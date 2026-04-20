import type { ResumeTemplate } from '@/app/(main)/dashboard/ai-resume/templates'

/** Shown when a preview URL fails to load. */
export const LATEX_PREVIEW_PLACEHOLDER = '/templates/placeholder-latex.svg'

/**
 * Two static pages for LaTeX preview (typical: page 1 + page 2 screenshots).
 * Convention: `public/templates/{id}-1.jpg` and `{id}-2.jpg` (JPEG).
 */
export function getLatexTemplatePreviewImageSources(template: ResumeTemplate): readonly [string, string] {
  const explicit = template.previewImages
  if (
    explicit?.length === 2 &&
    explicit[0]?.trim() &&
    explicit[1]?.trim()
  ) {
    return [explicit[0].trim(), explicit[1].trim()] as const
  }
  const first = template.previewImage?.trim() ?? `/templates/${template.id}-1.jpg`
  const second = template.previewImage2?.trim() ?? `/templates/${template.id}-2.jpg`
  return [first, second] as const
}

function withJpegFallback(src: string): readonly [string, string] {
  if (src.endsWith('.jpg')) return [src, `${src.slice(0, -4)}.jpeg`] as const
  if (src.endsWith('.jpeg')) return [src, `${src.slice(0, -5)}.jpg`] as const
  return [src, src] as const
}

/** Candidate URLs for each page: tries .jpg and .jpeg automatically. */
export function getLatexTemplatePreviewImageCandidates(
  template: ResumeTemplate,
): readonly [readonly [string, string], readonly [string, string]] {
  const [first, second] = getLatexTemplatePreviewImageSources(template)
  return [withJpegFallback(first), withJpegFallback(second)] as const
}

/** First page only (legacy / simple callers). */
export function getLatexTemplatePreviewImageSrc(template: ResumeTemplate): string {
  return getLatexTemplatePreviewImageSources(template)[0]
}

const latexPreviewPreloadCache = new Set<string>()

/**
 * Warm up browser cache for LaTeX preview screenshots.
 * Safe no-op on server.
 */
export function preloadLatexTemplatePreviewFirstPage(template: ResumeTemplate): void {
  if (typeof window === 'undefined') return
  const [firstPageCandidates] = getLatexTemplatePreviewImageCandidates(template)
  for (const src of firstPageCandidates) {
    if (!src || latexPreviewPreloadCache.has(src)) continue
    latexPreviewPreloadCache.add(src)
    const img = new Image()
    img.decoding = 'async'
    img.src = src
  }
}
