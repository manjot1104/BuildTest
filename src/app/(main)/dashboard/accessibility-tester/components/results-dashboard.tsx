'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
} from 'lucide-react'
import { ViolationCard } from './violation-card'
import type { TestSummary, SSEEvent, AxeViolation } from '@/types/accessibility.types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface ResultsDashboardProps {
  summary: TestSummary
  logs: SSEEvent[]
  testRunId: string | null
}

interface PageTestData {
  url: string
  violations: AxeViolation[]
  violationCount: number
  passCount: number
  incompleteCount: number
}

export function ResultsDashboard({ summary, logs, testRunId }: ResultsDashboardProps) {
  const complianceScore =
    summary.totalPasses + summary.totalViolations > 0
      ? Math.round(
          (summary.totalPasses / (summary.totalPasses + summary.totalViolations)) * 100,
        )
      : 100

  // Extract per-page data from logs
  const pageDataMap = new Map<string, PageTestData>()

  for (const log of logs) {
    if (log.type === 'test:start') {
      if (!pageDataMap.has(log.url)) {
        pageDataMap.set(log.url, {
          url: log.url,
          violations: [],
          violationCount: 0,
          passCount: 0,
          incompleteCount: 0,
        })
      }
    } else if (log.type === 'test:violation') {
      const page = pageDataMap.get(log.url)
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
      const page = pageDataMap.get(log.url)
      if (page) {
        page.violationCount = log.violationCount
        page.passCount = log.passCount
        page.incompleteCount = log.incompleteCount
      }
    }
  }

  const pageData = Array.from(pageDataMap.values())

  const severityData = [
    { name: 'Critical', count: summary.criticalCount, color: '#dc2626' },
    { name: 'Serious', count: summary.seriousCount, color: '#ea580c' },
    { name: 'Moderate', count: summary.moderateCount, color: '#ca8a04' },
    { name: 'Minor', count: summary.minorCount, color: '#6b7280' },
  ]

  const handleDownload = async () => {
    if (!testRunId) return
    const link = document.createElement('a')
    link.href = `/api/accessibility/report/${testRunId}`
    link.download = 'accessibility-report.pdf'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header with download */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Test Results</h2>
        {testRunId && (
          <Button onClick={handleDownload} className="gap-2">
            <FileDown className="size-4" />
            Download PDF Report
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">{summary.totalPages}</div>
            <p className="text-sm text-muted-foreground">Pages Tested</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-destructive">
              {summary.totalViolations}
            </div>
            <p className="text-sm text-muted-foreground">Total Violations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div
              className={`text-3xl font-bold ${
                complianceScore >= 80
                  ? 'text-green-600'
                  : complianceScore >= 50
                    ? 'text-yellow-600'
                    : 'text-destructive'
              }`}
            >
              {complianceScore}%
            </div>
            <p className="text-sm text-muted-foreground">Compliance Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="text-sm font-semibold text-red-600">{summary.criticalCount}C</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-semibold text-orange-500">{summary.seriousCount}S</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-semibold text-yellow-600">{summary.moderateCount}M</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-semibold text-gray-500">{summary.minorCount}m</span>
            </div>
            <p className="text-sm text-muted-foreground">Severity Breakdown</p>
          </CardContent>
        </Card>
      </div>

      {/* Severity Chart */}
      {summary.totalViolations > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Violations by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={80} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {severityData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-Page Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Page-by-Page Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pageData.map((page) => (
            <PageAccordion key={page.url} page={page} />
          ))}
          {pageData.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No page data available.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function PageAccordion({ page }: { page: PageTestData }) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border p-3 text-left hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          <Globe className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm">{page.url}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="size-3 text-destructive" />
            <span className="text-xs">{page.violationCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3 text-green-600" />
            <span className="text-xs">{page.passCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <HelpCircle className="size-3 text-yellow-600" />
            <span className="text-xs">{page.incompleteCount}</span>
          </div>
          <ChevronDown
            className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2 pl-6">
        {page.violations.length > 0 ? (
          page.violations.map((v, i) => <ViolationCard key={i} violation={v} />)
        ) : (
          <p className="py-2 text-sm text-green-600">No violations found on this page.</p>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
