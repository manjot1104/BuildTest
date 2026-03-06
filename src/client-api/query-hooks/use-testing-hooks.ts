import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TestRun {
  id: string
  status: 'crawling' | 'generating' | 'executing' | 'reporting' | 'complete' | 'failed'
  percent: number
  targetUrl: string
  overallScore: number | null
  totalTests: number | null
  passed: number | null
  failed: number | null
  skipped: number | null
  startedAt: string
  completedAt: string | null
  aiSummary: string | null
  shareableSlug: string | null
}

export interface Bug {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  page_url: string
  ai_fix_suggestion: string | null
  reproduction_steps: string[]
  status: 'open' | 'fixed' | 'ignored'
}

export interface TestResult {
  id: string
  status: 'passed' | 'failed' | 'flaky' | 'skipped'
  actual_result: string
  error_details: string | null
  duration_ms: number
  retry_count: number
  console_logs: string[]
}

export interface TestCase {
  id: string
  category: string
  title: string
  description: string
  steps: string[]
  expected_result: string
  priority: 'P0' | 'P1' | 'P2'
  tags: string[]
  estimated_duration: number
  results: TestResult[]
}

export interface TestReport extends TestRun {
  bugs: Bug[]
  bugsByCategory: Record<string, number>
  resultsByCategory: Record<string, { passed: number; failed: number; total: number }>
  crawlSummary: { totalPages: number; crawlTimeMs: number }
  isPublic: boolean
  testCases: TestCase[]
}

export interface TestHistoryItem {
  id: string
  targetUrl: string
  status: TestRun['status']
  overallScore: number | null
  totalTests: number | null
  passed: number | null
  failed: number | null
  startedAt: string
  completedAt: string | null
  aiSummary: string | null
  shareableSlug: string | null
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const testingKeys = {
  all: ['testing'] as const,
  history: () => [...testingKeys.all, 'history'] as const,
  run: (id: string) => [...testingKeys.all, 'run', id] as const,
  report: (id: string) => [...testingKeys.all, 'report', id] as const,
}

// ─── Queries ─────────────────────────────────────────────────────────────────

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
      if (status === 'complete' || status === 'failed') return false
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