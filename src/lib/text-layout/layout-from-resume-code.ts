import { resumeCodeToPlainTextForLayout } from "./code-to-plain-text-for-layout"
import { RESUME_LATEX_MARGIN_MM } from "./constants"
import {
  appendLayoutHintToFollowUpPrompt,
  computeResumeLayoutStats,
  TEXT_LAYOUT_SERVER_OPTIONS,
  type ResumeLayoutOptions,
  type ResumeLayoutStats,
} from "./layout-stats"
import { plainResumeTextToResumeData } from "./plain-text-to-resume-data"

const MIN_STRIPPED_CHARS = 40

/**
 * Page/line estimate from current HTML or LaTeX resume code (stripped to plain text).
 * Returns `null` if there is not enough text for a meaningful estimate.
 */
export function computeResumeLayoutStatsFromResumeCode(
  code: string,
  format: "html" | "latex",
  options?: ResumeLayoutOptions,
): ResumeLayoutStats | null {
  const plain = resumeCodeToPlainTextForLayout(code, format).trim()
  if (plain.length < MIN_STRIPPED_CHARS) {
    return null
  }
  try {
    const data = plainResumeTextToResumeData(plain)
    const merged: ResumeLayoutOptions = {
      ...options,
      marginMm:
        options?.marginMm ??
        (format === "latex" ? RESUME_LATEX_MARGIN_MM : undefined),
    }
    const stats = computeResumeLayoutStats(data, merged)
    return stats.lineCount > 0 ? stats : null
  } catch {
    return null
  }
}

/** Server follow-up: append length hint from current HTML/LaTeX (not the form). */
export function mergeFollowUpPromptWithLayoutHintFromCode(
  code: string,
  format: "html" | "latex",
  prompt: string,
): string {
  const stats = computeResumeLayoutStatsFromResumeCode(code, format, TEXT_LAYOUT_SERVER_OPTIONS)
  if (!stats) return prompt
  return appendLayoutHintToFollowUpPrompt(prompt, stats)
}
