'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { X, Code, Loader2, LayoutGrid } from 'lucide-react'
import { type ResumeTemplate } from '../templates'
import { renderTemplate, DUMMY_RESUME_DATA } from '@/lib/resume/template-renderer'
import { ensureLatexDummyPdfUrl, getCachedLatexDummyPdfUrl } from './latex-dummy-pdf-cache'
import { resumeRenderDataToResumeData } from '@/lib/text-layout/render-data-to-resume-data'
import { ResumeLayoutPreview } from './resume-layout-preview'

// ── A4 Page Dimensions at 96 DPI ──────────────────────────────────────────────
const A4_WIDTH = 794
const A4_MIN_HEIGHT = 1123

/** Same dummy profile as HTML/LaTeX preview, converted for the text-layout engine. */
const DUMMY_RESUME_FOR_TEXT_LAYOUT = resumeRenderDataToResumeData(DUMMY_RESUME_DATA)

interface ResumeTemplatePreviewModalProps {
  open: boolean
  onClose: () => void
  template: ResumeTemplate | null
  defaultFormat?: 'latex' | 'html'
}

/**
 * Preview modal for resume templates.
 *
 * CRITICAL: This uses the EXACT same `renderTemplate()` function as the
 * fallback generator. The only difference is that preview passes
 * DUMMY_RESUME_DATA while generation passes real user data.
 * This guarantees preview ≡ final output in layout & structure.
 *
 * RENDERING PIPELINE:
 *   HTML templates → renderTemplate('html') → srcdoc iframe (same as generated HTML)
 *   LaTeX templates → renderTemplate('latex') → compile-pdf → PDF iframe (same as generated PDF)
 *
 * Text layout tab: {@link ResumeLayoutPreview} on structured dummy data (prepare + layout, no template HTML).
 */
