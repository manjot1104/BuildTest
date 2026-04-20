import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateLaTeXResume } from '@/lib/openrouter'
import { normalizeResumeInput } from '@/lib/resume/template-validator'
import { generateLatexTemplateFallback } from '@/lib/resume/template-fallback-generator'
import { pruneGeneratedSections } from '@/lib/resume/section-pruner'
import { env } from '@/env'
import { getSession } from '@/server/better-auth/server'

export const maxDuration = 260

function localFallbackResponse(validatedData: ReturnType<typeof normalizeResumeInput>, warning: string) {
  const latex = pruneGeneratedSections(
    generateLatexTemplateFallback(validatedData),
    'latex',
    validatedData,
  )
  return NextResponse.json({
    latex,
    model: 'local-template-fallback',
    isFallback: true,
    success: true,
    warning,
  })
}

/**
 * Generate LaTeX code only (without compiling to PDF)
 * POST /api/resume/generate-latex
 */
export async function POST(request: NextRequest) {
  let validatedData: ReturnType<typeof normalizeResumeInput> | null = null
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    validatedData = normalizeResumeInput(body)

    if (validatedData.forceLocalOnly) {
      return localFallbackResponse(
        validatedData,
        'Generated with local template (AI skipped — fast path).',
      )
    }

    const hasOpenRouterKey = Boolean(env.OPENROUTER_API_KEY?.trim())
    if (!hasOpenRouterKey) {
      return localFallbackResponse(
        validatedData,
        'OPENROUTER_API_KEY is not set. Generated with local template (no AI).',
      )
    }

    const result = await generateLaTeXResume(validatedData)

    if (!result?.cleaned?.trim()) {
      return localFallbackResponse(validatedData, 'AI returned empty output. Generated with local template fallback.')
    }

    const prunedLatex = pruneGeneratedSections(result.cleaned, 'latex', validatedData)

    return NextResponse.json({
      latex: prunedLatex,
      model: result.model,
      isFallback: result.isFallback,
      success: true,
    })
  } catch (error) {
    console.error('Error generating LaTeX:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 },
      )
    }

    if (validatedData) {
      const hint =
        error instanceof Error ? error.message.slice(0, 280) : 'Unknown error'
      return localFallbackResponse(
        validatedData,
        `AI generation failed (${hint}). Generated with local template fallback.`,
      )
    }

    return NextResponse.json({ error: 'Failed to generate LaTeX code' }, { status: 500 })
  }
}
