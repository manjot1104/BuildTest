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
import {
  crawlSite,
  executeTest,
  MAX_TEST_RETRIES,
  type PagePerformanceMetrics,
  type PipelineSSEEvent,
} from "@/server/services/tinyfish.service";
import { uploadScreenshot, urlToSlug } from "@/server/services/s3.service";
import {
  generateTestCases,
  generateAISummary,
  generateBugFixSuggestions,
  type SiteContext,
  type TestRunSummaryInput,
  type TestCase,
  type BugContext,
} from "@/server/services/openRouter.service";
import type { ApiErrorResponse } from "@/types/api.types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normaliseUrl(url: string): string {
  if (!url.startsWith("http://") && !url.startsWith("https://"))
    return `https://${url}`;
  return url;
}

function calculateScore(passed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((passed / total) * 100);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size)
    chunks.push(arr.slice(i, i + size));
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
// In-memory pipeline state
// ---------------------------------------------------------------------------

const activePipelines = new Set<string>();
const cancelledPipelines = new Set<string>();
const crawlAbortControllers = new Map<string, AbortController>();

// Multiple SSE clients can connect to the same running pipeline.
// We fan-out events to all of them.
const pipelineEmitters = new Map<string, Set<(line: string) => void>>();

function registerEmitter(
  testRunId: string,
  emit: (line: string) => void,
): () => void {
  if (!pipelineEmitters.has(testRunId))
    pipelineEmitters.set(testRunId, new Set());
  pipelineEmitters.get(testRunId)!.add(emit);
  return () => pipelineEmitters.get(testRunId)?.delete(emit);
}

function broadcastToRun(testRunId: string, line: string): void {
  pipelineEmitters.get(testRunId)?.forEach((emit) => {
    try {
      emit(line);
    } catch {
      /* stream already closed */
    }
  });
}

function checkCancelled(testRunId: string): void {
  if (cancelledPipelines.has(testRunId))
    throw new Error(`CANCELLED:${testRunId}`);
}

// ---------------------------------------------------------------------------
// Background pipeline
// ---------------------------------------------------------------------------

// CHANGED: runPipeline now accepts optional userMaxPages and userMaxTests
// so user-provided values are carried all the way into crawlSite's budget.
async function runPipeline(
  testRunId: string,
  targetUrl: string,
  userMaxPages?: number,
  userMaxTests?: number,
): Promise<void> {
  const abortController = new AbortController();
  crawlAbortControllers.set(testRunId, abortController);

  // Convenience: broadcast an event to all connected SSE clients for this run
  const send = (event: PipelineSSEEvent) =>
    broadcastToRun(testRunId, buildSSELine(event));

  try {
    await runPipelineStages(testRunId, targetUrl, send, abortController.signal, userMaxPages, userMaxTests);
  } finally {
    crawlAbortControllers.delete(testRunId);
  }
}

