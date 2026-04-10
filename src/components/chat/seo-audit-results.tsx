'use client'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import React from 'react'
import {
  Smartphone,
  Monitor,
  Zap,
  AlertTriangle,

  Cpu,
  Sparkles,
  CheckCircle2,
  XCircle,
  MinusCircle,
  TrendingUp,
  FileWarning,
  Share2,
  ShieldCheck,
  Search,
  Copy,
  Check,
  Info,
  TriangleAlert,
  Wrench,
  Globe,
  Lock,
  WifiOff,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface CoreWebVital {
  value: string
  score: number | null // 0–1 from PSI
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
  // Optional: field data from CrUX (real users)
  fieldData?: {
    cwvPassed: boolean | null
    lcp?: { p75: string; category: 'good' | 'ni' | 'poor' }
    inp?: { p75: string; category: 'good' | 'ni' | 'poor' }
    cls?: { p75: string; category: 'good' | 'ni' | 'poor' }
    fcp?: { p75: string; category: 'good' | 'ni' | 'poor' }
    ttfb?: { p75: string; category: 'good' | 'ni' | 'poor' }
  }
}

interface SeoAuditResultsProps {
  result: string | null
  mobileData: PageSpeedResult | null
  desktopData: PageSpeedResult | null
  loading: boolean
  isFull?: boolean
  /**
   * Pass true when the audited URL is not publicly accessible
   * (localhost, private IP, blocked by auth, etc.).
   * When true, AI insights panel shows a "deploy first" callout instead.
   */
  isPrivateUrl?: boolean
}

// ─── Colour helpers ───────────────────────────────────────────────────────────
function getScoreColor(score: number): {
  hex: string; tw: string; ring: string; track: string; border: string; barHex: string; label: string; labelCn: string
} {
  if (score >= 90) return {
    hex: '#22c55e', tw: 'text-emerald-400', ring: '#22c55e',
    track: 'rgba(34,197,94,0.07)', border: 'border-emerald-500/20',
    barHex: '#22c55e', label: 'Good',
    labelCn: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  }
  if (score >= 50) return {
    hex: '#f59e0b', tw: 'text-amber-400', ring: '#f59e0b',
    track: 'rgba(245,158,11,0.07)', border: 'border-amber-500/20',
    barHex: '#f59e0b', label: 'Needs Improvement',
    labelCn: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
  }
  return {
    hex: '#ef4444', tw: 'text-red-400', ring: '#ef4444',
    track: 'rgba(239,68,68,0.07)', border: 'border-red-500/20',
    barHex: '#ef4444', label: 'Poor',
    labelCn: 'bg-red-500/10 text-red-400 border-red-500/25',
  }
}

function getVitalStatus(score: number | null): {
  Icon: React.ElementType; tw: string; dot: string; label: string
} {
  if (score === null) return { Icon: MinusCircle, tw: 'text-muted-foreground/25', dot: 'bg-muted-foreground/20', label: 'N/A' }
  if (score >= 0.9)   return { Icon: CheckCircle2, tw: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Good' }
  if (score >= 0.5)   return { Icon: MinusCircle,  tw: 'text-amber-400',   dot: 'bg-amber-400',   label: 'Needs Improvement' }
  return               { Icon: XCircle,      tw: 'text-red-400',     dot: 'bg-red-400',     label: 'Poor' }
}

function getCategoryColor(cat?: 'good' | 'ni' | 'poor') {
  if (cat === 'good') return 'text-emerald-400'
  if (cat === 'ni')   return 'text-amber-400'
  if (cat === 'poor') return 'text-red-400'
  return 'text-muted-foreground/40'
}

// ─── Score gauge (large PSI-style circle) ────────────────────────────────────
function ScoreGauge({ score, label, Icon }: { score: number; label: string; Icon: React.ElementType }) {
  const c = getScoreColor(score)
  const r = 30
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ

  return (
    <div className="flex flex-col items-center gap-2.5 group">
      {/* Circle */}
      <div
        className={cn('relative w-[76px] h-[76px] rounded-full border-2 flex items-center justify-center transition-transform duration-200 group-hover:scale-105', c.border)}
        style={{ background: c.track }}
      >
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 76 76">
          <circle cx="38" cy="38" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-white/4" />
          <circle cx="38" cy="38" r={r} fill="none" stroke={c.ring} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
        </svg>
        <span className={cn('text-[18px] font-bold tabular-nums z-10 leading-none', c.tw)}>{score}</span>
      </div>
      {/* Label row */}
      <div className="flex flex-col items-center gap-0.5">
        <Icon className={cn('h-3 w-3', c.tw)} />
        <span className="text-[9.5px] text-muted-foreground/40 font-medium tracking-wide text-center leading-tight max-w-[70px]">
          {label}
        </span>
      </div>
    </div>
  )
}

// ─── CWV passed/failed pill ───────────────────────────────────────────────────
function CwvAssessment({ passed }: { passed: boolean }) {
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold border',
      passed
        ? 'bg-emerald-500/8 text-emerald-400 border-emerald-500/20'
        : 'bg-red-500/8 text-red-400 border-red-500/20'
    )}>
      {passed
        ? <><CheckCircle2 className="h-3 w-3" /> Core Web Vitals: Passed</>
        : <><XCircle className="h-3 w-3" /> Core Web Vitals: Failed</>
      }
    </div>
  )
}

