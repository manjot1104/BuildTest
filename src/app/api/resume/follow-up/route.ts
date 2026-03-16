import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { followUpLaTeX } from '@/lib/openrouter'
import { env } from '@/env'
import { getSession } from '@/server/better-auth/server'

const followUpRequestSchema = z.object({
  currentLatex: z.string().min(1, 'LaTeX code is required').max(100000),
  prompt: z.string().min(1, 'Prompt is required').max(2000),
  model: z.string().max(100).optional(),
})

/**
 * Process follow-up prompt to modify existing LaTeX code
 * POST /api/resume/follow-up
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { currentLatex, prompt, model } = followUpRequestSchema.parse(body)

    if (!env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'Resume generation service is not configured.' },
        { status: 503 }
      )
    }

    const result = await followUpLaTeX(currentLatex, prompt, model)

    return NextResponse.json({
      latex: result.cleaned,
      model: result.model,
      isFallback: result.isFallback,
      success: true,
    })
  } catch (error) {
    console.error('Error processing follow-up:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process follow-up prompt' },
      { status: 500 }
    )
  }
}