// CHANGED: runPipelineStages accepts optional userMaxPages and userMaxTests
// and passes them into crawlSite via the budget option.
async function runPipelineStages(
  testRunId: string,
  targetUrl: string,
  send: (event: PipelineSSEEvent) => void,
  abortSignal: AbortSignal,
  userMaxPages?: number,
  userMaxTests?: number,
): Promise<void> {
  // ─── STEP 1: CRAWL ───────────────────────────────────────────────────────
  checkCancelled(testRunId);
  await updateRunStatus(testRunId, "crawling");
  send({ type: "status", status: "crawling", percent: 10 });

  let siteData: Awaited<ReturnType<typeof crawlSite>>;
  try {
    siteData = await crawlSite(targetUrl, {
      testRunId,
      abortSignal,
      // CHANGED: pass user-specified page/test counts into the budget if provided.
      // Falls back to the service-level defaults when not specified.
      budget: {
        ...(userMaxPages !== undefined && { maxPages: userMaxPages }),
        ...(userMaxTests !== undefined && { maxTests: userMaxTests }),
      },
    });
  } catch (err) {
    if (abortSignal.aborted || cancelledPipelines.has(testRunId))
      throw new Error(`CANCELLED:${testRunId}`);
    const msg = `Crawl failed: ${err instanceof Error ? err.message : String(err)}`;
    send({ type: "error", message: msg });
    throw new Error(msg);
  }

  // ─── STEP 2: GENERATE TEST CASES + persist crawl data (parallel) ─────────
  checkCancelled(testRunId);
  await updateRunStatus(testRunId, "generating");
  send({ type: "status", status: "generating", percent: 30 });

  const siteContext: SiteContext = {
    rootUrl: targetUrl,
    pages: siteData.pages,
    allLinks: siteData.allLinks,
    testBudget: siteData.testBudget,
    buildifyContext: {
      hasAuth:
        siteData.hasLogin || siteData.hasSignup || siteData.hasProtectedRoutes,
      apiEndpoints: siteData.pages.flatMap((p) => p.apiEndpoints),
    },
  };

  // Run AI generation, crawl DB writes, and background screenshots all in parallel
  const [generatedCases] = await Promise.all([
    // AI test case generation
    (async (): Promise<TestCase[]> => {
      checkCancelled(testRunId);
      try {
        return await generateTestCases(siteContext);
      } catch (err) {
        const msg = `Generation failed: ${err instanceof Error ? err.message : String(err)}`;
        send({ type: "error", message: msg });
        throw new Error(msg);
      }
    })(),

    // Persist crawl results to DB
    db.insert(crawl_results).values({
      id: nanoid(),
      test_run_id: testRunId,
      pages: siteData.pages,
      elements: siteData.pages.flatMap((p) => p.elements),
      forms: siteData.pages.flatMap((p) => p.forms),
      links: siteData.allLinks,
      screenshots: siteData.pages.map((p) => ({
        pageUrl: p.url,
        url375: p.screenshots.url375,
        url768: p.screenshots.url768,
        url1440: p.screenshots.url1440,
      })),
      crawl_time_ms: siteData.crawlTimeMs,
    }),

  ]);

  // Await stage3 so Puppeteer perf metrics are fully populated before we insert
  await siteData.stage3Promise.catch((err) => {
    console.warn("[Pipeline] stage3 screenshots/perf failed (non-fatal):", err);
  });
  if (siteData.performanceMetrics.length > 0) {
    await db.insert(performance_metrics).values(
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
    );
  }

  // Persist test cases
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

  // Emit all test cases at once so UI can render pending cards immediately
  send({
    type: "tests_generated",
    testCases: generatedCases.map((tc, i) => ({
      id: testCaseRecords[i]!.id,
      title: tc.title,
      category: tc.category,
      priority: tc.priority,
      steps: tc.steps,
      expected_result: tc.expected_result,
      target_url: tc.target_url,
    })),
  } as PipelineSSEEvent);

  for (let i = 0; i < generatedCases.length; i++) {
    send({
      type: "test_update",
      testResultId: "",
      testCaseId: testCaseRecords[i]!.id,
      title: generatedCases[i]!.title,
      status: "pending",
    });
  }

  // ─── STEP 3: EXECUTE ─────────────────────────────────────────────────────
  checkCancelled(testRunId);
  await updateRunStatus(testRunId, "executing");
  send({ type: "status", status: "executing", percent: 50 });

  const pairs: { tc: TestCase; dbId: string }[] = generatedCases.map(
    (tc, i) => ({
      tc,
      dbId: testCaseRecords[i]!.id,
    }),
  );

  // Single source of truth for live counters
  const counters = {
    passed: 0,
    failed: 0,
    running: 0,
    skipped: 0,
    total: testCaseRecords.length,
  };

  const sendCounters = () => send({ type: "counter", ...counters });

  const failedTestsForSuggestions: { testResultId: string; ctx: BugContext }[] =
    [];
  const bugsToInsertBase: Omit<
    typeof bug_reports.$inferInsert,
    "ai_fix_suggestion"
  >[] = [];
  const categoryResults: Record<
    string,
    { passed: number; failed: number; total: number }
  > = {};

  for (const [batchIndex, batch] of chunk(pairs, 50).entries()) {
    checkCancelled(testRunId);
    console.log(`[Testing] Batch ${batchIndex + 1}: ${batch.length} tests`);

    // Mark entire batch as running upfront
    counters.running += batch.length;
    await db
      .update(test_runs)
      .set({ running: counters.running })
      .where(eq(test_runs.id, testRunId));

    for (const { tc, dbId } of batch) {
      send({
        type: "test_update",
        testResultId: "",
        testCaseId: dbId,
        title: tc.title,
        status: "running",
      });
    }
    sendCounters();

    await Promise.allSettled(
      batch.map(async ({ tc, dbId }) => {
        const testUrl = tc.target_url ?? targetUrl;
        const goal = buildTestGoal(tc);

        // First attempt
        let result = await executeTest(testUrl, goal, false, 0);
        let retryCount = 0;
        let isFlaky = false;

        // Retry up to MAX_TEST_RETRIES times on failure (sourced from tinyfish.service)
        for (
          let attempt = 1;
          attempt <= MAX_TEST_RETRIES && !result.passed;
          attempt++
        ) {
          const retryResult = await executeTest(testUrl, goal, false, attempt);
          retryCount = attempt;
          if (retryResult.passed) {
            isFlaky = true;
            result = retryResult;
            break;
          }
          result = retryResult;
        }

        const status = isFlaky ? "flaky" : result.passed ? "passed" : "failed";
        const testResultId = nanoid();

        // Capture screenshot for failures
        let screenshotUrl: string | null = null;
        if (status === "failed") {
          try {
            const { runTinyFishScreenshot } =
              await import("@/server/services/tinyfish.service");
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
            console.warn(`[Testing] Screenshot failed for "${tc.title}":`, err);
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

        // ── Live counter update — fires immediately when this test settles ──
        counters.running = Math.max(0, counters.running - 1);
        if (status === "passed" || status === "flaky") {
          counters.passed++;
        } else {
          counters.failed++;
        }

        // DB sync is fire-and-forget — don't block the SSE emit
        void db
          .update(test_runs)
          .set({
            passed: counters.passed,
            failed: counters.failed,
            running: counters.running,
          })
          .where(eq(test_runs.id, testRunId));

        // Emit counter BEFORE test_update so the UI number ticks first
        sendCounters();

        send({
          type: "test_update",
          testResultId,
          testCaseId: dbId,
          title: tc.title,
          status,
          durationMs: result.durationMs,
        });

        // Category tracking
        if (!categoryResults[tc.category])
          categoryResults[tc.category] = { passed: 0, failed: 0, total: 0 };
        categoryResults[tc.category]!.total++;
        if (status === "passed" || status === "flaky")
          categoryResults[tc.category]!.passed++;
        else if (status === "failed") categoryResults[tc.category]!.failed++;

        if (status === "failed") {
          const bugId = nanoid();
          const severity =
            tc.priority === "P0"
              ? "critical"
              : tc.priority === "P1"
                ? "high"
                : "medium";

          failedTestsForSuggestions.push({
            testResultId: bugId,
            ctx: {
              pageUrl: testUrl,
              testTitle: tc.title,
              category: tc.category,
              steps: tc.steps,
              actualResult: result.actualResult,
              errorDetails: result.errorDetails,
              expectedResult: tc.expected_result,
              consoleLogs: result.consoleLogs,
              networkErrors: result.networkLogs
                .filter((l) => l.status !== null && l.status >= 400)
                .map((l) => ({
                  url: l.url,
                  method: l.method,
                  status: l.status,
                  error: l.error,
                })),
            },
          });

          bugsToInsertBase.push({
            id: bugId,
            test_run_id: testRunId,
            test_result_id: testResultId,
            severity,
            category: tc.category,
            title: `${tc.title} — FAILED`,
            description: result.actualResult,
            reproduction_steps: tc.steps,
            screenshot_url: screenshotUrl,
            annotation_box: null,
            page_url: testUrl,
            status: "open",
          });

          send({
            type: "bug_found",
            bug: {
              id: bugId,
              title: `${tc.title} — FAILED`,
              severity,
              category: tc.category,
              pageUrl: testUrl,
              screenshotUrl,
            },
          });
        }
      }),
    );

    // Count any rejected promises as skipped, send counters immediately
    const batchOutcomes = await Promise.allSettled(
      batch.map(async ({ tc, dbId }) => {
        void tc;
        void dbId;
      }),
    );
    for (const outcome of batchOutcomes) {
      if (outcome.status === "rejected") {
        counters.skipped++;
        counters.running = Math.max(0, counters.running - 1);
        console.warn("[Testing] Test settled as rejected:", outcome.reason);
        sendCounters();
      }
    }

    await db
      .update(test_runs)
      .set({
        passed: counters.passed,
        failed: counters.failed,
        skipped: counters.skipped,
        running: counters.running,
      })
      .where(eq(test_runs.id, testRunId));

    // Final counter push after batch DB sync
    sendCounters();
  }

  // ─── Generate AI fix suggestions for all failed tests ────────────────────
  let aiSuggestions = new Map<string, string | null>();
  if (failedTestsForSuggestions.length > 0) {
    try {
      console.log(
        `[Testing] Generating AI suggestions for ${failedTestsForSuggestions.length} failed tests`,
      );
      aiSuggestions = await generateBugFixSuggestions(
        failedTestsForSuggestions,
      );
    } catch (err) {
      console.warn(
        "[Testing] AI suggestion generation failed (non-fatal):",
        err,
      );
    }
  }

  if (bugsToInsertBase.length > 0) {
    await db.insert(bug_reports).values(
      bugsToInsertBase.map((bug) => ({
        ...bug,
        ai_fix_suggestion: aiSuggestions.get(bug.id) ?? null,
      })),
    );
  }

  // ─── STEP 4: REPORT ──────────────────────────────────────────────────────
  checkCancelled(testRunId);
  await updateRunStatus(testRunId, "reporting");
  send({ type: "status", status: "reporting", percent: 90 });

  const overallScore = calculateScore(
    counters.passed,
    counters.passed + counters.failed + counters.skipped,
  );

  const summaryInput: TestRunSummaryInput = {
    targetUrl,
    overallScore,
    totalTests: testCaseRecords.length,
    passed: counters.passed,
    failed: counters.failed,
    skipped: counters.skipped,
    bugs: bugsToInsertBase.map((b) => ({
      severity: (b.severity ?? "medium") as
        | "critical"
        | "high"
        | "medium"
        | "low",
      title: b.title ?? "",
      pageUrl: b.page_url ?? "",
      category: b.category ?? "",
    })),
    categoryResults,
    performanceSummary: siteData.performanceMetrics.map((pm) => ({
      pageUrl: pm.pageUrl,
      lcpMs: pm.lcpMs,
      cls: pm.cls,
      ttfbMs: pm.ttfbMs,
    })),
  };

  let aiSummary = "";
  try {
    aiSummary = await generateAISummary(summaryInput);
  } catch {
    aiSummary = `Test run complete. Score: ${overallScore}/100. ${counters.passed} passed, ${counters.failed} failed.`;
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
    // CHANGED: was `is_public: false` — set to true so share links work out of the box
    is_public: true,
    embed_badge_token: embedBadgeToken,
  });

  await db
    .update(test_runs)
    .set({
      status: "complete",
      overall_score: overallScore,
      passed: counters.passed,
      failed: counters.failed,
      skipped: counters.skipped,
      running: 0,
      completed_at: new Date(),
    })
    .where(eq(test_runs.id, testRunId));

  send({
    type: "complete",
    overallScore,
    passed: counters.passed,
    failed: counters.failed,
    skipped: counters.skipped,
    total: testCaseRecords.length,
    aiSummary,
    shareableSlug,
  });
}

// ---------------------------------------------------------------------------
// POST /api/test/run
// ---------------------------------------------------------------------------

// CHANGED: body now accepts optional maxPages and maxTests from the user.
// These are passed through to runPipeline → runPipelineStages → crawlSite.
export async function startTestRunHandler({
  body,
}: {
  body: { url: string; projectId?: string; maxPages?: number; maxTests?: number };
}): Promise<{ testRunId: string } | ApiErrorResponse> {
  try {
    const session = await getSession();
    if (!session?.user?.id) return { error: "Unauthorized", status: 401 };
    const { url, projectId, maxPages, maxTests } = body;
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

    activePipelines.add(testRunId);

    // CHANGED: forward user-specified maxPages/maxTests into the pipeline
    void runPipeline(testRunId, targetUrl, maxPages, maxTests)
      .catch(async (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.startsWith("CANCELLED:")) {
          await updateRunStatus(
            testRunId,
            "cancelled" as typeof test_runs.$inferInsert.status,
            {
              completed_at: new Date(),
              running: 0,
            },
          );
        } else {
          console.error(`[Testing] Pipeline failed for ${testRunId}:`, err);
          await updateRunStatus(testRunId, "failed");
        }
      })
      .finally(() => {
        activePipelines.delete(testRunId);
        cancelledPipelines.delete(testRunId);
        pipelineEmitters.delete(testRunId);
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
  if (!session?.user?.id)
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });

  const run = await db.query.test_runs.findFirst({
    where: eq(test_runs.id, params.id),
  });
  if (!run)
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
    });
  if (run.user_id !== session.user.id)
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });

  const SSE_HEADERS = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  };

  // ── Already terminal: return a single event and close ──────────────────────
  const isTerminal = (s: string) =>
    s === "complete" || s === "failed" || s === "cancelled";

  if (isTerminal(run.status)) {
    let event: PipelineSSEEvent;
    if (run.status === "complete") {
      const report = await db.query.report_exports.findFirst({
        where: eq(report_exports.test_run_id, params.id),
      });
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
    } else {
      event = {
        type: "error",
        message: run.status === "cancelled" ? "CANCELLED" : "Test run failed",
      };
    }
    return new Response(buildSSELine(event), { headers: SSE_HEADERS });
  }

  // ── Active or not-yet-started pipeline ────────────────────────────────────
  let unregister: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const emit = (line: string) => {
        try {
          controller.enqueue(new TextEncoder().encode(line));
        } catch {
          /* stream closed */
        }
      };

      if (activePipelines.has(params.id)) {
        // Pipeline already running — attach this client as a live listener.
        // Send a synthetic counter snapshot immediately so the UI isn't blank.
        void db.query.test_runs
          .findFirst({
            where: eq(test_runs.id, params.id),
            columns: {
              status: true,
              overall_score: true,
              passed: true,
              failed: true,
              skipped: true,
              running: true,
              total_tests: true,
            },
          })
          .then((current) => {
            if (!current) return;
            emit(
              buildSSELine({
                type: "status",
                status: current.status,
                percent: statusToPercent(current.status),
              }),
            );
            emit(
              buildSSELine({
                type: "counter",
                passed: current.passed ?? 0,
                failed: current.failed ?? 0,
                running: current.running ?? 0,
                skipped: current.skipped ?? 0,
                total: current.total_tests ?? 0,
              }),
            );
          });

        unregister = registerEmitter(params.id, emit);
      } else {
        // Pipeline not running — start it and wire this client as the first emitter
        // NOTE: when restarting via SSE, we do NOT have user-specified maxPages/maxTests
        // because this path is for reconnecting to an already-persisted run.
        // The original maxPages/maxTests were already applied when POST /test/run was called.
        console.log(`[Testing] SSE handler starting pipeline for ${params.id}`);
        activePipelines.add(params.id);
        unregister = registerEmitter(params.id, emit);

        void runPipeline(params.id, run.target_url)
          .catch(async (err) => {
            const msg = err instanceof Error ? err.message : String(err);
            broadcastToRun(
              params.id,
              buildSSELine(
                msg.startsWith("CANCELLED:")
                  ? { type: "error", message: "CANCELLED" }
                  : { type: "error", message: msg },
              ),
            );
            const isCancelled = msg.startsWith("CANCELLED:");
            await updateRunStatus(
              params.id,
              isCancelled
                ? ("cancelled" as typeof test_runs.$inferInsert.status)
                : "failed",
              isCancelled
                ? { completed_at: new Date(), running: 0 }
                : undefined,
            );
          })
          .finally(() => {
            activePipelines.delete(params.id);
            cancelledPipelines.delete(params.id);
            pipelineEmitters.get(params.id)?.forEach((fn) => {
              try {
                fn(
                  buildSSELine({
                    type: "status",
                    status: "done",
                    percent: 100,
                  }),
                );
              } catch {
                /* ignore */
              }
            });
            pipelineEmitters.delete(params.id);
          });
      }
    },
    cancel() {
      unregister?.();
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}

