// src/server/api/controllers/testing.controller.ts

import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";
import {
  test_runs,
  crawl_results,
  test_cases,
  test_results,
  bug_reports,
  report_exports,
  performance_metrics,
} from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { crawlSite, executeTest } from "@/server/services/tinyfish.service";
import { uploadScreenshot, urlToSlug } from "@/server/services/s3.service";
import type { PagePerformanceMetrics, PipelineSSEEvent } from "@/server/services/tinyfish.service";
import {
  generateTestCases,
  generateAISummary,
  type SiteContext,
  type TestRunSummaryInput,
  type TestCase,
} from "@/server/services/openRouter.service";
import type { ApiErrorResponse } from "@/types/api.types";

// MAX_TEST_RETRIES governs how many times the controller re-runs a *test
// execution* when it fails. This is separate from MAX_EXTRACTION_RETRIES
// in tinyfish.service (which governs per-page crawl retries). They were
// previously the same import but serve different purposes and should be
// tuned independently.
const MAX_TEST_RETRIES = 2;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normaliseUrl(url: string): string {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
}

function calculateScore(passed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((passed / total) * 100);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function updateRunStatus(
  testRunId: string,
  status: typeof test_runs.$inferInsert.status,
  extra?: Partial<typeof test_runs.$inferInsert>,
) {
  await db
    .update(test_runs)
    .set({ status, ...extra })
    .where(eq(test_runs.id, testRunId));
}

function buildSSELine(event: PipelineSSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function buildTestGoal(tc: TestCase): string {
  const numberedSteps = tc.steps
    .map((step, i) => `Step ${i + 1}: ${step}`)
    .join("\n");
  return `${numberedSteps}\n\nExpected result: ${tc.expected_result}`;
}

// ---------------------------------------------------------------------------
// FIX 2: In-memory set to track which test runs have an active pipeline
// This prevents the SSE handler from starting a SECOND pipeline when the
// first one was already started by startTestRunHandler.
//
// Root cause of the double pipeline:
//   1. POST /api/test/run → calls runPipeline() in background (void)
//   2. Frontend immediately opens GET /api/test/stream/:id
//   3. streamTestRunHandler sees status = "crawling" (not complete/failed)
//      so it calls runPipeline() AGAIN — two full pipelines running in parallel
//
// Fix: track active pipeline IDs in memory. SSE handler only starts pipeline
// if one isn't already running.
// ---------------------------------------------------------------------------
const activePipelines   = new Set<string>();

// cancelledPipelines: IDs of runs the user has explicitly cancelled.
// The pipeline checks this set at each major step and aborts if found.
// Using an in-memory Set is sufficient — if the server restarts, the DB
// status is already "cancelled" so the pipeline won't start again.
const cancelledPipelines = new Set<string>();

// Helper: check if this run has been cancelled. Throws if so.
function checkCancelled(testRunId: string): void {
  if (cancelledPipelines.has(testRunId)) {
    throw new Error(`CANCELLED:${testRunId}`);
  }
}

// ---------------------------------------------------------------------------
// Background pipeline
// ---------------------------------------------------------------------------

async function runPipeline(
  testRunId: string,
  targetUrl: string,
  emit?: (line: string) => void,
): Promise<void> {
  const send = (event: PipelineSSEEvent) => emit?.(buildSSELine(event));

  // ─── STEP 1: CRAWL ───────────────────────────────────────────────────────
  checkCancelled(testRunId);
  await updateRunStatus(testRunId, "crawling");
  send({ type: "status", status: "crawling", percent: 10 });

  let siteData: Awaited<ReturnType<typeof crawlSite>>;
  try {
    siteData = await crawlSite(targetUrl, { testRunId });
  } catch (err) {
    const msg = `Crawl failed: ${err instanceof Error ? err.message : String(err)}`;
    send({ type: "error", message: msg });
    throw new Error(msg);
  }

  await Promise.all([
    db.insert(crawl_results).values({
      id: nanoid(),
      test_run_id: testRunId,
      pages: siteData.pages,
      elements: siteData.pages.flatMap((p) => p.elements),
      forms: siteData.pages.flatMap((p) => p.forms),
      links: siteData.allLinks,
      screenshots: siteData.pages.map((p) => ({
        pageUrl: p.url,
        ...p.screenshots,
      })),
      crawl_time_ms: siteData.crawlTimeMs,
    }),
    siteData.performanceMetrics.length > 0
      ? db.insert(performance_metrics).values(
          siteData.performanceMetrics.map((pm: PagePerformanceMetrics) => ({
            id: nanoid(),
            test_run_id: testRunId,
            page_url: pm.pageUrl,
            lcp_ms: pm.lcpMs,
            fid_ms: pm.fidMs,
            cls: pm.cls,
            ttfb_ms: pm.ttfbMs,
            raw_metrics: pm.rawMetrics,
          })),
        )
      : Promise.resolve(),
  ]);

  // ─── STEP 2: GENERATE ────────────────────────────────────────────────────
  checkCancelled(testRunId);
  await updateRunStatus(testRunId, "generating");
  send({ type: "status", status: "generating", percent: 30 });

  const siteContext: SiteContext = {
    rootUrl:  targetUrl,
    pages:    siteData.pages,
    allLinks: siteData.allLinks,
    testBudget: siteData.testBudget,
    buildifyContext: {
      hasAuth:      siteData.hasLogin || siteData.hasSignup || siteData.hasProtectedRoutes,
      apiEndpoints: siteData.pages.flatMap((p) => p.apiEndpoints),
    },
  };

  let generatedCases: Awaited<ReturnType<typeof generateTestCases>>;
  try {
    generatedCases = await generateTestCases(siteContext);
  } catch (err) {
    const msg = `Generation failed: ${err instanceof Error ? err.message : String(err)}`;
    send({ type: "error", message: msg });
    throw new Error(msg);
  }

  const testCaseRecords = generatedCases.map((tc) => ({
    id: nanoid(),
    test_run_id: testRunId,
    category: tc.category,
    title: tc.title,
    description: tc.description,
    steps: tc.steps,
    expected_result: tc.expected_result,
    priority: tc.priority,
    tags: tc.tags,
    estimated_duration: tc.estimated_duration,
  }));

  await db.insert(test_cases).values(testCaseRecords);
  await db
    .update(test_runs)
    .set({ total_tests: testCaseRecords.length })
    .where(eq(test_runs.id, testRunId));

  for (let i = 0; i < generatedCases.length; i++) {
    const tc = generatedCases[i]!;
    const dbId = testCaseRecords[i]!.id;
    send({
      type: "test_update",
      testResultId: "",
      testCaseId: dbId,
      title: tc.title,
      status: "pending",
    });
  }

  // ─── STEP 3: EXECUTE ─────────────────────────────────────────────────────
  checkCancelled(testRunId);
  await updateRunStatus(testRunId, "executing");
  send({ type: "status", status: "executing", percent: 50 });

  const pairs: { tc: TestCase; dbId: string }[] = generatedCases.map((tc, i) => ({
    tc,
    dbId: testCaseRecords[i]!.id,
  }));

  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let totalRunning = 0;

  const bugsToInsert: (typeof bug_reports.$inferInsert)[] = [];
  const categoryResults: Record<string, { passed: number; failed: number; total: number }> = {};

  for (const [batchIndex, batch] of chunk(pairs, 50).entries()) {
    // Check cancellation before each batch — stops TinyFish calls immediately
    checkCancelled(testRunId);

    console.log(`[Testing] Batch ${batchIndex + 1}: ${batch.length} tests`);

    totalRunning += batch.length;
    await db
      .update(test_runs)
      .set({ running: totalRunning })
      .where(eq(test_runs.id, testRunId));

    for (const { tc, dbId } of batch) {
      send({ type: "test_update", testResultId: "", testCaseId: dbId, title: tc.title, status: "running" });
    }

    const batchResults = await Promise.allSettled(
      batch.map(async ({ tc, dbId }) => {
        const testUrl = tc.target_url ?? targetUrl;
        const goal = buildTestGoal(tc);

        let result = await executeTest(testUrl, goal);
        let retryCount = 0;
        let isFlaky = false;

        if (!result.passed) {
          for (let retry = 1; retry <= MAX_TEST_RETRIES; retry++) {
            console.log(`[Testing] Retry ${retry}/${MAX_TEST_RETRIES} for "${tc.title}"`);
            const retryResult = await executeTest(testUrl, goal);
            retryCount = retry;
            if (retryResult.passed) {
              isFlaky = true;
              result = retryResult;
              break;
            }
            result = retryResult;
          }
        }

        const status = isFlaky ? "flaky" : result.passed ? "passed" : "failed";
        const testResultId = nanoid();

        let screenshotUrl: string | null = null;
        if (status === "failed" && testRunId) {
          try {
            const { runTinyFishScreenshot } = await import("@/server/services/tinyfish.service");
            const ssBase64 = await runTinyFishScreenshot(testUrl);
            if (ssBase64) {
              screenshotUrl = await uploadScreenshot({
                base64Png: ssBase64,
                testRunId,
                pageSlug: urlToSlug(testUrl),
                viewport: "test",
              });
            }
          } catch (err) {
            console.warn(`[Testing] Failed to capture screenshot for "${tc.title}":`, err);
          }
        }

        await db.insert(test_results).values({
          id: testResultId,
          test_case_id: dbId,
          test_run_id: testRunId,
          status,
          actual_result: result.actualResult,
          duration_ms: result.durationMs,
          screenshot_url: screenshotUrl,
          error_details: result.errorDetails,
          console_logs: result.consoleLogs,
          network_logs: result.networkLogs,
          retry_count: retryCount,
          tinyfish_job_id: result.jobId ?? null,
        });

        send({
          type: "test_update",
          testResultId,
          testCaseId: dbId,
          title: tc.title,
          status,
          durationMs: result.durationMs,
        });

        const cat = tc.category;
        if (!categoryResults[cat]) categoryResults[cat] = { passed: 0, failed: 0, total: 0 };
        categoryResults[cat]!.total++;
        if (status === "passed" || status === "flaky") categoryResults[cat]!.passed++;
        else if (status === "failed") categoryResults[cat]!.failed++;

        if (status === "failed") {
          const bugId = nanoid();
          bugsToInsert.push({
            id: bugId,
            test_run_id: testRunId,
            test_result_id: testResultId,
            severity:
              tc.priority === "P0" ? "critical"
              : tc.priority === "P1" ? "high"
              : "medium",
            category: tc.category,
            title: `${tc.title} — FAILED`,
            description: result.actualResult,
            reproduction_steps: tc.steps,
            screenshot_url: screenshotUrl,
            annotation_box: null,
            ai_fix_suggestion: null,
            page_url: testUrl,
            status: "open",
          });

          send({
            type: "bug_found",
            bug: {
              id: bugId,
              title: `${tc.title} — FAILED`,
              severity: tc.priority === "P0" ? "critical" : tc.priority === "P1" ? "high" : "medium",
              category: tc.category,
              pageUrl: testUrl,
              screenshotUrl: screenshotUrl,
            },
          });
        }

        return status;
      }),
    );

    totalRunning -= batch.length;
    for (const outcome of batchResults) {
      if (outcome.status === "fulfilled") {
        if (outcome.value === "passed" || outcome.value === "flaky") totalPassed++;
        else totalFailed++;
      } else {
        totalSkipped++;
        console.warn("[Testing] Test settled as rejected:", outcome.reason);
      }
    }

    await db
      .update(test_runs)
      .set({
        passed: totalPassed,
        failed: totalFailed,
        skipped: totalSkipped,
        running: totalRunning,
      })
      .where(eq(test_runs.id, testRunId));

    send({
      type: "counter",
      passed: totalPassed,
      failed: totalFailed,
      running: totalRunning,
      skipped: totalSkipped,
      total: testCaseRecords.length,
    });
  }

  if (bugsToInsert.length > 0) {
    await db.insert(bug_reports).values(bugsToInsert);
  }

  // ─── STEP 4: REPORT ──────────────────────────────────────────────────────
  checkCancelled(testRunId);
  await updateRunStatus(testRunId, "reporting");
  send({ type: "status", status: "reporting", percent: 90 });

  const overallScore = calculateScore(
    totalPassed,
    totalPassed + totalFailed + totalSkipped,
  );

  const summaryInput: TestRunSummaryInput = {
    targetUrl,
    overallScore,
    totalTests: testCaseRecords.length,
    passed: totalPassed,
    failed: totalFailed,
    skipped: totalSkipped,
    bugs: bugsToInsert.map((b) => ({
      severity: (b.severity ?? "medium") as "critical" | "high" | "medium" | "low",
      title: b.title ?? "",
      pageUrl: b.page_url ?? "",
      category: b.category ?? "",
    })),
    categoryResults,
    performanceSummary: siteData.performanceMetrics.map((pm) => ({
      pageUrl: pm.pageUrl,
      lcpMs:   pm.lcpMs,
      cls:     pm.cls,
      ttfbMs:  pm.ttfbMs,
    })),
  };

  let aiSummary = "";
  try {
    aiSummary = await generateAISummary(summaryInput);
  } catch {
    aiSummary = `Test run complete. Score: ${overallScore}/100. ${totalPassed} passed, ${totalFailed} failed.`;
  }

  const embedBadgeToken = nanoid(32);
  const shareableSlug = nanoid(10);

  await db.insert(report_exports).values({
    id: nanoid(),
    test_run_id: testRunId,
    format: "json",
    file_url: null,
    ai_summary: aiSummary,
    shareable_slug: shareableSlug,
    is_public: false,
    embed_badge_token: embedBadgeToken,
  });

  await db
    .update(test_runs)
    .set({
      status: "complete",
      overall_score: overallScore,
      passed: totalPassed,
      failed: totalFailed,
      skipped: totalSkipped,
      running: 0,
      completed_at: new Date(),
    })
    .where(eq(test_runs.id, testRunId));

  send({
    type: "complete",
    overallScore,
    passed: totalPassed,
    failed: totalFailed,
    skipped: totalSkipped,
    total: testCaseRecords.length,
    aiSummary,
    shareableSlug,
  });
}

// ---------------------------------------------------------------------------
// POST /api/test/run
// ---------------------------------------------------------------------------

export async function startTestRunHandler({
  body,
}: {
  body: { url: string; projectId?: string };
}): Promise<{ testRunId: string } | ApiErrorResponse> {
  try {
    const session = await getSession();
    if (!session?.user?.id) return { error: "Unauthorized", status: 401 };

    const { url, projectId } = body;
    if (!url) return { error: "URL is required", status: 400 };

    const targetUrl = normaliseUrl(url);
    const testRunId = nanoid();

    await db.insert(test_runs).values({
      id: testRunId,
      user_id: session.user.id,
      target_url: targetUrl,
      project_id: projectId ?? null,
      status: "crawling",
      total_tests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      running: 0,
    });

    // FIX 2: Mark this pipeline as active BEFORE starting it
    activePipelines.add(testRunId);

    void runPipeline(testRunId, targetUrl).catch(async (err) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith("CANCELLED:")) {
        console.log(`[Testing] Pipeline cancelled: ${testRunId}`);
        await updateRunStatus(testRunId, "cancelled" as typeof test_runs.$inferInsert.status, {
          completed_at: new Date(),
          running: 0,
        });
      } else {
        console.error(`[Testing] Pipeline failed for ${testRunId}:`, err);
        await updateRunStatus(testRunId, "failed");
      }
    }).finally(() => {
      activePipelines.delete(testRunId);
      cancelledPipelines.delete(testRunId);
    });

    return { testRunId };
  } catch (err) {
    console.error("Error in startTestRunHandler:", err);
    return { error: "Internal server error", status: 500 };
  }
}

