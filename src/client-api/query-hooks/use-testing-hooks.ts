// src/client-api/query-hooks/use-testing-hooks.ts

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TestRun {
  id: string;
  status:
    | "crawling"
    | "generating"
    | "awaiting_review"
    | "executing"
    | "reporting"
    | "complete"
    | "failed"
    | "cancelled";
  percent: number;
  targetUrl: string;
  overallScore: number | null;
  totalTests: number | null;
  passed: number | null;
  failed: number | null;
  skipped: number | null;
  running: number | null;
  startedAt: string;
  completedAt: string | null;
  aiSummary: string | null;
  shareableSlug: string | null;
  embedBadgeToken: string | null;
}

export interface Bug {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  page_url: string;
  screenshot_url: string | null;
  annotation_box: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  ai_fix_suggestion: string | null;
  reproduction_steps: string[];
  status: "open" | "fixed" | "ignored";
}

export interface NetworkLogEntry {
  url: string;
  method: string;
  status: number | null;
  error: string | null;
  durationMs: number | null;
}

export interface TestResult {
  id: string;
  status: "pending" | "running" | "passed" | "failed" | "flaky" | "skipped";
  actual_result: string;
  error_details: string | null;
  duration_ms: number;
  retry_count: number;
  console_logs: string[];
  network_logs: NetworkLogEntry[];
}

export interface TestCase {
  id: string;
  category:
    | "navigation"
    | "forms"
    | "visual"
    | "performance"
    | "a11y"
    | "security";
  title: string;
  description: string;
  steps: string[];
  expected_result: string;
  priority: "P0" | "P1" | "P2";
  tags: string[];
  estimated_duration: number;
  results: TestResult[];
}

/** Shape returned by GET /api/test/run/:id/cases during the review phase */
export interface ReviewTestCase {
  id: string;
  test_run_id: string;
  category: string | null;
  title: string | null;
  description: string | null;
  steps: string[] | null;
  expected_result: string | null;
  priority: "P0" | "P1" | "P2" | null;
  tags: string[] | null;
  estimated_duration: number | null;
}

export interface PerformanceGauge {
  pageUrl: string;
  lcpMs: number | null;
  fidMs: number | null;
  cls: number | null;
  ttfbMs: number | null;
  domContentLoadedMs: number | null;
  loadEventMs: number | null;
  lcpStatus: "good" | "needs-improvement" | "poor" | "unknown";
  clsStatus: "good" | "needs-improvement" | "poor" | "unknown";
  ttfbStatus: "good" | "needs-improvement" | "poor" | "unknown";
  domContentLoadedStatus: "good" | "needs-improvement" | "poor" | "unknown";
  loadEventStatus: "good" | "needs-improvement" | "poor" | "unknown";
}

export interface TrendDataPoint {
  runId: string;
  score: number | null;
  date: string;
  isCurrent: boolean;
}

export interface CategoryResult {
  passed: number;
  failed: number;
  flaky: number;
  total: number;
}

export interface TestReport extends TestRun {
  bugs: Bug[];
  bugsByCategory: Record<string, number>;
  resultsByCategory: Record<string, CategoryResult>;
  crawlSummary: {
    totalPages: number;
    crawlTimeMs: number;
    screenshots: {
      pageUrl: string;
      url375: string | null;
      url768: string | null;
      url1440: string | null;
    }[];
    apiEndpoints: {
      url: string;
      method: string;
      status: number | null;
      responseType: string | null;
      durationMs: number | null;
    }[];
    navStructure: {
      breadcrumbs: string[];
      menus: { label: string; items: { text: string; href: string }[] }[];
    } | null;
  };
  isPublic: boolean;
  testCases: TestCase[];
  performanceGauges: PerformanceGauge[];
  trendData: TrendDataPoint[];
}

export interface TestHistoryItem {
  id: string;
  targetUrl: string;
  status: TestRun["status"];
  overallScore: number | null;
  totalTests: number | null;
  passed: number | null;
  failed: number | null;
  skipped: number | null;
  startedAt: string;
  completedAt: string | null;
  aiSummary: string | null;
  shareableSlug: string | null;
  embedBadgeToken: string | null;
  reportUrl: string;
}

// ─── Live test case from SSE tests_generated event ───────────────────────────

