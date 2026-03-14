'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Terminal, Pause, Play } from 'lucide-react'
import type { SSEEvent } from '@/types/accessibility.types'

interface LiveLogViewerProps {
  logs: SSEEvent[]
  progress?: { phase: string; current: number; total: number; percentage: number } | null
  title?: string
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
      return 'text-red-400 bg-red-950/30 px-1 rounded'
    case 'progress':
      return 'text-gray-600'
    default:
      return 'text-gray-300'
  }
}

function formatEvent(event: SSEEvent, verbose: boolean): string | null {
  switch (event.type) {
    case 'crawl:start':
      return `[CRAWL] Starting crawl of ${event.url}`
    case 'crawl:page_discovered':
      return `[CRAWL] Discovered page #${event.count}: ${event.url}`
    case 'crawl:complete':
      return `[CRAWL] Crawling complete. Found ${event.totalPages} pages.`
    case 'test:start':
      return `[TEST ] Testing page ${event.pageIndex}/${event.totalPages}: ${event.url}`
    case 'test:violation':
      return `  [${event.impact.toUpperCase().padEnd(8)}] ${event.ruleId}: ${event.description} (${event.nodeCount} element${event.nodeCount !== 1 ? 's' : ''})`
    case 'test:page_complete':
      return `[DONE ] ${event.violationCount} violations, ${event.passCount} passes, ${event.incompleteCount} incomplete`
    case 'test:complete':
      return `\n[COMPLETE] All tests finished. ${event.summary.totalViolations} total violations across ${event.summary.totalPages} pages.`
    case 'report:generating':
      return `[REPORT] Generating PDF report...`
    case 'report:complete':
      return `[REPORT] Report ready!`
    case 'error':
      return `[ERROR${event.fatal ? ' FATAL' : ''}] ${event.message}`
    case 'progress':
      return verbose ? `[PROGRESS] ${event.phase}: ${event.current}/${event.total} (${event.percentage}%)` : null
    default:
      return verbose ? JSON.stringify(event) : null
  }
}

export function LiveLogViewer({ logs, progress, title }: LiveLogViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [verbose, setVerbose] = useState(false)

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const displayLogs = logs
    .map((event) => {
      const text = formatEvent(event, verbose)
      if (!text) return null
      return { event, text }
    })
    .filter(Boolean) as Array<{ event: SSEEvent; text: string }>

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Terminal className="size-5" />
            {title ?? 'Live Logs'}
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="verbose-toggle"
                checked={verbose}
                onCheckedChange={setVerbose}
                className="scale-75"
              />
              <Label htmlFor="verbose-toggle" className="cursor-pointer text-xs text-muted-foreground">
                Verbose
              </Label>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
              className="gap-1 text-xs"
            >
              {autoScroll ? <Pause className="size-3" /> : <Play className="size-3" />}
              {autoScroll ? 'Pause' : 'Resume'}
            </Button>
          </div>
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
            <span className="text-gray-500">No log events.</span>
          ) : (
            displayLogs.map(({ event, text }, idx) => (
              <div key={idx} className={`${getLogColor(event)} whitespace-pre-wrap py-0.5`}>
                {text}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
