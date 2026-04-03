import type { ResumeData } from "./types"

/**
 * Coerce pasted resume plain text into {@link ResumeData} so the text-layout engine can estimate pages/lines.
 * Heuristic only — used for scoring UI and soft hints, not structured editing.
 */
export function plainResumeTextToResumeData(raw: string): ResumeData {
  const t = raw.trim()
  if (!t.length) {
    return { header: { name: "" } }
  }

  const lines = t.split(/\r?\n/)
  const firstLine = lines.find((l) => l.trim().length > 0)?.trim() ?? ""
  if (!firstLine) {
    return { header: { name: "" } }
  }

  const start = t.indexOf(firstLine)
  const afterFirst = start >= 0 ? t.slice(start + firstLine.length).trim() : ""

  if (!afterFirst) {
    return {
      header: { name: "Pasted resume" },
      summary: t,
    }
  }

  return {
    header: { name: firstLine.slice(0, 100) },
    summary: afterFirst,
  }
}
