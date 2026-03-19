'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Pause, Play, Terminal } from 'lucide-react'
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
      return 'text-red-400'
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
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-5 py-3">
        <div className="flex items-center gap-2.5">
          <Terminal className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{title ?? 'Live Logs'}</span>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-mono tabular-nums text-muted-foreground">
            {displayLogs.length}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="verbose-toggle"
              checked={verbose}
              onCheckedChange={setVerbose}
              className="scale-[0.8]"
            />
            <Label htmlFor="verbose-toggle" className="cursor-pointer text-xs text-muted-foreground">
              Verbose
            </Label>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoScroll(!autoScroll)}
            className="h-7 gap-1.5 px-2.5 text-xs transition-colors duration-150"
          >
            {autoScroll ? <Pause className="size-3" /> : <Play className="size-3" />}
            {autoScroll ? 'Pause' : 'Resume'}
          </Button>
        </div>
      </div>

      {/* Progress */}
      {progress && (
        <div className="border-b bg-muted/20 px-5 py-2.5">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span className="capitalize font-medium">{progress.phase}</span>
            <span className="tabular-nums font-mono">{progress.current}/{progress.total} ({progress.percentage}%)</span>
          </div>
          <Progress value={progress.percentage} className="h-1.5" />
        </div>
      )}

      {/* Terminal */}
      <div
        ref={scrollRef}
        className="h-[440px] overflow-auto bg-[#0a0a0a] p-5 font-mono text-[13px] leading-relaxed"
      >
        {displayLogs.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-gray-600">Waiting for events...</span>
          </div>
        ) : (
          displayLogs.map(({ event, text }, idx) => (
            <div key={idx} className={`${getLogColor(event)} whitespace-pre-wrap py-px transition-colors duration-100`}>
              {text}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