export interface LiveTestCase {
  id: string;
  title: string;
  category: string;
  priority: string;
  steps: string[];
  expected_result: string;
  target_url: string;
  /** Live execution status, updated by subsequent test_update events */
  status: "pending" | "running" | "passed" | "failed" | "flaky" | "skipped";
  durationMs?: number;
}

// ─── Crawl progress types ─────────────────────────────────────────────
// These mirror the CrawlProgressEvent union in tinyfish.service.ts so the
// frontend has fully typed access to the real-time crawl state.
// We redefine them here (rather than importing from the server module) to keep
// the client bundle free of server-only dependencies.

/** A single URL found during crawling, with its discovery source. */
export interface CrawlFoundUrl {
  url: string;
  /** Where this URL came from: sitemap, static HTML parse, or TinyFish discovery */
  source: "sitemap" | "html" | "discovery";
}

/** A page that was successfully extracted by TinyFish. */
export interface CrawlExtractedPage {
  url: string;
  title: string;
  elementsCount: number;
  formsCount: number;
  linksCount: number;
  /** 1-based position in the extraction queue */
  index: number;
  total: number;
}

/** A page that failed to extract after all retries. */
export interface CrawlFailedPage {
  url: string;
  reason: string;
  index: number;
  total: number;
}

// ─── SSE event shapes ─────────────────────────────────────────────────────────

export type PipelineSSEEvent =
  | { type: "status"; status: string; percent: number }
  | {
      type: "test_update";
      testResultId: string;
      testCaseId: string;
      title: string;
      status: TestResult["status"];
      durationMs?: number;
    }
  | {
      type: "counter";
      passed: number;
      failed: number;
      running: number;
      skipped: number;
      total: number;
    }
  | {
      type: "bug_found";
      bug: {
        id: string;
        title: string;
        severity: string;
        category: string;
        pageUrl: string;
        screenshotUrl: string | null;
      };
    }
  | {
      type: "tests_generated";
      testCases: {
        id: string;
        title: string;
        category: string;
        priority: string;
        steps: string[];
        expected_result: string;
        target_url: string;
      }[];
    }
  | {
      type: "complete";
      overallScore: number;
      passed: number;
      failed: number;
      skipped: number;
      total: number;
      aiSummary: string;
      shareableSlug: string | null;
    }
  | { type: "error"; message: string }
  // crawl_progress wraps one of the four crawl sub-events emitted by
  // tinyfish.service via the onProgress callback. We handle each sub-type in
  // the SSE hook switch below and store the relevant data in SSEState.
  | {
      type: "crawl_progress";
      event:
        | { type: "crawl_stage_change"; stage: string; description: string }
        | { type: "crawl_url_found"; url: string; source: "sitemap" | "html" | "discovery" }
        | { type: "crawl_page_extracted"; url: string; title: string; elementsCount: number; formsCount: number; linksCount: number; index: number; total: number }
        | { type: "crawl_page_failed"; url: string; reason: string; index: number; total: number };
    };

export interface LiveBug {
  id: string;
  title: string;
  severity: string;
  category: string;
  pageUrl: string;
  screenshotUrl: string | null;
}

// ─── SSE hook state ───────────────────────────────────────────────────────────

export interface SSEState {
  counter: {
    passed: number;
    failed: number;
    running: number;
    skipped: number;
    total: number;
  } | null;
  testUpdates: Record<
    string,
    {
      testResultId: string;
      title: string;
      status: TestResult["status"];
      durationMs?: number;
    }
  >;
  /**
   * Full ordered list of test cases received via the `tests_generated` event.
   * Each entry's `status` is updated in-place as `test_update` events arrive.
   * Empty until the generating phase completes.
   * Also populated by a `status: awaiting_review` event via the separate
   * GET /cases fetch so a reconnecting client can restore the review UI.
   */
  generatedTestCases: LiveTestCase[];
  liveBugs: LiveBug[];
  percent: number;
  pipelineStatus: string;
  isComplete: boolean;
  isCancelled: boolean;
  /** True while the run is paused at awaiting_review waiting for user confirmation */
  isAwaitingReview: boolean;
  errorMessage: string | null;

