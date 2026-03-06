'use client'

import React, { useState } from 'react'
import { LayoutTemplate, ArrowRight } from 'lucide-react'
import { TEMPLATES, type StudioTemplate, type TemplateCategory } from './templates'
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

// Canvas is 1440×960. Thumbnail uses full sidebar width minus 2×8px padding = ~208px
// but clamped for safety. Scale ≈ 208/1440, height = 960 × scale
const THUMB_W = 208
const SCALE = THUMB_W / 1440
const THUMB_H = Math.round(960 * SCALE)

function TemplateThumbnail({ template }: { template: StudioTemplate }) {
  return (
    <div
      style={{
        width: '100%',
        height: THUMB_H,
        overflow: 'hidden',
        position: 'relative',
        borderRadius: 8,
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
              opacity: el.type === 'spacer' ? 0 : 0.9,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Apply template ───────────────────────────────────────────────────────────

function applyTemplate(template: StudioTemplate): { elements: CanvasElement[]; background: CanvasBackground } {
  const elements = template.elements.map((el) => ({
    ...el,
    id: crypto.randomUUID(),
    formFields: el.formFields?.map((f) => ({ ...f, id: crypto.randomUUID() })),
  }))
  return { elements, background: template.background }
}

// ─── Template Browser ─────────────────────────────────────────────────────────

export function TemplateBrowser({ onApply, onStartBlank }: TemplateBrowserProps) {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all')
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const filtered =
    activeCategory === 'all' ? TEMPLATES : TEMPLATES.filter((t) => t.category === activeCategory)

  return (
    <div className="flex flex-col gap-4">
      {/* Category filter */}
      <div className="flex flex-wrap gap-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-all ${
              activeCategory === cat.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Blank canvas */}
      <button
        type="button"
        onClick={onStartBlank}
        className="group flex items-center gap-3 rounded-xl border-2 border-dashed border-border p-3 text-left transition-all hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted transition-all group-hover:bg-primary/10 group-hover:text-primary">
          <LayoutTemplate className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
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
          className="group overflow-hidden rounded-xl border border-border transition-all duration-200 hover:border-primary/50 hover:shadow-md"
          onMouseEnter={() => setHoveredId(template.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          {/* Thumbnail */}
          <div className="pointer-events-none overflow-hidden">
            <div
              className="transition-transform duration-300 ease-out"
              style={{ transform: hoveredId === template.id ? 'scale(1.03)' : 'scale(1)' }}
            >
              <TemplateThumbnail template={template} />
            </div>
          </div>

          {/* Info row */}
          <div className="flex items-center gap-2 border-t border-border/50 bg-background px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold leading-tight">{template.name}</p>
              <p className="truncate text-[10px] leading-tight text-muted-foreground capitalize">
                {template.category}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const { elements, background } = applyTemplate(template)
                onApply(elements, background)
              }}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition-all hover:opacity-90 hover:shadow-sm active:scale-95"
            >
              Use
              <ArrowRight className="size-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
