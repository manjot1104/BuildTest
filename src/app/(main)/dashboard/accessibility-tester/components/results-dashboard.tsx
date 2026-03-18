'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  FileDown,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Globe,
  FileText,
  ShieldAlert,
  ShieldCheck,
  BarChart3,
} from 'lucide-react'
import { ViolationCard } from './violation-card'
import type { TestSummary, AxeViolation } from '@/types/accessibility.types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { cn } from '@/lib/utils'

export interface PageResultData {
  url: string
  title: string | null
  violations: AxeViolation[]
  violationCount: number
  passCount: number
  incompleteCount: number
  inapplicableCount: number
  passes: Array<{ id: string; description: string; help: string; tags: string[] }>
  incomplete: Array<{ id: string; description: string; help: string; impact: string; tags: string[] }>
}

interface ResultsDashboardProps {
  summary: TestSummary
  pageResults: PageResultData[]
  testRunId: string | null
}

export function ResultsDashboard({ summary, pageResults, testRunId }: ResultsDashboardProps) {
  const complianceScore =
    summary.totalPasses + summary.totalViolations > 0
      ? Math.round(
          (summary.totalPasses / (summary.totalPasses + summary.totalViolations)) * 100,
        )
      : 100

  const severityData = [
    { name: 'Critical', count: summary.criticalCount, color: '#ef4444' },
    { name: 'Serious', count: summary.seriousCount, color: '#f97316' },
    { name: 'Moderate', count: summary.moderateCount, color: '#eab308' },
    { name: 'Minor', count: summary.minorCount, color: '#94a3b8' },
  ]

  const handleDownload = () => {
    if (!testRunId) return
    const link = document.createElement('a')
    link.href = `/api/accessibility/report/${testRunId}`
    link.download = 'accessibility-report.pdf'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Results Overview</h2>
        {testRunId && (
          <Button
            onClick={handleDownload}
            variant="outline"
            size="sm"
            className="gap-2 shadow-sm transition-all duration-200 hover:shadow-md"
          >
            <FileDown className="size-3.5" />
            Download PDF
          </Button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="size-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Pages</span>
          </div>
          <p className="mt-3 text-3xl font-bold tabular-nums">{summary.totalPages}</p>
          <div className="pointer-events-none absolute -bottom-4 -right-4 size-20 rounded-full bg-primary/[0.04]" />
        </div>

        <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
          <div className="flex items-center gap-2 text-red-500">
            <ShieldAlert className="size-4" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Violations</span>
          </div>
          <p className="mt-3 text-3xl font-bold tabular-nums text-red-600 dark:text-red-400">
            {summary.totalViolations}
          </p>
          <div className="pointer-events-none absolute -bottom-4 -right-4 size-20 rounded-full bg-red-500/[0.06]" />
        </div>

        <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
          <div className="flex items-center gap-2">
            <ShieldCheck
              className={cn(
                'size-4',
                complianceScore >= 80
                  ? 'text-green-500'
                  : complianceScore >= 50
                    ? 'text-amber-500'
                    : 'text-red-500',
              )}
            />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Score</span>
          </div>
          <p
            className={cn(
              'mt-3 text-3xl font-bold tabular-nums',
              complianceScore >= 80
                ? 'text-green-600 dark:text-green-400'
                : complianceScore >= 50
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-red-600 dark:text-red-400',
            )}
          >
            {complianceScore}%
          </p>
          <div
            className={cn(
              'pointer-events-none absolute -bottom-4 -right-4 size-20 rounded-full',
              complianceScore >= 80
                ? 'bg-green-500/[0.06]'
                : complianceScore >= 50
                  ? 'bg-amber-500/[0.06]'
                  : 'bg-red-500/[0.06]',
            )}
          />
        </div>

        <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
          <div className="flex items-center gap-2 text-muted-foreground">
            <BarChart3 className="size-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Severity</span>
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-red-500" />
                Critical
              </span>
              <span className="font-semibold tabular-nums">{summary.criticalCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-orange-500" />
                Serious
              </span>
              <span className="font-semibold tabular-nums">{summary.seriousCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-yellow-500" />
                Moderate
              </span>
              <span className="font-semibold tabular-nums">{summary.moderateCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-slate-400" />
                Minor
              </span>
              <span className="font-semibold tabular-nums">{summary.minorCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {summary.totalViolations > 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="mb-5 text-sm font-semibold">Violations by Severity</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'hsl(var(--popover-foreground))',
                    boxShadow: '0 4px 12px -2px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={22}>
                  {severityData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Page Breakdown */}
      <div>
        <h3 className="mb-4 text-sm font-semibold">Page-by-Page Breakdown</h3>
        <div className="space-y-2">
          {pageResults.map((page) => (
            <PageAccordion key={page.url} page={page} />
          ))}
          {pageResults.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No page data available.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function PageAccordion({ page }: { page: PageResultData }) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(
          'flex w-full items-center justify-between rounded-xl border bg-card px-4 py-3.5 text-left shadow-sm',
          'transition-all duration-200 hover:shadow-md hover:bg-accent/30',
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Globe className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <span className="block truncate text-sm font-medium">{page.title || page.url}</span>
            {page.title && (
              <span className="block truncate text-xs text-muted-foreground">{page.url}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0 ml-4">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="size-3 text-red-500" />
            <span className="text-xs font-medium tabular-nums">{page.violationCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3 text-green-500" />
            <span className="text-xs font-medium tabular-nums">{page.passCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <HelpCircle className="size-3 text-amber-500" />
            <span className="text-xs font-medium tabular-nums">{page.incompleteCount}</span>
          </div>
          <ChevronDown
            className={cn(
              'size-4 text-muted-foreground transition-transform duration-300 ease-out',
              open && 'rotate-180',
            )}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2 pl-4">
        {page.violations.length > 0 ? (
          page.violations.map((v, i) => <ViolationCard key={i} violation={v} />)
        ) : (
          <p className="py-3 text-sm text-green-600 dark:text-green-400">No violations found on this page.</p>
        )}

        {page.passes.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1.5 py-1.5 text-xs text-green-600 dark:text-green-400 transition-colors duration-150 hover:text-green-700 dark:hover:text-green-300">
              <ChevronDown className="size-3" />
              {page.passes.length} passing rules
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 space-y-0.5 pl-5">
              {page.passes.map((p) => (
                <div key={p.id} className="text-xs text-muted-foreground">
                  <code className="mr-1 text-green-600 dark:text-green-400">{p.id}</code> {p.description}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {page.incomplete.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1.5 py-1.5 text-xs text-amber-600 dark:text-amber-400 transition-colors duration-150 hover:text-amber-700 dark:hover:text-amber-300">
              <ChevronDown className="size-3" />
              {page.incomplete.length} incomplete (needs review)
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 space-y-0.5 pl-5">
              {page.incomplete.map((inc) => (
                <div key={inc.id} className="text-xs text-muted-foreground">
                  <code className="mr-1 text-amber-600 dark:text-amber-400">{inc.id}</code> {inc.description}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