  // ── Crawl progress state ─────────────────────────────────────────
  // These fields are populated by crawl_progress SSE events during the
  // "crawling" pipeline stage and cleared when execution begins.

  /** Current crawl sub-stage label, e.g. "Discovering pages" */
  crawlStage: string | null;
  /** Description of what the current stage is doing */
  crawlStageDescription: string | null;
  /** All URLs found so far during crawling (deduplicated by URL string) */
  crawlFoundUrls: CrawlFoundUrl[];
  /** Pages successfully extracted so far */
  crawlExtractedPages: CrawlExtractedPage[];
  /** Pages that failed to extract (after all retries) */
  crawlFailedPages: CrawlFailedPage[];
}

const INITIAL_SSE_STATE: SSEState = {
  counter: null,
  testUpdates: {},
  generatedTestCases: [],
  liveBugs: [],
  percent: 0,
  pipelineStatus: "crawling",
  isComplete: false,
  isCancelled: false,
  isAwaitingReview: false,
  errorMessage: null,
  // Crawl progress initial values
  crawlStage: null,
  crawlStageDescription: null,
  crawlFoundUrls: [],
  crawlExtractedPages: [],
  crawlFailedPages: [],
};

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const testingKeys = {
  all: ["testing"] as const,
  history: () => [...testingKeys.all, "history"] as const,
  run: (id: string) => [...testingKeys.all, "run", id] as const,
  report: (id: string) => [...testingKeys.all, "report", id] as const,
  publicReport: (slug: string) =>
    [...testingKeys.all, "public-report", slug] as const,
  badge: (token: string) => [...testingKeys.all, "badge", token] as const,
  cases: (runId: string) => [...testingKeys.all, "cases", runId] as const,
  // Daily run quota — fetched by useTestUsage for the usage indicator.
  usage: () => [...testingKeys.all, "usage"] as const,
};

const TERMINAL_STATUSES = new Set(["complete", "failed", "cancelled"]);

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useTestRunStatus(testRunId: string | null) {
  return useQuery({
    queryKey: testingKeys.run(testRunId ?? ""),
    queryFn: async (): Promise<TestRun> => {
      const res = await fetch(`/api/test/run/${testRunId}`);
      if (!res.ok) throw new Error("Failed to fetch test run status");
      return (await res.json()) as TestRun;
    },
    enabled: !!testRunId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return 2500;
      // Don't poll while paused at review — the UI drives transitions via mutations
      if (status === "awaiting_review") return false;
      if (TERMINAL_STATUSES.has(status)) return false;
      return 2500;
    },
    staleTime: 0,
    retry: 2,
  });
}

export function useTestReport(testRunId: string | null, enabled = true) {
  return useQuery({
    queryKey: testingKeys.report(testRunId ?? ""),
    queryFn: async (): Promise<TestReport> => {
      const res = await fetch(`/api/test/run/${testRunId}/report`);
      if (!res.ok) throw new Error("Failed to fetch test report");
      return (await res.json()) as TestReport;
    },
    enabled: !!testRunId && enabled,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });
}

export function useTestHistory() {
  return useQuery({
    queryKey: testingKeys.history(),
    queryFn: async (): Promise<TestHistoryItem[]> => {
      const res = await fetch("/api/test/history");
      if (!res.ok) throw new Error("Failed to fetch test history");
      const data = (await res.json()) as { runs: TestHistoryItem[] };
      return data.runs ?? [];
    },
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });
}