// ---------------------------------------------------------------------------
// GET /api/test/stream/[id]  (Server-Sent Events)
// ---------------------------------------------------------------------------

export async function streamTestRunHandler({
  params,
}: {
  params: { id: string };
}): Promise<Response> {
  const session = await getSession();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const run = await db.query.test_runs.findFirst({
    where: eq(test_runs.id, params.id),
  });

  if (!run) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  if (run.user_id !== session.user.id) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });

  // FIX: Handle all terminal states — complete, failed, AND cancelled.
  // Previously "cancelled" fell through and restarted the pipeline.
  const isTerminal = run.status === "complete" || run.status === "failed" || (run.status as string) === "cancelled";
  if (isTerminal) {
    const report = run.status === "complete"
      ? await db.query.report_exports.findFirst({ where: eq(report_exports.test_run_id, params.id) })
      : null;

    let event: PipelineSSEEvent;
    if (run.status === "complete") {
      event = {
        type: "complete",
        overallScore: run.overall_score ?? 0,
        passed: run.passed ?? 0,
        failed: run.failed ?? 0,
        skipped: run.skipped ?? 0,
        total: run.total_tests ?? 0,
        aiSummary: report?.ai_summary ?? "",
        shareableSlug: report?.shareable_slug ?? null,
      };
    } else if ((run.status as string) === "cancelled") {
      // Use sentinel message "CANCELLED" so the client can distinguish
      // user-cancelled from error-failed and show the right UI state.
      event = { type: "error", message: "CANCELLED" };
    } else {
      event = { type: "error", message: "Test run failed" };
    }

    const body = buildSSELine(event);
    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  let emitToStream!: (line: string) => void;
  let closeStream!: () => void;

  const stream = new ReadableStream({
    start(controller) {
      emitToStream = (line: string) => {
        try { controller.enqueue(new TextEncoder().encode(line)); } catch { /* stream closed */ }
      };
      closeStream = () => {
        try { controller.close(); } catch { /* already closed */ }
      };
    },
  });

  // FIX 2: Only start a new pipeline if one isn't already running
  if (!activePipelines.has(params.id)) {
    console.log(`[Testing] SSE handler starting pipeline for ${params.id} (no active pipeline found)`);
    activePipelines.add(params.id);

    void runPipeline(params.id, run.target_url, emitToStream)
      .catch(async (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.startsWith("CANCELLED:")) {
          emitToStream(buildSSELine({ type: "error", message: "CANCELLED" }));
        } else {
          console.error(`[Testing] SSE pipeline failed for ${params.id}:`, err);
          emitToStream(buildSSELine({ type: "error", message: String(err) }));
        }
      })
      .finally(() => {
        activePipelines.delete(params.id);
        cancelledPipelines.delete(params.id);
        closeStream();
      });
  } else {
    // Pipeline already running from startTestRunHandler — attach poll
    console.log(`[Testing] SSE handler: pipeline already active for ${params.id} — attaching poll`);

    void (async () => {
      const poll = setInterval(async () => {
        try {
          const current = await db.query.test_runs.findFirst({
            where: eq(test_runs.id, params.id),
          });

          if (!current) { clearInterval(poll); closeStream(); return; }

          emitToStream(buildSSELine({
            type: "counter",
            passed: current.passed ?? 0,
            failed: current.failed ?? 0,
            running: current.running ?? 0,
            skipped: current.skipped ?? 0,
            total: current.total_tests ?? 0,
          }));

          emitToStream(buildSSELine({
            type: "status",
            status: current.status,
            percent: { crawling: 10, generating: 30, executing: 70, reporting: 90, complete: 100, failed: 0, cancelled: 0 }[current.status] ?? 0,
          }));

          const isNowTerminal = current.status === "complete" || current.status === "failed" || (current.status as string) === "cancelled";
          if (isNowTerminal) {
            clearInterval(poll);

            if (current.status === "complete") {
              const report = await db.query.report_exports.findFirst({
                where: eq(report_exports.test_run_id, params.id),
              });
              emitToStream(buildSSELine({
                type: "complete",
                overallScore: current.overall_score ?? 0,
                passed: current.passed ?? 0,
                failed: current.failed ?? 0,
                skipped: current.skipped ?? 0,
                total: current.total_tests ?? 0,
                aiSummary: report?.ai_summary ?? "",
                shareableSlug: report?.shareable_slug ?? null,
              }));
            } else if ((current.status as string) === "cancelled") {
              emitToStream(buildSSELine({ type: "error", message: "CANCELLED" }));
            } else {
              emitToStream(buildSSELine({ type: "error", message: "Test run failed" }));
            }

            closeStream();
          }
        } catch (err) {
          console.error(`[Testing] Poll error for ${params.id}:`, err);
          clearInterval(poll);
          closeStream();
        }
      }, 3000);
    })();
  }

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// ---------------------------------------------------------------------------
// GET /api/test/[id]
// ---------------------------------------------------------------------------

