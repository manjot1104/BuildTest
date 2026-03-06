// src/server/api/controllers/testing.controller.ts
//
// Follows the same pattern as payment.controller.ts
// - Auth via getSession()
// - Business logic + DB writes inline
// - Calls tinyfish.service.ts and openrouter.service.ts for external API work
// - No separate pipeline service

import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";
import {
  test_runs,
  crawl_results,
  test_cases,
  test_results,
  bug_reports,
  report_exports,
} from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { crawlSite, executeTest } from "@/server/services/tinyfish.service";
import {
  generateTestCases,
  generateAISummary,
  type SiteContext,
  type TestRunSummaryInput,
} from "@/server/services/openRouter.service";
import type { ApiErrorResponse } from "@/types/api.types";
import { tr } from "date-fns/locale";

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

// ---------------------------------------------------------------------------
// Background pipeline (fired from startTestRunHandler, not awaited)
// ---------------------------------------------------------------------------

async function runPipeline(testRunId: string, targetUrl: string): Promise<void> {
  // STEP 1: CRAWL
  await updateRunStatus(testRunId, "crawling");

  let siteData: Awaited<ReturnType<typeof crawlSite>>;
  try {
    siteData = await crawlSite(targetUrl);
  } catch (err) {
    throw new Error(`Crawl failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  await db.insert(crawl_results).values({
    id: nanoid(),
    test_run_id: testRunId,
    pages: siteData.pages,
    elements: siteData.pages.flatMap((p) => p.elements),
    forms: siteData.pages.flatMap((p) => p.forms),
    links: siteData.allLinks,
    screenshots: [],
    crawl_time_ms: siteData.crawlTimeMs,
  });

  // STEP 2: GENERATE
  await updateRunStatus(testRunId, "generating");

  const siteContext: SiteContext = {
    rootUrl: targetUrl,
    pages: siteData.pages,
    allLinks: siteData.allLinks,
  };

  let generatedCases: Awaited<ReturnType<typeof generateTestCases>>;
  try {
    generatedCases = await generateTestCases(siteContext);
  } catch (err) {
    throw new Error(`Generation failed: ${err instanceof Error ? err.message : String(err)}`);
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

  // STEP 3: EXECUTE
  await updateRunStatus(testRunId, "executing");

  const pairs = generatedCases.map((tc, i) => ({
    tc,
    dbId: testCaseRecords[i]!.id,
  }));

  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  const bugsToInsert: (typeof bug_reports.$inferInsert)[] = [];

  for (const [batchIndex, batch] of chunk(pairs, 50).entries()) {
    console.log(`[Testing] Batch ${batchIndex + 1}: ${batch.length} tests`);

    const batchResults = await Promise.allSettled(
      batch.map(async ({ tc, dbId }) => {
        const goal = `${tc.steps.join("\n")}\n\nExpected: ${tc.expected_result}`;
        let result = await executeTest(tc.target_url, goal);

        let retryCount = 0;
        let isFlaky = false;

        if (!result.passed) {
          for (let retry = 1; retry <= 2; retry++) {
            const retryResult = await executeTest(tc.target_url, goal);
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
          retry_count: retryCount,
        });

        if (status === "failed") {
          bugsToInsert.push({
            id: nanoid(),
            test_run_id: testRunId,
            test_result_id: testResultId,
            severity:
              tc.priority === "P0"
                ? "critical"
                : tc.priority === "P1"
                  ? "high"
                  : "medium",
            category: tc.category,
            title: `${tc.title} — FAILED`,
            description: result.actualResult,
            reproduction_steps: tc.steps,
            screenshot_url: result.screenshotUrl,
            ai_fix_suggestion: null,
            page_url: tc.target_url,
            status: "open",
          });
        }

        return status;
      }),
    );

    for (const outcome of batchResults) {
      if (outcome.status === "fulfilled") {
        if (outcome.value === "passed" || outcome.value === "flaky") totalPassed++;
        else totalFailed++;
      } else {
        totalSkipped++;
      }
    }

    // Update live counters after every batch
    await db
      .update(test_runs)
      .set({ passed: totalPassed, failed: totalFailed, skipped: totalSkipped })
      .where(eq(test_runs.id, testRunId));
  }

  if (bugsToInsert.length > 0) {
    await db.insert(bug_reports).values(bugsToInsert);
  }

  // STEP 4: REPORT
  await updateRunStatus(testRunId, "reporting");

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
  };

  let aiSummary = "";
  try {
    aiSummary = await generateAISummary(summaryInput);
  } catch {
    aiSummary = `Test run complete. Score: ${overallScore}/100. ${totalPassed} passed, ${totalFailed} failed.`;
  }

  await db.insert(report_exports).values({
    id: nanoid(),
    test_run_id: testRunId,
    format: "json",
    file_url: null,
    ai_summary: aiSummary,
    shareable_slug: nanoid(10),
    is_public: false,
  });

  await db
    .update(test_runs)
    .set({
      status: "complete",
      overall_score: overallScore,
      passed: totalPassed,
      failed: totalFailed,
      skipped: totalSkipped,
      completed_at: new Date(),
    })
    .where(eq(test_runs.id, testRunId));
}

// ---------------------------------------------------------------------------
// Handlers (called from elysia.ts routes)
// ---------------------------------------------------------------------------

/**
 * Start a new test run
 * POST /api/test/run
 */
export async function startTestRunHandler({
  body,
}: {
  body: { url: string; projectId?: string };
}): Promise<{ testRunId: string } | ApiErrorResponse> {
  try {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401 };
  }

  const { url, projectId } = body;
  if (!url) {
    return { error: "URL is required", status: 400 };
  }

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
  });

  // Fire and forget — client polls for status
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

/**
 * Get test run status + results
 * GET /api/test/run/:id
 */
export async function getTestRunHandler({
  params,
}: {
  params: { id: string };
}): Promise<object | ApiErrorResponse> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401 };
  }

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
    startedAt: run.started_at,
    completedAt: run.completed_at,
    aiSummary: run.reportExports?.[0]?.ai_summary ?? null,
    shareableSlug: run.reportExports?.[0]?.shareable_slug ?? null,
    bugs: run.bugReports ?? [],
  };
}

/**
 * Get test history for the current user
 * GET /api/test/history
 */
export async function getTestHistoryHandler(): Promise<
  object | ApiErrorResponse
> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401 };
  }

  const runs = await db.query.test_runs.findMany({
    where: eq(test_runs.user_id, session.user.id),
    orderBy: [desc(test_runs.started_at)],
    with: {
      reportExports: true,
    },
    limit: 20,
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
      startedAt: run.started_at,
      completedAt: run.completed_at,
      aiSummary: run.reportExports?.[0]?.ai_summary ?? null,
      shareableSlug: run.reportExports?.[0]?.shareable_slug ?? null,
    })),
  };
}

/**
 * Get full report with all test results and bugs
 * GET /api/test/run/:id/report
 */
export async function getTestReportHandler({
  params,
}: {
  params: { id: string };
}): Promise<object | ApiErrorResponse> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401 };
  }

  const run = await db.query.test_runs.findFirst({
    where: eq(test_runs.id, params.id),
    with: {
      testCases: {
        with: { results: true },
      },
      bugReports: true,
      reportExports: true,
      crawlResult: true,
    },
  });

  if (!run) return { error: "Test run not found", status: 404 };
  if (run.user_id !== session.user.id) return { error: "Forbidden", status: 403 };

  // Group bugs by category for the dashboard ring charts
  const bugsByCategory = run.bugReports.reduce(
    (acc, bug) => {
      const cat = bug.category ?? "other";
      acc[cat] = (acc[cat] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Group test results by category
  const resultsByCategory = run.testCases.reduce(
    (acc, tc) => {
      const cat = tc.category ?? "other";
      if (!acc[cat]) acc[cat] = { passed: 0, failed: 0, total: 0 };
      for (const result of tc.results) {
        acc[cat]!.total++;
        if (result.status === "passed" || result.status === "flaky") acc[cat]!.passed++;
        else if (result.status === "failed") acc[cat]!.failed++;
      }
      return acc;
    },
    {} as Record<string, { passed: number; failed: number; total: number }>,
  );

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
    aiSummary: run.reportExports?.[0]?.ai_summary ?? null,
    shareableSlug: run.reportExports?.[0]?.shareable_slug ?? null,
    isPublic: run.reportExports?.[0]?.is_public ?? false,
    bugs: run.bugReports,
    bugsByCategory,
    resultsByCategory,
    testCases: run.testCases,
    crawlSummary: {
      totalPages: (run.crawlResult?.pages as unknown[])?.length ?? 0,
      crawlTimeMs: run.crawlResult?.crawl_time_ms ?? 0,
    },
  };
}