export function usePublicTestReport(slug: string | null) {
  return useQuery({
    queryKey: testingKeys.publicReport(slug ?? ""),
    queryFn: async (): Promise<TestReport> => {
      const res = await fetch(`/api/test/report/public/${slug}`);
      if (!res.ok) throw new Error("Report not found or not public");
      return (await res.json()) as TestReport;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });
}

export function useEmbedBadge(token: string | null) {
  return useQuery({
    queryKey: testingKeys.badge(token ?? ""),
    queryFn: async (): Promise<{
      score: number;
      label: string;
      color: string;
      reportUrl: string | null;
    }> => {
      const res = await fetch(`/api/badge/${token}`);
      if (!res.ok) throw new Error("Badge not found");
      return (await res.json()) as {
        score: number;
        label: string;
        color: string;
        reportUrl: string | null;
      };
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}

/**
 * useReviewTestCases
 *
 * Fetches the current list of test cases for a run that is in the
 * `awaiting_review` state. Automatically disabled for other statuses.
 * Invalidated by create/update/delete mutations so the UI stays in sync.
 */
export function useReviewTestCases(testRunId: string | null, enabled = true) {
  return useQuery({
    queryKey: testingKeys.cases(testRunId ?? ""),
    queryFn: async (): Promise<ReviewTestCase[]> => {
      const res = await fetch(`/api/test/run/${testRunId}/cases`);
      if (!res.ok) throw new Error("Failed to fetch test cases");
      const data = (await res.json()) as { testCases: ReviewTestCase[] };
      return data.testCases ?? [];
    },
    enabled: !!testRunId && enabled,
    staleTime: 0,
    retry: 1,
  });
}

/**
 * useTestUsage
 *
 * Fetches today's run count and daily limit for the authenticated user.
 * Used to render the usage pill near the Run button and disable it when
 * the daily cap is reached. Refetched automatically after a run starts.
 * Polls every 60s while the page is open so the count stays fresh.
 */
export function useTestUsage() {
  return useQuery({
    queryKey: testingKeys.usage(),
    queryFn: async (): Promise<{ runsToday: number; dailyLimit: number; planId: string }> => {
      const res = await fetch("/api/test/usage");
      if (!res.ok) throw new Error("Failed to fetch test usage");
      return (await res.json()) as { runsToday: number; dailyLimit: number; planId: string };
    },
    staleTime: 1000 * 30, // treat as fresh for 30s to avoid redundant fetches
    refetchInterval: 1000 * 60, // background poll every 60s
    retry: 1,
  });
}

// ─── SSE Hook ─────────────────────────────────────────────────────────────────

export function useTestRunSSE(
  testRunId: string | null,
  initialStatus?: string,
) {
  const queryClient = useQueryClient();
  const [sseState, setSseState] = useState<SSEState>(INITIAL_SSE_STATE);
  const sseStateRef = useRef<SSEState>(INITIAL_SSE_STATE);

  useEffect(() => {
    if (!testRunId) return;

    if (initialStatus && TERMINAL_STATUSES.has(initialStatus)) {
      const terminalState: SSEState = {
        ...INITIAL_SSE_STATE,
        isComplete: initialStatus === "complete",
        isCancelled: initialStatus === "cancelled",
        isAwaitingReview: false,
        pipelineStatus: initialStatus,
        percent: initialStatus === "complete" ? 100 : 0,
      };
      sseStateRef.current = terminalState;
      setSseState(terminalState);
      return;
    }

    // If reconnecting to a run already at review, restore that state immediately
    // by pre-seeding isAwaitingReview so the UI doesn't flash a loading state.
    const preseeded = initialStatus === "awaiting_review";

    // When reconnecting mid-execution, pre-seed generatedTestCases from
    // the React Query cache so steps/expected_result are available
    // immediately without waiting for a tests_generated event (which
    // only fires once and won't re-fire on reconnect).
    const isExecuting =
      initialStatus === "executing" || initialStatus === "reporting";

    const cachedCasesOnReconnect = isExecuting
      ? queryClient.getQueryData<ReviewTestCase[]>(
          testingKeys.cases(testRunId),
        )
      : undefined;

    const startState: SSEState = preseeded
      ? {
          ...INITIAL_SSE_STATE,
          pipelineStatus: "awaiting_review",
          percent: 40,
          isAwaitingReview: true,
        }
      : isExecuting && cachedCasesOnReconnect?.length
      ? {
          ...INITIAL_SSE_STATE,
          pipelineStatus: initialStatus ?? "executing",
          percent: initialStatus === "reporting" ? 90 : 50,
          generatedTestCases: cachedCasesOnReconnect.map((tc) => ({
            id: tc.id,
            title: tc.title ?? "",
            category: tc.category ?? "navigation",
            priority: tc.priority ?? "P1",
            steps: (tc.steps as string[]) ?? [],
            expected_result: tc.expected_result ?? "",
            target_url: (tc as { target_url?: string }).target_url ?? "",
            status: "pending" as const,
          })),
        }
      : INITIAL_SSE_STATE;

    sseStateRef.current = startState;
    setSseState(startState);

    const es = new EventSource(`/api/test/stream/${testRunId}`);

    es.onmessage = (e: MessageEvent<string>) => {
      let event: PipelineSSEEvent;
      try {
        event = JSON.parse(e.data) as PipelineSSEEvent;
      } catch {
        return;
      }

      const prev = sseStateRef.current;
      let next: SSEState = prev;

      switch (event.type) {
        case "status": {
          const isReview = event.status === "awaiting_review";
          next = {
            ...prev,
            percent: event.percent,
            pipelineStatus: event.status,
            isAwaitingReview: isReview,
          };
          // When entering review, fetch the cases list so the review UI has data
          if (isReview) {
            void queryClient.invalidateQueries({
              queryKey: testingKeys.cases(testRunId),
            });
          }
          // When leaving review (execution begins), clear the review flag
          if (prev.isAwaitingReview && !isReview) {
            next = { ...next, isAwaitingReview: false };
          }
          break;
        }

        case "tests_generated": {
          // Populate generatedTestCases with all test cases in "pending" state.
          // This is the key event that makes test cards visible before execution.
          const liveCases: LiveTestCase[] = event.testCases.map((tc) => ({
            ...tc,
            status: "pending" as const,
          }));

          // Persist full case data (steps, expected_result, target_url) to the
          // React Query cache so it survives reconnects and allows the
          // test_update upsert path to recover steps/expected_result when
          // generatedTestCases is empty (e.g. page refresh mid-execution).
          queryClient.setQueryData<ReviewTestCase[]>(
            testingKeys.cases(testRunId),
            event.testCases.map((tc) => ({
              id: tc.id,
              test_run_id: testRunId,
              category: tc.category ?? null,
              title: tc.title ?? null,
              description: null,
              steps: tc.steps ?? null,
              expected_result: tc.expected_result ?? null,
              priority: (tc.priority as "P0" | "P1" | "P2") ?? null,
              tags: null,
              estimated_duration: null,
            })),
          );

          next = { ...prev, generatedTestCases: liveCases };
          break;
        }

        case "test_update": {
          // Update testUpdates map (backward compat — used by the report tab)
          const updatedUpdates = {
            ...prev.testUpdates,
            [event.testCaseId]: {
              testResultId: event.testResultId,
              title: event.title,
              status: event.status,
              durationMs: event.durationMs,
            },
          };

          const existingIndex = prev.generatedTestCases.findIndex(
            (tc) => tc.id === event.testCaseId,
          );

          let updatedCases: typeof prev.generatedTestCases;
          if (existingIndex >= 0) {
            // Card already exists — update status and duration in-place
            updatedCases = prev.generatedTestCases.map((tc) =>
              tc.id === event.testCaseId
                ? {
                    ...tc,
                    status: event.status,
                    durationMs: event.durationMs ?? tc.durationMs,
                  }
                : tc,
            );
          } else {
            // Card is new — try to recover full data from the React Query
            // cache (populated by the tests_generated handler above).
            // This fires when generatedTestCases is empty due to a page
            // refresh or reconnect after review confirmed.
            const cachedCases = queryClient.getQueryData<ReviewTestCase[]>(
              testingKeys.cases(testRunId),
            );
            const cached = cachedCases?.find(
              (tc) => tc.id === event.testCaseId,
            );

            const newCard: LiveTestCase = {
              id: event.testCaseId,
              title: cached?.title ?? event.title,
              category: cached?.category ?? "navigation",
              priority: cached?.priority ?? "P1",
              steps: (cached?.steps as string[]) ?? [],
              expected_result: cached?.expected_result ?? "",
              target_url:
                (cached as { target_url?: string } | undefined)
                  ?.target_url ?? "",
              status: event.status,
              durationMs: event.durationMs,
            };
            updatedCases = [...prev.generatedTestCases, newCard];
          }

          next = {
            ...prev,
            testUpdates: updatedUpdates,
            generatedTestCases: updatedCases,
          };
          break;
        }

        case "counter":
          next = {
            ...prev,
            counter: {
              passed: event.passed,
              failed: event.failed,
              running: event.running,
              skipped: event.skipped,
              total: event.total,
            },
          };
          break;

        case "bug_found":
          next = { ...prev, liveBugs: [...prev.liveBugs, event.bug] };
          break;

        case "crawl_progress": {
          const crawlEvent = event.event;
          switch (crawlEvent.type) {
            case "crawl_stage_change":
              next = {
                ...prev,
                crawlStage: crawlEvent.stage,
                crawlStageDescription: crawlEvent.description,
              };
              break;

            case "crawl_url_found": {
              const alreadyFound = prev.crawlFoundUrls.some(
                (u) => u.url === crawlEvent.url,
              );
              if (alreadyFound) {
                next = prev;
              } else {
                next = {
                  ...prev,
                  crawlFoundUrls: [
                    ...prev.crawlFoundUrls,
                    { url: crawlEvent.url, source: crawlEvent.source },
                  ],
                };
              }
              break;
            }

            case "crawl_page_extracted": {
              const existingIdx = prev.crawlExtractedPages.findIndex(
                (p) => p.url === crawlEvent.url,
              );
              const updatedExtracted =
                existingIdx >= 0
                  ? prev.crawlExtractedPages.map((p, i) =>
                      i === existingIdx ? crawlEvent : p,
                    )
                  : [...prev.crawlExtractedPages, crawlEvent];
              next = { ...prev, crawlExtractedPages: updatedExtracted };
              break;
            }

            case "crawl_page_failed": {
              const alreadyFailed = prev.crawlFailedPages.some(
                (p) => p.url === crawlEvent.url,
              );
              next = alreadyFailed
                ? prev
                : {
                    ...prev,
                    crawlFailedPages: [
                      ...prev.crawlFailedPages,
                      crawlEvent,
                    ],
                  };
              break;
            }

            default:
              next = prev;
          }
          break;
        }

        case "complete":
          next = {
            ...prev,
            percent: 100,
            pipelineStatus: "complete",
            isComplete: true,
            isCancelled: false,
            isAwaitingReview: false,
            counter: {
              passed: event.passed,
              failed: event.failed,
              running: 0,
              skipped: event.skipped,
              total: event.total,
            },
          };
          es.close();
          void queryClient.invalidateQueries({
            queryKey: testingKeys.run(testRunId),
          });
          void queryClient.invalidateQueries({
            queryKey: testingKeys.report(testRunId),
          });
          void queryClient.invalidateQueries({
            queryKey: testingKeys.history(),
          });
          break;

        case "error": {
          const isCancelled = event.message === "CANCELLED";
          next = {
            ...prev,
            isCancelled,
            isAwaitingReview: false,
            errorMessage: isCancelled ? null : event.message,
            pipelineStatus: isCancelled ? "cancelled" : "failed",
          };
          es.close();
          void queryClient.invalidateQueries({
            queryKey: testingKeys.run(testRunId),
          });
          void queryClient.invalidateQueries({
            queryKey: testingKeys.history(),
          });
          break;
        }
      }

      sseStateRef.current = next;
      setSseState(next);
    };

    es.onerror = () => {
      if (sseStateRef.current.isComplete || sseStateRef.current.isCancelled)
        es.close();
    };

    return () => {
      es.close();
    };
  }, [testRunId, initialStatus, queryClient]);

  return { sseState };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

// TimeoutOverrides mirrors the server-side interface from
// tinyfish.service.ts so the UI can pass typed timeout values through
// useStartTestRun → POST /api/test/run without manual casting.
export interface TimeoutOverrides {
  /** Discovery TinyFish call timeout in milliseconds (default 300 000). */
  discoveryMs?: number;
  /** Per-page extraction TinyFish call timeout in milliseconds (default 300 000). */
  extractionMs?: number;
  /** Base timeout for a single test-execution TinyFish call in milliseconds (default 300 000). */
  executeTestBaseMs?: number;
}

// mutation input now also accepts optional concurrency, timeouts,
// and [GITHUB] optional github source fields.
// All fields remain optional — omitting them keeps server defaults.
export function useStartTestRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      url: string;
      projectId?: string;
      /** Maximum number of pages to crawl. Omit to use server default. */
      maxPages?: number;
      /** Maximum number of test cases to generate. Omit to use server default. */
      maxTests?: number;
      /**
       * Number of parallel TinyFish extraction calls during Stage 2 crawl.
       * Clamped server-side to [1, 20]. Omit to use server default (5).
       */
      concurrency?: number;
      /**
       * Per-run timeout overrides in milliseconds. Clamped server-side to
       * [30 000, 600 000] per field. Omit individual fields to keep defaults.
       */
      timeouts?: TimeoutOverrides;
      /**
       * [GITHUB] GitHub repo owner for source code analysis (e.g. "vercel").
       * All three github fields must be present for enrichment to apply.
       * Stripped server-side when the user has no GitHub token.
       */
      githubOwner?: string;
      /**
       * [GITHUB] GitHub repo name for source code analysis (e.g. "next.js").
       */
      githubRepo?: string;
      /**
       * [GITHUB] Branch to analyse (e.g. "main").
       */
      githubBranch?: string;
      /**
       * Optional free-text hint to help the crawler navigate sites that
       * require authentication or interaction before content is reachable.
       *
       * Examples:
       *   "Login with email test@example.com password demo1234"
       *   "Click 'Continue as guest' to bypass the signup wall"
       *
       * Sanitised server-side. Max 500 characters.
       */
      crawlContext?: string;
    }): Promise<{ testRunId: string }> => {
      const res = await fetch("/api/test/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await res.json()) as { testRunId?: string; error?: string };
      if (!res.ok || !data.testRunId)
        throw new Error(data.error ?? "Failed to start test run");
      return { testRunId: data.testRunId };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: testingKeys.history() });
      // Invalidate usage so the pill re-fetches after a run is started
      // and reflects the updated count immediately.
      void queryClient.invalidateQueries({ queryKey: testingKeys.usage() });
    },
  });
}

