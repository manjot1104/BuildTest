// src/client-api/query-hooks/use-testing-hooks.ts
// Key additions:
//   - `tests_generated` SSE event: populates `generatedTestCases` so the UI
//     can show all test cases as "pending" cards immediately after generation.
//   - `SSEState.generatedTestCases`: ordered list of test cases with live status.
//   - CHANGED: `useStartTestRun` mutation input now accepts optional `maxPages`
//     and `maxTests` so users can control the crawl/test budget from the UI.

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
  running: number | null
  startedAt: string
  completedAt: string | null
  aiSummary: string | null
  shareableSlug: string | null
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

export interface PerformanceGauge {
  pageUrl: string
  lcpMs: number | null
  fidMs: number | null          // kept for schema compat, always null in practice
  cls: number | null
  ttfbMs: number | null
  domContentLoadedMs: number | null
  loadEventMs: number | null
  lcpStatus: 'good' | 'needs-improvement' | 'poor' | 'unknown'
  clsStatus: 'good' | 'needs-improvement' | 'poor' | 'unknown'
  ttfbStatus: 'good' | 'needs-improvement' | 'poor' | 'unknown'
  domContentLoadedStatus: 'good' | 'needs-improvement' | 'poor' | 'unknown'
  loadEventStatus: 'good' | 'needs-improvement' | 'poor' | 'unknown'
  // fidStatus intentionally removed — FID can't be measured by Puppeteer
}

export interface TrendDataPoint {
  runId: string
  score: number | null
  date: string
  isCurrent: boolean
}

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
    screenshots: { pageUrl: string; url375: string | null; url768: string | null; url1440: string | null }[]
    apiEndpoints: { url: string; method: string; status: number | null; responseType: string | null; durationMs: number | null }[]
    navStructure: { breadcrumbs: string[]; menus: { label: string; items: { text: string; href: string }[] }[] } | null
  }
  isPublic: boolean
  testCases: TestCase[]
  performanceGauges: PerformanceGauge[]
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
  reportUrl: string
}

// ─── Live test case from SSE tests_generated event ───────────────────────────

/**
 * A test case surfaced by the `tests_generated` SSE event.
 * Shown as a live card during the executing phase before the full report loads.
 */
export interface LiveTestCase {
  id: string
  title: string
  category: string
  priority: string
  steps: string[]
  expected_result: string
  target_url: string
  /** Live execution status, updated by subsequent test_update events */
  status: 'pending' | 'running' | 'passed' | 'failed' | 'flaky' | 'skipped'
  durationMs?: number
}

// ─── SSE event shapes ─────────────────────────────────────────────────────────

export type PipelineSSEEvent =
  | { type: 'status'; status: string; percent: number }
  | { type: 'test_update'; testResultId: string; testCaseId: string; title: string; status: TestResult['status']; durationMs?: number }
  | { type: 'counter'; passed: number; failed: number; running: number; skipped: number; total: number }
  | { type: 'bug_found'; bug: { id: string; title: string; severity: string; category: string; pageUrl: string; screenshotUrl: string | null } }
  | {
      type: 'tests_generated';
      testCases: { id: string; title: string; category: string; priority: string; steps: string[]; expected_result: string; target_url: string }[]
    }
  | { type: 'complete'; overallScore: number; passed: number; failed: number; skipped: number; total: number; aiSummary: string; shareableSlug: string | null }
  | { type: 'error'; message: string }

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
  counter: { passed: number; failed: number; running: number; skipped: number; total: number } | null
  testUpdates: Record<string, { testResultId: string; title: string; status: TestResult['status']; durationMs?: number }>
  /**
   * Full ordered list of test cases received via the `tests_generated` event.
   * Each entry's `status` is updated in-place as `test_update` events arrive.
   * Empty until the generating phase completes.
   */
  generatedTestCases: LiveTestCase[]
  liveBugs: LiveBug[]
  percent: number
  pipelineStatus: string
  isComplete: boolean
  isCancelled: boolean
  errorMessage: string | null
}

