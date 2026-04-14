import { z } from "zod"

/**
 * Structured job-vs-resume evaluation (career-ops–style workflow, adapted for Buildify).
 * Used only by POST /api/resume/evaluate-job — does not participate in resume generation.
 */

export const jobFitEvaluateRequestSchema = z.object({
  jobDescription: z.string().trim().min(80).max(24_000),
  resumeContext: z.string().trim().max(12_000).optional(),
  model: z.string().max(100).optional(),
})

export type JobFitEvaluateRequest = z.infer<typeof jobFitEvaluateRequestSchema>

export const jobFitEvaluationResultSchema = z.object({
  /** 1–5 overall fit (5 = strong match). */
  fitScore: z.number().min(1).max(5),
  /** One short paragraph for the candidate. */
  fitSummary: z.string().max(2000),
  /** What the role is asking for in plain language. */
  roleSummary: z.string().max(1500),
  matchHighlights: z.array(z.string()).max(12),
  gapsAndRisks: z.array(z.string()).max(12),
  tailoringIdeas: z.array(z.string()).max(12),
  interviewPrep: z.array(z.string()).max(10),
  caution: z.string().max(500).optional(),
})

export type JobFitEvaluationResult = z.infer<typeof jobFitEvaluationResultSchema>

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return null
  return v as Record<string, unknown>
}

function toTrimmedString(v: unknown, fallback: string): string {
  if (typeof v === "string") return v.trim() || fallback
  if (v == null) return fallback
  return String(v).trim() || fallback
}

/** Accept string | string[] | newline text from sloppy model output */
function toStringList(v: unknown, max: number): string[] {
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === "string" ? x.trim() : String(x).trim()))
      .filter(Boolean)
      .slice(0, max)
  }
  if (typeof v === "string") {
    return v
      .split(/\n+/)
      .map((s) => s.replace(/^[-*•\d.)]+\s*/i, "").trim())
      .filter(Boolean)
      .slice(0, max)
  }
  return []
}

function clampFitScore(n: number): number {
  if (!Number.isFinite(n)) return 3
  if (n > 5 && n <= 100) {
    return Math.min(5, Math.max(1, Math.round((n / 20) * 10) / 10))
  }
  return Math.min(5, Math.max(1, Math.round(n * 10) / 10))
}

/** When JSON is missing or unparseable — still return 200 so the client can show guidance (not 502). */
export function minimalJobFitEvaluationStub(message: string): JobFitEvaluationResult {
  const summary = message.trim().slice(0, 2000) || "Analysis could not be completed."
  return {
    fitScore: 3,
    fitSummary: summary,
    roleSummary: "Try Analyze again, or choose another model from the resume model dropdown.",
    matchHighlights: [],
    gapsAndRisks: [],
    tailoringIdeas: [],
    interviewPrep: [],
    caution: undefined,
  }
}

/**
 * Turn messy model JSON into a valid result. Handles string fitScore, 0–100 scores,
 * alternate keys, wrapped `{ evaluation: {...} }`, and list-shaped strings.
 */
export function normalizeJobFitEvaluationPayload(data: unknown): JobFitEvaluationResult {
  let root = data
  const wrap = asRecord(root)
  if (wrap && "evaluation" in wrap) {
    root = wrap.evaluation
  }
  const o = asRecord(root)
  if (!o) {
    if (typeof data === "string" && data.trim().length > 40) {
      return minimalJobFitEvaluationStub(data.trim())
    }
    return minimalJobFitEvaluationStub(
      "The AI did not return a structured object. Try Analyze again or switch model.",
    )
  }

  const scoreRaw = o.fitScore ?? o.fit_score ?? o.score ?? o.overallFit
  let fitScore: number
  if (typeof scoreRaw === "string") {
    fitScore = clampFitScore(parseFloat(scoreRaw))
  } else if (typeof scoreRaw === "number") {
    fitScore = clampFitScore(scoreRaw)
  } else {
    fitScore = 3
  }

  const fitSummary = toTrimmedString(
    o.fitSummary ?? o.fit_summary ?? o.summary,
    "The model did not return a written summary; try Analyze again or pick another model.",
  ).slice(0, 2000)

  const roleSummary = toTrimmedString(
    o.roleSummary ?? o.role_summary ?? o.role ?? o.roleDescription,
    "Role summary was missing from the model response.",
  ).slice(0, 1500)

  const matchHighlights = toStringList(
    o.matchHighlights ?? o.match_highlights ?? o.highlights ?? o.strengths,
    12,
  )
  const gapsAndRisks = toStringList(
    o.gapsAndRisks ?? o.gaps_and_risks ?? o.gaps ?? o.risks ?? o.weaknesses,
    12,
  )
  const tailoringIdeas = toStringList(
    o.tailoringIdeas ?? o.tailoring_ideas ?? o.suggestions ?? o.recommendations,
    12,
  )
  const interviewPrep = toStringList(
    o.interviewPrep ?? o.interview_prep ?? o.interview ?? o.interviewQuestions,
    10,
  )

  const cautionRaw = o.caution ?? o.warning
  const caution =
    typeof cautionRaw === "string" && cautionRaw.trim().length > 0
      ? cautionRaw.trim().slice(0, 500)
      : undefined

  const candidate: JobFitEvaluationResult = {
    fitScore,
    fitSummary,
    roleSummary,
    matchHighlights,
    gapsAndRisks,
    tailoringIdeas,
    interviewPrep,
    caution,
  }

  const parsed = jobFitEvaluationResultSchema.safeParse(candidate)
  if (parsed.success) return parsed.data

  /** Never drop the request after we have a parsed object — coerce into schema (models sometimes drift). */
  const coerced: JobFitEvaluationResult = {
    fitScore: Math.min(5, Math.max(1, Math.round(Number(candidate.fitScore) * 10) / 10)) || 3,
    fitSummary: String(candidate.fitSummary ?? "").slice(0, 2000) || "Summary unavailable.",
    roleSummary: String(candidate.roleSummary ?? "").slice(0, 1500) || "Role summary unavailable.",
    matchHighlights: (candidate.matchHighlights ?? [])
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 12),
    gapsAndRisks: (candidate.gapsAndRisks ?? [])
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 12),
    tailoringIdeas: (candidate.tailoringIdeas ?? [])
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 12),
    interviewPrep: (candidate.interviewPrep ?? [])
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 10),
    caution: candidate.caution ? String(candidate.caution).slice(0, 500) : undefined,
  }
  const again = jobFitEvaluationResultSchema.safeParse(coerced)
  return again.success ? again.data : coerced
}

