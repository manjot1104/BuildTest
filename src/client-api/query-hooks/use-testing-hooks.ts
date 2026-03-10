import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TestRun {
  id: string
  status: 'crawling' | 'generating' | 'executing' | 'reporting' | 'complete' | 'failed' | 'cancelled'
  percent: number
  targetUrl: string
  overallScore: number | null
  totalTests: number | null
  passed: number | null
  failed: number | null
  skipped: number | null
  /** Live count of currently-executing tests (from SSE counter events) */
  running: number | null
  startedAt: string
  completedAt: string | null
  aiSummary: string | null
  shareableSlug: string | null
  /** Opaque token used for the "Tested by Buildify" embed badge */
  embedBadgeToken: string | null
}

export interface Bug {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  page_url: string
  screenshot_url: string | null
  /** Bounding box coordinates for the red annotation overlay in Bug Detail Modal */
  annotation_box: { x: number; y: number; width: number; height: number } | null
  ai_fix_suggestion: string | null
  reproduction_steps: string[]
  status: 'open' | 'fixed' | 'ignored'
}

export interface NetworkLogEntry {
  url: string
  method: string
  status: number | null
  error: string | null
  durationMs: number | null
}

export interface TestResult {
  id: string
  status: 'pending' | 'running' | 'passed' | 'failed' | 'flaky' | 'skipped'
  actual_result: string
  error_details: string | null
  duration_ms: number
  retry_count: number
  console_logs: string[]
  /** Network errors captured during test execution — shown in Bug Detail Modal */
  network_logs: NetworkLogEntry[]
}

export interface TestCase {
  id: string
  category: 'navigation' | 'forms' | 'visual' | 'performance' | 'a11y' | 'security'
  title: string
  description: string
  steps: string[]
  expected_result: string
  priority: 'P0' | 'P1' | 'P2'
  tags: string[]
  estimated_duration: number
  results: TestResult[]
}

/** Per-page Core Web Vitals — powers the Performance Gauges dashboard section */
export interface PerformanceGauge {
  pageUrl: string
  lcpMs: number | null
  fidMs: number | null
  cls: number | null
  ttfbMs: number | null
  lcpStatus: 'good' | 'needs-improvement' | 'poor' | 'unknown'
  fidStatus: 'good' | 'needs-improvement' | 'poor' | 'unknown'
  clsStatus: 'good' | 'needs-improvement' | 'poor' | 'unknown'
  ttfbStatus: 'good' | 'needs-improvement' | 'poor' | 'unknown'
}

/** One data point in the score Trend Chart */
export interface TrendDataPoint {
  runId: string
  score: number | null
  date: string
  isCurrent: boolean
}

/** Per-category pass/fail counts — drives the 6 Category Ring Charts */
export interface CategoryResult {
  passed: number
  failed: number
  flaky: number
  total: number
}

export interface TestReport extends TestRun {
  bugs: Bug[]
  bugsByCategory: Record<string, number>
  resultsByCategory: Record<string, CategoryResult>
  crawlSummary: {
    totalPages: number
    crawlTimeMs: number
    screenshots: {
      pageUrl: string
      url375: string | null
      url768: string | null
      url1440: string | null
    }[]
    apiEndpoints: {
      url: string
      method: string
      status: number | null
      responseType: string | null
      durationMs: number | null
    }[]
    navStructure: {
      breadcrumbs: string[]
      menus: {
        label: string
        items: { text: string; href: string }[]
      }[]
    } | null
  }
  isPublic: boolean
  testCases: TestCase[]
  /** Per-page Core Web Vitals for Performance Gauges section */
  performanceGauges: PerformanceGauge[]
  /** Score over time for the same target URL — Trend Chart */
  trendData: TrendDataPoint[]
}