export async function getTestRunHandler({
  params,
}: {
  params: { id: string };
}): Promise<object | ApiErrorResponse> {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized", status: 401 };

  const run = await db.query.test_runs.findFirst({
    where: eq(test_runs.id, params.id),
    with: {
      reportExports: true,
      bugReports: {
        orderBy: (b, { asc }) => [asc(b.severity)],
      },
    },
  });

  if (!run) return { error: "Test run not found", status: 404 };
  if (run.user_id !== session.user.id) return { error: "Forbidden", status: 403 };

  const progressMap: Record<typeof run.status, number> = {
    crawling: 10,
    generating: 30,
    executing: 70,
    reporting: 90,
    complete: 100,
    failed: 0,
    cancelled: 0,
  };

  return {
    id: run.id,
    status: run.status,
    percent: progressMap[run.status] ?? 0,
    targetUrl: run.target_url,
    overallScore: run.overall_score,
    totalTests: run.total_tests,
    passed: run.passed,
    failed: run.failed,
    skipped: run.skipped,
    running: run.running ?? 0,
    startedAt: run.started_at,
    completedAt: run.completed_at,
    aiSummary: run.reportExports?.[0]?.ai_summary ?? null,
    shareableSlug: run.reportExports?.[0]?.shareable_slug ?? null,
    embedBadgeToken: run.reportExports?.[0]?.embed_badge_token ?? null,
    bugs: run.bugReports ?? [],
  };
}

