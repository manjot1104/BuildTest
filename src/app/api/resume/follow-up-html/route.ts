import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 260
import { z } from 'zod'
import { followUpHtml } from '@/lib/openrouter'
import { validateHtmlFollowUpInput } from '@/lib/resume/code-validator'
import { mergeFollowUpPromptWithLayoutHintFromCode } from '@/lib/text-layout/layout-from-resume-code'
import { env } from '@/env'
import { getSession } from '@/server/better-auth/server'

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
    const { currentHtml, prompt, model } = validateHtmlFollowUpInput(body)

    if (!env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'Resume generation service is not configured.' },
        { status: 503 }
      )
    }

    const promptWithLayout = mergeFollowUpPromptWithLayoutHintFromCode(
      currentHtml,
      'html',
      prompt,
    )

    const result = await followUpHtml(currentHtml, promptWithLayout, model)

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
