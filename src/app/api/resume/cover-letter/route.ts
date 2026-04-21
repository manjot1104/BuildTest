import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
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

const requestSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
  title: z.string().trim().max(200).optional(),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40),
  summary: z.string().max(3000).optional(),
  skills: z.string().max(12000).optional(),
  experience: z.string().max(30000).optional(),
  projects: z.string().max(20000).optional(),
  achievements: z.string().max(12000).optional(),
  certifications: z.string().max(12000).optional(),
  jobDescription: z.string().trim().min(50).max(40000),
  companyName: z.string().trim().min(1).max(200),
  hiringManager: z.string().trim().max(120).optional(),
  model: z.string().max(100).optional(),
})

function buildModelChain(requested: string): string[] {
  return [requested, ...FALLBACK_CHAIN.filter((m) => m !== requested)]
}

function inferToneFromResume(input: z.infer<typeof requestSchema>): string {
  const source = `${input.summary ?? ''}\n${input.experience ?? ''}\n${input.projects ?? ''}`.toLowerCase()
  const hasMetrics = /\d+%|\d+\+|\$\d+|reduced|improved|increased|launched/.test(source)
  const hasLeadership = /led|managed|mentored|owned|collaborated|cross-functional/.test(source)
  if (hasLeadership && hasMetrics) return 'confident, impact-driven, and leadership-oriented'
  if (hasMetrics) return 'results-focused and data-backed'
  return 'professional, clear, and practical'
}

function extractKeywords(jobDescription: string): string[] {
  const words = jobDescription
    .toLowerCase()
    .replace(/[^a-z0-9\s#+.-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const stopwords = new Set([
    'the', 'and', 'for', 'with', 'from', 'that', 'this', 'your', 'you', 'are', 'our', 'will',
    'have', 'has', 'not', 'all', 'any', 'per', 'but', 'job', 'role', 'team', 'work', 'year',
    'years', 'who', 'what', 'when', 'where', 'able', 'ability', 'required', 'preferred',
  ])
  const counts = new Map<string, number>()
  for (const word of words) {
    if (word.length < 3 || stopwords.has(word)) continue
    counts.set(word, (counts.get(word) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word]) => word)
}

function localCoverLetterFallback(input: z.infer<typeof requestSchema>): string {
  const manager = input.hiringManager?.trim() ? `Dear ${input.hiringManager.trim()},` : 'Dear Hiring Manager,'
  const topSkills = (input.skills ?? '')
    .split(/[,|\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5)
    .join(', ')
  const highlights = [input.experience, input.projects, input.achievements]
    .filter(Boolean)
    .join('\n')
    .slice(0, 700)

  return `${manager}

I am excited to apply for the ${input.title?.trim() || 'position'} role at ${input.companyName}. My background aligns strongly with your requirements, and I am confident I can contribute immediate value.

I bring hands-on experience in ${topSkills || 'software development and cross-functional delivery'}. ${input.summary?.trim() || 'I focus on delivering practical solutions with measurable outcomes.'} ${highlights ? `A few relevant highlights include: ${highlights}` : ''}

I would welcome the opportunity to discuss how my experience can support ${input.companyName}'s goals. Thank you for your time and consideration.

Sincerely,
${input.fullName}
${input.email} | ${input.phone}`
}

async function callModel(messages: { role: string; content: string }[], model: string): Promise<string> {
  if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not configured.')
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60_000)
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': env.NEXT_PUBLIC_APP_URL,
        'X-Title': 'Buildify Cover Letter Generator',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.35,
        max_tokens: 1200,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      const msg = (err as Record<string, unknown>).error ?? response.statusText
      throw new Error(`OpenRouter error (${model}): ${response.status} - ${String(msg)}`)
    }
    const result = await response.json()
    const content = (result as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content
    if (!content?.trim()) throw new Error(`No response from ${model}`)
    return content
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timeout for model: ${model}`)
    }
    throw error
  }
}

async function callWithFallback(messages: { role: string; content: string }[], requestedModel: string) {
  const chain = buildModelChain(requestedModel).slice(0, 3)
  for (const model of chain) {
    try {
      const content = await callModel(messages, model)
      return { content, model, isFallback: model !== requestedModel }
    } catch {
      continue
    }
  }
  throw new Error('All models failed')
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = requestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
    }

    const input = parsed.data
    const requestedModel = input.model || DEFAULT_MODEL
    const tone = inferToneFromResume(input)
    const keywords = extractKeywords(input.jobDescription)

    if (!env.OPENROUTER_API_KEY) {
      return NextResponse.json({
        success: true,
        coverLetter: localCoverLetterFallback(input),
        model: 'local-cover-letter-fallback',
        isFallback: true,
        warning: 'OPENROUTER_API_KEY is not configured. Generated with local fallback.',
      })
    }

    const manager = input.hiringManager?.trim() || 'Hiring Manager'
    const messages = [
      {
        role: 'system',
        content:
          'You are an expert career writer. Return only the final cover letter text (no markdown or commentary). Keep it concise, specific, and naturally tailored to the job.',
      },
      {
        role: 'user',
        content: `Write a tailored cover letter for this candidate.

Candidate:
- Name: ${input.fullName}
- Target role: ${input.title || 'Not specified'}
- Email: ${input.email}
- Phone: ${input.phone}
- Summary: ${input.summary || 'N/A'}
- Skills: ${input.skills || 'N/A'}
- Experience: ${input.experience || 'N/A'}
- Projects: ${input.projects || 'N/A'}
- Achievements: ${input.achievements || 'N/A'}
- Certifications: ${input.certifications || 'N/A'}

Job:
- Company: ${input.companyName}
- Hiring manager: ${manager}
- Job description:
${input.jobDescription}

Constraints:
- Match the resume tone: ${tone}
- Prioritize these JD keywords naturally: ${keywords.join(', ')}
- 3 to 4 short paragraphs, no bullet points
- Mention 2-3 concrete achievements from candidate data
- End with a clear, polite call-to-action
- Keep under 380 words
- Start with "Dear ${manager}," and end with candidate name + contact`,
      },
    ]

    const result = await callWithFallback(messages, requestedModel)
    const cleaned = result.content
      .trim()
      .replace(/^```[\w-]*\s*/i, '')
      .replace(/```$/i, '')
      .trim()

    return NextResponse.json({
      success: true,
      coverLetter: cleaned,
      model: result.model,
      isFallback: result.isFallback,
      inferredTone: tone,
      focusedKeywords: keywords,
    })
  } catch (error) {
    console.error('[resume/cover-letter] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate cover letter.' },
      { status: 500 },
    )
  }
}
