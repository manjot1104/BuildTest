import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { followUpHtml } from '@/lib/openrouter'
import { env } from '@/env'

const followUpRequestSchema = z.object({
  currentHtml: z.string().min(1, 'HTML code is required'),
  prompt: z.string().min(1, 'Prompt is required'),
  model: z.string().optional(),
})

/**
 * Process follow-up prompt to modify existing HTML code
 * POST /api/resume/follow-up-html
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { currentHtml, prompt, model } = followUpRequestSchema.parse(body)

    if (!env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY is not configured.' },
        { status: 500 }
      )
    }

    const result = await followUpHtml(currentHtml, prompt, model)

    return NextResponse.json({
      html: result.cleaned,
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
