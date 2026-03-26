'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Target,
  FileSearch,
  Lightbulb,
  ArrowRight,
  Shield,
  Eye,
  Zap,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

interface CategoryScore {
  score: number
  details: string
}

interface Improvement {
  section: string
  issue: string
  suggestion: string
}

interface BulletExample {
  original: string
  improved: string
}

export interface ResumeScoreData {
  score: number
  breakdown: {
    ats: CategoryScore
    content: CategoryScore
    impact: CategoryScore
    keywords: CategoryScore
    readability: CategoryScore
    experience: CategoryScore
  }
  strengths: string[]
  weaknesses: string[]
  improvements: Improvement[]
  faangReadiness: {
    atsPass: boolean
    sixSecondTest: boolean
    impactAtScale: boolean
    verdict: string
  }
  bulletAnalysis: {
    total: number
    strong: number
    weak: number
    examples: BulletExample[]
  }
}

interface ResumeScorePanelProps {
  data: ResumeScoreData
  onClose: () => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getScoreColor(score: number, max: number): string {
  const pct = (score / max) * 100
  if (pct >= 80) return 'text-emerald-500'
  if (pct >= 60) return 'text-amber-500'
  return 'text-red-500'
}

function getScoreBg(score: number, max: number): string {
  const pct = (score / max) * 100
  if (pct >= 80) return 'bg-emerald-500'
  if (pct >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

function getOverallGrade(score: number): { grade: string; label: string; color: string } {
  if (score >= 90) return { grade: 'A+', label: 'Exceptional', color: 'text-emerald-500' }
  if (score >= 85) return { grade: 'A', label: 'Excellent', color: 'text-emerald-500' }
  if (score >= 80) return { grade: 'A-', label: 'Very Good', color: 'text-emerald-400' }
  if (score >= 75) return { grade: 'B+', label: 'Good', color: 'text-sky-500' }
  if (score >= 70) return { grade: 'B', label: 'Above Average', color: 'text-sky-400' }
  if (score >= 65) return { grade: 'B-', label: 'Average', color: 'text-amber-500' }
  if (score >= 60) return { grade: 'C+', label: 'Below Average', color: 'text-amber-500' }
  if (score >= 50) return { grade: 'C', label: 'Needs Work', color: 'text-orange-500' }
  return { grade: 'D', label: 'Significant Improvements Needed', color: 'text-red-500' }
}

// ── Component ────────────────────────────────────────────────────────────────

export function ResumeScorePanel({ data, onClose }: ResumeScorePanelProps) {
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    new Set(['breakdown', 'faang']),
  )

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const grade = getOverallGrade(data.score)

  const categories = [
    { key: 'ats', label: 'ATS Compatibility', max: 20, icon: Shield },
    { key: 'content', label: 'Content Quality', max: 20, icon: FileSearch },
    { key: 'impact', label: 'Impact & Metrics', max: 20, icon: TrendingUp },
    { key: 'keywords', label: 'Keywords', max: 15, icon: Target },
    { key: 'readability', label: 'Readability', max: 15, icon: Eye },
    { key: 'experience', label: 'Experience Strength', max: 10, icon: Zap },
  ] as const

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* ── Overall Score Card ────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-primary" />
            <span className="text-sm font-medium">Resume Score</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Hide
          </button>
        </div>
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-6">
            {/* Score circle */}
            <div className="relative flex size-24 shrink-0 items-center justify-center sm:size-28">
              <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  strokeWidth="6"
                  className="stroke-muted/40"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${(data.score / 100) * 264} 264`}
                  className={cn(
                    'transition-all duration-1000',
                    data.score >= 80
                      ? 'stroke-emerald-500'
                      : data.score >= 60
                        ? 'stroke-amber-500'
                        : 'stroke-red-500',
                  )}
                />
              </svg>
              <div className="text-center">
                <span className="text-2xl font-bold sm:text-3xl">{data.score}</span>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
            </div>
            {/* Grade + summary */}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className={cn('text-2xl font-bold', grade.color)}>{grade.grade}</span>
                <span className="text-sm text-muted-foreground">{grade.label}</span>
              </div>
              {data.faangReadiness?.verdict && (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {data.faangReadiness.verdict}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Category Breakdown ────────────────────────────────────────────── */}
      <CollapsibleSection
        id="breakdown"
        title="Score Breakdown"
        icon={<TrendingUp className="size-4 text-sky-500" />}
        isOpen={expandedSections.has('breakdown')}
        onToggle={() => toggleSection('breakdown')}
      >
        <div className="space-y-3">
          {categories.map(({ key, label, max, icon: Icon }) => {
            const cat = data.breakdown[key]
            if (!cat) return null
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="size-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">{label}</span>
                  </div>
                  <span className={cn('text-xs font-bold', getScoreColor(cat.score, max))}>
                    {cat.score}/{max}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(cat.score / max) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className={cn('h-full rounded-full', getScoreBg(cat.score, max))}
                  />
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">{cat.details}</p>
              </div>
            )
          })}
        </div>
      </CollapsibleSection>

      {/* ── FAANG Readiness ───────────────────────────────────────────────── */}
      <CollapsibleSection
        id="faang"
        title="FAANG Readiness"
        icon={<Zap className="size-4 text-amber-500" />}
        isOpen={expandedSections.has('faang')}
        onToggle={() => toggleSection('faang')}
      >
        <div className="space-y-2.5">
          <FaangCheck label="Can pass ATS screening" passed={data.faangReadiness?.atsPass} />
          <FaangCheck
            label="Passes 6-second recruiter scan"
            passed={data.faangReadiness?.sixSecondTest}
          />
          <FaangCheck
            label="Demonstrates impact at scale"
            passed={data.faangReadiness?.impactAtScale}
          />
        </div>
      </CollapsibleSection>

      {/* ── Strengths & Weaknesses ────────────────────────────────────────── */}
      {data.strengths?.length > 0 && (
        <CollapsibleSection
          id="strengths"
          title={`Strengths (${data.strengths.length})`}
          icon={<CheckCircle2 className="size-4 text-emerald-500" />}
          isOpen={expandedSections.has('strengths')}
          onToggle={() => toggleSection('strengths')}
        >
          <ul className="space-y-2">
            {data.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {data.weaknesses?.length > 0 && (
        <CollapsibleSection
          id="weaknesses"
          title={`Weaknesses (${data.weaknesses.length})`}
          icon={<AlertTriangle className="size-4 text-orange-500" />}
          isOpen={expandedSections.has('weaknesses')}
          onToggle={() => toggleSection('weaknesses')}
        >
          <ul className="space-y-2">
            {data.weaknesses.map((w, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed">
                <XCircle className="mt-0.5 size-3.5 shrink-0 text-orange-500" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* ── Actionable Improvements ──────────────────────────────────────── */}
      {data.improvements?.length > 0 && (
        <CollapsibleSection
          id="improvements"
          title={`Improvements (${data.improvements.length})`}
          icon={<Lightbulb className="size-4 text-violet-500" />}
          isOpen={expandedSections.has('improvements')}
          onToggle={() => toggleSection('improvements')}
        >
          <div className="space-y-3">
            {data.improvements.map((imp, i) => (
              <div
                key={i}
                className="rounded-lg border border-border/40 bg-muted/20 p-3"
              >
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-500">
                    {imp.section}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Issue:</span> {imp.issue}
                </p>
                <div className="mt-1.5 flex gap-1.5">
                  <ArrowRight className="mt-0.5 size-3 shrink-0 text-emerald-500" />
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">{imp.suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Bullet Point Analysis ────────────────────────────────────────── */}
      {data.bulletAnalysis && (
        <CollapsibleSection
          id="bullets"
          title="Bullet Point Analysis"
          icon={<FileSearch className="size-4 text-sky-500" />}
          isOpen={expandedSections.has('bullets')}
          onToggle={() => toggleSection('bullets')}
        >
          <div className="space-y-3">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Total" value={data.bulletAnalysis.total} />
              <StatCard label="Strong" value={data.bulletAnalysis.strong} color="text-emerald-500" />
              <StatCard label="Weak" value={data.bulletAnalysis.weak} color="text-orange-500" />
            </div>

            {/* Example rewrites */}
            {data.bulletAnalysis.examples?.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Suggested Rewrites:
                </p>
                {data.bulletAnalysis.examples.map((ex, i) => (
                  <div
                    key={i}
                    className="space-y-1.5 rounded-lg border border-border/40 bg-muted/20 p-2.5"
                  >
                    <div className="flex gap-1.5">
                      <XCircle className="mt-0.5 size-3 shrink-0 text-red-400" />
                      <p className="text-[11px] leading-relaxed text-muted-foreground line-through">
                        {ex.original}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-emerald-500" />
                      <p className="text-[11px] leading-relaxed text-emerald-600 dark:text-emerald-400">
                        {ex.improved}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}
    </motion.div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function CollapsibleSection({
  id,
  title,
  icon,
  isOpen,
  onToggle,
  children,
}: {
  id: string
  title: string
  icon: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 sm:px-4"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
        <ChevronDown
          className={cn(
            'size-4 text-muted-foreground transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </button>
      {isOpen && <div className="p-3 sm:p-4">{children}</div>}
    </div>
  )
}

function FaangCheck({ label, passed }: { label: string; passed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {passed ? (
        <CheckCircle2 className="size-4 text-emerald-500" />
      ) : (
        <XCircle className="size-4 text-red-400" />
      )}
      <span className="text-xs">{label}</span>
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color?: string
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 p-2 text-center">
      <div className={cn('text-lg font-bold', color)}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  )
}
