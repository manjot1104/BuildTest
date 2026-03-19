'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Eye, FileDown, Trash2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TestRun {
  id: string
  targetUrl: string
  standards: string[]
  status: string
  totalPagesTested: number | null
  totalViolations: number | null
  totalPasses: number | null
  createdAt: string
  completedAt: string | null
}

const statusStyles: Record<string, string> = {
  pending: 'text-muted-foreground bg-muted',
  crawling: 'text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/50',
  testing: 'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/50',
  generating_report: 'text-purple-700 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/50',
  completed: 'text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/50',
  failed: 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/50',
}

const standardLabels: Record<string, string> = {
  wcag2a: '2.0 A',
  wcag2aa: '2.0 AA',
  wcag21a: '2.1 A',
  wcag21aa: '2.1 AA',
  'best-practice': 'BP',
}

interface TestHistoryProps {
  onViewResults?: (id: string) => void
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function TestHistory({ onViewResults }: TestHistoryProps) {
  const queryClient = useQueryClient()

  const { data: history, isLoading } = useQuery<TestRun[]>({
    queryKey: ['accessibility-history'],
    queryFn: async () => {
      const res = await fetch('/api/accessibility/history')
      if (!res.ok) throw new Error('Failed to fetch history')
      return res.json() as Promise<TestRun[]>
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/accessibility/test/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete test run')
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accessibility-history'] })
      toast.success('Test run deleted')
    },
    onError: () => {
      toast.error('Failed to delete test run')
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="size-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Loading history...</p>
        </div>
      </div>
    )
  }

  if (!history || history.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 py-12 text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-xl bg-muted">
          <Clock className="size-4.5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground/80">No test history</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Your completed tests will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Test History</h2>
        <span className="text-sm text-muted-foreground">
          {history.length} test{history.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">URL</TableHead>
              <TableHead>Standards</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Pages</TableHead>
              <TableHead className="text-right">Violations</TableHead>
              <TableHead className="text-right">Date</TableHead>
              <TableHead className="w-[110px] pr-5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((run) => (
              <TableRow
                key={run.id}
                className="group transition-colors duration-150"
              >
                <TableCell className="max-w-[220px] pl-5">
                  <span className="block truncate text-sm font-medium">{run.targetUrl}</span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {run.standards.map((s) => (
                      <Badge key={s} variant="secondary" className="rounded-md text-[10px] font-mono px-1.5 py-0">
                        {standardLabels[s] ?? s}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      'inline-block rounded-md px-2 py-0.5 text-xs font-medium capitalize',
                      statusStyles[run.status] ?? statusStyles.pending,
                    )}
                  >
                    {run.status.replace('_', ' ')}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {run.totalPagesTested ?? '-'}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  <span className={cn(
                    'font-medium',
                    run.totalViolations && run.totalViolations > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400',
                  )}>
                    {run.totalViolations ?? '-'}
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {formatDate(run.createdAt)}
                </TableCell>
                <TableCell className="pr-5">
                  <div className="flex items-center justify-end gap-0.5 opacity-60 transition-opacity duration-200 group-hover:opacity-100">
                    {run.status === 'completed' && (
                      <>
                        {onViewResults && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg transition-colors duration-150"
                            onClick={() => onViewResults(run.id)}
                            title="View results"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        )}
                        <a href={`/api/accessibility/report/${run.id}`} download>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg transition-colors duration-150"
                            title="Download PDF"
                          >
                            <FileDown className="size-3.5" />
                          </Button>
                        </a>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-muted-foreground transition-colors duration-150 hover:text-destructive"
                      onClick={() => deleteMutation.mutate(run.id)}
                      disabled={deleteMutation.isPending}
                      title="Delete"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
