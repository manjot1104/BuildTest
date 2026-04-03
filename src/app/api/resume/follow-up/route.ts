import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { followUpLaTeX } from '@/lib/openrouter'
import { validateLatexFollowUpInput } from '@/lib/resume/code-validator'
import { mergeFollowUpPromptWithLayoutHintFromCode } from '@/lib/text-layout/layout-from-resume-code'
import { env } from '@/env'
import { getSession } from '@/server/better-auth/server'

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
    const { currentLatex, prompt, model } = validateLatexFollowUpInput(body)

    if (!env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'Resume generation service is not configured.' },
        { status: 503 }
      )
    }

    const promptWithLayout = mergeFollowUpPromptWithLayoutHintFromCode(
      currentLatex,
      'latex',
      prompt,
    )

    const result = await followUpLaTeX(currentLatex, promptWithLayout, model)

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
