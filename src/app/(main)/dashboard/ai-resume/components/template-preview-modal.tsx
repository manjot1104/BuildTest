'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { X, FileText, Code, Monitor, Loader2 } from 'lucide-react'
import type { ResumeTemplate } from '../templates'
import { renderTemplate, DUMMY_RESUME_DATA } from '@/lib/resume/template-renderer'

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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isCompilingPdf, setIsCompilingPdf] = useState(false)
  const [currentFormat, setCurrentFormat] = useState<'latex' | 'html'>(defaultFormat)
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
    const format = template.format || 'both'
    const newFormat =
      format === 'latex' ? 'latex' : format === 'html' ? 'html' : defaultFormat
    setCurrentFormat(newFormat)
    setPdfUrl(null)
    setIframeHeight(A4_MIN_HEIGHT)
    // Calculate scale after modal opens and DOM is ready
    requestAnimationFrame(() => {
      requestAnimationFrame(updateScale)
    })
  }, [open, template, defaultFormat, updateScale])

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

  // ── Generate preview content using the SAME renderer as final output ──────
  useEffect(() => {
    if (!open || !template) return
    let cancelled = false
    const format = template.format || 'both'
    const effectiveFormat = format === 'both' ? currentFormat : format

    // Always generate HTML preview (used as fallback for LaTeX too)
    const htmlContent = renderTemplate(template.styleGuide, 'html', DUMMY_RESUME_DATA)
    if (!cancelled) {
      setPreviewHtml(htmlContent || '')
    }

    if (effectiveFormat === 'latex') {
      // Generate LaTeX code for compilation
      const latexCode = renderTemplate(template.styleGuide, 'latex', DUMMY_RESUME_DATA)

      // Attempt PDF compilation
      setIsCompilingPdf(true)
      setPdfUrl(null)

      fetch('/api/resume/compile-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latex: latexCode, fileName: 'Preview' }),
      })
        .then(async (res) => {
          if (cancelled) return
          if (res.ok) {
            const blob = await res.blob()
            // Verify it's actually a PDF
            if (blob.size > 0 && blob.type.includes('pdf')) {
            setPdfUrl(URL.createObjectURL(blob))
            }
      } else {
            // PDF compilation failed — HTML fallback will be shown automatically
            }
          })
          .catch(() => {
          // PDF compilation failed — HTML fallback will be shown automatically
          })
          .finally(() => {
            if (!cancelled) setIsCompilingPdf(false)
          })
      } else {
      // HTML format — just use the rendered HTML
        setPdfUrl(null)
      setIframeHeight(A4_MIN_HEIGHT)
    }

    return () => {
      cancelled = true
    }
  }, [open, template, currentFormat])

  // ── Cleanup PDF URL on unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

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

  const templateFormat = template.format || 'both'
  const showFormatToggle = templateFormat === 'both' || !template.format
  const displayFormat =
    templateFormat === 'latex'
    ? 'latex' 
    : templateFormat === 'html' 
    ? 'html' 
    : currentFormat
  const isHtml = displayFormat === 'html'

  // Determine what to show in preview area:
  // - HTML templates → always show HTML iframe
  // - LaTeX templates → show PDF if compiled, else show HTML fallback
  const showPdfPreview = !isHtml && pdfUrl && !isCompilingPdf
  const showHtmlFallback = !isHtml && !pdfUrl && !isCompilingPdf
  const showCompiling = !isHtml && isCompilingPdf
  const showHtmlDirect = isHtml

  // The HTML content to render — always available for both formats
  const iframeHtml = previewHtml

  // Scaled container dimensions
  const scaledWidth = A4_WIDTH * scale
  const currentHeight = showPdfPreview ? A4_MIN_HEIGHT : iframeHeight
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
            {isHtml ? (
              <Code className="size-5 text-violet-400" />
            ) : (
              <FileText className="size-5 text-blue-400" />
            )}
            <h2 className="text-lg font-semibold text-white">{template.name}</h2>
          </div>
          
          {showFormatToggle && (
            <>
              <div className="h-4 w-px bg-white/10" />
              <div
                className="flex items-center gap-1 rounded-lg p-0.5"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setCurrentFormat('html')}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors"
                  style={{ 
                    color: currentFormat === 'html' ? '#fff' : 'rgba(255,255,255,0.5)',
                    background:
                      currentFormat === 'html' ? 'rgba(255,255,255,0.12)' : 'transparent',
                  }}
                >
                  <Monitor className="size-3.5" />
                  HTML
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentFormat('latex')}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors"
                  style={{ 
                    color: currentFormat === 'latex' ? '#fff' : 'rgba(255,255,255,0.5)',
                    background:
                      currentFormat === 'latex' ? 'rgba(255,255,255,0.12)' : 'transparent',
                  }}
                >
                  <FileText className="size-3.5" />
                  LaTeX
                </button>
              </div>
            </>
          )}

          {/* Show notice when using HTML fallback for LaTeX */}
          {showHtmlFallback && (
            <>
              <div className="h-4 w-px bg-white/10" />
              <span className="rounded-md bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-400">
                Showing HTML preview (PDF compilation pending)
              </span>
            </>
          )}
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
            {/* ── Compiling state ──────────────────────────────────────── */}
            {showCompiling && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: `${A4_MIN_HEIGHT}px`,
                  gap: '16px',
                }}
              >
                <Loader2
                  className="animate-spin"
                  style={{ width: '36px', height: '36px', color: '#6366f1' }}
                />
                <span style={{ fontSize: '14px', color: '#555', fontFamily: 'system-ui' }}>
                  Compiling LaTeX to PDF…
                </span>
                <span style={{ fontSize: '12px', color: '#999', fontFamily: 'system-ui' }}>
                  This may take a few seconds
                </span>
                </div>
              )}

            {/* ── PDF preview (LaTeX compiled successfully) ───────────── */}
            {showPdfPreview && pdfUrl && (
                <iframe
                  src={pdfUrl}
                style={{
                  width: `${A4_WIDTH}px`,
                  height: `${A4_MIN_HEIGHT}px`,
                  border: 'none',
                  display: 'block',
                }}
                title="LaTeX Resume Preview (PDF)"
              />
            )}

            {/* ── HTML preview (direct or fallback for LaTeX) ────────── */}
            {(showHtmlDirect || showHtmlFallback) && (
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
            {showHtmlFallback
              ? 'Showing HTML layout preview. Final LaTeX PDF may differ slightly in typography.'
              : 'Preview with sample data. Your resume will use the same layout with your information.'}
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
