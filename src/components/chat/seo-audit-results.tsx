'use client'

import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ─── Types ────────────────────────────────────────────────────────────────────
interface CoreWebVital {
  value: string
  score: number | null
}

interface PageSpeedResult {
  scores: {
    performance: number
    seo: number
    accessibility: number
    bestPractices: number
  }
  coreWebVitals: {
    lcp: CoreWebVital
    inp: CoreWebVital
    cls: CoreWebVital
    fcp: CoreWebVital
    tbt: CoreWebVital
    si: CoreWebVital
  }
  opportunities: { title: string; savings: string }[]
}

interface SeoAuditResultsProps {
  result: string | null
  mobileData: PageSpeedResult | null
  desktopData: PageSpeedResult | null
  loading: boolean
  isFull?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getScoreMeta(score: number) {
  if (score >= 90) return { color: 'text-emerald-500', ring: '#10b981' }
  if (score >= 50) return { color: 'text-amber-500', ring: '#f59e0b' }
  return { color: 'text-red-500', ring: '#ef4444' }
}

function getVitalMeta(score: number | null) {
  if (score === null) return { dot: 'bg-muted-foreground/40', text: 'text-muted-foreground' }
  if (score >= 0.9) return { dot: 'bg-emerald-500', text: 'text-emerald-500' }
  if (score >= 0.5) return { dot: 'bg-amber-500', text: 'text-amber-500' }
  return { dot: 'bg-red-500', text: 'text-red-500' }
}

// ─── Score Circle ─────────────────────────────────────────────────────────────
function ScoreCircle({ score, label }: { score: number; label: string }) {
  const { color, ring } = getScoreMeta(score)
  const r = 18
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor"
            strokeWidth="3.5" className="text-muted/20" />
          <circle cx="24" cy="24" r={r} fill="none" stroke={ring}
            strokeWidth="3.5" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <span className={cn('absolute inset-0 flex items-center justify-center text-xs font-bold', color)}>
          {score}
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  )
}

