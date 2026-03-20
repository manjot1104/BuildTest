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
  type TimeoutOverrides, // import for per-run timeout override type
  type CrawlProgressEvent, // import for live crawl progress event type
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
import {
  countTestCasesByRunId,
  countTestRunsTodayByUserId,
  createTestCase,
  deleteTestCase,
  getTestCasesByRunId,
  insertCrawlResult,
  insertPerformanceMetrics,
  insertTestCases,
  updateTestCase,
  updateTestRunCounters,
  updateTestRunStatus,
} from "@/server/db/queries";
// [GITHUB] Import source context fetcher and token guard
import {
  fetchGithubSourceContext,
  getGithubToken,
} from "@/server/services/github.service";

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
// Plan limit helpers
// ---------------------------------------------------------------------------

// Plan IDs match subscriptions.plan_id in schema.ts: "starter" | "pro" | "enterprise"
// No subscription row → null → FREE_PLAN_LIMITS applies.
// These MUST stay in sync with PLAN_LIMITS / FREE_LIMITS in testing.page.tsx.
// The UI enforces soft limits before sending; these are the server-side hard gates.
interface PlanLimits {
  maxPages: number;
  maxTests: number;
  // Maximum test runs allowed per UTC calendar day.
  // Change DAILY_RUN_LIMITS below to adjust per-plan values.
  dailyRuns: number;
  // Maximum concurrent extractions allowed per run.
  // Must stay in sync with PLAN_LIMITS.maxConcurrency in testing.page.tsx.
  maxConcurrency: number;
}

// ---------------------------------------------------------------------------
// Daily run limits — edit these to change per-plan quotas.
// Keys must match subscriptions.plan_id values (lower-cased).
// "free" is the fallback for users with no active subscription.
// ---------------------------------------------------------------------------
const DAILY_RUN_LIMITS: Record<string, number> = {
  free:       2,
  starter:    5,
  pro:        15,
  enterprise: 50,
} as const;

const FREE_PLAN_LIMITS: PlanLimits = { maxPages: 3, maxTests: 5, dailyRuns: DAILY_RUN_LIMITS.free!, maxConcurrency: 3 };

const SERVER_PLAN_LIMITS: Record<string, PlanLimits> = {
  starter:    { maxPages:  5, maxTests: 10, dailyRuns: DAILY_RUN_LIMITS.starter!,    maxConcurrency:  5 },
  pro:        { maxPages: 10, maxTests: 20, dailyRuns: DAILY_RUN_LIMITS.pro!,        maxConcurrency: 10 },
  enterprise: { maxPages: 20, maxTests: 30, dailyRuns: DAILY_RUN_LIMITS.enterprise!, maxConcurrency: 20 },
};

/**
 * Resolves the hard server-side test-generation cap for a given subscription.
 * Called in runPipelineStages to clamp AI-generated case count and in
 * createTestCaseHandler to enforce the add-case ceiling during review.
 * Also used by startTestRunHandler and getTestUsageHandler for the daily limit.
 *
 * @param planId - value of subscriptions.plan_id, or null/undefined for free tier.
 */
function getServerPlanLimits(planId: string | null | undefined): PlanLimits {
  if (!planId) return FREE_PLAN_LIMITS;
  return SERVER_PLAN_LIMITS[planId.toLowerCase()] ?? FREE_PLAN_LIMITS;
}

/**
 * Fetches the active subscription plan_id for a user, or null if none exists.
 * Used by the pipeline and createTestCaseHandler to look up per-plan limits.
 */
async function getUserPlanId(userId: string): Promise<string | null> {
  // Import subscriptions table inline to avoid potential circular module issues
  const { subscriptions } = await import("@/server/db/schema");
  const { and } = await import("drizzle-orm");

  const [sub] = await db
    .select({ plan_id: subscriptions.plan_id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.user_id, userId),
        eq(subscriptions.status, "active"),
      ),
    )
    .limit(1);

  return sub?.plan_id ?? null;
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

// Stores a resolve function for each run that is paused at awaiting_review.
// Calling it with true resumes execution; false cancels.
const reviewResolvers = new Map<string, (confirmed: boolean) => void>();

// crawl_progress event buffer — stores all crawl_progress SSE lines
// emitted so far for each active run.
//
// WHY: The pipeline starts immediately after POST /api/test/run, so Stage 0
// (URL seeding, ~instant) and early Stage 1 events fire before the browser
// even opens the SSE connection. Without a buffer those events are lost and
// the CrawlProgressPanel stays blank even though the server already found URLs.
//
// When a new SSE client connects during the crawling phase, we flush the entire
// buffer to it before attaching as a live listener, giving an instant catch-up.
// The buffer is cleared when the pipeline moves out of the crawling stage
// (i.e. on the first non-crawl "status" event) so it never grows unbounded.
const crawlProgressBuffers = new Map<string, string[]>();

// Execution event buffer — stores the latest test_update line per
// testCaseId plus the latest counter line during the executing/reporting phase.
//
// WHY: Same race as crawl progress — if the user navigates back or the tab
// loses focus and the EventSource reconnects mid-execution, the new client
// gets only the synthetic status+counter snapshot, not the individual
// test_update events that already fired. That means the live execution cards
// are blank even though half the tests have already run.
//
// We store only the LATEST line per testCaseId (keyed as "tc:{id}") and the
// latest counter (keyed as "counter") so the map stays O(numTests) not O(events).
// On reconnect we flush all entries in insertion order to give the client the
// current snapshot of every card.
// The buffer is cleared when the run completes/fails/cancels.
const executionBuffers = new Map<string, Map<string, string>>();