export function ResumeTemplatePreviewModal({
  open,
  onClose,
  template,
  defaultFormat = 'html',
}: ResumeTemplatePreviewModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [previewHtml, setPreviewHtml] = useState<string>('')
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string>('')
  const [previewError, setPreviewError] = useState<string>('')
  const [scale, setScale] = useState(1)
  const [iframeHeight, setIframeHeight] = useState(A4_MIN_HEIGHT)
  const [modalView, setModalView] = useState<'template' | 'textlayout'>('template')

  // ── Calculate scale to fit paper in container ────────────────────────────
  const updateScale = useCallback(() => {
    if (!containerRef.current) return
    const availableWidth = containerRef.current.clientWidth - 48 // 24px padding each side
    const newScale = Math.min(availableWidth / A4_WIDTH, 1)
    setScale(newScale)
  }, [])

  // ── Reset state when template changes ────────────────────────────────────
  useEffect(() => {
    if (!open || !template) return
    setIframeHeight(A4_MIN_HEIGHT)
    // Calculate scale after modal opens and DOM is ready
    requestAnimationFrame(() => {
      requestAnimationFrame(updateScale)
    })
  }, [open, template, updateScale])

  // ── Recalculate scale on window resize ────────────────────────────────────
  useEffect(() => {
    if (!open) return
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [open, updateScale])

  // ── Auto-resize iframe after content loads ────────────────────────────────
  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (doc?.body) {
        // Measure actual content height, minimum A4 height
        const contentHeight = doc.documentElement.scrollHeight || doc.body.scrollHeight
        setIframeHeight(Math.max(contentHeight, A4_MIN_HEIGHT))
      }
    } catch {
      // Cross-origin restriction — fall back to A4 height
      setIframeHeight(A4_MIN_HEIGHT)
    }
  }, [])

  // ── Generate preview content (LaTeX -> compiled PDF, HTML -> iframe HTML) ──
  useEffect(() => {
    if (!open || !template) return
    let cancelled = false
    setPreviewError('')
    setPreviewHtml('')
    setPreviewPdfUrl('')

    const isLatexPreview = defaultFormat === 'latex' || template.format === 'latex'

    const run = async () => {
      if (!isLatexPreview) {
        const htmlContent = renderTemplate(template.styleGuide, 'html', DUMMY_RESUME_DATA)
        if (!cancelled) {
          setPreviewHtml(htmlContent || '')
          setIframeHeight(A4_MIN_HEIGHT)
        }
        return
      }

      // Instant paint when card hover / thumbnail already compiled this session
      const cachedPdf = getCachedLatexDummyPdfUrl(template.id)
      if (cachedPdf) {
        setPreviewPdfUrl(cachedPdf)
        setIframeHeight(A4_MIN_HEIGHT)
      }

      // LaTeX: shared cache + single in-flight compile per template (same dummy PDF as export)
      try {
        const url = await ensureLatexDummyPdfUrl(template)
        if (!cancelled) {
          setPreviewPdfUrl(url)
          setIframeHeight(A4_MIN_HEIGHT)
        }
        return
      } catch (err) {
        console.warn('[ResumePreview] LaTeX preview compile failed:', err)
        if (!cancelled) {
          setPreviewError(`LaTeX preview compile failed for "${template.name}".`)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [open, template, defaultFormat])

  useEffect(() => {
    if (open) setModalView('template')
  }, [open, template?.id])

  // ── Escape key to close ───────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open || !template) return null

  const showHtmlContent = !!previewHtml.trim()
  const showPdfContent = !!previewPdfUrl
  const isPreviewLoading = !showPdfContent && !showHtmlContent && !previewError

  // The HTML content to render — always available for both formats
  const iframeHtml = previewHtml

  // Scaled container dimensions
  const scaledWidth = A4_WIDTH * scale
  const currentHeight = iframeHeight
  const scaledHeight = currentHeight * scale

  return (
    <div className="fixed inset-0 z-9999 flex flex-col" style={{ background: '#0d0d11' }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-6"
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#141418' }}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <Code className="size-5 shrink-0 text-violet-400" />
            <h2 className="truncate text-lg font-semibold text-white">{template.name}</h2>
          </div>
          <div
            className="flex shrink-0 rounded-lg p-0.5"
            style={{ background: "rgba(255,255,255,0.06)" }}
            role="tablist"
            aria-label="Preview mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={modalView === "template"}
              onClick={() => setModalView("template")}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3"
              style={
                modalView === "template"
                  ? { background: "rgba(255,255,255,0.14)", color: "#fff" }
                  : { color: "rgba(255,255,255,0.45)" }
              }
            >
              Template
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={modalView === "textlayout"}
              onClick={() => setModalView("textlayout")}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3"
              style={
                modalView === "textlayout"
                  ? { background: "rgba(255,255,255,0.14)", color: "#fff" }
                  : { color: "rgba(255,255,255,0.45)" }
              }
            >
              <LayoutGrid className="size-3.5 opacity-90" />
              Text layout
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 transition-colors hover:bg-white/10"
          style={{ color: 'rgba(255,255,255,0.6)' }}
          title="Close preview (Esc)"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* ── Preview Content ─────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex flex-1 justify-center overflow-auto"
        style={{ background: '#1a1a1e', padding: '24px 24px 48px' }}
      >
        {modalView === "textlayout" ? (
          <div className="w-full max-w-4xl">
            <p className="mb-3 text-center text-xs text-zinc-500">
              A4 text layout from the same dummy profile (prepare + line wrap). Independent of this template&apos;s
              HTML/LaTeX styling.
            </p>
            <div style={{ maxHeight: "min(78vh, 820px)" }} className="w-full overflow-hidden">
              <ResumeLayoutPreview
                resumeData={DUMMY_RESUME_FOR_TEXT_LAYOUT}
                variant="minimal"
                scale={0.36}
                className="w-full border-white/10 bg-transparent"
              />
            </div>
          </div>
        ) : (
        <div
          style={{
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: `${A4_WIDTH}px`,
              minHeight: `${currentHeight}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              background: '#ffffff',
              borderRadius: '4px',
              boxShadow: '0 4px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* ── PDF preview for LaTeX templates (compiled from same source) ─── */}
            {showPdfContent && (
              <iframe
                ref={iframeRef}
                src={previewPdfUrl}
                style={{
                  width: `${A4_WIDTH}px`,
                  height: `${A4_MIN_HEIGHT}px`,
                  border: 'none',
                  display: 'block',
                  background: '#ffffff',
                }}
                title="Resume Preview PDF"
              />
            )}

            {/* ── HTML preview fallback ───────────────────────────────────── */}
            {showHtmlContent && (
              <>
                {iframeHtml?.trim() ? (
              <iframe
                    ref={iframeRef}
                    srcDoc={iframeHtml}
                    onLoad={handleIframeLoad}
                    style={{
                      width: `${A4_WIDTH}px`,
                      height: `${iframeHeight}px`,
                      border: 'none',
                      display: 'block',
                      background: '#ffffff',
                    }}
                    title="Resume Preview"
                  sandbox="allow-same-origin"
              />
              ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: `${A4_MIN_HEIGHT}px`,
                      gap: '12px',
                    }}
                  >
                    <Loader2
                      className="animate-spin"
                      style={{ width: '28px', height: '28px', color: '#aaa' }}
                    />
                    <span style={{ fontSize: '13px', color: '#888', fontFamily: 'system-ui' }}>
                      Generating preview…
                    </span>
                </div>
              )}
              </>
            )}

            {isPreviewLoading && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: `${A4_MIN_HEIGHT}px`,
                  gap: '18px',
                  background: 'linear-gradient(180deg, #ffffff 0%, #fcfcff 100%)',
                }}
              >
                <div
                  style={{
                    width: '110px',
                    height: '110px',
                    borderRadius: '999px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'radial-gradient(circle at center, rgba(124,58,237,0.16), rgba(124,58,237,0.06) 55%, transparent 70%)',
                  }}
                >
                  <Loader2
                    className="animate-spin"
                    style={{ width: '40px', height: '40px', color: '#7c3aed' }}
                  />
            </div>

                <div style={{ width: '300px', display: 'grid', gap: '8px' }}>
                  <div className="h-2 w-full animate-pulse rounded bg-violet-200/80" />
                  <div className="h-2 w-[92%] animate-pulse rounded bg-violet-100/90" />
                  <div className="h-2 w-[78%] animate-pulse rounded bg-violet-100/80" />
                  </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#4c1d95' }}>
                    Preparing LaTeX preview
                </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    Compiling layout... this may take a few seconds.
                  </div>
                  </div>
                </div>
              )}

            {!showPdfContent && !showHtmlContent && previewError && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: `${A4_MIN_HEIGHT}px`,
                  gap: '10px',
                  padding: '24px',
                }}
              >
                <span style={{ fontSize: '13px', color: '#666', fontFamily: 'system-ui', textAlign: 'center' }}>
                  {previewError}
                </span>
            </div>
          )}

          </div>
        </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div
        className="flex h-12 shrink-0 items-center justify-between border-t px-6"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#141418' }}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
          <span className="text-xs text-white/40">
            {modalView === "textlayout"
              ? "Text layout tab: A4 wrap from the text engine (dummy data). Switch to Template for HTML/PDF styling."
              : "Preview with sample data. Your resume will use the same layout with your information."}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-white/5 px-3 py-1 text-xs text-white/60">
            {template.category}
          </span>
        </div>
      </div>
    </div>
  )
}