// ─── Horizontal bar for CWV distribution ─────────────────────────────────────
function DistBar({ good, ni, poor }: { good: number; ni: number; poor: number }) {
  return (
    <div className="flex h-1.5 w-full rounded-full overflow-hidden gap-px">
      <div className="bg-emerald-500/60 rounded-l-full transition-all duration-700" style={{ width: `${good}%` }} />
      <div className="bg-amber-500/60 transition-all duration-700" style={{ width: `${ni}%` }} />
      <div className="bg-red-500/60 rounded-r-full transition-all duration-700" style={{ width: `${poor}%` }} />
    </div>
  )
}

// ─── Single vital row ─────────────────────────────────────────────────────────
function VitalRow({
  name, fullName, value, score, isCwv,
}: {
  name: string; fullName: string; value: string; score: number | null; isCwv?: boolean
}) {
  const st = getVitalStatus(score)
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gradient-to-r from-white/[0.04] to-transparent transition-colors group">
      {/* Status dot */}
      <span className={cn('h-2 w-2 rounded-full shrink-0 ring-[1.5px] ring-offset-1 ring-offset-background', st.dot,
        score === null ? 'ring-muted-foreground/10' : st.dot.replace('bg-', 'ring-').replace('400', '400/30')
      )} />
      {/* Name */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-[11px] font-bold text-foreground/55 font-mono tracking-wide shrink-0">{name}</span>
        <span className="text-[10.5px] text-muted-foreground/30 truncate">{fullName}</span>
        {isCwv && (
          <span className="ml-1 shrink-0 text-[8px] font-bold uppercase tracking-widest px-1.5 py-[1px] rounded bg-blue-500/8 text-blue-400/60 border border-blue-500/12">
            CWV
          </span>
        )}
      </div>
      {/* Value */}
      <span className={cn('text-[11.5px] font-bold tabular-nums font-mono shrink-0', st.tw)}>
        {value}
      </span>
    </div>
  )
}

