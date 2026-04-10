/** A4 at 96 CSS px per inch → mm conversion (CSS reference pixels). */
export const RESUME_MM_TO_PX = 96 / 25.4

export function mmToPx(mm: number): number {
  return mm * RESUME_MM_TO_PX
}

export const RESUME_A4_MM = { width: 210, height: 297 } as const

export const RESUME_A4_PX = {
  width: mmToPx(RESUME_A4_MM.width),
  height: mmToPx(RESUME_A4_MM.height),
} as const

/**
 * Matches `page.pdf({ margin })` in `src/lib/html-to-pdf.ts` (Puppeteer A4 export).
 */
export const RESUME_PDF_MARGIN_MM = 10

/**
 * Matches design-system `--rs-page-pad-x` / `--rs-page-pad-y` on `.resume` / `.page`.
 * This is the inner inset *after* the PDF margin, where body text starts.
 */
export const RESUME_CONTENT_INSET_PX = 20

/**
 * LaTeX compile wrapper uses `\\usepackage[margin=0.75in]{geometry}`.
 * Used when estimating from LaTeX source (`computeResumeLayoutStatsFromResumeCode`).
 */
export const RESUME_LATEX_MARGIN_MM = 0.75 * 25.4

/**
 * Horizontal/vertical inset from the physical page edge to the **text box** used for wrapping.
 * - Default: PDF export margin + inner resume padding (HTML path).
 * - Override: explicit `marginMm` only (LaTeX path or custom).
 */
export function resumeLayoutInsetPx(overrideMarginMm?: number): number {
  if (overrideMarginMm !== undefined) {
    return mmToPx(overrideMarginMm)
  }
  return mmToPx(RESUME_PDF_MARGIN_MM) + RESUME_CONTENT_INSET_PX
}