// ---------------------------------------------------------------------------
// DELETE /api/test/run/[id]  — Cancel a running test
// ---------------------------------------------------------------------------
//
// Called when the user clicks "Stop" / "Cancel" in the UI.
//
// How it works:
//   1. Mark the run as "cancelled" in DB immediately
//   2. Add to cancelledPipelines Set (in-memory signal checked by pipeline
//      at each major step — crawl, generate, execute batch, report)
//   3. Remove from activePipelines (prevents SSE handler from re-attaching)
//
// The pipeline checks cancelledPipelines before each step and throws
// "CANCELLED:<id>" which the catch handler converts to DB status "cancelled".
// ---------------------------------------------------------------------------

export async function cancelTestRunHandler({
  params,
}: {
  params: { id: string };
}): Promise<{ cancelled: boolean } | ApiErrorResponse> {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized", status: 401 };

  const run = await db.query.test_runs.findFirst({
    where: eq(test_runs.id, params.id),
    columns: { id: true, user_id: true, status: true },
  });

  if (!run) return { error: "Test run not found", status: 404 };
  if (run.user_id !== session.user.id) return { error: "Forbidden", status: 403 };

  // Already in a terminal state — nothing to cancel
  if (
    run.status === "complete" ||
    run.status === "failed" ||
    (run.status as string) === "cancelled"
  ) {
    return { cancelled: false };
  }

  // Signal the in-memory pipeline to stop at its next checkpoint
  cancelledPipelines.add(params.id);

  // Update DB immediately so history shows "cancelled" without waiting
  await db
    .update(test_runs)
    .set({
      status: "cancelled" as typeof test_runs.$inferInsert.status,
      completed_at: new Date(),
      running: 0,
    })
    .where(eq(test_runs.id, params.id));

  // Remove from active pipelines so SSE doesn't re-attach
  activePipelines.delete(params.id);

  console.log(`[Testing] Run ${params.id} cancelled by user ${session.user.id}`);
  return { cancelled: true };
}

