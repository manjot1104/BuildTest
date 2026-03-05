'use client'

import React, { useState } from 'react'
import { LayoutTemplate, ArrowRight } from 'lucide-react'
import { TEMPLATES, type PersonaTemplate, type TemplateCategory } from './templates'
import { type CanvasElement, type CanvasBackground } from './types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TemplateBrowserProps {
  onApply: (elements: CanvasElement[], background: CanvasBackground) => void
  onStartBlank: () => void
}

// ─── Category labels ──────────────────────────────────────────────────────────

const CATEGORIES: { id: TemplateCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'developer', label: 'Developer' },
  { id: 'designer', label: 'Designer' },
  { id: 'personal', label: 'Personal' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'creative', label: 'Creative' },
  { id: 'photography', label: 'Photo' },
]

// ─── Thumbnail helpers ────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  navbar: '#374151',
  heading: '#3b82f6',
  paragraph: '#6b7280',
  image: '#059669',
  button: '#7c3aed',
  section: '#4b5563',
  container: '#6b7280',
  divider: '#9ca3af',
  'code-block': '#0f172a',
  'social-links': '#0891b2',
  form: '#d97706',
  icon: '#fbbf24',
  spacer: 'transparent',
  'video-embed': '#1f2937',
}

function getThumbColor(el: CanvasElement): string {
  if (el.type === 'spacer') return 'transparent'
  const explicit = el.styles.backgroundColor
  // Use the element's explicit backgroundColor when it's not transparent
  if (explicit && explicit !== 'transparent' && !explicit.startsWith('rgba(0,0,0,0)') && !explicit.startsWith('transparent')) {
    return explicit
  }
  return TYPE_COLORS[el.type] ?? '#9ca3af'
}

function getBgStyle(bg: CanvasBackground): React.CSSProperties {
  if (bg.type === 'gradient') {
    return { background: `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientFrom}, ${bg.gradientTo})` }
  }
  return { backgroundColor: bg.color }
}

// Canvas is 1440×960. Thumbnail fits in sidebar width (~196px).
// Scale = 196/1440 ≈ 0.1361, height = 960 × 0.1361 ≈ 130px
const THUMB_W = 196
const SCALE = THUMB_W / 1440
const THUMB_H = Math.round(960 * SCALE)

function TemplateThumbnail({ template }: { template: PersonaTemplate }) {
  return (
    <div
      style={{
        width: THUMB_W,
        height: THUMB_H,
        overflow: 'hidden',
        position: 'relative',
        borderRadius: 6,
        flexShrink: 0,
        ...getBgStyle(template.background),
      }}
    >
      <div
        style={{
          width: 1440,
          height: 960,
          transform: `scale(${SCALE})`,
          transformOrigin: 'top left',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {template.elements.map((el) => (
          <div
            key={el.id}
            style={{
              position: 'absolute',
              left: el.x,
              top: el.y,
              width: el.width,
              height: el.height,
              backgroundColor: getThumbColor(el),
              borderRadius: Math.min(el.styles.borderRadius ?? (el.type === 'button' ? 6 : el.type === 'divider' ? 2 : 4), 32),
              opacity: el.type === 'spacer' ? 0 : 0.88,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Apply template ───────────────────────────────────────────────────────────

function applyTemplate(template: PersonaTemplate): { elements: CanvasElement[]; background: CanvasBackground } {
  const elements = template.elements.map((el) => ({
    ...el,
    id: crypto.randomUUID(),
    // Regenerate nested IDs for form fields
    formFields: el.formFields?.map((f) => ({ ...f, id: crypto.randomUUID() })),
  }))
  return { elements, background: template.background }
}

// ─── Template Browser ─────────────────────────────────────────────────────────

export function TemplateBrowser({ onApply, onStartBlank }: TemplateBrowserProps) {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all')

  const filtered =
    activeCategory === 'all' ? TEMPLATES : TEMPLATES.filter((t) => t.category === activeCategory)

  return (
    <div className="flex flex-col gap-3">
      {/* Category filter */}
      <div className="flex flex-wrap gap-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
              activeCategory === cat.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Blank canvas card */}
      <button
        type="button"
        onClick={onStartBlank}
        className="group flex items-center gap-2.5 rounded-lg border-2 border-dashed border-border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
          <LayoutTemplate className="size-4" />
        </div>
        <div>
          <p className="text-xs font-semibold">Blank Canvas</p>
          <p className="text-[10px] text-muted-foreground">Start from scratch</p>
        </div>
      </button>

      {/* Template cards */}
      {filtered.map((template) => (
        <div
          key={template.id}
          className="overflow-hidden rounded-lg border border-border transition-all hover:border-primary hover:shadow-sm"
        >
          {/* Thumbnail */}
          <div className="pointer-events-none px-1.5 pt-1.5">
            <TemplateThumbnail template={template} />
          </div>

          {/* Info row */}
          <div className="flex items-center gap-2 px-2.5 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold leading-tight">{template.name}</p>
              <p className="truncate text-[10px] leading-tight text-muted-foreground">{template.description}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const { elements, background } = applyTemplate(template)
                onApply(elements, background)
              }}
              className="flex shrink-0 items-center gap-0.5 rounded bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Use
              <ArrowRight className="size-2.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