export interface TestHistoryItem {
  id: string
  targetUrl: string
  status: TestRun['status']
  overallScore: number | null
  totalTests: number | null
  passed: number | null
  failed: number | null
  skipped: number | null
  startedAt: string
  completedAt: string | null
  aiSummary: string | null
  shareableSlug: string | null
  embedBadgeToken: string | null
  /** Direct link to the visual report page — /report/:id */
  reportUrl: string
}

// ─── SSE event shapes (mirror of PipelineSSEEvent in tinyfish.service.ts) ────

export type PipelineSSEEvent =
  | { type: 'status'; status: string; percent: number }
  | { type: 'test_update'; testResultId: string; testCaseId: string; title: string; status: TestResult['status']; durationMs?: number }
  | { type: 'counter'; passed: number; failed: number; running: number; skipped: number; total: number }
  | { type: 'bug_found'; bug: { id: string; title: string; severity: string; category: string; pageUrl: string; screenshotUrl: string | null } }
  | { type: 'complete'; overallScore: number; passed: number; failed: number; skipped: number; total: number; aiSummary: string; shareableSlug: string | null }
  | { type: 'error'; message: string }

// ─── Live bug type surfaced by SSE ───────────────────────────────────────────

export interface LiveBug {
  id: string
  title: string
  severity: string
  category: string
  pageUrl: string
  screenshotUrl: string | null
}

// ─── SSE hook state ───────────────────────────────────────────────────────────

export interface SSEState {
  /** Live counter shown in the header during test execution */
  counter: { passed: number; failed: number; running: number; skipped: number; total: number } | null
  /**
   * Per-test card states keyed by testCaseId.
   * Cards start as 'pending', flip to 'running', then 'passed' / 'failed' / 'flaky' in real-time.
   */
  testUpdates: Record<string, { testResultId: string; title: string; status: TestResult['status']; durationMs?: number }>
  /** Bugs surfaced immediately as tests fail — shown as screenshot thumbnails */
  liveBugs: LiveBug[]
  /** 0–100 progress bar value */
  percent: number
  /** Human-readable pipeline phase label */
  pipelineStatus: string
  /** True once the 'complete' event is received */
  isComplete: boolean
  /**
   * True when the server sends the "CANCELLED" sentinel via the error event.
   * Distinct from isError — the UI shows a "cancelled" state, not a failure.
   */
  isCancelled: boolean
  /** Non-null if the stream emitted an 'error' event that is NOT a cancellation */
  errorMessage: string | null
}

