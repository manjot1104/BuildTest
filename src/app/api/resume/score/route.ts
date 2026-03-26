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
        temperature: 0.2,
        max_tokens: 3000,
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

const SCORING_PROMPT = `You are a FAANG-level resume reviewer + ATS system. Analyze the given resume content and return a JSON object with your assessment. The resume may be provided as plain text, HTML code, or LaTeX code — evaluate the CONTENT regardless of format.

SCORING CATEGORIES (total 100 points):

1. ATS Compatibility (20 points):
   - Proper section structure (Summary, Experience, Skills, Education, Projects)
   - Standard headings (no creative/unusual section names)
   - No complex formatting that breaks ATS parsers
   - Clean text hierarchy

2. Content Quality (20 points):
   - Strong bullet points with action verbs (Built, Led, Developed, Optimized, etc.)
   - Clarity and relevance of content
   - Professional language, no fluff or filler
   - Each bullet conveys a complete accomplishment

3. Impact & Metrics (20 points):
   - Use of quantifiable results (%, $, scale numbers, time saved)
   - Real-world impact demonstrated (users served, revenue generated, efficiency gained)
   - Specificity over vagueness
   - Every experience entry should show measurable outcomes

4. Keywords Optimization (15 points):
   - Industry-relevant keywords present
   - Technical skills properly listed
   - No keyword stuffing
   - Keywords match likely job descriptions

5. Structure & Readability (15 points):
   - Clean layout with proper spacing
   - Easy to scan in 6-8 seconds
   - Consistent formatting across sections
   - Logical section ordering
   - Proper font sizing and hierarchy

6. Projects & Experience Strength (10 points):
   - Technical depth shown
   - Problem-solving demonstrated
   - Relevance to target roles
   - Progression and growth visible

BULLET POINT QUALITY CHECK:
- Each bullet should be 2-5 lines (ideally 3 lines)
- Must follow: Action verb + What was done + Impact/Result
- Bad: "Worked on the backend" 
- Good: "Architected a microservices backend using Node.js and PostgreSQL, reducing API response times by 45% and supporting 2M+ daily active users"

RESPONSE FORMAT:
Return ONLY valid JSON (no markdown, no backticks, no explanation outside JSON):

{
  "score": <number 0-100>,
  "breakdown": {
    "ats": { "score": <0-20>, "details": "<1-2 sentence explanation>" },
    "content": { "score": <0-20>, "details": "<1-2 sentence explanation>" },
    "impact": { "score": <0-20>, "details": "<1-2 sentence explanation>" },
    "keywords": { "score": <0-15>, "details": "<1-2 sentence explanation>" },
    "readability": { "score": <0-15>, "details": "<1-2 sentence explanation>" },
    "experience": { "score": <0-10>, "details": "<1-2 sentence explanation>" }
  },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "improvements": [
    { "section": "<section name>", "issue": "<what is wrong>", "suggestion": "<specific actionable fix>" },
    { "section": "<section name>", "issue": "<what is wrong>", "suggestion": "<specific actionable fix>" },
    { "section": "<section name>", "issue": "<what is wrong>", "suggestion": "<specific actionable fix>" }
  ],
  "faangReadiness": {
    "atsPass": <true/false>,
    "sixSecondTest": <true/false>,
    "impactAtScale": <true/false>,
    "verdict": "<1-2 sentence FAANG readiness verdict>"
  },
  "bulletAnalysis": {
    "total": <number of bullets>,
    "strong": <number with action+task+impact>,
    "weak": <number that need improvement>,
    "examples": [
      { "original": "<a weak bullet from the resume>", "improved": "<your rewritten version>" }
    ]
  }
}

IMPORTANT:
- Be PRECISE and SPECIFIC. No generic feedback.
- Reference actual content from the resume in your feedback.
- Score honestly — most resumes score 50-80. Only exceptional ones score 85+.
- Give at least 3-5 improvements with concrete rewrite suggestions.
- Return ONLY the JSON object, nothing else.`

/**
 * POST /api/resume/score
 * Scores a resume using AI analysis
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
        { error: 'Resume code is required and must be at least 50 characters.' },
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
    const formatLabel = format === 'latex' ? 'LaTeX' : format === 'html' ? 'HTML' : 'text'

    const messages = [
      { role: 'system', content: SCORING_PROMPT },
      {
        role: 'user',
        content: `Analyze this resume (${formatLabel} format) and provide your scoring JSON:\n\n${code}`,
      },
    ]

    const result = await callWithFallback(messages, requestedModel)

    // Parse JSON from the response — handle markdown-wrapped JSON
    let cleaned = result.content.trim()
    // Strip markdown code fences if present
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')
    cleaned = cleaned.trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      // Try to extract JSON object from the response
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0])
        } catch {
          return NextResponse.json(
            { error: 'AI returned invalid scoring data. Please try again.' },
            { status: 502 },
          )
        }
      } else {
        return NextResponse.json(
          { error: 'AI returned invalid scoring data. Please try again.' },
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