/** Step 2 — career-ops workflow: copy / optional append without changing generation APIs. */

const APPEND_SECTION_HEADER =
  "--- Job fit tailoring ideas (review before Generate resume) ---"

/**
 * Bulleted list for “Additional instructions” — user must click Append (never auto).
 */
export function formatTailoringIdeasForAdditionalInstructions(
  e: JobFitEvaluationResult,
): string {
  if (!e.tailoringIdeas.length) return ""
  const lines = e.tailoringIdeas.map((t, i) => `${i + 1}. ${t}`)
  return [APPEND_SECTION_HEADER, ...lines].join("\n")
}

/** Numbered list only — for quick copy without the “additional instructions” header. */
export function formatTailoringIdeasPlainList(e: JobFitEvaluationResult): string {
  if (!e.tailoringIdeas.length) return ""
  return e.tailoringIdeas.map((t, i) => `${i + 1}. ${t}`).join("\n")
}

/** Full report for clipboard (markdown-friendly plain text). */
export function formatJobFitEvaluationFullReport(e: JobFitEvaluationResult): string {
  const blocks: string[] = []
  blocks.push(`## Job fit score: ${e.fitScore}/5`)
  blocks.push("")
  blocks.push("### Summary")
  blocks.push(e.fitSummary)
  blocks.push("")
  blocks.push("### Role in plain language")
  blocks.push(e.roleSummary)
  if (e.matchHighlights.length) {
    blocks.push("")
    blocks.push("### Match highlights")
    e.matchHighlights.forEach((t) => blocks.push(`- ${t}`))
  }
  if (e.gapsAndRisks.length) {
    blocks.push("")
    blocks.push("### Gaps & risks")
    e.gapsAndRisks.forEach((t) => blocks.push(`- ${t}`))
  }
  if (e.tailoringIdeas.length) {
    blocks.push("")
    blocks.push("### Tailoring ideas")
    e.tailoringIdeas.forEach((t) => blocks.push(`- ${t}`))
  }
  if (e.interviewPrep.length) {
    blocks.push("")
    blocks.push("### Interview prep")
    e.interviewPrep.forEach((t) => blocks.push(`- ${t}`))
  }
  if (e.caution) {
    blocks.push("")
    blocks.push("### Caution")
    blocks.push(e.caution)
  }
  return blocks.join("\n")
}

export const JOB_FIT_EVALUATION_SYSTEM_PROMPT = `You are an experienced hiring manager and career coach. The user will send a job description (and optional resume text from their form — not a final PDF).

Your job: help them decide if the role is worth pursuing and how to position themselves. This is advisory only — never claim you verified facts about the company or compensation.

Rules:
- Be honest: flag mismatches in seniority, domain, or must-have skills.
- Prefer specific references to the JD and resume context over generic advice.
- Do not tell the user to apply or not apply — give a fit score and reasoning; they decide.
- If resume context is empty or very thin, say so and base analysis mainly on the JD.
- Your entire reply must be one valid JSON object: start with { and end with }. No markdown code fences, no text before or after the object.

JSON shape (use these exact camelCase keys; all string values must use standard double quotes):
{
  "fitScore": <number 1-5, can use one decimal e.g. 3.5>,
  "fitSummary": "<2-4 sentences>",
  "roleSummary": "<what this role is really about, 2-5 sentences>",
  "matchHighlights": ["<3-8 items: where candidate aligns>"],
  "gapsAndRisks": ["<2-8 items: gaps, red flags, or stretch areas>"],
  "tailoringIdeas": ["<3-8 concrete bullets for resume/cover angle — not full resume text>"],
  "interviewPrep": ["<3-6 likely themes or questions to prepare>"],
  "caution": "<optional one sentence if JD is vague, scam-like, or data is insufficient>"
}

Scoring guide for fitScore:
- 4.5–5: strong match on core skills + level
- 3.5–4.4: reasonable match with some gaps
- 2.5–3.4: stretch role or several mismatches
- Below 2.5: poor fit or insufficient information`
