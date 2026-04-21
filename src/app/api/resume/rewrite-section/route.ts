import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { env } from '@/env'
import { getSession } from '@/server/better-auth/server'

export const maxDuration = 90

const DEFAULT_MODEL = 'google/gemma-3-12b-it:free'

const FALLBACK_CHAIN = [
  'google/gemma-3-12b-it:free',
  'arcee-ai/trinity-large-preview:free',
  'google/gemma-3-27b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-coder:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
]

const rewriteSchema = z.object({
  section: z
    .enum([
      'summary',
      'skills',
      'experience',
      'projects',
      'education',
      'certifications',
      'achievements',
      'languagesKnown',
    ]),
  sectionText: z.string().min(5).max(40_000),
  instruction: z.string().max(500).optional(),
  model: z.string().max(100).optional(),
  fullName: z.string().max(100).optional(),
  title: z.string().max(200).optional(),
  targetRole: z.string().max(200).optional(),
})

function buildModelChain(requested: string): string[] {
  return [requested, ...FALLBACK_CHAIN.filter((m) => m !== requested)]
}

async function callModel(messages: { role: string; content: string }[], model: string): Promise<string> {
  if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not configured.')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 45_000)

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': env.NEXT_PUBLIC_APP_URL,
        'X-Title': 'Buildify Resume AI Writer',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.25,
        max_tokens: 1200,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    if (!response.ok) {
      throw new Error(`OpenRouter error (${model}): ${response.status}`)
    }

    const data = await response.json()
    const content = (data as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content
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

function sectionRules(section: z.infer<typeof rewriteSchema>['section']) {
  if (section === 'summary') return 'Keep 2-3 lines, crisp and professional.'
  if (section === 'skills') return 'Keep concise categories or clean comma-separated skills.'
  if (section === 'experience' || section === 'projects') {
    return 'Keep bullet style. Improve impact with action verbs + metrics. Do not invent fake facts.'
  }
  if (section === 'education') return 'Keep compact and factual.'
  return 'Keep concise and factual.'
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = rewriteSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
    }

    const input = parsed.data

    if (!env.OPENROUTER_API_KEY) {
      return NextResponse.json({
        success: true,
        rewrittenText: input.sectionText,
        warning: 'AI writer is unavailable because OPENROUTER_API_KEY is missing.',
        model: 'local-noop',
        isFallback: true,
      })
    }

    const requestedModel = input.model || DEFAULT_MODEL
    const messages = [
      {
        role: 'system',
        content:
          'You are a resume writing assistant. Rewrite only the provided section. Keep original facts, improve clarity/impact, and return only rewritten text with no markdown or extra commentary.',
      },
      {
        role: 'user',
        content: `Rewrite this resume section.

Candidate: ${input.fullName ?? 'N/A'}
Target role: ${input.targetRole ?? input.title ?? 'N/A'}
Section: ${input.section}
Section rules: ${sectionRules(input.section)}
User instruction: ${input.instruction?.trim() || 'Improve wording and impact while preserving truth.'}

Current section text:
${input.sectionText}`,
      },
    ]

    const result = await callWithFallback(messages, requestedModel)
    const rewrittenText = result.content
      .trim()
      .replace(/^```[\w-]*\s*/i, '')
      .replace(/```$/i, '')
      .trim()

    return NextResponse.json({
      success: true,
      rewrittenText,
      model: result.model,
      isFallback: result.isFallback,
    })
  } catch (error) {
    console.error('[resume/rewrite-section] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to rewrite section.' },
      { status: 500 },
    )
  }
}