// ---------------------------------------------------------------------------
// GET /api/test/history
// ---------------------------------------------------------------------------

export async function getTestHistoryHandler(): Promise<object | ApiErrorResponse> {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized", status: 401 };

  const runs = await db.query.test_runs.findMany({
    where: eq(test_runs.user_id, session.user.id),
    orderBy: [desc(test_runs.started_at)],
    with: {
      reportExports: true,
    },
    limit: 50,
  });

  return {
    runs: runs.map((run) => ({
      id: run.id,
      targetUrl: run.target_url,
      status: run.status,
      overallScore: run.overall_score,
      totalTests: run.total_tests,
      passed: run.passed,
      failed: run.failed,
      skipped: run.skipped,
      startedAt: run.started_at,
      completedAt: run.completed_at,
      aiSummary: run.reportExports?.[0]?.ai_summary ?? null,
      shareableSlug: run.reportExports?.[0]?.shareable_slug ?? null,
      embedBadgeToken: run.reportExports?.[0]?.embed_badge_token ?? null,
      reportUrl: `/report/${run.id}`,
    })),
  };
}

// ---------------------------------------------------------------------------
// GET /api/test/report/[id]
// ---------------------------------------------------------------------------

export async function getTestReportHandler({
  params,
}: {
  params: { id: string };
}): Promise<object | ApiErrorResponse> {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized", status: 401 };

  const run = await db.query.test_runs.findFirst({
    where: eq(test_runs.id, params.id),
    with: {
      testCases: {
        with: { results: true },
      },
      bugReports: true,
      reportExports: true,
      crawlResult: true,
      performanceMetrics: true,
    },
  });

  if (!run) return { error: "Test run not found", status: 404 };
  if (run.user_id !== session.user.id) return { error: "Forbidden", status: 403 };

  const resultsByCategory = run.testCases.reduce(
    (acc, tc) => {
      const cat = tc.category ?? "other";
      if (!acc[cat]) acc[cat] = { passed: 0, failed: 0, flaky: 0, total: 0 };
      for (const result of tc.results) {
        acc[cat]!.total++;
        if (result.status === "passed") acc[cat]!.passed++;
        else if (result.status === "flaky") { acc[cat]!.passed++; acc[cat]!.flaky++; }
        else if (result.status === "failed") acc[cat]!.failed++;
      }
      return acc;
    },
    {} as Record<string, { passed: number; failed: number; flaky: number; total: number }>,
  );

  const bugsByCategory = run.bugReports.reduce(
    (acc, bug) => {
      const cat = bug.category ?? "other";
      acc[cat] = (acc[cat] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  type PerformanceMetricRow = {
    id: string;
    page_url: string;
    lcp_ms: number | null;
    fid_ms: number | null;
    cls: number | null;
    ttfb_ms: number | null;
  };

  const performanceGauges = ((run as unknown as { performanceMetrics: PerformanceMetricRow[] }).performanceMetrics ?? []).map(
    (pm: PerformanceMetricRow) => ({
      pageUrl: pm.page_url,
      lcpMs: pm.lcp_ms,
      fidMs: pm.fid_ms,
      cls: pm.cls,
      ttfbMs: pm.ttfb_ms,
      lcpStatus: pm.lcp_ms === null ? "unknown" : pm.lcp_ms < 2500 ? "good" : pm.lcp_ms < 4000 ? "needs-improvement" : "poor",
      fidStatus: pm.fid_ms === null ? "unknown" : pm.fid_ms < 100 ? "good" : pm.fid_ms < 300 ? "needs-improvement" : "poor",
      clsStatus: pm.cls === null ? "unknown" : pm.cls < 0.1 ? "good" : pm.cls < 0.25 ? "needs-improvement" : "poor",
      ttfbStatus: pm.ttfb_ms === null ? "unknown" : pm.ttfb_ms < 800 ? "good" : pm.ttfb_ms < 1800 ? "needs-improvement" : "poor",
    }),
  );

  const trendRuns = await db.query.test_runs.findMany({
    where: eq(test_runs.target_url, run.target_url),
    orderBy: [desc(test_runs.started_at)],
    limit: 10,
    columns: {
      id: true,
      overall_score: true,
      started_at: true,
      status: true,
    },
  });

  const trendData = trendRuns
    .filter((r) => r.status === "complete" && r.overall_score !== null)
    .map((r) => ({
      runId: r.id,
      score: r.overall_score,
      date: r.started_at,
      isCurrent: r.id === run.id,
    }))
    .reverse();

  const export0 = run.reportExports?.[0];

  return {
    id: run.id,
    targetUrl: run.target_url,
    status: run.status,
    overallScore: run.overall_score,
    totalTests: run.total_tests,
    passed: run.passed,
    failed: run.failed,
    skipped: run.skipped,
    startedAt: run.started_at,
    completedAt: run.completed_at,
    aiSummary: export0?.ai_summary ?? null,
    shareableSlug: export0?.shareable_slug ?? null,
    isPublic: export0?.is_public ?? false,
    embedBadgeToken: export0?.embed_badge_token ?? null,
    bugs: run.bugReports,
    bugsByCategory,
    resultsByCategory,
    testCases: run.testCases,
    crawlSummary: {
      totalPages: (run.crawlResult?.pages as unknown[])?.length ?? 0,
      crawlTimeMs: run.crawlResult?.crawl_time_ms ?? 0,
      screenshots: (run.crawlResult?.screenshots as { pageUrl: string; url375: string | null; url768: string | null; url1440: string | null }[] | null) ?? [],
      apiEndpoints: (run.crawlResult?.pages as { apiEndpoints?: { url: string; method: string; status: number | null; responseType: string | null; durationMs: number | null }[] }[] | null)
        ?.flatMap((p) => p.apiEndpoints ?? []) ?? [],
      navStructure: (run.crawlResult?.pages as { navStructure?: { breadcrumbs: string[]; menus: { label: string; items: { text: string; href: string }[] }[] } }[] | null)?.[0]?.navStructure ?? null,
    },
    performanceGauges,
    trendData,
  };
}

// ---------------------------------------------------------------------------
// GET /api/test/report/public/[slug]
// ---------------------------------------------------------------------------

export async function getPublicReportHandler({
  params,
}: {
  params: { slug: string };
}): Promise<object | ApiErrorResponse> {
  const exportRow = await db.query.report_exports.findFirst({
    where: eq(report_exports.shareable_slug, params.slug),
  });

  if (!exportRow) return { error: "Report not found", status: 404 };
  if (!exportRow.is_public) return { error: "This report is private", status: 403 };

  return getTestReportHandler({ params: { id: exportRow.test_run_id } });
}

// ---------------------------------------------------------------------------
// GET /api/badge/[token]
// ---------------------------------------------------------------------------

export async function getEmbedBadgeHandler({
  params,
}: {
  params: { token: string };
}): Promise<object | ApiErrorResponse> {
  const exportRow = await db.query.report_exports.findFirst({
    where: eq(report_exports.embed_badge_token, params.token),
    with: { testRun: true },
  });

  if (!exportRow) return { error: "Badge not found", status: 404 };

  const score = (exportRow as unknown as { testRun: { overall_score: number | null } }).testRun?.overall_score ?? 0;
  const color = score >= 90 ? "green" : score >= 70 ? "yellow" : "red";

  return {
    score,
    label: "Tested by Buildify",
    color,
    reportUrl: exportRow.shareable_slug
      ? `/report/${exportRow.shareable_slug}`
      : null,
  };
}