export function useCancelTestRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (testRunId: string): Promise<{ cancelled: boolean }> => {
      const res = await fetch(`/api/test/run/${testRunId}/cancel`, {
        method: "DELETE",
      });
      const data = (await res.json()) as {
        cancelled?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to cancel test run");
      return { cancelled: data.cancelled ?? false };
    },
    onSuccess: (_, testRunId) => {
      void queryClient.invalidateQueries({
        queryKey: testingKeys.run(testRunId),
      });
      void queryClient.invalidateQueries({ queryKey: testingKeys.history() });
    },
  });
}

// ─── useRunFromCases ──────────────────────────────────────────────────────────
// Starts a new test run pre-seeded with caller-supplied test cases.
// The server skips crawling and AI generation and goes straight to
// awaiting_review so the user can confirm (or edit) before execution.
export function useRunFromCases() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      /** Original target URL — locked, cannot be changed. */
      targetUrl: string;
      /** Test cases to pre-seed (from a previous run). */
      cases: {
        title: string;
        category: string;
        steps: string[];
        expected_result: string;
        priority: "P0" | "P1" | "P2";
        description?: string | null;
        tags?: string[] | null;
        estimated_duration?: number | null;
      }[];
    }): Promise<{ testRunId: string }> => {
      const res = await fetch("/api/test/run/from-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await res.json()) as { testRunId?: string; error?: string };
      if (!res.ok || !data.testRunId)
        throw new Error(data.error ?? "Failed to start run from cases");
      return { testRunId: data.testRunId };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: testingKeys.history() });
      void queryClient.invalidateQueries({ queryKey: testingKeys.usage() });
    },
  });
}