const INITIAL_SSE_STATE: SSEState = {
  counter: null,
  testUpdates: {},
  liveBugs: [],
  percent: 0,
  pipelineStatus: 'crawling',
  isComplete: false,
  isCancelled: false,
  errorMessage: null,
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const testingKeys = {
  all: ['testing'] as const,
  history: () => [...testingKeys.all, 'history'] as const,
  run: (id: string) => [...testingKeys.all, 'run', id] as const,
  report: (id: string) => [...testingKeys.all, 'report', id] as const,
  publicReport: (slug: string) => [...testingKeys.all, 'public-report', slug] as const,
  badge: (token: string) => [...testingKeys.all, 'badge', token] as const,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Terminal statuses that should never open an SSE connection */
const TERMINAL_STATUSES = new Set(['complete', 'failed', 'cancelled'])

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Polling fallback for test run status.
 * Prefer useTestRunSSE for real-time streaming.
 */
export function useTestRunStatus(testRunId: string | null) {
  return useQuery({
    queryKey: testingKeys.run(testRunId ?? ''),
    queryFn: async (): Promise<TestRun> => {
      const res = await fetch(`/api/test/run/${testRunId}`)
      if (!res.ok) throw new Error('Failed to fetch test run status')
      return (await res.json()) as TestRun
    },
    enabled: !!testRunId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (!status) return 2500
      if (TERMINAL_STATUSES.has(status)) return false
      return 2500
    },
    staleTime: 0,
    retry: 2,
  })
}

export function useTestReport(testRunId: string | null, enabled = true) {
  return useQuery({
    queryKey: testingKeys.report(testRunId ?? ''),
    queryFn: async (): Promise<TestReport> => {
      const res = await fetch(`/api/test/run/${testRunId}/report`)
      if (!res.ok) throw new Error('Failed to fetch test report')
      return (await res.json()) as TestReport
    },
    enabled: !!testRunId && enabled,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  })
}

export function useTestHistory() {
  return useQuery({
    queryKey: testingKeys.history(),
    queryFn: async (): Promise<TestHistoryItem[]> => {
      const res = await fetch('/api/test/history')
      if (!res.ok) throw new Error('Failed to fetch test history')
      const data = await res.json() as { runs: TestHistoryItem[] }
      return data.runs ?? []
    },
    staleTime: 1000 * 60 * 2,
    retry: 1,
  })
}

/** Public read-only report — no auth required, fetched by shareable slug */
export function usePublicTestReport(slug: string | null) {
  return useQuery({
    queryKey: testingKeys.publicReport(slug ?? ''),
    queryFn: async (): Promise<TestReport> => {
      const res = await fetch(`/api/test/report/public/${slug}`)
      if (!res.ok) throw new Error('Report not found or not public')
      return (await res.json()) as TestReport
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  })
}

/** Embed badge data — fetched by the opaque embedBadgeToken */
export function useEmbedBadge(token: string | null) {
  return useQuery({
    queryKey: testingKeys.badge(token ?? ''),
    queryFn: async (): Promise<{ score: number; label: string; color: string; reportUrl: string | null }> => {
      const res = await fetch(`/api/badge/${token}`)
      if (!res.ok) throw new Error('Badge not found')
      return (await res.json()) as { score: number; label: string; color: string; reportUrl: string | null }
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })
}

// ─── SSE Hook ─────────────────────────────────────────────────────────────────

/**
 * useTestRunSSE
 *
 * Opens an SSE connection to GET /api/test/stream/:id and maintains local
 * state so the UI updates in real-time without any polling.
 *
 * KEY FIX: Takes `initialStatus` and skips opening the SSE connection entirely
 * for terminal statuses (complete / failed / cancelled). This prevents the
 * history panel from accidentally restarting a cancelled pipeline when a user
 * clicks on a past run — the SSE stream would otherwise be opened, the server
 * would see the run isn't "complete/failed" (old check missed "cancelled"), and
 * would spin up a brand-new pipeline.
 *
 * Usage:
 *   const { sseState } = useTestRunSSE(testRunId, run?.status)
 */
export function useTestRunSSE(testRunId: string | null, initialStatus?: string) {
  const queryClient = useQueryClient()
  const [sseState, setSseState] = useState<SSEState>(INITIAL_SSE_STATE)
  const sseStateRef = useRef<SSEState>(INITIAL_SSE_STATE)

  useEffect(() => {
    if (!testRunId) return

    // ── CRITICAL FIX ──────────────────────────────────────────────────────
    // Do NOT open SSE for terminal statuses. When the history panel selects
    // a cancelled or complete run, we just want to display the stored data —
    // not reconnect to the SSE endpoint which would restart the pipeline.
    if (initialStatus && TERMINAL_STATUSES.has(initialStatus)) {
      // Reflect the terminal status in local SSE state immediately so the
      // UI renders the correct panel (cancelled / complete) without waiting.
      const terminalState: SSEState = {
        ...INITIAL_SSE_STATE,
        isComplete: initialStatus === 'complete',
        isCancelled: initialStatus === 'cancelled',
        pipelineStatus: initialStatus,
        percent: initialStatus === 'complete' ? 100 : 0,
      }
      sseStateRef.current = terminalState
      setSseState(terminalState)
      return
    }

    // Reset state whenever testRunId changes (new test run started)
    sseStateRef.current = INITIAL_SSE_STATE
    setSseState(INITIAL_SSE_STATE)

    const es = new EventSource(`/api/test/stream/${testRunId}`)

    es.onmessage = (e: MessageEvent<string>) => {
      let event: PipelineSSEEvent
      try {
        event = JSON.parse(e.data) as PipelineSSEEvent
      } catch {
        return
      }

      const prev = sseStateRef.current
      let next: SSEState = prev

      switch (event.type) {
        case 'status':
          next = { ...prev, percent: event.percent, pipelineStatus: event.status }
          break

        case 'test_update':
          next = {
            ...prev,
            testUpdates: {
              ...prev.testUpdates,
              [event.testCaseId]: {
                testResultId: event.testResultId,
                title: event.title,
                status: event.status,
                durationMs: event.durationMs,
              },
            },
          }
          break

        case 'counter':
          next = {
            ...prev,
            counter: {
              passed: event.passed,
              failed: event.failed,
              running: event.running,
              skipped: event.skipped,
              total: event.total,
            },
          }
          break

        case 'bug_found':
          next = { ...prev, liveBugs: [...prev.liveBugs, event.bug] }
          break

        case 'complete':
          next = {
            ...prev,
            percent: 100,
            pipelineStatus: 'complete',
            isComplete: true,
            isCancelled: false,
            counter: {
              passed: event.passed,
              failed: event.failed,
              running: 0,
              skipped: event.skipped,
              total: event.total,
            },
          }
          es.close()
          void queryClient.invalidateQueries({ queryKey: testingKeys.run(testRunId) })
          void queryClient.invalidateQueries({ queryKey: testingKeys.report(testRunId) })
          void queryClient.invalidateQueries({ queryKey: testingKeys.history() })
          break

        case 'error': {
          // The server sends message "CANCELLED" as a sentinel to distinguish
          // a user-requested cancellation from a real pipeline failure.
          const isCancelled = event.message === 'CANCELLED'
          next = {
            ...prev,
            isCancelled,
            errorMessage: isCancelled ? null : event.message,
            pipelineStatus: isCancelled ? 'cancelled' : 'failed',
          }
          es.close()
          void queryClient.invalidateQueries({ queryKey: testingKeys.run(testRunId) })
          void queryClient.invalidateQueries({ queryKey: testingKeys.history() })
          break
        }
      }

      sseStateRef.current = next
      setSseState(next)
    }

    es.onerror = () => {
      if (sseStateRef.current.isComplete || sseStateRef.current.isCancelled) es.close()
    }

    return () => {
      es.close()
    }
  }, [testRunId, initialStatus, queryClient])

  return { sseState }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useStartTestRun() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { url: string; projectId?: string }): Promise<{ testRunId: string }> => {
      const res = await fetch('/api/test/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await res.json() as { testRunId?: string; error?: string }
      if (!res.ok || !data.testRunId) throw new Error(data.error ?? 'Failed to start test run')
      return { testRunId: data.testRunId }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: testingKeys.history() })
    },
  })
}

/**
 * useCancelTestRun
 *
 * Sends DELETE /api/test/run/:id/cancel to stop a running pipeline.
 * On success:
 *   - Invalidates the run status query (so UI shows "cancelled")
 *   - Invalidates history (so the history panel shows "Cancelled" badge)
 *
 * The server sets the DB status to "cancelled" immediately, then signals
 * the in-memory pipeline to stop at its next checkpoint. TinyFish API calls
 * mid-flight will complete (we can't abort them) but no new ones will start.
 */
export function useCancelTestRun() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (testRunId: string): Promise<{ cancelled: boolean }> => {
      const res = await fetch(`/api/test/run/${testRunId}/cancel`, {
        method: 'DELETE',
      })
      const data = await res.json() as { cancelled?: boolean; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to cancel test run')
      return { cancelled: data.cancelled ?? false }
    },
    onSuccess: (_, testRunId) => {
      void queryClient.invalidateQueries({ queryKey: testingKeys.run(testRunId) })
      void queryClient.invalidateQueries({ queryKey: testingKeys.history() })
    },
  })
}