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
import { crawlSite, executeTest, MAX_TEST_RETRIES } from "@/server/services/tinyfish.service";
import type { PagePerformanceMetrics, PipelineSSEEvent } from "@/server/services/tinyfish.service";
import {
  generateTestCases,
  generateAISummary,
  type SiteContext,
  type TestRunSummaryInput,
  type TestCase,
} from "@/server/services/openRouter.service";
import type { ApiErrorResponse } from "@/types/api.types";

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

// Emit a single SSE event to the client.
// The controller receives an `emit` callback from the SSE route handler.
function buildSSELine(event: PipelineSSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

// ---------------------------------------------------------------------------
// Build the goal string passed to executeTest.
// Returns ONLY human-readable steps — the service wraps these in its own
// structured prompt so we must NOT add JSON schema instructions here.
// ---------------------------------------------------------------------------

function buildTestGoal(tc: TestCase): string {
  const numberedSteps = tc.steps
    .map((step, i) => `Step ${i + 1}: ${step}`)
    .join("\n");
  return `${numberedSteps}\n\nExpected result: ${tc.expected_result}`;
}

// ---------------------------------------------------------------------------
// Background pipeline
// Accepts an optional `emit` callback for SSE streaming.
// When emit is provided every significant state change pushes an event.
// When emit is null the pipeline runs silently (legacy non-SSE mode).
// ---------------------------------------------------------------------------

async function runPipeline(
  testRunId: string,
  targetUrl: string,
  emit?: (line: string) => void,
): Promise<void> {
  const send = (event: PipelineSSEEvent) => emit?.(buildSSELine(event));

  // ─── STEP 1: CRAWL ───────────────────────────────────────────────────────
  await updateRunStatus(testRunId, "crawling");
  send({ type: "status", status: "crawling", percent: 10 });

  let siteData: Awaited<ReturnType<typeof crawlSite>>;
  try {
    siteData = await crawlSite(targetUrl);
  } catch (err) {
    const msg = `Crawl failed: ${err instanceof Error ? err.message : String(err)}`;
    send({ type: "error", message: msg });
    throw new Error(msg);
  }

  // Store crawl results + performance metrics concurrently
  await Promise.all([
    db.insert(crawl_results).values({
      id: nanoid(),
      test_run_id: testRunId,
      pages: siteData.pages,
      elements: siteData.pages.flatMap((p) => p.elements),
      forms: siteData.pages.flatMap((p) => p.forms),
      links: siteData.allLinks,
      screenshots: [],
      crawl_time_ms: siteData.crawlTimeMs,
    }),
    // Store one performance_metrics row per crawled page
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
  await updateRunStatus(testRunId, "generating");
  send({ type: "status", status: "generating", percent: 30 });

  const siteContext: SiteContext = {
    rootUrl: targetUrl,
    pages: siteData.pages,
    allLinks: siteData.allLinks,
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

  // Emit initial "pending" state for each test card so the UI can render them
  for (let i = 0; i < generatedCases.length; i++) {
    const tc = generatedCases[i]!;
    const dbId = testCaseRecords[i]!.id;
    send({
      type: "test_update",
      testResultId: "",       // not yet created
      testCaseId: dbId,
      title: tc.title,
      status: "pending",
    });
  }

  // ─── STEP 3: EXECUTE ─────────────────────────────────────────────────────
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
    console.log(`[Testing] Batch ${batchIndex + 1}: ${batch.length} tests`);

    // Mark all tests in this batch as "running" before firing them
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

        // Initial attempt
        let result = await executeTest(testUrl, goal);
        let retryCount = 0;
        let isFlaky = false;

        // Retry logic — up to MAX_TEST_RETRIES (2) retries.
        // If it passes on any retry it is marked "flaky" (not "passed"),
        // which prevents false positives from destroying CI trust.
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
          }
        }

        const status = isFlaky ? "flaky" : result.passed ? "passed" : "failed";
        const testResultId = nanoid();

        await db.insert(test_results).values({
          id: testResultId,
          test_case_id: dbId,
          test_run_id: testRunId,
          status,
          actual_result: result.actualResult,
          duration_ms: result.durationMs,
          screenshot_url: result.screenshotUrl,
          error_details: result.errorDetails,
          console_logs: result.consoleLogs,
          // NEW: store network logs for Bug Detail Modal
          network_logs: result.networkLogs,
          retry_count: retryCount,
          // NEW: store TinyFish job ID for traceability
          tinyfish_job_id: result.jobId ?? null,
        });

        // Emit real-time status flip for this test card
        send({
          type: "test_update",
          testResultId,
          testCaseId: dbId,
          title: tc.title,
          status,
          durationMs: result.durationMs,
        });

        // Accumulate category stats for ring charts
        const cat = tc.category;
        if (!categoryResults[cat]) categoryResults[cat] = { passed: 0, failed: 0, total: 0 };
        categoryResults[cat]!.total++;
        if (status === "passed" || status === "flaky") categoryResults[cat]!.passed++;
        else if (status === "failed") categoryResults[cat]!.failed++;

        // Surface failed bugs immediately via SSE
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
            screenshot_url: result.screenshotUrl,
            // annotation_box is null until a screenshot annotation step is added
            annotation_box: null,
            ai_fix_suggestion: null,
            page_url: testUrl,
            status: "open",
          });

          // Emit bug immediately so the dashboard surfaces it in real-time
          send({
            type: "bug_found",
            bug: {
              id: bugId,
              title: `${tc.title} — FAILED`,
              severity: tc.priority === "P0" ? "critical" : tc.priority === "P1" ? "high" : "medium",
              category: tc.category,
              pageUrl: testUrl,
              screenshotUrl: result.screenshotUrl,
            },
          });
        }

        return status;
      }),
    );

    // Tally batch outcomes and update running count
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

    // Persist running totals after each batch so polling clients also stay fresh
    await db
      .update(test_runs)
      .set({
        passed: totalPassed,
        failed: totalFailed,
        skipped: totalSkipped,
        running: totalRunning,
      })
      .where(eq(test_runs.id, testRunId));

    // Emit live counter update
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
    // NEW: pass category results for richer AI summary
    categoryResults,
    // NEW: pass performance data so AI can call out slow pages
    performanceSummary: siteData.performanceMetrics.map((pm: PagePerformanceMetrics) => ({
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
    aiSummary = `Test run complete. Score: ${overallScore}/100. ${totalPassed} passed, ${totalFailed} failed.`;
  }

  // Generate a unique token for the embed badge endpoint (/api/badge/[token])
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

  // Final SSE event — client transitions to the report view
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
// POST /api/test/start
// Creates the test_run row and fires the pipeline in the background.
// Returns the testRunId immediately so the client can open the SSE stream.
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

    void runPipeline(testRunId, targetUrl).catch(async (err) => {
      console.error(`[Testing] Pipeline failed for ${testRunId}:`, err);
      await updateRunStatus(testRunId, "failed");
    });

    return { testRunId };
  } catch (err) {
    console.error("Error in startTestRunHandler:", err);
    return { error: "Internal server error", status: 500 };
  }
}