// ── Review phase mutations ────────────────────────────────────────────────────

/**
 * useCreateTestCase
 *
 * Adds a new test case during the `awaiting_review` phase.
 * Invalidates the cases list on success so the review UI re-fetches.
 */
export function useCreateTestCase(testRunId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      category: string;
      steps: string[];
      expectedResult: string;
      priority?: "P0" | "P1" | "P2";
      description?: string;
      tags?: string[];
    }): Promise<ReviewTestCase> => {
      const res = await fetch(`/api/test/run/${testRunId}/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await res.json()) as {
        testCase?: ReviewTestCase;
        error?: string;
      };
      if (!res.ok || !data.testCase)
        throw new Error(data.error ?? "Failed to create test case");
      return data.testCase;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: testingKeys.cases(testRunId),
      });
    },
  });
}

/**
 * useUpdateTestCase
 *
 * Edits an existing test case during the `awaiting_review` phase.
 * Uses optimistic updates so the form feels instant.
 */
export function useUpdateTestCase(testRunId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      caseId: string;
      title?: string;
      category?: string;
      steps?: string[];
      expectedResult?: string;
      priority?: "P0" | "P1" | "P2";
      description?: string;
    }): Promise<ReviewTestCase> => {
      const { caseId, ...body } = input;
      const res = await fetch(`/api/test/run/${testRunId}/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        testCase?: ReviewTestCase;
        error?: string;
      };
      if (!res.ok || !data.testCase)
        throw new Error(data.error ?? "Failed to update test case");
      return data.testCase;
    },
    onMutate: async (input) => {
      // Cancel any in-flight refetches so they don't overwrite the optimistic update
      await queryClient.cancelQueries({
        queryKey: testingKeys.cases(testRunId),
      });
      const previous = queryClient.getQueryData<ReviewTestCase[]>(
        testingKeys.cases(testRunId),
      );
      // Optimistically apply the edits
      queryClient.setQueryData<ReviewTestCase[]>(
        testingKeys.cases(testRunId),
        (old) =>
          old?.map((tc) =>
            tc.id === input.caseId
              ? {
                  ...tc,
                  ...(input.title !== undefined && { title: input.title }),
                  ...(input.category !== undefined && {
                    category: input.category,
                  }),
                  ...(input.steps !== undefined && { steps: input.steps }),
                  ...(input.expectedResult !== undefined && {
                    expected_result: input.expectedResult,
                  }),
                  ...(input.priority !== undefined && {
                    priority: input.priority,
                  }),
                  ...(input.description !== undefined && {
                    description: input.description,
                  }),
                }
              : tc,
          ) ?? [],
      );
      return { previous };
    },
    onError: (_err, _input, context) => {
      // Roll back on error
      if (context?.previous) {
        queryClient.setQueryData(
          testingKeys.cases(testRunId),
          context.previous,
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: testingKeys.cases(testRunId),
      });
    },
  });
}

