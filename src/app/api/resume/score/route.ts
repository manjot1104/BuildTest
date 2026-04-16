import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'
import { getSession } from '@/server/better-auth/server'

export const maxDuration = 120

const DEFAULT_MODEL = 'google/gemma-3-12b-it:free'

const FALLBACK_CHAIN = [
  'google/gemma-3-12b-it:free',
  'arcee-ai/trinity-large-preview:free',
  'google/gemma-3-27b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-coder:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'openai/gpt-oss-120b:free',
  'openai/gpt-oss-20b:free',
]

function buildModelChain(requested: string): string[] {
  return [requested, ...FALLBACK_CHAIN.filter((m) => m !== requested)]
}

async function callModel(
  messages: { role: string; content: string }[],
  model: string,
): Promise<string> {
  const apiKey = env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured.')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 90000)

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': env.NEXT_PUBLIC_APP_URL,
        'X-Title': 'Buildify AI Resume Scorer',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.15,
        max_tokens: 2000,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      const msg = (err as Record<string, unknown>)?.error ?? response.statusText
      throw new Error(`OpenRouter error (${model}): ${response.status} - ${String(msg)}`)
    }

    const result = await response.json()
    const content = (result as { choices?: { message?: { content?: string } }[] }).choices?.[0]
      ?.message?.content
    if (!content) throw new Error(`No response from ${model}`)
    return content
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timeout for model: ${model}`)
    }
    throw error
  }
}

async function callWithFallback(
  messages: { role: string; content: string }[],
  requestedModel: string,
): Promise<{ content: string; model: string }> {
  const chain = buildModelChain(requestedModel)
  for (const model of chain) {
    try {
      const content = await callModel(messages, model)
      return { content, model }
    } catch {
      continue
    }
  }
  throw new Error('All models failed. Please try again.')
}

// ── Concise, fast scoring prompt ─────────────────────────────────────────────

const SCORING_PROMPT = `You are a FAANG recruiter + ATS system. Score the resume. Be fast, precise, actionable. No filler.

SCORING (100 total):
- ATS Compatibility (20): Standard headings, clean structure, parseable
- Content Quality (20): Action verbs, clarity, no fluff, complete accomplishments
- Impact & Metrics (20): Numbers (%, $, scale), real outcomes, specificity
- Keywords Match (15): Industry terms, no stuffing, role-relevant
- Readability & Structure (15): Scannable in 6s, consistent formatting, logical order
- Experience/Projects (10): Technical depth, problem-solving, relevance

BULLET CHECK: Each should start with action verb, include what was done + measurable impact, be 2-5 lines.

Return ONLY valid JSON (no markdown, no backticks):
{
  "score": <0-100>,
  "breakdown": {
    "ats": <0-20>,
    "content": <0-20>,
    "impact": <0-20>,
    "keywords": <0-15>,
    "readability": <0-15>,
    "experience": <0-10>
  },
  "strengths": ["<3-5 specific strengths>"],
  "weaknesses": ["<3-5 specific weaknesses>"],
  "improvements": ["<3-5 actionable suggestions with concrete rewrites where possible>"]
}

RULES:
- Be specific — reference actual resume content
- Most resumes score 50-80. Only exceptional ones 85+.
- No generic feedback. Every point must be actionable.
- Keep each item to 1-2 sentences max.`

/**
 * POST /api/resume/score
 * Fast, efficient AI resume scoring
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as { code?: string; format?: string; model?: string }
    const { code, format, model } = body

    if (!code || typeof code !== 'string' || code.trim().length < 50) {
      return NextResponse.json(
        { error: 'Resume content is required (min 50 characters).' },
        { status: 400 },
      )
    }

    if (!env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'AI scoring service is not configured.' },
        { status: 500 },
      )
    }

    const requestedModel = model || DEFAULT_MODEL
    const formatLabel = format === 'latex' ? 'LaTeX' : format === 'html' ? 'HTML' : 'plain text'

    const messages = [
      { role: 'system', content: SCORING_PROMPT },
      {
        role: 'user',
        content: `Score this resume (${formatLabel}):\n\n${code}`,
      },
    ]

    const result = await callWithFallback(messages, requestedModel)

    // Parse JSON — handle markdown-wrapped responses
    let cleaned = result.content.trim()
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')
    cleaned = cleaned.trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0])
        } catch {
          return NextResponse.json(
            { error: 'AI returned invalid data. Please try again.' },
            { status: 502 },
          )
        }
      } else {
        return NextResponse.json(
          { error: 'AI returned invalid data. Please try again.' },
          { status: 502 },
        )
      }
    }

    return NextResponse.json({
      success: true,
      scoring: parsed,
      model: result.model,
    })
  } catch (error) {
    console.error('[resume/score] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to score resume.' },
      { status: 500 },
    )
  }
}
