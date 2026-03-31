'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Target,
  Lightbulb,
  Shield,
  Eye,
  Zap,
  FileSearch,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

export interface ResumeScoreData {
  score: number
  breakdown: {
    ats: number
    content: number
    impact: number
    keywords: number
    readability: number
    experience: number
  }
  strengths: string[]
  weaknesses: string[]
  improvements: string[]
}

interface ResumeScorePanelProps {
  data: ResumeScoreData
  onClose: () => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number, max: number): string {
  const pct = (score / max) * 100
  if (pct >= 80) return 'text-emerald-500'
  if (pct >= 60) return 'text-amber-500'
  return 'text-red-500'
}

function scoreBg(score: number, max: number): string {
  const pct = (score / max) * 100
  if (pct >= 80) return 'bg-emerald-500'
  if (pct >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

function getGrade(score: number): { grade: string; label: string; color: string } {
  if (score >= 90) return { grade: 'A+', label: 'Exceptional', color: 'text-emerald-500' }
  if (score >= 85) return { grade: 'A', label: 'Excellent', color: 'text-emerald-500' }
  if (score >= 80) return { grade: 'A-', label: 'Very Good', color: 'text-emerald-400' }
  if (score >= 75) return { grade: 'B+', label: 'Good', color: 'text-sky-500' }
  if (score >= 70) return { grade: 'B', label: 'Above Average', color: 'text-sky-400' }
  if (score >= 65) return { grade: 'B-', label: 'Average', color: 'text-amber-500' }
  if (score >= 60) return { grade: 'C+', label: 'Below Average', color: 'text-amber-500' }
  if (score >= 50) return { grade: 'C', label: 'Needs Work', color: 'text-orange-500' }
  return { grade: 'D', label: 'Major Improvements Needed', color: 'text-red-500' }
}

// ── Categories config ────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'ats', label: 'ATS Compatibility', max: 20, icon: Shield },
  { key: 'content', label: 'Content Quality', max: 20, icon: FileSearch },
  { key: 'impact', label: 'Impact & Metrics', max: 20, icon: TrendingUp },
  { key: 'keywords', label: 'Keywords Match', max: 15, icon: Target },
  { key: 'readability', label: 'Readability', max: 15, icon: Eye },
  { key: 'experience', label: 'Experience Strength', max: 10, icon: Zap },
] as const

// ── Component ────────────────────────────────────────────────────────────────

export function ResumeScorePanel({ data, onClose }: ResumeScorePanelProps) {
  const [open, setOpen] = React.useState<Set<string>>(new Set(['breakdown']))
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const grade = getGrade(data.score)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-3"
    >
      {/* ── Overall Score ───────────────────────────────────────────────────── */}
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
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-5">
            {/* Circular progress */}
            <div className="relative flex size-22 shrink-0 items-center justify-center sm:size-24">
              <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" strokeWidth="6" className="stroke-muted/40" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${(data.score / 100) * 264} 264`}
                  className={cn(
                    'transition-all duration-700',
                    data.score >= 80 ? 'stroke-emerald-500' : data.score >= 60 ? 'stroke-amber-500' : 'stroke-red-500',
                  )}
                />
              </svg>
              <div className="text-center">
                <span className="text-2xl font-bold">{data.score}</span>
                <span className="text-[10px] text-muted-foreground">/100</span>
              </div>
            </div>
            {/* Grade */}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className={cn('text-2xl font-bold', grade.color)}>{grade.grade}</span>
                <span className="text-sm text-muted-foreground">{grade.label}</span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Scored across 6 categories by AI recruiter analysis.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Score Breakdown ─────────────────────────────────────────────────── */}
      <Section
        id="breakdown"
        title="Score Breakdown"
        icon={<TrendingUp className="size-4 text-sky-500" />}
        isOpen={open.has('breakdown')}
        onToggle={() => toggle('breakdown')}
      >
        <div className="space-y-3">
          {CATEGORIES.map(({ key, label, max, icon: Icon }) => {
            const val = data.breakdown?.[key] ?? 0
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="size-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">{label}</span>
                  </div>
                  <span className={cn('text-xs font-bold tabular-nums', scoreColor(val, max))}>
                    {val}/{max}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(val / max) * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.05 }}
                    className={cn('h-full rounded-full', scoreBg(val, max))}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      {/* ── Strengths ───────────────────────────────────────────────────────── */}
      {data.strengths?.length > 0 && (
        <Section
          id="strengths"
          title={`Strengths (${data.strengths.length})`}
          icon={<CheckCircle2 className="size-4 text-emerald-500" />}
          isOpen={open.has('strengths')}
          onToggle={() => toggle('strengths')}
        >
          <ul className="space-y-2">
            {data.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── Weaknesses ──────────────────────────────────────────────────────── */}
      {data.weaknesses?.length > 0 && (
        <Section
          id="weaknesses"
          title={`Weaknesses (${data.weaknesses.length})`}
          icon={<AlertTriangle className="size-4 text-orange-500" />}
          isOpen={open.has('weaknesses')}
          onToggle={() => toggle('weaknesses')}
        >
          <ul className="space-y-2">
            {data.weaknesses.map((w, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed">
                <XCircle className="mt-0.5 size-3.5 shrink-0 text-orange-500" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── Improvements ────────────────────────────────────────────────────── */}
      {data.improvements?.length > 0 && (
        <Section
          id="improvements"
          title={`Improvements (${data.improvements.length})`}
          icon={<Lightbulb className="size-4 text-violet-500" />}
          isOpen={open.has('improvements')}
          onToggle={() => toggle('improvements')}
        >
          <ul className="space-y-2">
            {data.improvements.map((imp, i) => (
              <li
                key={i}
                className="flex gap-2 rounded-lg border border-border/40 bg-muted/20 p-2.5 text-xs leading-relaxed"
              >
                <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-violet-500" />
                <span>{imp}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </motion.div>
  )
}

// ── Collapsible Section ──────────────────────────────────────────────────────

function Section({
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
        <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
      </button>
      {isOpen && <div className="p-3 sm:p-4">{children}</div>}
    </div>
  )
}