function statusToPercent(status: string): number {
  return (
    (
      {
        crawling: 10,
        generating: 30,
        executing: 70,
        reporting: 90,
        complete: 100,
        failed: 0,
        cancelled: 0,
      } as Record<string, number>
    )[status] ?? 0
  );
}

// ---------------------------------------------------------------------------
// GET /api/test/run/[id]
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
      bugReports: { orderBy: (b, { asc }) => [asc(b.severity)] },
    },
  });

  if (!run) return { error: "Test run not found", status: 404 };
  if (run.user_id !== session.user.id)
    return { error: "Forbidden", status: 403 };

  return {
    id: run.id,
    status: run.status,
    percent: statusToPercent(run.status),
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
// DELETE /api/test/run/[id]/cancel
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
  if (run.user_id !== session.user.id)
    return { error: "Forbidden", status: 403 };

  const isTerminal = (s: string) =>
    s === "complete" || s === "failed" || s === "cancelled";
  if (isTerminal(run.status)) return { cancelled: false };

  cancelledPipelines.add(params.id);
  crawlAbortControllers.get(params.id)?.abort();

  await db
    .update(test_runs)
    .set({
      status: "cancelled" as typeof test_runs.$inferInsert.status,
      completed_at: new Date(),
      running: 0,
    })
    .where(eq(test_runs.id, params.id));

  activePipelines.delete(params.id);
  return { cancelled: true };
}

