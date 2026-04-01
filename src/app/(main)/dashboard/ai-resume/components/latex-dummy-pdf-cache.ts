/**
 * Session cache + single in-flight compile per template for LaTeX dummy PDF previews.
 * Same `renderTemplate(..., 'latex', DUMMY_RESUME_DATA)` + `/api/resume/compile-pdf` as export.
 */
import { renderTemplate, DUMMY_RESUME_DATA } from '@/lib/resume/template-renderer'
import type { ResumeTemplate } from '../templates'

const urlByTemplateId = new Map<string, string>()
const pendingByTemplateId = new Map<string, Promise<string>>()

export function getCachedLatexDummyPdfUrl(templateId: string): string | undefined {
  return urlByTemplateId.get(templateId)
}

/**
 * Returns a blob URL for the compiled dummy PDF. Concurrent calls for the same template share one compile.
 */
export async function ensureLatexDummyPdfUrl(template: ResumeTemplate): Promise<string> {
  const hit = urlByTemplateId.get(template.id)
  if (hit) return hit

  const existing = pendingByTemplateId.get(template.id)
  if (existing) return existing

  const promise = (async () => {
    const latexContent = renderTemplate(template.styleGuide, 'latex', DUMMY_RESUME_DATA)
    const response = await fetch('/api/resume/compile-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latex: latexContent, fileName: `Template_${template.id}` }),
    })
    if (!response.ok) throw new Error('LaTeX compile failed')

    const blob = await response.blob()
    const pdfUrl = URL.createObjectURL(blob)
    urlByTemplateId.set(template.id, pdfUrl)
    return pdfUrl
  })()
    .finally(() => {
      pendingByTemplateId.delete(template.id)
    })

  pendingByTemplateId.set(template.id, promise)
  return promise
}

/** Fire-and-forget warm-up (e.g. hover) — exact same pipeline as preview. */
export function prefetchLatexDummyPdf(template: ResumeTemplate): void {
  if (template.format !== 'latex') return
  void ensureLatexDummyPdfUrl(template).catch(() => {
    /* ignore — card/modal will surface errors */
  })
}
