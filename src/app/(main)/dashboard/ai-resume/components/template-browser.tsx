'use client'

import React, { useState, useMemo } from 'react'
import { FileText, Briefcase, GraduationCap, Sparkles, Palette, User } from 'lucide-react'
import { RESUME_TEMPLATES, type ResumeTemplate, type ResumeTemplateCategory } from '../templates'
import { ResumeTemplatePreviewModal } from './template-preview-modal'
import { ResumeTemplateCard } from './resume-template-card'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResumeTemplateBrowserProps {
  onSelect: (template: ResumeTemplate) => void
  defaultFormat?: 'latex' | 'html'
}

// ─── Category labels ──────────────────────────────────────────────────────────

const CATEGORIES: { id: ResumeTemplateCategory | 'all'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'all', label: 'All', icon: FileText },
  { id: 'professional', label: 'Professional', icon: Briefcase },
  { id: 'modern', label: 'Modern', icon: Sparkles },
  { id: 'creative', label: 'Creative', icon: Palette },
  { id: 'minimal', label: 'Minimal', icon: FileText },
  { id: 'academic', label: 'Academic', icon: GraduationCap },
  { id: 'executive', label: 'Executive', icon: User },
]

// ─── Template Browser ─────────────────────────────────────────────────────────

export function ResumeTemplateBrowser({ onSelect, defaultFormat = 'html' }: ResumeTemplateBrowserProps) {
  const [activeCategory, setActiveCategory] = useState<ResumeTemplateCategory | 'all'>('all')
  const [previewTemplate, setPreviewTemplate] = useState<ResumeTemplate | null>(null)

  const formatFiltered = useMemo(() => {
    return RESUME_TEMPLATES.filter((t) => {
      if (!t.format || t.format === 'both') {
        return defaultFormat === 'html'
      }
      return t.format === defaultFormat
    })
  }, [defaultFormat])

  const filtered = useMemo(() => {
    return activeCategory === 'all' ? formatFiltered : formatFiltered.filter((t) => t.category === activeCategory)
  }, [formatFiltered, activeCategory])

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:gap-10 lg:py-10">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Resume</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Choose a template</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground sm:text-[15px]">
          Each card shows a live preview of the layout. Open <span className="font-medium text-foreground/90">Preview</span>{' '}
          for full-screen detail (including an A4 text-layout view). LaTeX templates open the same PDF pipeline as export.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition-all sm:px-4 ${
                activeCategory === cat.id
                  ? 'border-primary/30 bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'border-border/60 bg-muted/40 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="size-3.5 shrink-0 opacity-90" />
              {cat.label}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
        {filtered.map((template) => (
          <ResumeTemplateCard
            key={template.id}
            template={template}
            onSelect={() => onSelect(template)}
            onPreview={() => setPreviewTemplate(template)}
          />
        ))}
      </div>

      <ResumeTemplatePreviewModal
        open={previewTemplate !== null}
        onClose={() => setPreviewTemplate(null)}
        template={previewTemplate}
        defaultFormat={defaultFormat}
      />
    </div>
  )
}
