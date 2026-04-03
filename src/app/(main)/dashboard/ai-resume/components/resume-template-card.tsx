'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'
import { ArrowRight, Eye, FileText, Loader2 } from 'lucide-react'
import { renderTemplate, DUMMY_RESUME_DATA } from '@/lib/resume/template-renderer'
import {
  ensureLatexDummyPdfUrl,
  getCachedLatexDummyPdfUrl,
  prefetchLatexDummyPdf,
} from './latex-dummy-pdf-cache'
import { cn } from '@/lib/utils'
import type { ResumeTemplate, ResumeTemplateCategory } from '../templates'

const A4_W = 794
const A4_H = 1123
const THUMB_MAX_H = 152

type ThumbState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'html'; html: string }
  | { kind: 'pdf'; pdfUrl: string }
  | { kind: 'error'; message: string }

const htmlThumbCache = new Map<string, string>()

function useThumbScale(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = useState(0.14)

  const measure = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const w = el.clientWidth
    if (w < 8) return
    // Fit by width so thumbnail fills the full card width.
    const s = w / A4_W
    setScale(s)
  }, [containerRef])

  useEffect(() => {
    measure()
    const el = containerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure, containerRef])

  return scale
}

const categoryLabel: Record<ResumeTemplateCategory, string> = {
  professional: 'Professional',
  modern: 'Modern',
  creative: 'Creative',
  minimal: 'Minimal',
  academic: 'Academic',
  executive: 'Executive',
}

export interface ResumeTemplateCardProps {
  template: ResumeTemplate
  onSelect: () => void
  onPreview: () => void
}

