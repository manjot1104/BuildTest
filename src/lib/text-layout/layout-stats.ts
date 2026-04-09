import { generateResumeLayout } from "./engine"
import type { ResumeData, ResumeLayoutOptions } from "./types"

export type { ResumeLayoutOptions }

/** Browser + server use the same stack string so page estimates stay comparable. */
export const TEXT_LAYOUT_ENGINE_FONT_STACK = "Inter, ui-sans-serif, system-ui, sans-serif"

/** Deterministic metrics on Node (generate API). */
export const TEXT_LAYOUT_SERVER_OPTIONS: ResumeLayoutOptions = {
  forceApproximateMetrics: true,
  fontFamily: TEXT_LAYOUT_ENGINE_FONT_STACK,
}

/** Browser insights / preview (canvas when available). */
export const TEXT_LAYOUT_CLIENT_OPTIONS: ResumeLayoutOptions = {
  fontFamily: TEXT_LAYOUT_ENGINE_FONT_STACK,
}

export type ResumeLayoutStats = {
  pageCount: number
  /** Same as laid-out text lines (one element ≈ one line). */
  lineCount: number
  fitsOnePage: boolean
  /** True when more than two A4 pages at current margins/typography. */
  exceedsTwoPages: boolean
}

/**
 * Runs the same {@link generateResumeLayout} pipeline and returns aggregate metrics (no extra canvas work beyond layout).
 */
export function computeResumeLayoutStats(
  data: ResumeData,
  options?: ResumeLayoutOptions,
): ResumeLayoutStats {
  const { pages } = generateResumeLayout(data, options)
  const lineCount = pages.reduce((n, p) => n + p.elements.length, 0)
  return {
    pageCount: pages.length,
    lineCount,
    fitsOnePage: pages.length <= 1,
    exceedsTwoPages: pages.length > 2,
  }
}

/** Matches `incomingResumeSchema` in `template-validator.ts`. */
export const RESUME_ADDITIONAL_INSTRUCTIONS_MAX = 5000

/** Matches follow-up `prompt` max in `code-validator.ts`. */
export const RESUME_FOLLOW_UP_PROMPT_MAX = 2000

export function buildLayoutHintBlock(stats: ResumeLayoutStats): string {
  return [
    "---",
    "LAYOUT_LENGTH_HINT (app text-layout engine; approximate A4 at default margins):",
    `Pages: ~${stats.pageCount}. Laid-out lines: ~${stats.lineCount}.`,
    "Prefer concise HTML/LaTeX that typically fits 1–2 PDF pages when reasonable; keep roles, dates, and quantified achievements unless the user asked to shorten.",
    "---",
  ].join("\n")
}

/**
 * Appends a soft length hint for the AI (page/line counts from the text-layout engine).
 * Truncates the user's text first if needed so the merged string stays within API limits.
 */
export function appendLayoutHintToAdditionalInstructions(
  additionalInstructions: string | undefined,
  stats: ResumeLayoutStats,
  maxTotal: number = RESUME_ADDITIONAL_INSTRUCTIONS_MAX,
): string {
  const hintBlock = buildLayoutHintBlock(stats)

  const base = (additionalInstructions ?? "").trim()
  if (!base) {
    return hintBlock.slice(0, maxTotal)
  }

  const suffix = `\n\n${hintBlock}`
  const maxUser = maxTotal - suffix.length
  if (maxUser <= 0) {
    return hintBlock.slice(0, maxTotal)
  }

  const userPart =
    base.length > maxUser ? `${base.slice(0, Math.max(0, maxUser - 1))}…` : base
  return `${userPart}${suffix}`
}

/**
 * Appends the same hint to a follow-up user prompt (shorter API limit than `additionalInstructions`).
 */
export function appendLayoutHintToFollowUpPrompt(
  prompt: string,
  stats: ResumeLayoutStats,
  maxTotal: number = RESUME_FOLLOW_UP_PROMPT_MAX,
): string {
  const hintBlock = buildLayoutHintBlock(stats)
  const base = prompt.trim()
  const suffix = `\n\n${hintBlock}`
  const maxUser = maxTotal - suffix.length
  if (maxUser <= 0) {
    return hintBlock.slice(0, maxTotal)
  }
  if (!base) {
    return hintBlock.slice(0, maxTotal)
  }
  const userPart =
    base.length > maxUser ? `${base.slice(0, Math.max(0, maxUser - 1))}…` : base
  return `${userPart}${suffix}`
}

/** Short context line for `/api/resume/score` (readability / length nudge for the model). */
export function formatLayoutContextForScoring(stats: ResumeLayoutStats): string {
  const lengthNote = stats.exceedsTwoPages
    ? "Content is long vs a typical 1–2 page resume; weigh scannability and density in readability/ATS feedback."
    : "Length is in a typical resume range for this measurement."
  return [
    "SCR_LAYOUT_CONTEXT (internal A4 text-layout engine; approximate):",
    `~${stats.pageCount} page(s), ~${stats.lineCount} laid-out lines.`,
    lengthNote,
  ].join(" ")
}