// ─── PageSpeed score panel ────────────────────────────────────────────────────
function PageSpeedPanel({ data }: { data: PageSpeedResult }) {
  const vitals: Array<{ key: keyof PageSpeedResult['coreWebVitals']; name: string; fullName: string; isCwv?: boolean }> = [
    { key: 'lcp', name: 'LCP', fullName: 'Largest Contentful Paint', isCwv: true },
    { key: 'inp', name: 'INP', fullName: 'Interaction to Next Paint', isCwv: true },
    { key: 'cls', name: 'CLS', fullName: 'Cumulative Layout Shift',  isCwv: true },
    { key: 'fcp', name: 'FCP', fullName: 'First Contentful Paint' },
    { key: 'tbt', name: 'TBT', fullName: 'Total Blocking Time' },
    { key: 'si',  name: 'SI',  fullName: 'Speed Index' },
  ]

  const categories: Array<{ key: keyof PageSpeedResult['scores']; label: string; Icon: React.ElementType }> = [
    { key: 'performance',   label: 'Performance',    Icon: TrendingUp },
    { key: 'seo',           label: 'SEO',            Icon: Search },
    { key: 'accessibility', label: 'Accessibility',  Icon: Globe },
    { key: 'bestPractices', label: 'Best Practices', Icon: ShieldCheck },
  ]

  return (
    <div className="space-y-6">
      {/* Field data CWV assessment */}
      {data.fieldData && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest">
              Field Data · Real Users
            </p>
            {data.fieldData.cwvPassed !== null && (
              <CwvAssessment passed={data.fieldData.cwvPassed} />
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['lcp', 'inp', 'cls'] as const).map((k) => {
              const fd = data.fieldData?.[k]
              if (!fd) return null
              return (
                <div key={k} className="rounded-lg border border-border/12 bg-muted/[0.03] px-3 py-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold font-mono text-muted-foreground/40 uppercase">{k}</span>
                    <span className={cn('text-[9px] font-bold uppercase tracking-wide', getCategoryColor(fd.category))}>
                      {fd.category === 'good' ? 'Good' : fd.category === 'ni' ? 'NI' : 'Poor'}
                    </span>
                  </div>
                  <p className={cn('text-[15px] font-bold tabular-nums font-mono', getCategoryColor(fd.category))}>
                    {fd.p75}
                  </p>
                  <p className="text-[9px] text-muted-foreground/25">75th percentile</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Divider */}
      {data.fieldData && <Separator className="opacity-8" />}

      {/* Lab scores — 4 gauges */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest">
          Lab Data · Simulated
        </p>
        <div className="flex items-start justify-around gap-2">
          {categories.map(({ key, label, Icon }) => (
            <ScoreGauge key={key} score={data.scores[key]} label={label} Icon={Icon} />
          ))}
        </div>
        {/* Score legend */}
        <div className="flex items-center justify-center gap-4 pt-1">
          {[
            { dot: '#ef4444', label: '0–49 Poor' },
            { dot: '#f59e0b', label: '50–89 NI' },
            { dot: '#22c55e', label: '90–100 Good' },
          ].map(({ dot, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-[9px] text-muted-foreground/25 font-medium">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: dot }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      <Separator className="opacity-8" />

      {/* Vitals table */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest px-4">
          Diagnostics
        </p>
        <div className="rounded-xl border border-border/12 overflow-hidden divide-y divide-border/[0.06]">
          {vitals.map(({ key, name, fullName, isCwv }) => {
            const v = data.coreWebVitals[key]
            return (
              <VitalRow
                key={key}
                name={name}
                fullName={fullName}
                value={v.value}
                score={v.score}
                isCwv={isCwv}
              />
            )
          })}
        </div>
      </div>

      {/* Opportunities */}
      {data.opportunities.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest">
            Opportunities
          </p>
          <div className="space-y-1.5">
            {data.opportunities.map((o, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg bg-amber-500/4 border border-amber-500/10 px-3.5 py-2.5">
                <Zap className="h-3.5 w-3.5 text-amber-400/50 shrink-0 mt-[1px]" />
                <span className="text-[11px] text-muted-foreground/50 leading-snug flex-1">{o.title}</span>
                {o.savings && (
                  <span className="text-[9.5px] font-bold font-mono text-amber-400/60 shrink-0 bg-amber-500/8 px-2 py-0.5 rounded-md border border-amber-500/12">
                    {o.savings}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-muted-foreground/8" />
     <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground/55">Analyzing your app…</p>
        <p className="text-[11px] text-muted-foreground/30">Fetching PageSpeed + AI insights</p>
      </div>
    </div>
  )
}

// ─── Overall SEO score banner ─────────────────────────────────────────────────
function OverallScoreBanner({ score, summary }: { score: number; summary: string }) {
  const c = getScoreColor(score)
  return (
    <div className="rounded-2xl border border-border/12 bg-muted/[0.04] overflow-hidden">
      {/* Top accent stripe */}
      
      <div className="px-6 py-5 flex flex-col items-center gap-3">
        {/* Score */}
        <div className="flex items-baseline gap-1.5">
          <span className={cn('text-[52px] font-bold tabular-nums leading-none', c.tw)}>{score}</span>
          <span className="text-sm text-muted-foreground/20 font-medium">/ 100</span>
        </div>
        {/* Label row */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-muted-foreground/20 uppercase tracking-[0.2em]">
            Overall SEO Score
          </span>
          <span className={cn('text-[9px] font-bold px-2.5 py-0.5 rounded-full border', c.labelCn)}>
            {c.label}
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-muted/15 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${score}%`, background: c.barHex }}
          />
        </div>
        {summary && (
          <p className="text-[11.5px] text-muted-foreground/35 leading-relaxed text-center max-w-md pt-0.5">
            {summary}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    try { await navigator.clipboard.writeText(text) }
    catch {
      const el = document.createElement('textarea')
      el.value = text; document.body.appendChild(el); el.select()
      document.execCommand('copy'); document.body.removeChild(el)
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <button onClick={handleCopy} className={cn(
      'absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all duration-150 select-none',
     copied
  ? 'bg-primary/15 text-primary border border-primary/30'
  : 'bg-primary/10 text-primary/70 border border-primary/20 hover:bg-primary/20 hover:text-primary'
    )}>
      {copied ? <><Check className="h-3 w-3" /><span>Copied!</span></> : <><Copy className="h-3 w-3" /><span>Copy</span></>}
    </button>
  )
}

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)

  if (Array.isArray(node)) {
    return node.map(extractText).join('')
  }

  if (React.isValidElement(node)) {
    return extractText((node as React.ReactElement<any>).props.children)
  }

  return ''
}

// ─── Section variant system ───────────────────────────────────────────────────
type Variant = 'critical' | 'technical' | 'perf' | 'ai' | 'action' | 'social' | 'info'

function getVariant(title: string): Variant {
  if (/critical|missing|error|fail/i.test(title))                    return 'critical'
  if (/technical|meta|canonical|robots|crawl|sitemap|schema/i.test(title)) return 'technical'
  if (/performance|speed|load/i.test(title))                         return 'perf'
  if (/ai|modern|semantic|nlp/i.test(title))                         return 'ai'
  if (/fix|solution|recommend|action|priority|improve/i.test(title)) return 'action'
  if (/og|open.?graph|social|twitter|share/i.test(title))           return 'social'
  return 'info'
}

const VARIANTS: Record<Variant, {
  Icon: React.ElementType; ic: string; iw: string; bc: string; bg: string; badge: string; badgeCn: string
}> = {
  critical: { Icon: TriangleAlert, ic: 'text-red-400',     iw: 'bg-red-500/10 border-red-500/20',     bc: 'border-red-500/15',     bg: 'bg-red-500/[0.03]',    badge: 'Critical',    badgeCn: 'bg-red-500/10 text-red-400 border-red-500/20' },
  technical:{ Icon: Cpu,          ic: 'text-orange-400',  iw: 'bg-orange-500/10 border-orange-500/20',bc: 'border-orange-500/15',  bg: 'bg-orange-500/[0.03]', badge: 'Technical',   badgeCn: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  perf:     { Icon: Zap,          ic: 'text-purple-400',  iw: 'bg-purple-500/10 border-purple-500/20',bc: 'border-purple-500/15',  bg: 'bg-purple-500/[0.03]', badge: 'Performance', badgeCn: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  ai:       { Icon: Sparkles,     ic: 'text-blue-400',    iw: 'bg-blue-500/10 border-blue-500/20',    bc: 'border-blue-500/15',    bg: 'bg-blue-500/[0.03]',   badge: 'AI SEO',      badgeCn: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  action:   { Icon: Wrench,       ic: 'text-emerald-400', iw: 'bg-emerald-500/10 border-emerald-500/20',bc:'border-emerald-500/15',bg: 'bg-emerald-500/[0.03]',badge: 'Action',      badgeCn: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  social:   { Icon: Share2,       ic: 'text-sky-400',     iw: 'bg-sky-500/10 border-sky-500/20',      bc: 'border-sky-500/15',     bg: 'bg-sky-500/[0.03]',    badge: 'Social',      badgeCn: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  info:     { Icon: FileWarning,  ic: 'text-muted-foreground/40', iw: 'bg-muted/15 border-border/20', bc: 'border-border/12',      bg: 'bg-transparent',       badge: 'Info',        badgeCn: 'bg-muted/15 text-muted-foreground/40 border-border/20' },
}

// ─── Priority badge ───────────────────────────────────────────────────────────
function PriorityBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    HIGH:   'bg-red-500/10 text-red-400 border-red-500/25 [&>span]:bg-red-400',
    MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/25 [&>span]:bg-amber-400',
    LOW:    'bg-zinc-500/10 text-zinc-400 border-zinc-500/20 [&>span]:bg-zinc-500',
  }
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-[3px] rounded-full border align-middle mr-1.5',
      map[level] ?? map.LOW
    )}>
      <span className="h-[5px] w-[5px] rounded-full shrink-0" />{level}
    </span>
  )
}

// ─── "URL not public" callout (shown instead of AI when URL is private) ───────
function PrivateUrlCallout() {
  return (
    <div className="rounded-2xl border border-border/12 bg-muted/[0.04] p-6 flex flex-col items-center gap-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/15 border border-border/15">
        <Lock className="h-5 w-5 text-muted-foreground/40" />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-foreground/60 tracking-tight">Deploy to get AI Insights</p>
        <p className="text-[11.5px] text-muted-foreground/35 leading-relaxed max-w-xs">
          AI analysis works best with a publicly accessible URL. Deploy your app and run the audit again to get detailed SEO recommendations.
        </p>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/25 font-medium">
        <WifiOff className="h-3 w-3" />
        URL appears to be private or not yet deployed
      </div>
    </div>
  )
}

// ─── AI analysis markdown renderer ───────────────────────────────────────────
function AiAnalysis({ result }: { result: string }) {
  const parts = result.split('\n---\n')
  const aiPart = parts.length >= 3 ? parts.slice(2).join('\n---\n') : result

  const cleaned = aiPart
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]/gu, '')
    .trim()

  const scoreMatch = cleaned.match(/(\d{1,3})\s*\/\s*100/i)
  const seoScore   = scoreMatch?.[1] ? Math.min(100, parseInt(scoreMatch[1])) : null
  const summaryMatch = cleaned.match(/\d{1,3}\s*\/\s*100\s*[-–—]\s*([^.\n]{20,250}\.?)/)
  const summaryText = summaryMatch?.[1]?.replace(/\*\*/g, '').trim() ?? ''

  return (
    <div className="w-full space-y-6">
      {seoScore !== null && (
        <OverallScoreBanner score={seoScore} summary={summaryText} />
      )}

      {/* Markdown — full width, left-aligned */}
     <div className="w-full text-left space-y-4">
        <ReactMarkdown
          components={{
            h1: () => null,

            h2: ({ children }) => {
              const text = String(children).replace(/[^\w\s&/()\-–.,]/g, '').trim()
              if (!text) return null
              const v = VARIANTS[getVariant(text)]
              return (
                <div className={cn('flex items-center gap-3 mt-10 mb-4 first:mt-0 px-5 py-4 rounded-2xl border backdrop-blur-sm bg-gradient-to-r from-white/[0.04] to-transparent hover:bg-white/[0.04] transition-all duration-200 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]', v.bc, v.bg)}>
                  <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', v.iw)}>
                    <v.Icon className={cn('h-4 w-4', v.ic)} />
                  </div>
                  <span className="text-[14px] font-semibold text-foreground flex-1 tracking-tight">{text}</span>
                  <span className={cn('shrink-0 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border', v.badgeCn)}>
                    {v.badge}
                  </span>
                </div>
              )
            },

            h3: ({ children }) => (
              <div className="flex items-center gap-2 mt-5 mb-2.5">
               <span className="h-[14px] w-[2px] rounded-full bg-primary/60 shrink-0" />
               <h3 className="text-[12px] font-semibold text-foreground/70 tracking-tight">{children}</h3>
              </div>
            ),

            p: ({ children }) => (
              <p className="text-[12px] text-muted-foreground/60 leading-[1.85] mb-4 last:mb-0">{children}</p>
            ),

            ul: ({ children }) => <ul className="mb-4 space-y-2 pl-0 list-none">{children}</ul>,

            li: ({ children }) => (
              <li className="flex items-start gap-3 text-[12px] text-muted-foreground/60 leading-[1.8]">
                <span className="mt-[9px] h-[5px] w-[5px] rounded-full bg-primary/70 shadow-[0_0_6px_rgba(59,130,246,0.6)] shrink-0" />
                <span className="flex-1">{children}</span>
              </li>
            ),

            ol: ({ children }) => (
              <ol className="mb-4 pl-5 space-y-2 list-decimal text-[12px] text-muted-foreground/60">{children}</ol>
            ),

           strong: ({ children }) => {
  const text = String(children).trim()
  const up = text.toUpperCase()

  // Priority badges (HIGH / MEDIUM / LOW)
  if (['HIGH', 'MEDIUM', 'LOW'].includes(up)) {
    return <PriorityBadge level={up} />
  }

  // Keyword badges
  const map: Record<string, { variant?: any; className: string }> = {
    critical:  { className: 'bg-red-500/10 text-red-400 border-red-500/25' },
    important: { className: 'bg-orange-500/10 text-orange-400 border-orange-500/25' },
    warning:   { className: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
    fix:       { className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' },
    action:    { className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' },
    note:      { className: 'bg-blue-500/10 text-blue-400 border-blue-500/25' },
    tip:       { className: 'bg-blue-500/10 text-blue-400 border-blue-500/25' },
  }

  const key = text.toLowerCase()

  if (map[key]) {
    return (
      <Badge
        variant="outline"
        className={cn(
          'text-[10px] font-semibold px-2 py-[2px] rounded-md mr-1 uppercase tracking-wide',
          map[key].className
        )}
      >
        {text}
      </Badge>
    )
  }

  return <strong className="font-semibold ">{children}</strong>
},

            blockquote: ({ children }) => (
              <blockquote className="my-4 flex gap-3 rounded-xl border border-blue-500/12 bg-blue-500/[0.04] px-4 py-3.5 not-italic">
                <Info className="h-3.5 w-3.5 text-blue-400/50 shrink-0 mt-0.5" />
                <div className="text-[11.5px] text-muted-foreground/55 leading-relaxed">{children}</div>
              </blockquote>
            ),

            table: ({ children }) => (
              <div className="overflow-x-auto mb-4 rounded-xl border border-border/12">
                <table className="w-full border-collapse">{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead className="bg-muted/8 border-b border-border/12">{children}</thead>,
            th: ({ children }) => (
              <th className="text-left text-muted-foreground/35 font-semibold px-3.5 py-2.5 text-[10px] uppercase tracking-[0.1em]">{children}</th>
            ),
            td: ({ children }) => (
              <td className="px-3.5 py-2.5 border-b border-border/6 text-[11.5px] text-muted-foreground/55 last:border-0">{children}</td>
            ),

        code: ({ children, className }) => {
  const match = /language-(\w+)/.exec(className || '')

  if (match) {
    return (
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={match[1]}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: '16px',
          fontSize: '11px',
          borderRadius: '12px',
        }}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    )
  }

  return (
    <code className="bg-muted/20 text-foreground/65 rounded-md px-1.5 py-[2px] text-[10.5px] font-mono border border-border/12">
      {children}
    </code>
  )
},

   pre: ({ children }) => {
  const text = extractText(children)
  return (
    <div className="relative mb-4 rounded-2xl overflow-hidden border border-white/10 group">
      <CopyButton text={text} />
      {children}
    </div>
  )
},

            hr: () => <Separator className="my-6 opacity-[0.08]" />,
          }}
        >
          {cleaned}
        </ReactMarkdown>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function SeoAuditResults({
  result,
  mobileData,
  desktopData,
  loading,
  isFull = false,
  isPrivateUrl = false,
}: SeoAuditResultsProps) {
  const hasPageSpeed = mobileData ?? desktopData
  const hasBoth      = mobileData && desktopData

  if (loading) return <LoadingSkeleton />

  const pad = isFull ? 'px-8' : 'px-4'

  return (
    <div className="w-full">

      {/* ── PageSpeed block — constrained width ── */}
      <div className={cn(pad, 'py-5', isFull && 'max-w-6xl mx-auto')}>
        {hasPageSpeed ? (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground/35" />
                <span className="text-xs font-semibold text-foreground/65 tracking-tight">PageSpeed Insights</span>
              </div>
              <span className="text-[9.5px] text-muted-foreground/25 font-medium">
                Powered by Google Lighthouse
              </span>
            </div>

            {hasBoth ? (
              <Tabs defaultValue="mobile" className="w-full">
                <TabsList className="w-full h-9 bg-muted/8 border border-border/12 p-0.5 rounded-xl">
                  <TabsTrigger
                    value="mobile"
                    className="flex-1 h-8 text-[11px] gap-1.5 data-[state=active]:bg-background/80 data-[state=active]:text-foreground/70 data-[state=active]:shadow-sm rounded-lg text-muted-foreground/30 font-medium transition-all"
                  >
                    <Smartphone className="h-3 w-3" /> Mobile
                  </TabsTrigger>
                  <TabsTrigger
                    value="desktop"
                    className="flex-1 h-8 text-[11px] gap-1.5 data-[state=active]:bg-background/80 data-[state=active]:text-foreground/70 data-[state=active]:shadow-sm rounded-lg text-muted-foreground/30 font-medium transition-all"
                  >
                    <Monitor className="h-3 w-3" /> Desktop
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="mobile" className="mt-5">
                  <PageSpeedPanel data={mobileData} />
                </TabsContent>
                <TabsContent value="desktop" className="mt-5">
                  <PageSpeedPanel data={desktopData} />
                </TabsContent>
              </Tabs>
            ) : (
              <PageSpeedPanel data={(mobileData ?? desktopData)!} />
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-amber-500/12 bg-amber-500/4 px-4 py-4 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-400/55 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-400/65 mb-0.5">PageSpeed data unavailable</p>
              <p className="text-[11px] text-muted-foreground/35 leading-relaxed">
                Deploy your app to a public URL to get real performance metrics from Google PageSpeed Insights.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── AI Analysis — full page width, no max-w ── */}
      <div className={cn(pad, 'pb-8')}>
        

        {/* Centred divider heading */}
      <div className="flex items-center justify-center mb-6">
  <div className="flex items-center gap-2">
    <Sparkles className="h-3 w-3 text-primary/70" />
    <span className="text-xs font-semibold text-foreground/90 tracking-[0.2em] uppercase">
      AI Analysis
    </span>
  </div>
</div>

        {/* Content: private URL guard → callout; otherwise → full analysis */}
        {isPrivateUrl || !result ? (
          <PrivateUrlCallout />
        ) : (
          <AiAnalysis result={result} />
        )}
      </div>
    </div>
  )
}