/**
 * useDeleteTestCase
 *
 * Deletes a test case during the `awaiting_review` phase.
 * The server enforces a minimum of 1 — this hook surfaces that as an error.
 * Uses optimistic removal so the card disappears immediately.
 */
export function useDeleteTestCase(testRunId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (caseId: string): Promise<void> => {
      const res = await fetch(`/api/test/run/${testRunId}/cases/${caseId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { deleted?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to delete test case");
    },
    onMutate: async (caseId) => {
      await queryClient.cancelQueries({
        queryKey: testingKeys.cases(testRunId),
      });
      const previous = queryClient.getQueryData<ReviewTestCase[]>(
        testingKeys.cases(testRunId),
      );
      // Optimistically remove the case
      queryClient.setQueryData<ReviewTestCase[]>(
        testingKeys.cases(testRunId),
        (old) => old?.filter((tc) => tc.id !== caseId) ?? [],
      );
      return { previous };
    },
    onError: (_err, _caseId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          testingKeys.cases(testRunId),
          context.previous,
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: testingKeys.cases(testRunId),
      });
    },
  });
}

/**
 * useConfirmAndExecute
 *
 * Confirms the review phase and unblocks the server-side pipeline to begin
 * execution. After a successful call the SSE stream will start emitting
 * `status: executing` and `test_update` events.
 */
export function useConfirmAndExecute(testRunId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ confirmed: boolean }> => {
      const res = await fetch(`/api/test/run/${testRunId}/confirm`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        confirmed?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to confirm test run");
      return { confirmed: data.confirmed ?? false };
    },
    onSuccess: () => {
      // Invalidate the run status so any polling UI picks up the new status
      void queryClient.invalidateQueries({
        queryKey: testingKeys.run(testRunId),
      });
      // Cases list is no longer needed after confirmation
      void queryClient.removeQueries({
        queryKey: testingKeys.cases(testRunId),
      });
    },
  });
}

// ── End review phase mutations ────────────────────────────────────────────────

/**
 * useExportReportPdf
 *
 * Triggers a Puppeteer-based PDF export and auto-downloads the result.
 */
export function useExportReportPdf() {
  return useMutation({
    mutationFn: async (testRunId: string): Promise<void> => {
      const res = await fetch(`/api/test/run/${testRunId}/export-pdf`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "PDF export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `buildify-report-${testRunId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}