// Helper: upsert a line into the execution buffer keyed by a stable key.
function bufferExecutionLine(testRunId: string, key: string, line: string): void {
  if (!executionBuffers.has(testRunId)) {
    executionBuffers.set(testRunId, new Map());
  }
  executionBuffers.get(testRunId)!.set(key, line);
}

// Helper: flush all buffered execution lines to a newly connected client.
function flushExecutionBuffer(testRunId: string, emit: (line: string) => void): void {
  const buffer = executionBuffers.get(testRunId);
  if (!buffer) return;
  for (const line of buffer.values()) {
    try { emit(line); } catch { /* stream closed */ }
  }
}

// Helper: append a crawl_progress SSE line to the run's crawl buffer.
function bufferCrawlProgressLine(testRunId: string, line: string): void {
  if (!crawlProgressBuffers.has(testRunId)) {
    crawlProgressBuffers.set(testRunId, []);
  }
  crawlProgressBuffers.get(testRunId)!.push(line);
}

// Helper: flush all buffered crawl_progress lines to a single emit function.
// Used when a new SSE client connects mid-crawl so it catches up immediately.
function flushCrawlProgressBuffer(testRunId: string, emit: (line: string) => void): void {
  const buffer = crawlProgressBuffers.get(testRunId);
  if (!buffer) return;
  for (const line of buffer) {
    try { emit(line); } catch { /* stream closed */ }
  }
}

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
  // Auto-buffer crawl_progress lines so late-connecting SSE clients
  // get a full replay of all URLs/pages found before they connected.
  if (line.includes('"crawl_progress"')) {
    bufferCrawlProgressLine(testRunId, line);
  }

  // Auto-buffer test_update lines, keyed by testCaseId so each card
  // is stored only once (latest state). Late-connecting clients get the current
  // status of every test card without missing any that already ran.
  if (line.includes('"test_update"')) {
    // Extract testCaseId from the raw JSON string without a full parse.
    // Format is always: ..."testCaseId":"<id>"...
    const match = /"testCaseId":"([^"]+)"/.exec(line);
    if (match?.[1]) {
      bufferExecutionLine(testRunId, `tc:${match[1]}`, line);
    }
  }

  // Buffer the latest counter line so reconnecting clients see the
  // current passed/failed/running counts immediately.
  if (line.includes('"counter"')) {
    bufferExecutionLine(testRunId, "counter", line);
  }

  // When the pipeline moves past crawling (first status event that is
  // NOT "crawling"), clear the crawl buffer — no longer needed.
  if (line.includes('"status"') && !line.includes('"crawling"')) {
    crawlProgressBuffers.delete(testRunId);
  }

  // When the pipeline completes/fails/cancels, clear the execution
  // buffer — the run is terminal and no new clients need a replay.
  if (
    line.includes('"complete"') ||
    (line.includes('"error"') && (line.includes('"CANCELLED"') || line.includes('"failed"')))
  ) {
    executionBuffers.delete(testRunId);
  }

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

// runPipeline now accepts optional concurrency and timeouts so they
// can be forwarded from the original POST /api/test/run request body all the
// way into crawlSite() and executeTest() inside runPipelineStages().
// [GITHUB] Also accepts optional github owner/repo/branch for source enrichment.
async function runPipeline(
  testRunId: string,
  targetUrl: string,
  userId: string,
  userMaxPages?: number,
  userMaxTests?: number,
  userConcurrency?: number,        
  userTimeouts?: TimeoutOverrides, 
  githubOwner?: string | null,     // [GITHUB]
  githubRepo?: string | null,      // [GITHUB]
  githubBranch?: string | null,    // [GITHUB]
  crawlContext?: string,           // free text crawl hint forwaded to crawl site 
): Promise<void> {
  const abortController = new AbortController();
  crawlAbortControllers.set(testRunId, abortController);

  // Convenience: broadcast an event to all connected SSE clients for this run
  const send = (event: PipelineSSEEvent) =>
    broadcastToRun(testRunId, buildSSELine(event));

  try {
    await runPipelineStages(
      testRunId,
      targetUrl,
      userId,
      send,
      abortController.signal,
      userMaxPages,
      userMaxTests,
      userConcurrency,   
      userTimeouts,      
      githubOwner,       // [GITHUB]
      githubRepo,        // [GITHUB]
      githubBranch,      // [GITHUB]
      crawlContext,      // free text crawl hint forwarded to crawlSite
    );
  } finally {
    crawlAbortControllers.delete(testRunId);
  }
}

