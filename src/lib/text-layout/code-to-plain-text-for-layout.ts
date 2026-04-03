/**
 * Strip resume HTML/LaTeX to rough plain text for {@link plainResumeTextToResumeData} + layout stats.
 * Heuristic only — not for display or parsing structured fields.
 */

export function stripHtmlResumeToPlainText(html: string): string {
  if (!html?.trim()) return ""
  let s = html.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "\n")
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "\n")
  s = s.replace(/<br\s*\/?>/gi, "\n")
  s = s.replace(/<\/(p|div|h[1-6]|li|tr|section|article|header|footer)\s*>/gi, "\n")
  s = s.replace(/<\/(ul|ol|table)\s*>/gi, "\n")
  s = s.replace(/<[^>]+>/g, " ")
  s = s.replace(/&nbsp;/gi, " ")
  s = s.replace(/&amp;/gi, "&")
  s = s.replace(/&lt;/gi, "<")
  s = s.replace(/&gt;/gi, ">")
  s = s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  s = s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  s = s.replace(/[ \t]+/g, " ")
  s = s.replace(/\n[ \t]+/g, "\n")
  s = s.replace(/[ \t]+\n/g, "\n")
  s = s.replace(/\n{3,}/g, "\n\n")
  return s.trim()
}

export function stripLatexResumeToPlainText(tex: string): string {
  if (!tex?.trim()) return ""
  let s = tex.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  s = s.replace(/%[^\n]*/g, "")
  s = s.replace(/\\\\(\[!?])?/g, "\n")
  s = s.replace(/\$\$[\s\S]*?\$\$/g, " ")
  s = s.replace(/\$[^$\n]*\$/g, " ")
  for (let i = 0; i < 4; i++) {
    s = s.replace(/\\[a-zA-Z@]+\*?(\[[^\]]*\])?\{[^{}]*\}/g, " ")
  }
  s = s.replace(/\\[a-zA-Z@]+\*?(\[[^\]]*\])?/g, " ")
  s = s.replace(/[{}\\]/g, " ")
  s = s.replace(/[ \t]+/g, " ")
  s = s.replace(/\n[ \t]+/g, "\n")
  s = s.replace(/[ \t]+\n/g, "\n")
  s = s.replace(/\n{3,}/g, "\n\n")
  return s.trim()
}

export function resumeCodeToPlainTextForLayout(code: string, format: "html" | "latex"): string {
  return format === "html" ? stripHtmlResumeToPlainText(code) : stripLatexResumeToPlainText(code)
}
