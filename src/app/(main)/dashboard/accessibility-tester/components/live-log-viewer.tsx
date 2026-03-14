'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Terminal, Pause, Play } from 'lucide-react'
import type { SSEEvent } from '@/types/accessibility.types'

interface LiveLogViewerProps {
  logs: SSEEvent[]
  progress: { phase: string; current: number; total: number; percentage: number } | null
}

function formatTime(): string {
  const now = new Date()
  return now.toLocaleTimeString('en-US', { hour12: false })
}

function getLogColor(event: SSEEvent): string {
  switch (event.type) {
    case 'crawl:start':
    case 'crawl:page_discovered':
    case 'crawl:complete':
      return 'text-cyan-400'
    case 'test:start':
      return 'text-blue-400'
    case 'test:violation':
      switch (event.impact) {
        case 'critical': return 'text-red-400 font-bold'
        case 'serious': return 'text-orange-400'
        case 'moderate': return 'text-yellow-400'
        case 'minor': return 'text-gray-400'
        default: return 'text-gray-400'
      }
    case 'test:page_complete':
      return 'text-green-400'
    case 'test:complete':
      return 'text-green-300 font-semibold'
    case 'report:generating':
      return 'text-purple-400'
    case 'report:complete':
      return 'text-green-300 font-bold'
    case 'error':
      return 'text-red-400 bg-red-950/30'
    case 'progress':
      return 'text-gray-500'
    default:
      return 'text-gray-300'
  }
}

function formatEvent(event: SSEEvent): string {
  switch (event.type) {
    case 'crawl:start':
      return `[CRAWL] Starting crawl of ${event.url}`
    case 'crawl:page_discovered':
      return `[CRAWL] Discovered page #${event.count}: ${event.url}`
    case 'crawl:complete':
      return `[CRAWL] Crawling complete. Found ${event.totalPages} pages.`
    case 'test:start':
      return `[TEST] Testing page ${event.pageIndex}/${event.totalPages}: ${event.url}`
    case 'test:violation':
      return `[VIOLATION] [${event.impact.toUpperCase()}] ${event.ruleId}: ${event.description} (${event.nodeCount} elements)`
    case 'test:page_complete':
      return `[DONE] Page complete: ${event.violationCount} violations, ${event.passCount} passes, ${event.incompleteCount} incomplete`
    case 'test:complete':
      return `[COMPLETE] All tests done. ${event.summary.totalViolations} total violations across ${event.summary.totalPages} pages.`
    case 'report:generating':
      return `[REPORT] Generating PDF report...`
    case 'report:complete':
      return `[REPORT] Report ready! Test run ID: ${event.testRunId}`
    case 'error':
      return `[ERROR${event.fatal ? ' FATAL' : ''}] ${event.message}`
    case 'progress':
      return `[PROGRESS] ${event.phase}: ${event.current}/${event.total} (${event.percentage}%)`
    default:
      return JSON.stringify(event)
  }
}

export function LiveLogViewer({ logs, progress }: LiveLogViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  // Filter out progress events from display log (too noisy)
  const displayLogs = logs.filter((l) => l.type !== 'progress')

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Terminal className="size-5" />
            Live Logs
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoScroll(!autoScroll)}
            className="gap-1 text-xs"
          >
            {autoScroll ? <Pause className="size-3" /> : <Play className="size-3" />}
            {autoScroll ? 'Pause scroll' : 'Resume scroll'}
          </Button>
        </div>
        {progress && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="capitalize">{progress.phase}</span>
              <span>
                {progress.current}/{progress.total} ({progress.percentage}%)
              </span>
            </div>
            <Progress value={progress.percentage} className="h-2" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div
          ref={scrollRef}
          className="h-[500px] overflow-auto rounded-lg border border-neutral-800 bg-[#0a0a0a] p-4 font-mono text-[13px] leading-relaxed"
        >
          {displayLogs.length === 0 ? (
            <span className="text-gray-500">Waiting for events...</span>
          ) : (
            displayLogs.map((event, idx) => (
              <div key={idx} className={`${getLogColor(event)} py-0.5`}>
                <span className="mr-2 text-gray-600">{formatTime()}</span>
                {formatEvent(event)}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