// runPipelineStages accepts optional userConcurrency and
// userTimeouts, passes both into crawlSite via CrawlOptions, and passes
// userTimeouts into each executeTest call so test-step timeouts are also
// governed by the user's requested override.
//
// runPipelineStages now passes an onProgress callback into crawlSite.
// When the crawl service fires a CrawlProgressEvent, we wrap it in a
// crawl_progress PipelineSSEEvent and broadcast it to all connected SSE clients.
// This is the only change needed in the controller — the service handles
// all the event logic internally.
//
// [GITHUB] runPipelineStages now fetches GitHub source context (if provided)
// in parallel with crawlSite and injects it into SiteContext before calling
// generateTestCases. The fetch is non-fatal — if it fails for any reason
// (bad token, wrong repo/branch, network error) the pipeline continues
// without source enrichment. No DB writes are made for the GitHub fields.
async function runPipelineStages(
  testRunId: string,
  targetUrl: string,
  userId: string,
  send: (event: PipelineSSEEvent) => void,
  abortSignal: AbortSignal,
  userMaxPages?: number,
  userMaxTests?: number,
  userConcurrency?: number,       
  userTimeouts?: TimeoutOverrides, 
  githubOwner?: string | null,     // [GITHUB]
  githubRepo?: string | null,      // [GITHUB]
  githubBranch?: string | null,    // [GITHUB]
  crawlContext?: string,           // free text crawl hint forwarded to crawlSite
): Promise<void> {
  // ─── STEP 1: CRAWL + GITHUB SOURCE CONTEXT (parallel) ───────────────────
  checkCancelled(testRunId);
  await updateTestRunStatus(testRunId, "crawling");
  send({ type: "status", status: "crawling", percent: 10 });

  // [GITHUB] Fetch source context in parallel with crawlSite.
  // fetchGithubSourceContext already guards internally:
  //   - returns null if userId has no GitHub token (email-only users)
  //   - returns null if repo/branch don't exist or any network error
  // We never block the crawl on this — it races alongside it.
  const githubSourcePromise =
    githubOwner && githubRepo && githubBranch
      ? fetchGithubSourceContext(userId, githubOwner, githubRepo, githubBranch).catch(
          (err) => {
            console.warn("[Pipeline] GitHub source fetch error (non-fatal):", err);
            return null;
          },
        )
      : Promise.resolve(null);

  let siteData: Awaited<ReturnType<typeof crawlSite>>;
  try {
    siteData = await crawlSite(targetUrl, {
      testRunId,
      abortSignal,
      budget: {
        ...(userMaxPages !== undefined && { maxPages: userMaxPages }),
        ...(userMaxTests !== undefined && { maxTests: userMaxTests }),
        // Forward user-requested concurrency into the crawl budget.
        ...(userConcurrency !== undefined && { concurrency: userConcurrency }),
      },
      // Forward user-requested timeout overrides into the crawl call.
      timeouts: userTimeouts,
      // onProgress bridges CrawlProgressEvent from the service layer
      // up to SSE clients by wrapping each event in a crawl_progress envelope.
      // This keeps the service free of SSE/HTTP knowledge while giving the
      // frontend full visibility into every crawl milestone.
      onProgress: (event: CrawlProgressEvent) => {
        send({ type: "crawl_progress", event });
      },
      //Forward the user-supplied crawl context hint so TinyFish can
      // handle authentication barriers and interaction-gated pages.
      crawlContext: crawlContext ?? undefined,
    });
  } catch (err) {
    if (abortSignal.aborted || cancelledPipelines.has(testRunId))
      throw new Error(`CANCELLED:${testRunId}`);
    const msg = `Crawl failed: ${err instanceof Error ? err.message : String(err)}`;
    send({ type: "error", message: msg });
    throw new Error(msg);
  }

  // Await the GitHub source context — it was racing alongside the crawl,
  // so by now it is almost certainly already resolved.
  const githubSourceContext = await githubSourcePromise;

  if (githubSourceContext) {
    console.log(`[Pipeline] GitHub source context loaded: ${githubOwner}/${githubRepo}@${githubBranch}`);
  } else if (githubOwner && githubRepo && githubBranch) {
    console.warn("[Pipeline] GitHub source context unavailable — continuing without it");
  }

  // ─── STEP 2: GENERATE TEST CASES + persist crawl data (parallel) ─────────
  checkCancelled(testRunId);
  await updateTestRunStatus(testRunId, "generating");
  send({ type: "status", status: "generating", percent: 30 });

  // [GITHUB] Inject githubSource into SiteContext so generateTestCases can
  // append real route names, form fields, and validation rules to the AI prompt.
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
    githubSource: githubSourceContext ?? undefined, // [GITHUB]
  };

  // Run AI generation, crawl DB writes, and background screenshots all in parallel
  const [generatedCasesRaw] = await Promise.all([
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

    insertCrawlResult({
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

  // ── Enforce plan-based test-case ceiling ──────────────────────────────────
  // The crawl budget (testBudget.totalTests) already reflects the user's
  // requested maxTests value, which is clamped server-side in
  // startTestRunHandler before the pipeline starts.  However, the AI model
  // (generateTestCases) does not know the exact numeric ceiling — it targets
  // the budget heuristically and may overshoot.
  //
  // We apply two independent caps and take the minimum:
  //   1. testBudget.totalTests — budget from allocateTestBudget, already
  //      hard-capped by HARD_CAPS.MAX_TESTS in tinyfish.service.ts
  //   2. planLimits.maxTests   — per-plan ceiling looked up from the active
  //      subscription, so a free user can never exceed FREE_PLAN_LIMITS.maxTests
  //      even if they tampered the POST /api/test/run request body.
  //
  // Cases are ordered by priority in the AI response, so truncating the tail
  // always drops the lowest-priority ones first.
  const planId = await getUserPlanId(userId);
  const planLimits = getServerPlanLimits(planId);
  const effectiveTestCap = Math.min(
    siteData.testBudget.totalTests,
    planLimits.maxTests,
  );

  const generatedCases =
    generatedCasesRaw.length > effectiveTestCap
      ? generatedCasesRaw.slice(0, effectiveTestCap)
      : generatedCasesRaw;

  if (generatedCasesRaw.length > generatedCases.length) {
    console.log(
      `[Pipeline] Clamped AI output: ${generatedCasesRaw.length} → ${generatedCases.length} cases ` +
        `(plan="${planId ?? "free"}" planMax=${planLimits.maxTests} budgetMax=${siteData.testBudget.totalTests})`,
    );
  }
  // ── End plan-limit enforcement ────────────────────────────────────────────

  // Await stage3 so Puppeteer perf metrics are fully populated before we insert
  await siteData.stage3Promise.catch((err) => {
    console.warn("[Pipeline] stage3 screenshots/perf failed (non-fatal):", err);
  });
  if (siteData.performanceMetrics.length > 0) {
    await insertPerformanceMetrics(
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

  // Persist initial test cases
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

  await insertTestCases(testCaseRecords);
  await db
    .update(test_runs)
    .set({ total_tests: testCaseRecords.length })
    .where(eq(test_runs.id, testRunId));

  // Emit all test cases so the review UI can render them immediately
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

  // ─── STEP 2.5: PAUSE FOR REVIEW ──────────────────────────────────────────
  // Transition to awaiting_review and wait for the user to confirm or cancel.
  checkCancelled(testRunId);
  await updateTestRunStatus(testRunId, "awaiting_review");
  send({ type: "status", status: "awaiting_review", percent: 40 });

  const confirmed = await new Promise<boolean>((resolve) => {
    reviewResolvers.set(testRunId, resolve);
  });
  reviewResolvers.delete(testRunId);

  if (!confirmed) {
    // User cancelled during review
    throw new Error(`CANCELLED:${testRunId}`);
  }

  // Re-fetch test cases in case the user edited/added/deleted during review
  const finalTestCaseRows = await getTestCasesByRunId(testRunId);

  // Update total_tests to reflect any edits made during review
  await db
    .update(test_runs)
    .set({ total_tests: finalTestCaseRows.length })
    .where(eq(test_runs.id, testRunId));

  // ─── STEP 3: EXECUTE ─────────────────────────────────────────────────────
  checkCancelled(testRunId);
  await updateTestRunStatus(testRunId, "executing");
  send({ type: "status", status: "executing", percent: 50 });

  // Emit pending cards for all (possibly-edited) test cases
  for (const row of finalTestCaseRows) {
    send({
      type: "test_update",
      testResultId: "",
      testCaseId: row.id,
      title: row.title ?? "",
      status: "pending",
    });
  }

  // Build execution pairs from DB rows (source of truth after review edits)
  const pairs: { tc: typeof finalTestCaseRows[number]; dbId: string }[] =
    finalTestCaseRows.map((row) => ({ tc: row, dbId: row.id }));

  const counters = {
    passed: 0,
    failed: 0,
    running: 0,
    skipped: 0,
    total: finalTestCaseRows.length,
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
    await updateTestRunCounters(testRunId, { running: counters.running });

    for (const { tc, dbId } of batch) {
      send({
        type: "test_update",
        testResultId: "",
        testCaseId: dbId,
        title: tc.title ?? "",
        status: "running",
      });
    }
    sendCounters();

    await Promise.allSettled(
      batch.map(async ({ tc, dbId }) => {
        const testUrl = (tc as { target_url?: string }).target_url ?? targetUrl;

        // Build goal from DB row fields (steps + expected_result)
        const steps = (tc.steps as string[] | null) ?? [];
        const numberedSteps = steps
          .map((step, i) => `Step ${i + 1}: ${step}`)
          .join("\n");
        const goal = `${numberedSteps}\n\nExpected result: ${tc.expected_result ?? ""}`;

        // Forward userTimeouts into executeTest so per-run timeout
        // overrides apply to individual test-step browser sessions as well.
        let result = await executeTest(testUrl, goal, false, 0, userTimeouts);
        let retryCount = 0;
        let isFlaky = false;

        // Retry up to MAX_TEST_RETRIES times on failure (sourced from tinyfish.service)
        for (
          let attempt = 1;
          attempt <= MAX_TEST_RETRIES && !result.passed;
          attempt++
        ) {
          // Pass userTimeouts into retry calls as well.
          const retryResult = await executeTest(testUrl, goal, false, attempt, userTimeouts);
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
            console.warn(
              `[Testing] Screenshot failed for "${tc.title}":`,
              err,
            );
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

        void updateTestRunCounters(testRunId, {
          passed: counters.passed,
          failed: counters.failed,
          running: counters.running,
        });

        // Emit counter BEFORE test_update so the UI number ticks first
        sendCounters();

        send({
          type: "test_update",
          testResultId,
          testCaseId: dbId,
          title: tc.title ?? "",
          status,
          durationMs: result.durationMs,
        });

        const category =
          (tc as { category?: string | null }).category ?? "other";

        if (!categoryResults[category])
          categoryResults[category] = { passed: 0, failed: 0, total: 0 };
        categoryResults[category]!.total++;
        if (status === "passed" || status === "flaky")
          categoryResults[category]!.passed++;
        else if (status === "failed") categoryResults[category]!.failed++;

        if (status === "failed") {
          const bugId = nanoid();
          const priority =
            (tc as { priority?: string | null }).priority ?? "P2";
          const severity =
            priority === "P0"
              ? "critical"
              : priority === "P1"
                ? "high"
                : "medium";

          failedTestsForSuggestions.push({
            testResultId: bugId,
            ctx: {
              pageUrl: testUrl,
              testTitle: tc.title ?? "",
              category,
              steps,
              actualResult: result.actualResult,
              errorDetails: result.errorDetails,
              expectedResult: tc.expected_result ?? "",
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
            category,
            title: `${tc.title ?? ""} — FAILED`,
            description: result.actualResult,
            reproduction_steps: steps,
            screenshot_url: screenshotUrl,
            annotation_box: null,
            page_url: testUrl,
            status: "open",
          });

          send({
            type: "bug_found",
            bug: {
              id: bugId,
              title: `${tc.title ?? ""} — FAILED`,
              severity,
              category,
              pageUrl: testUrl,
              screenshotUrl,
            },
          });
        }
      }),
    );

    // Count rejected promises as skipped
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

    await updateTestRunCounters(testRunId, {
      passed: counters.passed,
      failed: counters.failed,
      skipped: counters.skipped,
      running: counters.running,
    });

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
  await updateTestRunStatus(testRunId, "reporting");
  send({ type: "status", status: "reporting", percent: 90 });

  const overallScore = calculateScore(
    counters.passed,
    counters.passed + counters.failed + counters.skipped,
  );

  const summaryInput: TestRunSummaryInput = {
    targetUrl,
    overallScore,
    totalTests: finalTestCaseRows.length,
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
    // set to true so share links work out of the box
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
    total: finalTestCaseRows.length,
    aiSummary,
    shareableSlug,
  });
}

// ---------------------------------------------------------------------------
// POST /api/test/run
// ---------------------------------------------------------------------------

// body accepts optional concurrency and timeout overrides
// alongside the maxPages and maxTests. All new fields are optional
// and server-side clamped before reaching crawlSite / executeTest.
// [GITHUB] Also accepts optional githubOwner/githubRepo/githubBranch for
// source code enrichment. All three are stripped server-side if the user
// has no GitHub token — email-only users cannot trigger the source fetch.
export async function startTestRunHandler({
  body,
}: {
  body: {
    url: string;
    projectId?: string;
    maxPages?: number;
    maxTests?: number;
    /** Number of parallel TinyFish extraction calls during Stage 2 crawl. */
    concurrency?: number;
    /** Per-run timeout overrides (milliseconds). Clamped server-side. */
    timeouts?: TimeoutOverrides;
    /** [GITHUB] Optional source repo for test enrichment. e.g. "vercel" */
    githubOwner?: string;
    /** [GITHUB] Optional source repo name. e.g. "next.js" */
    githubRepo?: string;
    /** [GITHUB] Optional branch. e.g. "main" */
    githubBranch?: string;
    /**
     * Optional free-text hint to help the crawler navigate sites that
     * require authentication, cookie acceptance, or other interaction before
     * content is accessible.
     *
     * Examples:
     *   "Login with email test@example.com and password demo1234"
     *   "Click 'Continue as guest' to bypass the signup wall"
     *
     * Sanitised (trimmed, capped at 500 chars) server-side before forwarding.
     */
    crawlContext?: string;
  };
}): Promise<{ testRunId: string } | ApiErrorResponse> {
  try {
    const session = await getSession();
    if (!session?.user?.id) return { error: "Unauthorized", status: 401 };
    const {
      url,
      projectId,
      maxPages,
      maxTests,
      concurrency,
      timeouts,
      githubOwner,
      githubRepo,
      githubBranch,
      crawlContext,
    } = body;
    if (!url) return { error: "URL is required", status: 400 };

    const targetUrl = normaliseUrl(url);
    const testRunId = nanoid();

    // ── Server-side plan limit validation ─────────────────────────────────
    // The UI already clamps values to plan limits before sending (see
    // PLAN_LIMITS / getPlanLimits in testing.page.tsx).  We re-validate here
    // so a tampered request body can never exceed the user's actual plan.
    const planId = await getUserPlanId(session.user.id);
    const planLimits = getServerPlanLimits(planId);

    const effectiveMaxPages = maxPages !== undefined
      ? Math.min(maxPages, planLimits.maxPages)
      : undefined;
    const effectiveMaxTests = maxTests !== undefined
      ? Math.min(maxTests, planLimits.maxTests)
      : undefined;

    if (maxPages !== undefined && maxPages > planLimits.maxPages) {
      console.warn(
        `[Testing] User ${session.user.id} requested maxPages=${maxPages} but plan "${planId ?? "free"}" allows ${planLimits.maxPages} — clamped.`,
      );
    }
    if (maxTests !== undefined && maxTests > planLimits.maxTests) {
      console.warn(
        `[Testing] User ${session.user.id} requested maxTests=${maxTests} but plan "${planId ?? "free"}" allows ${planLimits.maxTests} — clamped.`,
      );
    }

    // ── Daily run limit enforcement ────────────────────────────────────────
    // Count how many runs the user has already started today (UTC calendar day).
    // This is a hard server-side gate — the UI also disables the Run button
    // when the limit is reached (via useTestUsage), but we enforce it here
    // so a crafted request can never bypass the cap.
    const runsToday = await countTestRunsTodayByUserId(session.user.id);
    if (runsToday >= planLimits.dailyRuns) {
      console.warn(
        `[Testing] User ${session.user.id} hit daily run limit: ${runsToday}/${planLimits.dailyRuns} (plan="${planId ?? "free"}").`,
      );
      return {
        error: `Daily limit reached. Your ${planId ?? "free"} plan allows ${planLimits.dailyRuns} test run${planLimits.dailyRuns === 1 ? "" : "s"} per day. Resets at midnight UTC.`,
        status: 429,
      };
    }
    // ── End daily run limit enforcement ───────────────────────────────────

    // ── Concurrency plan limit enforcement ────────────────────────────────
    // Concurrency is now plan-gated (not just hard-capped at 20).
    // We clamp to the plan's maxConcurrency, which is itself always ≤ the
    // absolute hard cap of CONCURRENCY_MAX=20 defined in tinyfish.service.
    // The UI already prevents values above planLimits.maxConcurrency from
    // being submitted, but we enforce it here for tampered requests.
    const CONCURRENCY_MIN = 1;
    const effectiveConcurrency =
      concurrency !== undefined
        ? Math.max(CONCURRENCY_MIN, Math.min(concurrency, planLimits.maxConcurrency))
        : undefined;

    if (concurrency !== undefined && concurrency > planLimits.maxConcurrency) {
      console.warn(
        `[Testing] User ${session.user.id} requested concurrency=${concurrency} but plan "${planId ?? "free"}" allows ${planLimits.maxConcurrency} — clamped to ${effectiveConcurrency}.`,
      );
    } else if (concurrency !== undefined && concurrency < CONCURRENCY_MIN) {
      console.warn(
        `[Testing] User ${session.user.id} requested concurrency=${concurrency} below minimum — clamped to ${CONCURRENCY_MIN}.`,
      );
    }
    // ── End concurrency plan limit enforcement ─────────────────────────────

    // [GITHUB] Strip GitHub fields if the user has no GitHub token.
    // This is the server-side safety net — the UI already hides/disables the
    // panel for email-only users, but a crafted request must never cause an
    // error or silently attempt an unauthenticated GitHub API call.
    const hasGithubToken = !!(await getGithubToken(session.user.id));
    const effectiveGithubOwner  = hasGithubToken ? (githubOwner  ?? null) : null;
    const effectiveGithubRepo   = hasGithubToken ? (githubRepo   ?? null) : null;
    const effectiveGithubBranch = hasGithubToken ? (githubBranch ?? null) : null;

    if ((githubOwner || githubRepo || githubBranch) && !hasGithubToken) {
      console.warn(
        `[Testing] User ${session.user.id} sent GitHub fields but has no token — stripped.`,
      );
    }

    // Sanitise crawlContext server-side (belt-and-suspenders alongside
    // the sanitiseCrawlContext() call inside crawlSite in tinyfish.service.ts).
    // We strip here so the DB insert and logs never receive raw oversized input.
    const effectiveCrawlContext =
      typeof crawlContext === "string" && crawlContext.trim().length > 0
        ? crawlContext.trim().slice(0, 500)
        : undefined;

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

    // Forward (already-clamped) concurrency and timeouts into the pipeline.
    // [GITHUB] Forward (already-guarded) GitHub fields into the pipeline.
    void runPipeline(
      testRunId,
      targetUrl,
      session.user.id,
      effectiveMaxPages,
      effectiveMaxTests,
      effectiveConcurrency,      // now plan-clamped, not just hard-capped
      timeouts,                  // raw from body — resolveTimeouts clamps inside crawlSite/executeTest
      effectiveGithubOwner,      // [GITHUB]
      effectiveGithubRepo,       // [GITHUB]
      effectiveGithubBranch,     // [GITHUB]
      effectiveCrawlContext,    // sanitised crawl context
    )
      .catch(async (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.startsWith("CANCELLED:")) {
          await updateTestRunStatus(
            testRunId,
            "cancelled" as typeof test_runs.$inferInsert.status,
            { completed_at: new Date(), running: 0 },
          );
        } else {
          console.error(`[Testing] Pipeline failed for ${testRunId}:`, err);
          await updateTestRunStatus(testRunId, "failed");
        }
      })
      .finally(() => {
        activePipelines.delete(testRunId);
        cancelledPipelines.delete(testRunId);
        reviewResolvers.delete(testRunId);
        pipelineEmitters.delete(testRunId);
        // Clean up both event buffers so we don't leak memory
        // after the run finishes.
        crawlProgressBuffers.delete(testRunId);
        executionBuffers.delete(testRunId);
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

  // If the run is paused at awaiting_review, emit the current state so a
  // reconnecting client can restore the review UI immediately.
  if (run.status === "awaiting_review") {
    const testCaseRows = await getTestCasesByRunId(params.id);
    const initEvents: string[] = [
      buildSSELine({ type: "status", status: "awaiting_review", percent: 40 }),
      buildSSELine({
        type: "tests_generated",
        testCases: testCaseRows.map((tc) => ({
          id: tc.id,
          title: tc.title ?? "",
          category: tc.category ?? "",
          priority: (tc.priority ?? "P1") as "P0" | "P1" | "P2",
          steps: (tc.steps as string[]) ?? [],
          expected_result: tc.expected_result ?? "",
          target_url: (tc as { target_url?: string }).target_url,
        })),
      } as PipelineSSEEvent),
    ];

    // If there is an active pipeline waiting for review confirmation, attach
    // this client so it also receives the eventual executing/complete events.
    let unregister: (() => void) | null = null;
    const stream = new ReadableStream({
      start(controller) {
        const emit = (line: string) => {
          try {
            controller.enqueue(new TextEncoder().encode(line));
          } catch {
            /* closed */
          }
        };
        // Flush current state immediately
        for (const line of initEvents) emit(line);
        // Attach as live listener for subsequent pipeline events
        unregister = registerEmitter(params.id, emit);
      },
      cancel() {
        unregister?.();
      },
    });

    return new Response(stream, { headers: SSE_HEADERS });
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

            // Replay all buffered crawl_progress events to this client.
            // This handles the common race where the browser opens the SSE
            // connection AFTER the pipeline has already discovered/extracted
            // some URLs. Without this flush the CrawlProgressPanel would be
            // empty until the next crawl_progress event fires live.
            // The flush only sends lines if the run is still in the crawling
            // stage — if it has already moved on the buffer was already cleared.
            if (current.status === "crawling") {
              flushCrawlProgressBuffer(params.id, emit);
            }

            // Replay the latest test_update snapshot for every test card
            // plus the latest counter, so a reconnecting client mid-execution
            // sees all cards with their current status immediately instead of
            // waiting for the next live event to fire.
            if (current.status === "executing" || current.status === "reporting") {
              flushExecutionBuffer(params.id, emit);
            }
          });

        unregister = registerEmitter(params.id, emit);
      } else {
        // Pipeline not running — start it and wire this client as the first emitter.
        // NOTE: when restarting via SSE, we do NOT have user-specified maxPages/maxTests
        // because this path is for reconnecting to an already-persisted run.
        // The original maxPages/maxTests were already applied when POST /test/run was called.
        //  pass run.user_id so re-started pipelines can still derive plan limits.
        // NOTE: concurrency and timeouts are also not available here — the run was
        // already launched with its original settings; we restart without overrides,
        // which will use the crawler's built-in defaults.
        // NOTE: [GITHUB] GitHub fields are also not available on reconnect — source
        // enrichment only runs on the initial pipeline launch via POST /api/test/run.
        console.log(`[Testing] SSE handler starting pipeline for ${params.id}`);
        activePipelines.add(params.id);
        unregister = registerEmitter(params.id, emit);

        void runPipeline(params.id, run.target_url, run.user_id)
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
            await updateTestRunStatus(
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
            reviewResolvers.delete(params.id);
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
            // Clean up both event buffers — safety-net alongside
            // the broadcastToRun auto-clear on complete/error events.
            crawlProgressBuffers.delete(params.id);
            executionBuffers.delete(params.id);
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
        awaiting_review: 40,
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
// GET /api/test/usage  — daily run quota for the authenticated user
// Used by useTestUsage() to render the usage pill in the UI and disable the
// Run button when the limit is reached.
// ---------------------------------------------------------------------------

export async function getTestUsageHandler(): Promise<object | ApiErrorResponse> {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized", status: 401 };

  const planId = await getUserPlanId(session.user.id);
  const planLimits = getServerPlanLimits(planId);
  const runsToday = await countTestRunsTodayByUserId(session.user.id);

  return {
    runsToday,
    dailyLimit: planLimits.dailyRuns,
    planId: planId ?? "free",
  };
}

// ---------------------------------------------------------------------------
// GET /api/test/run/[id]/cases  — list all test cases for review
// ---------------------------------------------------------------------------

export async function getTestCasesHandler({
  params,
}: {
  params: { id: string };
}): Promise<object | ApiErrorResponse> {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized", status: 401 };

  const run = await db.query.test_runs.findFirst({
    where: eq(test_runs.id, params.id),
    columns: { id: true, user_id: true, status: true },
  });
  if (!run) return { error: "Test run not found", status: 404 };
  if (run.user_id !== session.user.id) return { error: "Forbidden", status: 403 };

  const cases = await getTestCasesByRunId(params.id);
  return { testCases: cases };
}

// ---------------------------------------------------------------------------
// POST /api/test/run/[id]/cases  — create a new test case during review
// ---------------------------------------------------------------------------

export async function createTestCaseHandler({
  params,
  body,
}: {
  params: { id: string };
  body: {
    title: string;
    category: string;
    steps: string[];
    expectedResult: string;
    priority?: "P0" | "P1" | "P2";
    description?: string;
    tags?: string[];
  };
}): Promise<object | ApiErrorResponse> {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized", status: 401 };

  const run = await db.query.test_runs.findFirst({
    where: eq(test_runs.id, params.id),
    columns: { id: true, user_id: true, status: true },
  });
  if (!run) return { error: "Test run not found", status: 404 };
  if (run.user_id !== session.user.id) return { error: "Forbidden", status: 403 };
  if (run.status !== "awaiting_review")
    return { error: "Test cases can only be added during review", status: 400 };

  const { title, category, steps, expectedResult, priority, description, tags } =
    body;
  if (!title || !category || !steps?.length || !expectedResult)
    return { error: "title, category, steps, and expectedResult are required", status: 400 };

  // ── Plan limit enforcement during review phase ────────────────────────────
  // The user can add/edit cases during review, but must not exceed their plan's
  // maxTests ceiling.  We re-derive the limit from the live subscription here
  // so this endpoint can never be bypassed via direct API calls.
  const planId = await getUserPlanId(session.user.id);
  const planLimits = getServerPlanLimits(planId);
  const currentCount = await countTestCasesByRunId(params.id);

  if (currentCount >= planLimits.maxTests) {
    return {
      error:
        `Your ${planId ?? "free"} plan allows a maximum of ${planLimits.maxTests} test cases. ` +
        `Delete an existing case before adding a new one, or upgrade your plan.`,
      status: 403,
    };
  }
  // ── End plan limit enforcement ────────────────────────────────────────────

  const newCase = await createTestCase({
    testRunId: params.id,
    title,
    category,
    steps,
    expectedResult,
    priority,
    description,
    tags,
  });

  // Keep total_tests in sync
  const total = await countTestCasesByRunId(params.id);
  await db
    .update(test_runs)
    .set({ total_tests: total })
    .where(eq(test_runs.id, params.id));

  return { testCase: newCase };
}

// ---------------------------------------------------------------------------
// PATCH /api/test/run/[id]/cases/[caseId]  — edit a test case during review
// ---------------------------------------------------------------------------

export async function updateTestCaseHandler({
  params,
  body,
}: {
  params: { id: string; caseId: string };
  body: {
    title?: string;
    category?: string;
    steps?: string[];
    expectedResult?: string;
    priority?: "P0" | "P1" | "P2";
    description?: string;
  };
}): Promise<object | ApiErrorResponse> {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized", status: 401 };

  const run = await db.query.test_runs.findFirst({
    where: eq(test_runs.id, params.id),
    columns: { id: true, user_id: true, status: true },
  });
  if (!run) return { error: "Test run not found", status: 404 };
  if (run.user_id !== session.user.id) return { error: "Forbidden", status: 403 };
  if (run.status !== "awaiting_review")
    return { error: "Test cases can only be edited during review", status: 400 };

  const updated = await updateTestCase(params.caseId, params.id, body);
  if (!updated)
    return { error: "Test case not found or does not belong to this run", status: 404 };

  return { testCase: updated };
}

// ---------------------------------------------------------------------------
// DELETE /api/test/run/[id]/cases/[caseId]  — delete a test case during review
// ---------------------------------------------------------------------------

export async function deleteTestCaseHandler({
  params,
}: {
  params: { id: string; caseId: string };
}): Promise<object | ApiErrorResponse> {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized", status: 401 };

  const run = await db.query.test_runs.findFirst({
    where: eq(test_runs.id, params.id),
    columns: { id: true, user_id: true, status: true },
  });
  if (!run) return { error: "Test run not found", status: 404 };
  if (run.user_id !== session.user.id) return { error: "Forbidden", status: 403 };
  if (run.status !== "awaiting_review")
    return { error: "Test cases can only be deleted during review", status: 400 };

  // Enforce minimum of one test case
  const total = await countTestCasesByRunId(params.id);
  if (total <= 1)
    return {
      error: "Cannot delete the last test case — at least one must remain",
      status: 400,
    };

  await deleteTestCase(params.caseId, params.id);

  // Keep total_tests in sync
  const newTotal = await countTestCasesByRunId(params.id);
  await db
    .update(test_runs)
    .set({ total_tests: newTotal })
    .where(eq(test_runs.id, params.id));

  return { deleted: true };
}

// ---------------------------------------------------------------------------
// POST /api/test/run/[id]/confirm  — confirm review and begin execution
// ---------------------------------------------------------------------------

export async function confirmAndExecuteHandler({
  params,
}: {
  params: { id: string };
}): Promise<{ confirmed: boolean } | ApiErrorResponse> {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized", status: 401 };

  const run = await db.query.test_runs.findFirst({
    where: eq(test_runs.id, params.id),
    columns: { id: true, user_id: true, status: true },
  });
  if (!run) return { error: "Test run not found", status: 404 };
  if (run.user_id !== session.user.id) return { error: "Forbidden", status: 403 };
  if (run.status !== "awaiting_review")
    return { error: "Run is not awaiting review", status: 400 };

  // Final gate: must have at least one test case before executing
  const total = await countTestCasesByRunId(params.id);
  if (total === 0)
    return { error: "Cannot execute — no test cases exist", status: 400 };

  const resolver = reviewResolvers.get(params.id);
  if (!resolver) {
    // Pipeline process may have died or restarted — not currently waiting.
    return { error: "Pipeline is not waiting for review confirmation. Try refreshing.", status: 409 };
  }

  resolver(true);
  return { confirmed: true };
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

  // If paused at review, resolve the promise with false to unblock the pipeline
  const resolver = reviewResolvers.get(params.id);
  if (resolver) resolver(false);

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
    const domContentLoadedMs =
      typeof raw?.domContentLoadedMs === "number"
        ? raw.domContentLoadedMs
        : null;
    const loadEventMs =
      typeof raw?.loadEventMs === "number" ? raw.loadEventMs : null;

    return {
      pageUrl: pm.page_url,
      lcpMs: pm.lcp_ms,
      fidMs: pm.fid_ms,
      cls: pm.cls,
      ttfbMs: pm.ttfb_ms,
      domContentLoadedMs,
      loadEventMs,
      lcpStatus:
        pm.lcp_ms === null
          ? "unknown"
          : pm.lcp_ms < 2500
            ? "good"
            : pm.lcp_ms < 4000
              ? "needs-improvement"
              : "poor",
      clsStatus:
        pm.cls === null
          ? "unknown"
          : pm.cls < 0.1
            ? "good"
            : pm.cls < 0.25
              ? "needs-improvement"
              : "poor",
      ttfbStatus:
        pm.ttfb_ms === null
          ? "unknown"
          : pm.ttfb_ms < 800
            ? "good"
            : pm.ttfb_ms < 1800
              ? "needs-improvement"
              : "poor",
      domContentLoadedStatus:
        domContentLoadedMs === null
          ? "unknown"
          : domContentLoadedMs < 1500
            ? "good"
            : domContentLoadedMs < 3000
              ? "needs-improvement"
              : "poor",
      loadEventStatus:
        loadEventMs === null
          ? "unknown"
          : loadEventMs < 2000
            ? "good"
            : loadEventMs < 4000
              ? "needs-improvement"
              : "poor",
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
  // we pass the run id directly via params so the share link works without login.
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
// Returns an actual SVG image (not JSON).
// This is what the "Copy Badge" button points to as the image src in the
// markdown string: [![Tested by Buildify](.../svg)](report-link).
// IMPORTANT: must be declared AFTER /badge/:token so Elysia doesn't swallow
// "svg" as the token param on the route above. Elysia matches more-specific
// (longer) static segments first, so /badge/:token/svg wins correctly.
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

  // return plain-text 404 (not JSON) so broken image shows cleanly
  if (!exportRow) {
    return new Response("Badge not found", { status: 404 });
  }

  const score =
    (exportRow as unknown as { testRun: { overall_score: number | null } })
      .testRun?.overall_score ?? 0;

  // colour mirrors the score gauge thresholds used in the dashboard UI
  const color =
    score >= 90 ? "#22c55e" : score >= 70 ? "#eab308" : "#ef4444";

  // single unified label as specified in the plan doc —
  // "Tested by Buildify — Score: 94" as one cohesive badge, not two
  // separate dark-label + colored-score sections.
  const badgeText = `Tested by Buildify — Score: ${score}`;
  const totalWidth = 220;

  // standard Shields.io-style SVG badge structure.
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
      // cache for 5 minutes so score stays fresh without hammering the DB
      "Cache-Control": "public, max-age=300",
      // allow GitHub's image proxy (camo) to load the badge cross-origin
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
          const col =
            pct >= 80 ? "#22c55e" : pct >= 50 ? "#eab308" : "#ef4444";
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

    // pdfBytes is already a clean ArrayBuffer returned by safePdfBytes()
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