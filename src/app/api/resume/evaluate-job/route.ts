import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/env"
import { getSession } from "@/server/better-auth/server"
import {
  JOB_FIT_EVALUATION_SYSTEM_PROMPT,
  jobFitEvaluateRequestSchema,
  minimalJobFitEvaluationStub,
  normalizeJobFitEvaluationPayload,
} from "@/lib/resume/job-fit-evaluation"

export const maxDuration = 120

/** Stay under serverless limits: avoid chained 90s OpenRouter calls causing gateway 502. */
const PER_MODEL_TIMEOUT_MS = 40_000
const MAX_MODEL_ATTEMPTS = 3

const DEFAULT_MODEL = "google/gemma-3-12b-it:free"

const FALLBACK_CHAIN = [
  "google/gemma-3-12b-it:free",
  "arcee-ai/trinity-large-preview:free",
  "google/gemma-3-27b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-coder:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "openai/gpt-oss-120b:free",
  "openai/gpt-oss-20b:free",
]

function buildModelChain(requested: string): string[] {
  return [requested, ...FALLBACK_CHAIN.filter((m) => m !== requested)]
}

function openRouterMessageText(content: unknown): string {
  if (content == null) return ""
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part
        if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
          return part.text
        }
        return ""
      })
      .join("")
  }
  return ""
}

/** First top-level `{ ... }` using brace depth (avoids greedy-regex failures on nested JSON). */
function extractBalancedJsonObject(raw: string): string | null {
  const start = raw.indexOf("{")
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < raw.length; i++) {
    const c = raw[i]
    if (escape) {
      escape = false
      continue
    }
    if (c === "\\" && inString) {
      escape = true
      continue
    }
    if (c === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (c === "{") depth++
    else if (c === "}") {
      depth--
      if (depth === 0) return raw.slice(start, i + 1)
    }
  }
  return null
}

async function callModel(
  messages: { role: string; content: string }[],
  model: string,
  timeoutMs: number = PER_MODEL_TIMEOUT_MS,
): Promise<string> {
  const apiKey = env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured.")

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const buildBody = (jsonObjectMode: boolean) =>
    JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 4096,
      ...(jsonObjectMode ? { response_format: { type: "json_object" as const } } : {}),
    })

  try {
    let response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": env.NEXT_PUBLIC_APP_URL,
        "X-Title": "Buildify Job Fit Evaluation",
      },
      body: buildBody(true),
      signal: controller.signal,
    })

    // Some providers/models reject JSON mode; retry once without it (do not mask other 400s).
    if (!response.ok && response.status === 400) {
      const errText = await response.text()
      if (/response_format|json_object|json.?mode/i.test(errText)) {
        response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": env.NEXT_PUBLIC_APP_URL,
            "X-Title": "Buildify Job Fit Evaluation",
          },
          body: buildBody(false),
          signal: controller.signal,
        })
      } else {
        clearTimeout(timeoutId)
        throw new Error(`OpenRouter error (${model}): 400 - ${errText.slice(0, 500)}`)
      }
    }

    clearTimeout(timeoutId)

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      const msg = (err as Record<string, unknown>)?.error ?? response.statusText
      throw new Error(`OpenRouter error (${model}): ${response.status} - ${String(msg)}`)
    }

    const result = await response.json()
    const rawContent = (result as { choices?: { message?: { content?: unknown } }[] }).choices?.[0]
      ?.message?.content
    const content = openRouterMessageText(rawContent)
    if (!content.trim()) throw new Error(`No response from ${model}`)
    return content
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Timeout for model: ${model}`)
    }
    throw error
  }
}

async function callWithFallback(
  messages: { role: string; content: string }[],
  requestedModel: string,
): Promise<{ content: string; model: string }> {
  const chain = buildModelChain(requestedModel).slice(0, MAX_MODEL_ATTEMPTS)
  for (const model of chain) {
    try {
      const content = await callModel(messages, model, PER_MODEL_TIMEOUT_MS)
      return { content, model }
    } catch {
      continue
    }
  }
  throw new Error("All models failed. Please try again.")
}

function parseEvaluationJson(raw: string): unknown {
  let cleaned = raw.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "")
  const firstObj = cleaned.indexOf("{")
  if (firstObj > 0) cleaned = cleaned.slice(firstObj)
  cleaned = cleaned.replace(/[\u201c\u201d]/g, '"').trim()

  const balanced = extractBalancedJsonObject(cleaned)
  const chunks = [
    cleaned,
    balanced ?? "",
    balanced ? balanced.replace(/,\s*(\}|\])/g, "$1") : "",
    cleaned.replace(/,\s*(\}|\])/g, "$1"),
  ].filter((s) => s.length > 0)

  const uniq = [...new Set(chunks)]
  for (const chunk of uniq) {
    try {
      return JSON.parse(chunk)
    } catch {
      const extracted = extractBalancedJsonObject(chunk)
      if (extracted && extracted !== chunk) {
        try {
          return JSON.parse(extracted)
        } catch {
          try {
            return JSON.parse(extracted.replace(/,\s*(\}|\])/g, "$1"))
          } catch {
            /* continue */
          }
        }
      }
      const m = chunk.match(/\{[\s\S]*\}/)
      if (m) {
        try {
          return JSON.parse(m[0])
        } catch {
          try {
            return JSON.parse(m[0].replace(/,\s*(\}|\])/g, "$1"))
          } catch {
            /* continue */
          }
        }
      }
    }
  }
  throw new Error("invalid json")
}

/**
 * POST /api/resume/evaluate-job
 * Career-ops–style JD vs resume context — read-only analysis; does not affect generation APIs.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsedBody = jobFitEvaluateRequestSchema.safeParse(body)
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsedBody.error.flatten() },
        { status: 400 },
      )
    }

    const { jobDescription, resumeContext, model } = parsedBody.data

    if (!env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "AI evaluation is not configured." },
        { status: 500 },
      )
    }

    const requestedModel = model || DEFAULT_MODEL

    const userContent =
      resumeContext && resumeContext.length > 0
        ? `--- JOB DESCRIPTION ---\n${jobDescription}\n\n--- CANDIDATE RESUME CONTEXT (from form, may be incomplete) ---\n${resumeContext}`
        : `--- JOB DESCRIPTION ---\n${jobDescription}\n\n(No resume context provided — analyze the JD and note what the candidate should verify in their profile.)`

    const messages = [
      { role: "system", content: JOB_FIT_EVALUATION_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ]

    const result = await callWithFallback(messages, requestedModel)

    let parsed: unknown
    try {
      parsed = parseEvaluationJson(result.content)
    } catch {
      return NextResponse.json({
        success: true,
        evaluation: minimalJobFitEvaluationStub(
          "The model reply was not valid JSON. Try Analyze again or pick another model.",
        ),
        model: result.model,
        parseWarning: true,
      })
    }

    const normalized = normalizeJobFitEvaluationPayload(parsed)

    return NextResponse.json({
      success: true,
      evaluation: normalized,
      model: result.model,
    })
  } catch (error) {
    console.error("[resume/evaluate-job] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to evaluate job fit." },
      { status: 500 },
    )
  }
}
