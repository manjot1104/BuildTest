export type ResumeHeader = {
  name: string
  contact?: string
}

export type ResumeExperienceEntry = {
  title: string
  company: string
  location?: string
  dates?: string
  bullets?: string[]
}

export type ResumeEducationEntry = {
  institution: string
  degree?: string
  dates?: string
  details?: string
}

export type ResumeProjectEntry = {
  name: string
  tech?: string
  bullets?: string[]
}

export type ResumeData = {
  header: ResumeHeader
  summary?: string
  experience?: ResumeExperienceEntry[]
  education?: ResumeEducationEntry[]
  skills?: string[]
  projects?: ResumeProjectEntry[]
  /** One item per line or comma-split in mapper */
  certifications?: string[]
  achievements?: string[]
  /** Single line, e.g. "English (Native), Spanish" */
  languagesLine?: string
}

export type LayoutElement = {
  text: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  fontWeight?: string
}

export type LayoutPage = {
  elements: LayoutElement[]
}

export type ResumeLayoutResult = {
  pages: LayoutPage[]
}

export type TypographyStyle = {
  fontSize: number
  fontWeight?: string
  /** Line height as a multiple of fontSize; defaults to a resume-friendly ratio. */
  lineHeight?: number
  fontFamily: string
}

export type SegmentKind = "word" | "space"

/** One measured segment after prepare; layout walks these arrays (pretext-style parallel buffers). */
export type PreparedSegments = {
  texts: string[]
  widths: number[]
  kinds: SegmentKind[]
  fontCss: string
  fontSize: number
  fontWeight: string | undefined
  lineHeightPx: number
  measureKey: string
  normalized: string
}

export type ResumeLayoutOptions = {
  /**
   * Uniform inset from page edge to text, in mm (all sides).
   * When omitted, uses HTML PDF export: `RESUME_PDF_MARGIN_MM` + inner resume padding (20px),
   * aligned with `html-to-pdf` + design-system `.resume` padding.
   * Set explicitly for LaTeX-style estimates (e.g. 0.75in margin only).
   */
  marginMm?: number
  /** Base stack used in canvas `font` and approximate metrics. */
  fontFamily?: string
  /** Use fixed heuristic widths even when canvas is available (cross-runtime determinism). */
  forceApproximateMetrics?: boolean
  /** Passed to `Intl.Segmenter` for word boundaries. */
  locale?: string
  /**
   * When true, logs page count, line count, content box, and used height to console.
   * Or set env `DEBUG_RESUME_LAYOUT=1` (Node/server only).
   */
  debugLayout?: boolean
}