// ─── PageSpeed Card ───────────────────────────────────────────────────────────
function PageSpeedCard({ data, label, icon }: { data: PageSpeedResult; label: string; icon: string }) {
  const vitals = [
    { key: 'lcp', name: 'LCP', desc: 'Largest Contentful Paint' },
    { key: 'inp', name: 'INP', desc: 'Interaction to Next Paint' },
    { key: 'cls', name: 'CLS', desc: 'Cumulative Layout Shift' },
    { key: 'fcp', name: 'FCP', desc: 'First Contentful Paint' },
    { key: 'tbt', name: 'TBT', desc: 'Total Blocking Time' },
    { key: 'si',  name: 'SI',  desc: 'Speed Index' },
  ] as const

  return (
    <Card className="border-border/40 shadow-none">
      <CardHeader className="px-4 py-2.5 border-b border-border/30">
        <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
          <span>{icon}</span>
          <span>{label}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">

        {/* Score circles */}
        <div className="grid grid-cols-4 gap-2 px-4 py-4 border-b border-border/20">
          <ScoreCircle score={data.scores.performance} label="Performance" />
          <ScoreCircle score={data.scores.seo} label="SEO" />
          <ScoreCircle score={data.scores.accessibility} label="Accessibility" />
          <ScoreCircle score={data.scores.bestPractices} label="Best Practices" />
        </div>

        {/* Core Web Vitals */}
        <div className="px-4 py-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
            Core Web Vitals
          </p>
          <div className="space-y-2">
            {vitals.map(({ key, name, desc }) => {
              const vital = data.coreWebVitals[key]
              const meta = getVitalMeta(vital.score)
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', meta.dot)} />
                  <span className="text-xs font-medium text-foreground w-7 shrink-0">{name}</span>
                  <span className="text-xs text-muted-foreground flex-1 truncate">{desc}</span>
                  <span className={cn('text-xs font-semibold tabular-nums shrink-0', meta.text)}>
                    {vital.value}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Opportunities */}
        {data.opportunities.length > 0 && (
          <>
            <Separator className="opacity-40" />
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Top Opportunities
              </p>
              <div className="space-y-1.5">
                {data.opportunities.map((o, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-amber-500 text-[10px] mt-0.5 shrink-0">→</span>
                    <span className="text-xs text-muted-foreground leading-snug">
                      {o.title}
                      {o.savings && (
                        <Badge variant="outline" className="ml-1.5 text-[9px] px-1 py-0 h-4 text-amber-500 border-amber-500/30">
                          {o.savings}
                        </Badge>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Loading ──────────────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Analyzing your app…</p>
      <p className="text-xs text-muted-foreground/50">This may take 15–20 seconds</p>
    </div>
  )
}

// ─── AI Analysis ─────────────────────────────────────────────────────────────
function AiAnalysis({ result }: { result: string }) {
  const parts = result.split('\n---\n')
  const aiPart = parts.length >= 3 ? parts.slice(2).join('\n---\n') : result

  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h1 className="text-sm font-semibold text-foreground mt-0 mb-3 pb-2 border-b border-border/40 tracking-tight">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xs font-semibold text-foreground mt-5 mb-2 first:mt-0 flex items-center gap-2 uppercase tracking-wider">
            <span className="inline-block w-0.5 h-3 rounded-full bg-primary shrink-0" />
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-xs font-medium text-muted-foreground mt-3 mb-1.5">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-xs text-muted-foreground leading-relaxed mb-2">{children}</p>
        ),
        ul: ({ children }) => <ul className="mb-3 space-y-1 pl-0">{children}</ul>,
        li: ({ children }) => (
          <li className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed list-none">
            <span className="mt-1.5 h-1 w-1 rounded-full bg-border shrink-0" />
            <span>{children}</span>
          </li>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 space-y-1 list-decimal list-inside text-xs text-muted-foreground">{children}</ol>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-2 border-l-2 border-primary/30 bg-muted/30 pl-3 pr-2 py-1.5 rounded-r-md text-xs text-muted-foreground not-italic">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto mb-3 rounded-lg border border-border/40">
            <table className="w-full border-collapse text-xs">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-muted/40">{children}</thead>,
        th: ({ children }) => (
          <th className="text-left text-muted-foreground font-medium px-3 py-2 border-b border-border/30 text-[10px] uppercase tracking-wider">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 border-b border-border/10 text-xs text-foreground/80">{children}</td>
        ),
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-')
          if (isBlock) return <code className={className}>{children}</code>
          return (
            <code className="bg-muted text-foreground rounded px-1.5 py-0.5 text-[10px] font-mono border border-border/30">
              {children}
            </code>
          )
        },
        pre: ({ children }) => (
          <pre className="bg-muted/50 rounded-lg p-3 overflow-x-auto text-[10px] font-mono mb-3 border border-border/30 leading-relaxed">
            {children}
          </pre>
        ),
        hr: () => <Separator className="my-4 opacity-40" />,
      }}
    >
      {aiPart}
    </ReactMarkdown>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export function SeoAuditResults({
  result,
  mobileData,
  desktopData,
  loading,
  isFull = false,
}: SeoAuditResultsProps) {
  const hasPageSpeed = mobileData ?? desktopData

  if (loading) return <LoadingSkeleton />

  return (
    <div className={cn('space-y-4', isFull ? 'px-8 py-6' : 'p-4')}>

      {/* PageSpeed Cards */}
      {hasPageSpeed ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">PageSpeed Insights</p>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />90+
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />50–89
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />Poor
              </span>
            </div>
          </div>
          <div className={cn('grid gap-3', isFull ? 'grid-cols-2' : 'grid-cols-1')}>
            {mobileData && <PageSpeedCard data={mobileData} label="Mobile" icon="📱" />}
            {desktopData && <PageSpeedCard data={desktopData} label="Desktop" icon="🖥️" />}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
          <span>⚠️</span>
          <span>PageSpeed data unavailable — deploy your app for real metrics</span>
        </div>
      )}

      {/* AI Analysis */}
      {result && (
        <>
          <Separator className="opacity-40" />
          <div>
            <p className="text-xs font-semibold text-foreground mb-3">AI Analysis</p>
            <AiAnalysis result={result} />
          </div>
        </>
      )}
    </div>
  )
}
