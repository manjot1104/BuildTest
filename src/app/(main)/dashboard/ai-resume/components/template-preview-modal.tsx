'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { X, Code, Loader2 } from 'lucide-react'
import { RESUME_TEMPLATES, type ResumeTemplate } from '../templates'
import { renderTemplate, DUMMY_RESUME_DATA } from '@/lib/resume/template-renderer'
import { resolveHtmlPreviewTemplate } from '../template-structure'

// ── A4 Page Dimensions at 96 DPI ──────────────────────────────────────────────
const A4_WIDTH = 794
const A4_MIN_HEIGHT = 1123

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
 *   HTML templates → renderTemplate() → srcdoc iframe (immediate)
 *   LaTeX templates → renderTemplate('latex') → compile-pdf API → PDF iframe
 *                   → if compilation fails → renderTemplate('html') as fallback
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
    let createdPdfUrl: string | null = null
    setPreviewError('')
    setPreviewHtml('')
    setPreviewPdfUrl('')

    const isLatexPreview = defaultFormat === 'latex' || template.format === 'latex'

    const htmlPreviewTemplate = resolveHtmlPreviewTemplate(template, RESUME_TEMPLATES)
    console.log('[ResumePreview] selected templateId:', template.id)
    console.log('[ResumePreview] rendering template:', htmlPreviewTemplate?.id ?? null)
    console.log('[ResumePreview] mode:', isLatexPreview ? 'latex-pdf' : 'html')

    const run = async () => {
      if (isLatexPreview) {
        try {
          const latexContent = renderTemplate(template.styleGuide, 'latex', DUMMY_RESUME_DATA)
          const response = await fetch('/api/resume/compile-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latex: latexContent, fileName: 'Template_Preview' }),
          })

          if (!response.ok) throw new Error('LaTeX preview compile failed')

          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          createdPdfUrl = url
          if (!cancelled) {
            setPreviewPdfUrl(url)
            setIframeHeight(A4_MIN_HEIGHT)
          } else {
            URL.revokeObjectURL(url)
          }
          return
        } catch (err) {
          console.warn('[ResumePreview] LaTeX preview compile failed, using HTML fallback:', err)
          // Fallback to mapped HTML preview so users can still inspect structure.
        }
      }

      if (!htmlPreviewTemplate) {
        if (!cancelled) {
          setPreviewError(`Preview mapping missing for template: ${template.id}`)
        }
        return
      }

      const htmlContent = renderTemplate(htmlPreviewTemplate.styleGuide, 'html', DUMMY_RESUME_DATA)
      if (!cancelled) {
        setPreviewHtml(htmlContent || '')
        setIframeHeight(A4_MIN_HEIGHT)
      }
    }

    void run()

    return () => {
      cancelled = true
      if (createdPdfUrl) {
        URL.revokeObjectURL(createdPdfUrl)
      }
    }
  }, [open, template, defaultFormat])

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

  const isHtml = true
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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
              <Code className="size-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-white">{template.name}</h2>
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
        {/* Paper container — scaled to fit viewport */}
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
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div
        className="flex h-12 shrink-0 items-center justify-between border-t px-6"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#141418' }}
      >
        <div className="flex items-center gap-4">
          <span className="text-xs text-white/40">
            Preview with sample data. Your resume will use the same layout with your information.
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
