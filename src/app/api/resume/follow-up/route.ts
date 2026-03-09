import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { followUpLaTeX } from '@/lib/openrouter'
import { env } from '@/env'

const followUpRequestSchema = z.object({
  currentLatex: z.string().min(1, 'LaTeX code is required'),
  prompt: z.string().min(1, 'Prompt is required'),
  model: z.string().optional(),
})

/**
 * Process follow-up prompt to modify existing LaTeX code
 * POST /api/resume/follow-up
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { currentLatex, prompt, model } = followUpRequestSchema.parse(body)

    if (!env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY is not configured.' },
        { status: 500 }
      )
    }

    const result = await followUpLaTeX(currentLatex, prompt, model)

    return NextResponse.json({
      latex: result.cleaned,
      rawResponse: result.raw,
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

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message || 'Failed to process follow-up prompt' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
