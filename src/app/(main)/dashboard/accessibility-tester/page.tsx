'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useAccessibilityTest } from '@/hooks/use-accessibility-test'
import { TestConfigForm } from './components/test-config-form'
import { LiveLogViewer } from './components/live-log-viewer'
import { ResultsDashboard } from './components/results-dashboard'
import { TestHistory } from './components/test-history'
import { Button } from '@/components/ui/button'
import { RotateCcw, StopCircle } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
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
            <TestHistory />
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
            className="space-y-4"
          >
            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="gap-2" onClick={handleReset}>
                <RotateCcw className="size-4" />
                New Test
              </Button>
            </div>
            <ResultsDashboard summary={summary} logs={logs} testRunId={testRunId} />
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