const INITIAL_SSE_STATE: SSEState = {
  counter: null,
  testUpdates: {},
  generatedTestCases: [],
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

const TERMINAL_STATUSES = new Set(['complete', 'failed', 'cancelled'])

// ─── Queries ──────────────────────────────────────────────────────────────────

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

export function useTestRunSSE(testRunId: string | null, initialStatus?: string) {
  const queryClient = useQueryClient()
  const [sseState, setSseState] = useState<SSEState>(INITIAL_SSE_STATE)
  const sseStateRef = useRef<SSEState>(INITIAL_SSE_STATE)

  useEffect(() => {
    if (!testRunId) return

    if (initialStatus && TERMINAL_STATUSES.has(initialStatus)) {
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

    sseStateRef.current = INITIAL_SSE_STATE
    setSseState(INITIAL_SSE_STATE)

    const es = new EventSource(`/api/test/stream/${testRunId}`)

    es.onmessage = (e: MessageEvent<string>) => {
      let event: PipelineSSEEvent
      try { event = JSON.parse(e.data) as PipelineSSEEvent }
      catch { return }

      const prev = sseStateRef.current
      let next: SSEState = prev

      switch (event.type) {
        case 'status':
          next = { ...prev, percent: event.percent, pipelineStatus: event.status }
          break

        case 'tests_generated': {
          // Populate generatedTestCases with all test cases in "pending" state.
          // This is the key event that makes test cards visible before execution.
          const liveCases: LiveTestCase[] = event.testCases.map((tc) => ({
            ...tc,
            status: 'pending' as const,
          }))
          next = { ...prev, generatedTestCases: liveCases }
          break
        }

        case 'test_update': {
          // Update testUpdates map (backward compat)
          const updatedUpdates = {
            ...prev.testUpdates,
            [event.testCaseId]: {
              testResultId: event.testResultId,
              title: event.title,
              status: event.status,
              durationMs: event.durationMs,
            },
          }
          // Also update generatedTestCases in-place so live cards reflect new status
          const updatedCases = prev.generatedTestCases.map((tc) =>
            tc.id === event.testCaseId
              ? { ...tc, status: event.status, durationMs: event.durationMs ?? tc.durationMs }
              : tc,
          )
          next = { ...prev, testUpdates: updatedUpdates, generatedTestCases: updatedCases }
          break
        }

        case 'counter':
          next = {
            ...prev,
            counter: { passed: event.passed, failed: event.failed, running: event.running, skipped: event.skipped, total: event.total },
          }
          break

        case 'bug_found':
          next = { ...prev, liveBugs: [...prev.liveBugs, event.bug] }
          break

        case 'complete':
          next = {
            ...prev, percent: 100, pipelineStatus: 'complete', isComplete: true, isCancelled: false,
            counter: { passed: event.passed, failed: event.failed, running: 0, skipped: event.skipped, total: event.total },
          }
          es.close()
          void queryClient.invalidateQueries({ queryKey: testingKeys.run(testRunId) })
          void queryClient.invalidateQueries({ queryKey: testingKeys.report(testRunId) })
          void queryClient.invalidateQueries({ queryKey: testingKeys.history() })
          break

        case 'error': {
          const isCancelled = event.message === 'CANCELLED'
          next = {
            ...prev, isCancelled, errorMessage: isCancelled ? null : event.message,
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

    return () => { es.close() }
  }, [testRunId, initialStatus, queryClient])

  return { sseState }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

// CHANGED: mutation input now accepts optional maxPages and maxTests.
// These are forwarded to POST /api/test/run and flow into the crawl budget.
// Defaults are intentionally omitted here so the server's own defaults apply
// when the user hasn't changed the sliders.
export function useStartTestRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      url: string;
      projectId?: string;
      /** Maximum number of pages to crawl. Omit to use server default (5). */
      maxPages?: number;
      /** Maximum number of test cases to generate. Omit to use server default (10). */
      maxTests?: number;
    }): Promise<{ testRunId: string }> => {
      const res = await fetch('/api/test/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
      })
      const data = await res.json() as { testRunId?: string; error?: string }
      if (!res.ok || !data.testRunId) throw new Error(data.error ?? 'Failed to start test run')
      return { testRunId: data.testRunId }
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: testingKeys.history() }) },
  })
}

export function useCancelTestRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (testRunId: string): Promise<{ cancelled: boolean }> => {
      const res = await fetch(`/api/test/run/${testRunId}/cancel`, { method: 'DELETE' })
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

/**
 * useExportReportPdf
 *
 * Triggers a Puppeteer-based PDF export by hitting POST /api/test/run/:id/export-pdf.
 * The browser receives the PDF as a Blob and triggers a file download automatically.
 */
export function useExportReportPdf() {
  return useMutation({
    mutationFn: async (testRunId: string): Promise<void> => {
      const res = await fetch(`/api/test/run/${testRunId}/export-pdf`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? 'PDF export failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `buildify-report-${testRunId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
  })
}