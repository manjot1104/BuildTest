/**
 * Typography + spacing for the Pretext-style text-layout engine.
 * Keep numeric values aligned with `src/lib/resume/resume-design-system.ts` (:root tokens).
 */

export const RESUME_LAYOUT_FONT_STACK =
  "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"

/**
 * Font metrics used for canvas measurement + line breaking.
 * Sizes are px; lineHeight is a unitless multiplier (same meaning as CSS line-height on inline text).
 */
export const RESUME_LAYOUT_TYPOGRAPHY = {
  name: { fontSize: 26, fontWeight: "700" as const, lineHeight: 1.15 },
  contact: { fontSize: 11.5, fontWeight: "400" as const, lineHeight: 1.45 },
  sectionTitle: { fontSize: 15, fontWeight: "700" as const, lineHeight: 1.25 },
  body: { fontSize: 11.5, fontWeight: "400" as const, lineHeight: 1.45 },
  bodyStrong: { fontSize: 11.5, fontWeight: "600" as const, lineHeight: 1.45 },
  meta: { fontSize: 11.5, fontWeight: "400" as const, lineHeight: 1.45 },
  bullet: { fontSize: 11.5, fontWeight: "400" as const, lineHeight: 1.45 },
} as const

/** Vertical rhythm (px) — matches design-system section / bullet spacing. */
export const RESUME_LAYOUT_SPACE_PX = {
  /** Bullet / tight gap — ~ --rs-bullet-gap */
  xs: 4,
  /** Heading → body — ~ --rs-heading-to-content */
  sm: 7,
  /** Section / block gap — ~ --rs-section-gap */
  md: 14,
  /** After name + contact block */
  lg: 14,
  /** Between jobs / projects */
  xl: 14,
} as const