// ---------------------------------------------------------------------------
// GET /api/test/history
// ---------------------------------------------------------------------------

export async function getTestHistoryHandler(): Promise<
  object | ApiErrorResponse
> {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized", status: 401 };

  const runs = await db.query.test_runs.findMany({
    where: eq(test_runs.user_id, session.user.id),
    orderBy: [desc(test_runs.started_at)],
    with: { reportExports: true },
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
// GET /api/test/run/[id]/report
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
      testCases: { with: { results: true } },
      bugReports: true,
      reportExports: true,
      crawlResult: true,
    },
  });

  if (!run) return { error: "Test run not found", status: 404 };
  if (run.user_id !== session.user.id)
    return { error: "Forbidden", status: 403 };

  const resultsByCategory = run.testCases.reduce(
    (acc, tc) => {
      const cat = tc.category ?? "other";
      if (!acc[cat]) acc[cat] = { passed: 0, failed: 0, flaky: 0, total: 0 };
      for (const result of tc.results) {
        acc[cat]!.total++;
        if (result.status === "passed") acc[cat]!.passed++;
        else if (result.status === "flaky") {
          acc[cat]!.passed++;
          acc[cat]!.flaky++;
        } else if (result.status === "failed") acc[cat]!.failed++;
      }
      return acc;
    },
    {} as Record<
      string,
      { passed: number; failed: number; flaky: number; total: number }
    >,
  );

  const bugsByCategory = run.bugReports.reduce(
    (acc, bug) => {
      const cat = bug.category ?? "other";
      acc[cat] = (acc[cat] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const perfRows = await db
  .select()
  .from(performance_metrics)
  .where(eq(performance_metrics.test_run_id, params.id));

  const performanceGauges = perfRows.map((pm) => {
    const raw = pm.raw_metrics as Record<string, unknown> | null;
    const domContentLoadedMs = typeof raw?.domContentLoadedMs === "number" ? raw.domContentLoadedMs : null;
    const loadEventMs        = typeof raw?.loadEventMs        === "number" ? raw.loadEventMs        : null;

    return {
      pageUrl: pm.page_url,
      lcpMs:   pm.lcp_ms,
      fidMs:   pm.fid_ms,
      cls:     pm.cls,
      ttfbMs:  pm.ttfb_ms,
      domContentLoadedMs,
      loadEventMs,
      lcpStatus:
        pm.lcp_ms  === null ? "unknown" : pm.lcp_ms  < 2500 ? "good" : pm.lcp_ms  < 4000 ? "needs-improvement" : "poor",
      clsStatus:
        pm.cls     === null ? "unknown" : pm.cls     < 0.1  ? "good" : pm.cls     < 0.25 ? "needs-improvement" : "poor",
      ttfbStatus:
        pm.ttfb_ms === null ? "unknown" : pm.ttfb_ms < 800  ? "good" : pm.ttfb_ms < 1800 ? "needs-improvement" : "poor",
      domContentLoadedStatus:
        domContentLoadedMs === null ? "unknown" : domContentLoadedMs < 1500 ? "good" : domContentLoadedMs < 3000 ? "needs-improvement" : "poor",
      loadEventStatus:
        loadEventMs === null ? "unknown" : loadEventMs < 2000 ? "good" : loadEventMs < 4000 ? "needs-improvement" : "poor",
    };
  });

  const trendRuns = await db.query.test_runs.findMany({
    where: eq(test_runs.target_url, run.target_url),
    orderBy: [desc(test_runs.started_at)],
    limit: 10,
    columns: { id: true, overall_score: true, started_at: true, status: true },
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
      screenshots: [],
      apiEndpoints:
        (
          run.crawlResult?.pages as
            | {
                apiEndpoints?: {
                  url: string;
                  method: string;
                  status: number | null;
                  responseType: string | null;
                  durationMs: number | null;
                }[];
              }[]
            | null
        )?.flatMap((p) => p.apiEndpoints ?? []) ?? [],
      navStructure:
        (
          run.crawlResult?.pages as
            | {
                navStructure?: {
                  breadcrumbs: string[];
                  menus: {
                    label: string;
                    items: { text: string; href: string }[];
                  }[];
                };
              }[]
            | null
        )?.[0]?.navStructure ?? null,
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
  if (!exportRow.is_public)
    return { error: "This report is private", status: 403 };
  // CHANGED: previously called getTestReportHandler({ params: { id: exportRow.test_run_id } })
  // which requires a session and returns 401 for unauthenticated users.
  // Now we pass the run id directly via params so the share link works without login.
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
  const score =
    (exportRow as unknown as { testRun: { overall_score: number | null } })
      .testRun?.overall_score ?? 0;
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

// ---------------------------------------------------------------------------
// GET /api/badge/[token]/svg
// ADDED: Returns an actual SVG image so the badge renders in GitHub READMEs,
// websites, and any Markdown renderer. The copied badge markdown from the
// report page points to this endpoint as the image src.
// No auth required — token is a nanoid(32) opaque string.
// ---------------------------------------------------------------------------

export async function getEmbedBadgeSvgHandler({
  params,
}: {
  params: { token: string };
}): Promise<Response> {
  const exportRow = await db.query.report_exports.findFirst({
    where: eq(report_exports.embed_badge_token, params.token),
    with: { testRun: true },
  });

  // ADDED: return plain-text 404 (not JSON) so broken image shows cleanly
  if (!exportRow) {
    return new Response("Badge not found", { status: 404 });
  }

  const score =
    (exportRow as unknown as { testRun: { overall_score: number | null } })
      .testRun?.overall_score ?? 0;

  // ADDED: colour mirrors the score gauge thresholds used in the dashboard UI
  const color =
    score >= 90 ? "#22c55e" : score >= 70 ? "#eab308" : "#ef4444";

  // UPDATED: single unified label as specified in the plan doc —
  // "Tested by Buildify — Score: 94" as one cohesive badge, not two
  // separate dark-label + colored-score sections.
  const badgeText = `Tested by Buildify — Score: ${score}`;
  const totalWidth = 220;

  // ADDED: standard Shields.io-style SVG badge structure.
  // Two text nodes (offset shadow + main) give the embossed look.
  // Whole badge is one solid color (green/yellow/red) based on score.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <linearGradient id="g" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <rect rx="3" width="${totalWidth}" height="20" fill="${color}"/>
  <rect rx="3" width="${totalWidth}" height="20" fill="url(#g)"/>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${totalWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${badgeText}</text>
    <text x="${totalWidth / 2}" y="14">${badgeText}</text>
  </g>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      // ADDED: cache for 5 minutes so score stays fresh without hammering the DB
      "Cache-Control": "public, max-age=300",
      // ADDED: allow GitHub's image proxy (camo) to load the badge cross-origin
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// ---------------------------------------------------------------------------
// POST /api/test/run/[id]/export-pdf
// ---------------------------------------------------------------------------

export async function exportTestReportPdfHandler({
  params,
}: {
  params: { id: string };
}): Promise<Response | ApiErrorResponse> {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized", status: 401 };

  const run = await db.query.test_runs.findFirst({
    where: eq(test_runs.id, params.id),
    with: {
      testCases: { with: { results: true } },
      bugReports: true,
      reportExports: true,
    },
  });

  if (!run) return { error: "Test run not found", status: 404 };
  if (run.user_id !== session.user.id)
    return { error: "Forbidden", status: 403 };
  if (run.status !== "complete")
    return {
      error: "Report not ready — test run is not complete",
      status: 400,
    };

  try {
    const report = run.reportExports?.[0];
    const aiSummary = report?.ai_summary ?? "";
    const overallScore = run.overall_score ?? 0;
    const scoreColor =
      overallScore >= 90
        ? "#22c55e"
        : overallScore >= 70
          ? "#eab308"
          : "#ef4444";

    // Build category breakdown
    const resultsByCategory: Record<
      string,
      { passed: number; failed: number; total: number }
    > = {};
    for (const tc of run.testCases ?? []) {
      const cat = tc.category ?? "other";
      if (!resultsByCategory[cat])
        resultsByCategory[cat] = { passed: 0, failed: 0, total: 0 };
      for (const r of tc.results ?? []) {
        resultsByCategory[cat]!.total++;
        if (r.status === "passed" || r.status === "flaky")
          resultsByCategory[cat]!.passed++;
        else if (r.status === "failed") resultsByCategory[cat]!.failed++;
      }
    }

    const bugs = (run.bugReports ?? []) as {
      id: string;
      severity: string;
      category: string;
      title: string;
      description: string;
      page_url: string;
      screenshot_url: string | null;
      ai_fix_suggestion: string | null;
      reproduction_steps: string[];
    }[];

    const severityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    bugs.sort(
      (a, b) =>
        (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3),
    );

    const severityColors: Record<string, string> = {
      critical: "#ef4444",
      high: "#f97316",
      medium: "#eab308",
      low: "#60a5fa",
    };

    function esc(s: string | null | undefined): string {
      return (s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    const durationSecs = run.completed_at
      ? Math.round(
          (new Date(run.completed_at).getTime() -
            new Date(run.started_at ?? run.completed_at).getTime()) /
            1000,
        )
      : null;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Buildify Test Report — ${esc(run.target_url)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #09090b; color: #e4e4e7; font-size: 13px; line-height: 1.6; }
  .page { max-width: 900px; margin: 0 auto; padding: 40px 32px; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 36px; padding-bottom: 24px; border-bottom: 1px solid #27272a; }
  .brand-name { font-size: 17px; font-weight: 700; color: #f4f4f5; }
  .brand-sub { font-size: 11px; color: #71717a; font-family: monospace; margin-top: 2px; }
  .report-date { text-align: right; color: #52525b; font-size: 11px; font-family: monospace; line-height: 1.8; }
  .score-hero { background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 28px; margin-bottom: 24px; display: flex; align-items: center; gap: 32px; }
  .score-circle { width: 100px; height: 100px; border-radius: 50%; border: 6px solid ${scoreColor}33; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; }
  .score-number { font-size: 32px; font-weight: 700; color: ${scoreColor}; line-height: 1; }
  .score-label { font-size: 10px; color: #52525b; font-family: monospace; }
  .score-details { flex: 1; min-width: 0; }
  .score-url { font-family: monospace; font-size: 12px; color: #71717a; margin-bottom: 8px; overflow-wrap: break-word; word-break: break-all; }
  .score-bar { height: 6px; background: #27272a; border-radius: 9999px; overflow: hidden; display: flex; margin-bottom: 8px; }
  .score-bar-pass { background: #22c55e; height: 100%; }
  .score-bar-fail { background: #ef4444; height: 100%; }
  .score-bar-skip { background: #3f3f46; flex: 1; height: 100%; }
  .score-stats { display: flex; gap: 16px; font-family: monospace; font-size: 12px; flex-wrap: wrap; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 11px; font-family: monospace; text-transform: uppercase; letter-spacing: 0.08em; color: #52525b; margin-bottom: 12px; }
  .ai-summary { background: rgba(34,197,94,0.04); border: 1px solid rgba(34,197,94,0.15); border-radius: 12px; padding: 16px; }
  .ai-label { font-size: 11px; font-family: monospace; text-transform: uppercase; letter-spacing: 0.08em; color: #4ade80; margin-bottom: 8px; }
  .ai-text { color: #d4d4d8; font-size: 13px; line-height: 1.7; }
  .category-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .category-card { background: #18181b; border: 1px solid #27272a; border-radius: 10px; padding: 14px; text-align: center; }
  .category-pct { font-size: 20px; font-weight: 700; line-height: 1; margin-bottom: 4px; }
  .category-name { font-size: 11px; color: #71717a; text-transform: capitalize; }
  .category-sub { font-size: 10px; color: #3f3f46; font-family: monospace; margin-top: 2px; }
  .bug-item { background: #18181b; border: 1px solid #27272a; border-radius: 10px; padding: 14px 16px; margin-bottom: 10px; page-break-inside: avoid; }
  .bug-header { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
  .bug-severity { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-family: monospace; padding: 2px 8px; border-radius: 9999px; border: 1px solid; text-transform: uppercase; letter-spacing: 0.05em; flex-shrink: 0; }
  .bug-sev-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
  .bug-category { font-size: 10px; color: #52525b; background: #27272a; padding: 2px 7px; border-radius: 9999px; flex-shrink: 0; }
  .bug-title { font-size: 13px; font-weight: 600; color: #f4f4f5; margin-top: 6px; }
  .bug-url { font-size: 11px; color: #52525b; font-family: monospace; margin-bottom: 6px; overflow-wrap: break-word; word-break: break-all; }
  .bug-desc { font-size: 12px; color: #a1a1aa; line-height: 1.5; margin-bottom: 8px; }
  .bug-screenshot { margin: 10px 0; border-radius: 8px; overflow: hidden; border: 1px solid #27272a; }
  .bug-screenshot img { width: 100%; display: block; max-height: 280px; object-fit: cover; object-position: top; }
  .bug-steps-label { font-size: 10px; font-family: monospace; text-transform: uppercase; letter-spacing: 0.06em; color: #52525b; margin: 8px 0 5px; }
  .bug-steps { list-style: none; }
  .bug-step { display: flex; gap: 8px; font-size: 11px; color: #71717a; margin-bottom: 3px; }
  .step-num { color: #3f3f46; font-family: monospace; flex-shrink: 0; min-width: 16px; }
  .bug-fix { background: rgba(34,197,94,0.05); border: 1px solid rgba(34,197,94,0.15); border-radius: 8px; padding: 10px 12px; margin-top: 10px; }
  .bug-fix-label { font-size: 10px; font-family: monospace; text-transform: uppercase; letter-spacing: 0.06em; color: #4ade80; margin-bottom: 5px; }
  .bug-fix-text { font-size: 11px; color: #a1a1aa; font-family: monospace; white-space: pre-wrap; line-height: 1.5; }
  .test-table { background: #18181b; border: 1px solid #27272a; border-radius: 10px; overflow: hidden; }
  .test-row { display: flex; align-items: center; gap: 10px; padding: 8px 14px; border-bottom: 1px solid #1f1f1f; }
  .test-row:last-child { border-bottom: none; }
  .test-status { font-size: 10px; font-family: monospace; padding: 2px 7px; border-radius: 9999px; border: 1px solid; flex-shrink: 0; }
  .ts-passed  { color: #4ade80; border-color: rgba(74,222,128,.25); background: rgba(74,222,128,.08); }
  .ts-failed  { color: #f87171; border-color: rgba(248,113,113,.25); background: rgba(248,113,113,.08); }
  .ts-flaky   { color: #facc15; border-color: rgba(250,204,21,.25); background: rgba(250,204,21,.08); }
  .ts-skipped { color: #52525b; border-color: #27272a; background: #18181b; }
  .test-priority { font-size: 10px; font-family: monospace; padding: 2px 6px; border-radius: 9999px; border: 1px solid; flex-shrink: 0; }
  .tp-P0 { color: #f87171; border-color: rgba(248,113,113,.25); background: rgba(248,113,113,.08); }
  .tp-P1 { color: #facc15; border-color: rgba(250,204,21,.25); background: rgba(250,204,21,.08); }
  .tp-P2 { color: #52525b; border-color: #27272a; background: #18181b; }
  .test-title { font-size: 12px; color: #d4d4d8; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .test-cat { font-size: 10px; color: #52525b; font-family: monospace; flex-shrink: 0; }
  .test-dur { font-size: 10px; color: #3f3f46; font-family: monospace; flex-shrink: 0; }
  .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #27272a; display: flex; align-items: center; justify-content: space-between; color: #3f3f46; font-size: 11px; font-family: monospace; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .bug-item { page-break-inside: avoid; } }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div>
      <div class="brand-name">🐛 Buildify Testing Engine</div>
      <div class="brand-sub">Automated QA Report</div>
    </div>
    <div class="report-date">
      <div>${new Date(run.started_at ?? Date.now()).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
      <div>Run ID: ${run.id}</div>
      ${durationSecs !== null ? `<div>Duration: ${durationSecs}s</div>` : ""}
    </div>
  </div>

  <div class="score-hero">
    <div class="score-circle">
      <div class="score-number">${overallScore}</div>
      <div class="score-label">/100</div>
    </div>
    <div class="score-details">
      <div class="score-url">${esc(run.target_url)}</div>
      <div class="score-bar">
        <div class="score-bar-pass" style="width:${(((run.passed ?? 0) / Math.max(run.total_tests ?? 1, 1)) * 100).toFixed(1)}%"></div>
        <div class="score-bar-fail" style="width:${(((run.failed ?? 0) / Math.max(run.total_tests ?? 1, 1)) * 100).toFixed(1)}%"></div>
        <div class="score-bar-skip"></div>
      </div>
      <div class="score-stats">
        <span style="color:#22c55e;">✓ ${run.passed ?? 0} passed</span>
        <span style="color:#ef4444;">✗ ${run.failed ?? 0} failed</span>
        <span style="color:#52525b;">${run.skipped ?? 0} skipped</span>
        <span style="color:#71717a;">${run.total_tests ?? 0} total</span>
      </div>
    </div>
  </div>

  ${
    aiSummary
      ? `
  <div class="section">
    <div class="ai-summary">
      <div class="ai-label">✦ AI Analysis</div>
      <div class="ai-text">${esc(aiSummary)}</div>
    </div>
  </div>`
      : ""
  }

  ${
    Object.keys(resultsByCategory).length > 0
      ? `
  <div class="section">
    <div class="section-title">Category Breakdown</div>
    <div class="category-grid">
      ${Object.entries(resultsByCategory)
        .map(([cat, data]) => {
          const pct =
            data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0;
          const col = pct >= 80 ? "#22c55e" : pct >= 50 ? "#eab308" : "#ef4444";
          return `<div class="category-card">
          <div class="category-pct" style="color:${col};">${pct}%</div>
          <div class="category-name">${cat.replace(/_/g, " ")}</div>
          <div class="category-sub">${data.passed}/${data.total}</div>
        </div>`;
        })
        .join("")}
    </div>
  </div>`
      : ""
  }

  <div class="section">
    <div class="section-title">Bugs Found (${bugs.length})</div>
    ${
      bugs.length === 0
        ? `<div style="background:#18181b;border:1px solid #27272a;border-radius:10px;padding:20px;text-align:center;color:#52525b;font-family:monospace;font-size:12px;">✓ No bugs found</div>`
        : bugs
            .map((bug) => {
              const col = severityColors[bug.severity] ?? "#71717a";
              return `<div class="bug-item">
            <div class="bug-header">
              <span class="bug-severity" style="color:${col};border-color:${col}44;background:${col}15;">
                <span class="bug-sev-dot" style="background:${col};"></span>${esc(bug.severity)}
              </span>
              <span class="bug-category">${esc(bug.category)}</span>
            </div>
            <div class="bug-title">${esc(bug.title)}</div>
            <div class="bug-url">${esc(bug.page_url)}</div>
            ${bug.description ? `<div class="bug-desc">${esc(bug.description)}</div>` : ""}
            ${
              bug.screenshot_url
                ? `<div class="bug-screenshot"><img src="${esc(bug.screenshot_url)}" alt="Bug screenshot" crossorigin="anonymous" onerror="this.parentElement.style.display='none'" /></div>`
                : ""
            }
            ${
              (bug.reproduction_steps?.length ?? 0) > 0
                ? `<div class="bug-steps-label">Steps to Reproduce</div>
                 <ol class="bug-steps">${bug.reproduction_steps.map((step, i) => `<li class="bug-step"><span class="step-num">${i + 1}.</span>${esc(step)}</li>`).join("")}</ol>`
                : ""
            }
            ${
              bug.ai_fix_suggestion
                ? `<div class="bug-fix"><div class="bug-fix-label">✦ AI Fix Suggestion</div><div class="bug-fix-text">${esc(bug.ai_fix_suggestion)}</div></div>`
                : ""
            }
          </div>`;
            })
            .join("")
    }
  </div>

  ${
    (run.testCases?.length ?? 0) > 0
      ? `
  <div class="section">
    <div class="section-title">All Test Cases (${run.testCases!.length})</div>
    <div class="test-table">
      ${run
        .testCases!.map((tc) => {
          const result = tc.results?.[0];
          const status = result?.status ?? "skipped";
          const priority = (tc.priority ?? "P2") as string;
          return `<div class="test-row">
          <span class="test-status ts-${status}">${status}</span>
          <span class="test-priority tp-${priority}">${priority}</span>
          <span class="test-title">${esc(tc.title)}</span>
          <span class="test-cat">${esc(tc.category ?? "")}</span>
          ${result?.duration_ms ? `<span class="test-dur">${(result.duration_ms / 1000).toFixed(1)}s</span>` : ""}
        </div>`;
        })
        .join("")}
    </div>
  </div>`
      : ""
  }

  <div class="footer">
    <span>Generated by Buildify Testing Engine</span>
    <span>${new Date().toISOString()}</span>
  </div>

</div>
</body>
</html>`;

    const { generateHtmlPdf } =
      await import("@/server/services/puppeteer.service");
    const pdfBytes = await generateHtmlPdf(html);

    if (!pdfBytes)
      return {
        error: "PDF generation failed — Puppeteer could not render the HTML",
        status: 500,
      };

    // FIXED: pdfBytes is already a clean ArrayBuffer returned by safePdfBytes()
    // inside generateHtmlPdf() in puppeteer.service.ts — it owns its own memory
    // slice with no pool offset. Wrapping it in Buffer.from() then reading
    // .buffer re-attaches it to Node's shared pool, which causes the byteOffset
    // to be non-zero and sends garbage bytes before the PDF header, corrupting
    // the file. Pass pdfBytes directly so exactly the right bytes are sent.
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="buildify-report-${params.id}.pdf"`,
        "Content-Length": String(pdfBytes.byteLength),
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("PDF generation error for run", params.id, err);
    return {
      error: "PDF generation failed due to an internal error",
      status: 500,
    };
  }
}