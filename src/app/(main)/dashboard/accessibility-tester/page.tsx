'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccessibilityTest } from '@/hooks/use-accessibility-test'
import { TestConfigForm } from './components/test-config-form'
import { LiveLogViewer } from './components/live-log-viewer'
import { ResultsDashboard, type PageResultData } from './components/results-dashboard'
import { TestHistory } from './components/test-history'
import { Button } from '@/components/ui/button'
import {
  RotateCcw, StopCircle, ArrowLeft, Loader2, AlertCircle,
  Shield, FileSearch,
} from 'lucide-react'
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
      <div className="relative mx-auto w-full max-w-5xl space-y-8 py-2">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="size-9 shrink-0 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md"
            onClick={() => setViewing(null)}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Test Results</h1>
            {viewing.targetUrl && (
              <p className="mt-0.5 text-sm text-muted-foreground">{viewing.targetUrl}</p>
            )}
          </div>
        </div>

        {viewing.loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="size-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground">Loading test results...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
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
    <div className="relative mx-auto w-full max-w-5xl py-2">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-64 w-[600px] rounded-full bg-primary/[0.04] blur-[100px]" />

      {/* Page Header */}
      <div className="relative mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Accessibility Tester</h1>
        <p className="mt-2 max-w-lg text-muted-foreground">
          Test your website against WCAG accessibility standards with automated crawling and analysis.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative space-y-12"
          >
            <TestConfigForm onSubmit={handleSubmit} isRunning={false} />

            {/* Result placeholder */}
            <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 px-8 py-14 text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-muted">
                <FileSearch className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground/80">
                Your accessibility report will appear here
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Enter a URL above and start a test to analyze your website
              </p>
            </div>

            <TestHistory onViewResults={handleViewResults} />
          </motion.div>
        )}

        {status === 'running' && (
          <motion.div
            key="running"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="space-y-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Test in progress...</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                onClick={abort}
              >
                <StopCircle className="size-3.5" />
                Cancel
              </Button>
            </div>
            <LiveLogViewer logs={logs} progress={progress} />
          </motion.div>
        )}

        {status === 'completed' && summary && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-green-500/10">
                  <Shield className="size-4 text-green-500" />
                </div>
                <span className="text-sm font-medium">Test completed successfully</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 shadow-sm transition-all duration-200 hover:shadow-md"
                onClick={handleReset}
              >
                <RotateCcw className="size-3.5" />
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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="space-y-5"
          >
            <div className="rounded-2xl border border-destructive/20 bg-destructive/[0.03] px-8 py-10 text-center shadow-sm">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-destructive/10">
                <AlertCircle className="size-5 text-destructive" />
              </div>
              <p className="text-base font-semibold text-destructive">Test Failed</p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-6 gap-2 shadow-sm transition-all duration-200 hover:shadow-md"
                onClick={handleReset}
              >
                <RotateCcw className="size-3.5" />
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
