'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { History, Eye, FileDown, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

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

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  crawling: 'bg-blue-100 text-blue-700',
  testing: 'bg-yellow-100 text-yellow-700',
  generating_report: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
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
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="size-5" />
            Test History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            No tests run yet. Configure and start your first accessibility test above.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="size-5" />
          Test History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Standards</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Pages</TableHead>
                <TableHead className="text-center">Violations</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="max-w-[200px] truncate text-xs">
                    {run.targetUrl}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {run.standards.map((s) => (
                        <Badge key={s} variant="outline" className="text-[10px]">
                          {standardLabels[s] ?? s}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[run.status] ?? statusColors.pending}>
                      {run.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {run.totalPagesTested ?? '-'}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {run.totalViolations ?? '-'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(run.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {run.status === 'completed' && (
                        <>
                          {onViewResults && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => onViewResults(run.id)}
                            >
                              <Eye className="size-4" />
                            </Button>
                          )}
                          <a href={`/api/accessibility/report/${run.id}`} download>
                            <Button variant="ghost" size="icon" className="size-8">
                              <FileDown className="size-4" />
                            </Button>
                          </a>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(run.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
