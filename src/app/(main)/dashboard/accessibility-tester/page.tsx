'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccessibilityTest } from '@/hooks/use-accessibility-test'
import { TestConfigForm } from './components/test-config-form'
import { LiveLogViewer } from './components/live-log-viewer'
import { ResultsDashboard, type PageResultData } from './components/results-dashboard'
import { TestHistory } from './components/test-history'
import { Button } from '@/components/ui/button'
import { RotateCcw, StopCircle, ArrowLeft, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import type { SSEEvent, TestSummary, AxeViolation } from '@/types/accessibility.types'

interface ViewingState {
  testRunId: string
  targetUrl: string
  summary: TestSummary
  pageResults: PageResultData[]
  logs: SSEEvent[]
  loading: boolean
}

export default function AccessibilityTesterPage() {
  const {
    status,
    logs,
    progress,
    summary,
    testRunId,
    error,
    startTest,
    reset,
    abort,
  } = useAccessibilityTest()

  const queryClient = useQueryClient()
  const [viewing, setViewing] = useState<ViewingState | null>(null)

  const handleSubmit = (values: {
    url: string
    standards: string[]
    maxPages: number
    maxDepth: number
  }) => {
    void startTest(values)
  }

  const handleReset = () => {
    reset()
    void queryClient.invalidateQueries({ queryKey: ['accessibility-history'] })
  }

  const handleViewResults = useCallback(async (id: string) => {
    setViewing({
      testRunId: id,
      targetUrl: '',
      summary: { totalPages: 0, totalViolations: 0, totalPasses: 0, totalIncomplete: 0, criticalCount: 0, seriousCount: 0, moderateCount: 0, minorCount: 0 },
      pageResults: [],
      logs: [],
      loading: true,
    })

    try {
      const res = await fetch(`/api/accessibility/results/${id}`)
      if (!res.ok) throw new Error('Failed to fetch results')

      const data = await res.json() as {
        testRun: {
          id: string
          targetUrl: string
          totalPagesTested: number | null
          totalViolations: number | null
          totalPasses: number | null
          totalIncomplete: number | null
          logs: SSEEvent[]
        }
        pageResults: Array<{
          pageUrl: string
          pageTitle: string | null
          violationCount: number
          passCount: number
          incompleteCount: number
          inapplicableCount: number
          violations: AxeViolation[]
          passes: Array<{ id: string; description: string; help: string; tags: string[] }>
          incomplete: Array<{ id: string; description: string; help: string; impact: string; tags: string[] }>
        }>
      }

      // Build summary from DB data
      const pageResults: PageResultData[] = data.pageResults.map((p) => ({
        url: p.pageUrl,
        title: p.pageTitle,
        violations: p.violations,
        violationCount: p.violationCount,
        passCount: p.passCount,
        incompleteCount: p.incompleteCount,
        inapplicableCount: p.inapplicableCount,
        passes: p.passes,
        incomplete: p.incomplete,
      }))

      // Compute severity counts from violation data
      let criticalCount = 0, seriousCount = 0, moderateCount = 0, minorCount = 0
      for (const page of pageResults) {
        for (const v of page.violations) {
          switch (v.impact) {
            case 'critical': criticalCount++; break
            case 'serious': seriousCount++; break
            case 'moderate': moderateCount++; break
            case 'minor': minorCount++; break
          }
        }
      }

      setViewing({
        testRunId: id,
        targetUrl: data.testRun.targetUrl,
        summary: {
          totalPages: data.testRun.totalPagesTested ?? 0,
          totalViolations: data.testRun.totalViolations ?? 0,
          totalPasses: data.testRun.totalPasses ?? 0,
          totalIncomplete: data.testRun.totalIncomplete ?? 0,
          criticalCount,
          seriousCount,
          moderateCount,
          minorCount,
        },
        pageResults,
        logs: data.testRun.logs ?? [],
        loading: false,
      })
    } catch {
      setViewing(null)
    }
  }, [])

  // Build pageResults from live logs for live test
  const livePageResults: PageResultData[] = (() => {
    if (status !== 'completed' || !summary) return []
    const map = new Map<string, PageResultData>()
    for (const log of logs) {
      if (log.type === 'test:start' && !map.has(log.url)) {
        map.set(log.url, {
          url: log.url,
          title: null,
          violations: [],
          violationCount: 0,
          passCount: 0,
          incompleteCount: 0,
          inapplicableCount: 0,
          passes: [],
          incomplete: [],
        })
      } else if (log.type === 'test:violation') {
        const page = map.get(log.url)
        if (page) {
          page.violations.push({
            id: log.ruleId,
            impact: log.impact as AxeViolation['impact'],
            description: log.description,
            help: '',
            helpUrl: '',
            tags: [],
            nodes: [],
          })
        }
      } else if (log.type === 'test:page_complete') {
        const page = map.get(log.url)
        if (page) {
          page.violationCount = log.violationCount
          page.passCount = log.passCount
          page.incompleteCount = log.incompleteCount
        }
      }
    }
    return Array.from(map.values())
  })()

  // Viewing past results
  if (viewing) {
    return (
      <div className="w-full space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => setViewing(null)}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Test Results</h1>
            {viewing.targetUrl && (
              <p className="text-sm text-muted-foreground">{viewing.targetUrl}</p>
            )}
          </div>
        </div>

        {viewing.loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <ResultsDashboard
              summary={viewing.summary}
              pageResults={viewing.pageResults}
              testRunId={viewing.testRunId}
            />
            {viewing.logs.length > 0 && (
              <LiveLogViewer logs={viewing.logs} title="Test Logs" />
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Accessibility Tester</h1>
        <p className="text-sm text-muted-foreground">
          Test your website against WCAG accessibility standards with automated crawling and analysis.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <TestConfigForm onSubmit={handleSubmit} isRunning={false} />
            <TestHistory onViewResults={handleViewResults} />
          </motion.div>
        )}

        {status === 'running' && (
          <motion.div
            key="running"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex justify-end">
              <Button variant="destructive" size="sm" className="gap-2" onClick={abort}>
                <StopCircle className="size-4" />
                Cancel Test
              </Button>
            </div>
            <LiveLogViewer logs={logs} progress={progress} />
          </motion.div>
        )}

        {status === 'completed' && summary && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="gap-2" onClick={handleReset}>
                <RotateCcw className="size-4" />
                New Test
              </Button>
            </div>
            <ResultsDashboard
              summary={summary}
              pageResults={livePageResults}
              testRunId={testRunId}
            />
            <LiveLogViewer logs={logs} title="Test Logs" />
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center">
              <p className="text-lg font-semibold text-destructive">Test Failed</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={handleReset}>
                <RotateCcw className="size-4" />
                Try Again
              </Button>
            </div>
            {logs.length > 0 && <LiveLogViewer logs={logs} progress={progress} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