export const ResumeTemplateCard = React.memo(function ResumeTemplateCard({
  template,
  onSelect,
  onPreview,
}: ResumeTemplateCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const thumbWrapRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(thumbWrapRef, { once: true, margin: '120px', amount: 0.05 })
  const scale = useThumbScale(containerRef)
  const [thumbState, setThumbState] = useState<ThumbState>({ kind: 'idle' })

  useEffect(() => {
    if (!isInView) return
    let cancelled = false

    const run = async () => {
      if (template.format === 'latex') {
        const cachedPdf = getCachedLatexDummyPdfUrl(template.id)
        if (cachedPdf) {
          if (!cancelled) setThumbState({ kind: 'pdf', pdfUrl: cachedPdf })
          return
        }

        if (!cancelled) setThumbState({ kind: 'loading' })
        try {
          const pdfUrl = await ensureLatexDummyPdfUrl(template)
          if (!cancelled) setThumbState({ kind: 'pdf', pdfUrl })
          return
        } catch {
          if (!cancelled) {
            setThumbState({ kind: 'error', message: 'Could not load exact dummy output' })
          }
          return
        }
      }

      const cachedHtml = htmlThumbCache.get(template.id)
      if (cachedHtml) {
        if (!cancelled) setThumbState({ kind: 'html', html: cachedHtml })
        return
      }

      if (!cancelled) setThumbState({ kind: 'loading' })
      try {
        const html = renderTemplate(template.styleGuide, 'html', DUMMY_RESUME_DATA)
        if (!html?.trim()) throw new Error('Empty html')
        htmlThumbCache.set(template.id, html)
        if (!cancelled) setThumbState({ kind: 'html', html })
      } catch {
        if (!cancelled) setThumbState({ kind: 'error', message: 'Could not load exact dummy output' })
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [isInView, template.id, template.format, template.styleGuide])

  const isLatex = template.format === 'latex'
  const isLoading = !isInView || thumbState.kind === 'idle' || thumbState.kind === 'loading'
  const showHtml = thumbState.kind === 'html'
  const showPdf = thumbState.kind === 'pdf'
  const showError = thumbState.kind === 'error'

  const warmLatexPdf = useCallback(() => {
    prefetchLatexDummyPdf(template)
  }, [template])

  return (
    <article
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card',
        'shadow-sm transition-all duration-300',
        'hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-primary/5',
      )}
      onMouseEnter={warmLatexPdf}
    >
      <div ref={thumbWrapRef} className="relative border-b border-border/40 bg-muted/40">
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5">
          <span
            className={cn(
              'rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-sm',
              isLatex
                ? 'bg-slate-900/75 text-amber-100/95'
                : 'bg-background/85 text-muted-foreground',
            )}
          >
            {isLatex ? 'LaTeX' : 'HTML'}
          </span>
        </div>

        <div ref={containerRef} className="relative mx-auto w-full max-w-[420px] px-3 pt-3">
          <div
            className="relative overflow-hidden rounded-t-lg bg-white shadow-inner ring-1 ring-black/5"
            style={{ height: THUMB_MAX_H }}
          >
            {isLoading && (
              <div className="flex h-full items-center justify-center bg-linear-to-b from-muted/80 to-muted/40">
                <Loader2 className="size-6 animate-spin text-muted-foreground/50" aria-hidden />
              </div>
            )}

            {showHtml && (
              <div
                className="pointer-events-none absolute left-0 top-0 origin-top-left will-change-transform"
                style={{
                  width: A4_W,
                  height: A4_H,
                  transform: `scale(${scale})`,
                }}
              >
                <iframe
                  title={`${template.name} dummy output preview`}
                  srcDoc={thumbState.kind === 'html' ? thumbState.html : ''}
                  className="block border-0 bg-white"
                  style={{ width: A4_W, height: A4_H }}
                  sandbox="allow-same-origin"
                  loading="lazy"
                />
              </div>
            )}

            {showPdf && (
              <div
                className="pointer-events-none absolute left-0 top-0 origin-top-left will-change-transform"
                style={{
                  width: A4_W,
                  height: A4_H,
                  transform: `scale(${scale})`,
                }}
              >
                <iframe
                  title={`${template.name} dummy PDF preview`}
                  src={`${thumbState.kind === 'pdf' ? thumbState.pdfUrl : ''}#view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                  className="block border-0 bg-white"
                  style={{ width: A4_W, height: A4_H }}
                  loading="lazy"
                />
              </div>
            )}

            {showError && (
              <div className="flex h-full flex-col items-center justify-center gap-2 bg-linear-to-br from-slate-100 via-white to-slate-100 px-4 text-center dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
                <FileText className="size-8 text-muted-foreground/50" aria-hidden />
                <p className="text-[11px] font-medium leading-snug text-muted-foreground">
                  {thumbState.kind === 'error' ? thumbState.message : 'Preview unavailable'}
                </p>
                <p className="text-[10px] text-muted-foreground/80">Open full Preview</p>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onPreview()
          }}
          className={cn(
            'absolute bottom-2 right-2 z-10 hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:flex',
            'bg-background/90 text-xs font-medium text-foreground shadow-md ring-1 ring-border/60 backdrop-blur-sm',
            'opacity-0 transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:ring-primary/30',
            'group-hover:opacity-100 group-focus-within:opacity-100',
            'focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary/40',
          )}
        >
          <Eye className="size-3.5" aria-hidden />
          Preview
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 pt-3 sm:p-5 sm:pt-4">
        <div className="min-w-0 space-y-1.5">
          <h3 className="text-base font-semibold leading-snug tracking-tight text-foreground sm:text-[17px]">
            {template.name}
          </h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{template.description}</p>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3">
          <span className="rounded-full bg-muted/80 px-2.5 py-1 text-[10px] font-medium capitalize text-muted-foreground">
            {categoryLabel[template.category]}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onPreview()
              }}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary sm:hidden"
              aria-label={`Preview ${template.name}`}
            >
              <Eye className="size-4" />
            </button>
            <button
              type="button"
              onClick={onSelect}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
            >
              Use template
              <ArrowRight className="size-3.5" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
})