// ---------------------------------------------------------------------------
// GET /api/test/stream/[id]  (Server-Sent Events)
// The route handler sets up the SSE response and passes the emit callback
// into the pipeline. This function is called by the Next.js route handler.
//
// Usage in route file:
//   export async function GET(req: Request, { params }: { params: { id: string } }) {
//     return streamTestRunHandler({ params });
//   }
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

  // Verify the run exists and belongs to this user before streaming
  const run = await db.query.test_runs.findFirst({
    where: eq(test_runs.id, params.id),
  });

  if (!run) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  if (run.user_id !== session.user.id) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });

  // If the run is already complete/failed, stream a single synthetic event and close.
  if (run.status === "complete" || run.status === "failed") {
    const report = await db.query.report_exports.findFirst({
      where: eq(report_exports.test_run_id, params.id),
    });
    const event: PipelineSSEEvent = run.status === "complete"
      ? {
          type: "complete",
          overallScore: run.overall_score ?? 0,
          passed: run.passed ?? 0,
          failed: run.failed ?? 0,
          skipped: run.skipped ?? 0,
          total: run.total_tests ?? 0,
          aiSummary: report?.ai_summary ?? "",
          shareableSlug: report?.shareable_slug ?? null,
        }
      : { type: "error", message: "Test run failed" };

    const body = buildSSELine(event);
    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Live run — pipe pipeline events to the client
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

  // Fire the pipeline; when done, close the SSE stream.
  void runPipeline(params.id, run.target_url, emitToStream)
    .catch((err) => {
      console.error(`[Testing] SSE pipeline failed for ${params.id}:`, err);
      emitToStream(buildSSELine({ type: "error", message: String(err) }));
    })
    .finally(() => {
      closeStream();
    });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable Nginx buffering for SSE
    },
  });
}

