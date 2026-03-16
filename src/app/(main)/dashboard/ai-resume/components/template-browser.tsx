'use client'

import React, { useState } from 'react'
import { FileText, ArrowRight, Briefcase, GraduationCap, Sparkles, Palette, User, Eye } from 'lucide-react'
import { RESUME_TEMPLATES, type ResumeTemplate, type ResumeTemplateCategory } from '../templates'
import { ResumeTemplatePreviewModal } from './template-preview-modal'

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

// ─── Category Icons ───────────────────────────────────────────────────────────

const getCategoryIcon = (category: ResumeTemplateCategory) => {
  switch (category) {
    case 'professional':
      return Briefcase
    case 'modern':
      return Sparkles
    case 'creative':
      return Palette
    case 'minimal':
      return FileText
    case 'academic':
      return GraduationCap
    case 'executive':
      return User
    default:
      return FileText
  }
}

// ─── Template Browser ─────────────────────────────────────────────────────────

export function ResumeTemplateBrowser({ onSelect, defaultFormat = 'html' }: ResumeTemplateBrowserProps) {
  const [activeCategory, setActiveCategory] = useState<ResumeTemplateCategory | 'all'>('all')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<ResumeTemplate | null>(null)
  const [previewFormat, setPreviewFormat] = useState<'latex' | 'html'>(defaultFormat)

  // Filter templates by format (LaTeX or HTML)
  const formatFiltered = RESUME_TEMPLATES.filter((t) => {
    if (!t.format || t.format === 'both') {
      // If no format specified or 'both', show only HTML templates for HTML format, LaTeX for LaTeX format
      // For backward compatibility, assume existing templates without format are HTML
      return defaultFormat === 'html'
    }
    return t.format === defaultFormat
  })

  const filtered =
    activeCategory === 'all' ? formatFiltered : formatFiltered.filter((t) => t.category === activeCategory)

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">Choose a Template</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Select a resume template to get started. You can customize it later.
        </p>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap justify-center gap-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              <Icon className="size-3.5" />
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((template) => {
          const CategoryIcon = getCategoryIcon(template.category)
          return (
            <div
              key={template.id}
              onMouseEnter={() => setHoveredId(template.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="group relative overflow-hidden rounded-xl border border-border/60 bg-card transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              
              <div className="relative flex flex-col gap-4 p-6">
                {/* Icon and Category */}
                <div className="flex items-start justify-between">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                    <CategoryIcon className="size-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPreviewTemplate(template)
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-muted/80 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
                      title="Preview template"
                    >
                      <Eye className="size-3.5" />
                      <span className="hidden sm:inline">Preview</span>
                    </button>
                    <ArrowRight className="size-4 -translate-x-1 text-muted-foreground/0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-primary" />
                  </div>
                </div>

                {/* Template Info */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{template.name}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {template.description}
                  </p>
                </div>

                {/* Preview */}
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {template.preview}
                  </p>
                </div>

                {/* Category Badge and Use Button */}
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md bg-muted/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                    {template.category}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelect(template)}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition-all hover:opacity-90 hover:shadow-sm active:scale-95"
                  >
                    Use
                    <ArrowRight className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Preview Modal */}
      <ResumeTemplatePreviewModal
        open={previewTemplate !== null}
        onClose={() => setPreviewTemplate(null)}
        template={previewTemplate}
        defaultFormat={previewFormat}
      />
    </div>
  )
}
