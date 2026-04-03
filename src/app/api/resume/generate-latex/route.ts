import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateLaTeXResume } from '@/lib/openrouter'
import { normalizeResumeInput } from '@/lib/resume/template-validator'
import { generateLatexTemplateFallback } from '@/lib/resume/template-fallback-generator'
import { pruneGeneratedSections } from '@/lib/resume/section-pruner'
import { env } from '@/env'
import { getSession } from '@/server/better-auth/server'
import { normalizedResumeInputToResumeData } from '@/lib/text-layout/normalized-to-resume-data'
import {
  appendLayoutHintToAdditionalInstructions,
  computeResumeLayoutStats,
  TEXT_LAYOUT_SERVER_OPTIONS,
} from '@/lib/text-layout/layout-stats'

// Configure runtime for longer operations
export const maxDuration = 120 // 2 minutes for AI generation
const AI_PROVIDER_TIMEOUT_MS = 70000
const FORCE_DETERMINISTIC_TEMPLATE_IDS = new Set([
  'latex-blue-magenta-financial',
])

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

    const layoutStats = computeResumeLayoutStats(
      normalizedResumeInputToResumeData(validatedData),
      TEXT_LAYOUT_SERVER_OPTIONS,
    )
    validatedData = {
      ...validatedData,
      additionalInstructions: appendLayoutHintToAdditionalInstructions(
        validatedData.additionalInstructions,
        layoutStats,
      ),
    }

    // Some highly visual templates are better rendered deterministically to avoid AI dummy/sample leakage.
    if (validatedData.templateId && FORCE_DETERMINISTIC_TEMPLATE_IDS.has(validatedData.templateId)) {
      const latex = pruneGeneratedSections(
        generateLatexTemplateFallback(validatedData),
        'latex',
        validatedData
      )
      return NextResponse.json({
        latex,
        model: 'local-template-fallback',
        isFallback: true,
        success: true,
        warning: 'Deterministic rendering enabled for this template to ensure only user input is used.',
      })
    }

    if (!env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'Resume generation service is not configured.' },
        { status: 503 }
      )
    }

    const result = await Promise.race([
      generateLaTeXResume(validatedData),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI_PROVIDER_TIMEOUT')), AI_PROVIDER_TIMEOUT_MS)
      ),
    ])

    if (!result?.cleaned?.trim()) {
      return NextResponse.json(
        { error: 'Failed to generate LaTeX code from AI' },
        { status: 500 }
      )
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
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      const message = error.message || 'Failed to generate LaTeX code'
      const lower = message.toLowerCase()
      const isRateLimit = lower.includes('rate limit') || lower.includes('429')
      const isProviderPolicy = lower.includes('no endpoints available') || lower.includes('guardrail')
      const isProviderTimeout = message.includes('AI_PROVIDER_TIMEOUT') || lower.includes('timed out')

      // Local fallback so users can still generate a resume even when OpenRouter is unavailable.
      if ((isRateLimit || isProviderPolicy || isProviderTimeout) && validatedData) {
        const latex = pruneGeneratedSections(
          generateLatexTemplateFallback(validatedData),
          'latex',
          validatedData
        )
        return NextResponse.json({
          latex,
          model: 'local-template-fallback',
          isFallback: true,
          success: true,
          warning: isProviderTimeout
            ? 'AI provider timed out. Generated with local template fallback.'
            : isRateLimit
            ? 'OpenRouter rate limit reached. Generated with local template fallback.'
            : 'OpenRouter endpoint policy blocked. Generated with local template fallback.',
        })
      }

      return NextResponse.json(
        {
          error: isRateLimit
            ? 'OpenRouter rate limit reached for available models. Please retry later or add credits.'
            : isProviderPolicy
              ? 'No OpenRouter endpoints are available under current privacy/guardrail settings. Please adjust OpenRouter settings.'
              : message,
        },
        { status: isRateLimit ? 429 : 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate LaTeX code' },
      { status: 500 }
    )
  }
}