// ---------------------------------------------------------------------------
// GET /api/test/[id]
// Polling fallback — returns current run state (no SSE required).
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
  };

  return {
    id: run.id,
    status: run.status,
    percent: progressMap[run.status],
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
// GET /api/test/history
// Returns past test runs for the authenticated user.
// Includes a direct link to each run's full report for the history table.
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
      // Direct URL to the full visual report for this run
      reportUrl: `/report/${run.id}`,
    })),
  };
}

// ---------------------------------------------------------------------------
// GET /api/test/report/[id]
// Full visual report data — all sections of the dashboard.
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
      // NEW: include per-page Core Web Vitals for Performance Gauges section
      performanceMetrics: true,
    },
  });

  if (!run) return { error: "Test run not found", status: 404 };
  if (run.user_id !== session.user.id) return { error: "Forbidden", status: 403 };

  // ── Category ring chart data (6 donuts) ──────────────────────────────────
  // Each category accumulates pass/fail counts from its test results.
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

  // ── Bug list data (sortable table) ───────────────────────────────────────
  const bugsByCategory = run.bugReports.reduce(
    (acc, bug) => {
      const cat = bug.category ?? "other";
      acc[cat] = (acc[cat] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // ── Performance Gauges ───────────────────────────────────────────────────
  // Map raw DB rows into the shape the frontend Performance Gauges component expects.
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
      // Threshold helpers — frontend uses these to colour the gauge
      lcpStatus: pm.lcp_ms === null ? "unknown" : pm.lcp_ms < 2500 ? "good" : pm.lcp_ms < 4000 ? "needs-improvement" : "poor",
      fidStatus: pm.fid_ms === null ? "unknown" : pm.fid_ms < 100 ? "good" : pm.fid_ms < 300 ? "needs-improvement" : "poor",
      clsStatus: pm.cls === null ? "unknown" : pm.cls < 0.1 ? "good" : pm.cls < 0.25 ? "needs-improvement" : "poor",
      ttfbStatus: pm.ttfb_ms === null ? "unknown" : pm.ttfb_ms < 800 ? "good" : pm.ttfb_ms < 1800 ? "needs-improvement" : "poor",
    }),
  );

  // ── Trend data ────────────────────────────────────────────────────────────
  // Previous runs for the same target URL (up to 10) for the Trend Chart.
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
      // Mark the current run in the trend chart
      isCurrent: r.id === run.id,
    }))
    .reverse(); // chronological order for the chart

  const export0 = run.reportExports?.[0];

  return {
    id: run.id,
    targetUrl: run.target_url,
    status: run.status,
    // Score Hero
    overallScore: run.overall_score,
    totalTests: run.total_tests,
    passed: run.passed,
    failed: run.failed,
    skipped: run.skipped,
    startedAt: run.started_at,
    completedAt: run.completed_at,
    // Report export meta
    aiSummary: export0?.ai_summary ?? null,
    shareableSlug: export0?.shareable_slug ?? null,
    isPublic: export0?.is_public ?? false,
    embedBadgeToken: export0?.embed_badge_token ?? null,
    // Bug list table
    bugs: run.bugReports,
    bugsByCategory,
    // Category ring charts
    resultsByCategory,
    // Test cases (for drill-down)
    testCases: run.testCases,
    // Crawl meta
    crawlSummary: {
      totalPages: (run.crawlResult?.pages as unknown[])?.length ?? 0,
      crawlTimeMs: run.crawlResult?.crawl_time_ms ?? 0,
    },
    // Performance Gauges section
    performanceGauges,
    // Trend Chart section
    trendData,
  };
}

// ---------------------------------------------------------------------------
// GET /api/test/report/public/[slug]
// Public read-only report — no auth required.
// Only returns data if is_public = true on the report_export row.
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

  // Delegate to the full report handler — reuse all the aggregation logic
  return getTestReportHandler({ params: { id: exportRow.test_run_id } });
}

// ---------------------------------------------------------------------------
// GET /api/badge/[token]
// Returns SVG badge data for README/website embeds.
// Shape: { score: number, label: "Tested by Buildify", color: string }
// The SVG is rendered by the route handler, not here.
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