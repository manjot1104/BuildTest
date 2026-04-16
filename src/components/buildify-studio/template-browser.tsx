'use client'

import React, { useState, useRef, useEffect } from 'react'
import { LayoutTemplate, ArrowRight, Eye } from 'lucide-react'
import { TEMPLATES, type StudioTemplate, type TemplateCategory } from './templates'
import { type CanvasElement, type CanvasBackground } from './types'
// CanvasBackground still used in applyTemplate return type
import { PreviewCanvas } from './preview-modal'

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
  { id: 'futuristic', label: 'Futuristic' },
]

// ─── Thumbnail helpers ────────────────────────────────────────────────────────

function TemplateThumbnail({ template, containerW }: { template: StudioTemplate; containerW: number }) {
  const thumbH = Math.round(960 * (containerW / 1440))

  return (
    <div
      style={{
        width: '100%',
        height: thumbH,
        overflow: 'hidden',
        position: 'relative',
        borderRadius: 8,
        pointerEvents: 'none',
      }}
    >
      <PreviewCanvas
        elements={template.elements}
        background={template.background}
        deviceWidth={1440}
        deviceHeight={960}
        containerW={containerW}
        containerH={thumbH}
        deviceId="desktop"
      />
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
  const [containerW, setContainerW] = useState(208)
  const containerRef = useRef<HTMLDivElement>(null)

  // Track sidebar width dynamically so thumbnails resize when sidebar is dragged
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(() => {
      setContainerW(el.getBoundingClientRect().width)
    })
    obs.observe(el)
    // Set initial width
    setContainerW(el.getBoundingClientRect().width)
    return () => obs.disconnect()
  }, [])

  const filtered =
    activeCategory === 'all' ? TEMPLATES : TEMPLATES.filter((t) => t.category === activeCategory)

  return (
    <div ref={containerRef} className="flex flex-col gap-4">
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
        className="group flex items-center gap-3 rounded-xl border-2 border-dashed border-border p-3 text-left transition-all hover:border-primary/50 hover:bg-muted hover:shadow-sm"
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
              <TemplateThumbnail template={template} containerW={containerW} />
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
                sessionStorage.setItem('template-preview', JSON.stringify({
                  elements: template.elements,
                  background: template.background,
                  name: template.name,
                }))
                window.open('/template-preview', '_blank')
              }}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground active:scale-95"
              title="Preview in new tab"
            >
              <Eye className="size-3" />
            </button>
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
