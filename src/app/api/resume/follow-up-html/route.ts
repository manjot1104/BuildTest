import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { followUpHtml } from '@/lib/openrouter'
import { env } from '@/env'
import { getSession } from '@/server/better-auth/server'

const followUpRequestSchema = z.object({
  currentHtml: z.string().min(1, 'HTML code is required').max(100000),
  prompt: z.string().min(1, 'Prompt is required').max(2000),
  model: z.string().max(100).optional(),
})

/**
 * Process follow-up prompt to modify existing HTML code
 * POST /api/resume/follow-up-html
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { currentHtml, prompt, model } = followUpRequestSchema.parse(body)

    if (!env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'Resume generation service is not configured.' },
        { status: 503 }
      )
    }

    const result = await followUpHtml(currentHtml, prompt, model)

    return NextResponse.json({
      html: result.cleaned,
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
