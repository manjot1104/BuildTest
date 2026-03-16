import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateLaTeXResume } from '@/lib/openrouter'
import { env } from '@/env'
import { getSession } from '@/server/better-auth/server'

const resumeRequestSchema = z.object({
  fullName: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().min(1).max(20),
  skills: z.string().min(1).max(5000),
  experience: z.string().min(1).max(10000),
  education: z.string().min(1).max(5000),
  projects: z.string().min(1).max(10000),
  additionalInstructions: z.string().max(2000).optional(),
  model: z.string().max(100).optional(),
  templateId: z.string().max(100).optional(),
  templateStyleGuide: z.string().max(50000).optional(),
})

/**
 * Generate LaTeX code only (without compiling to PDF)
 * POST /api/resume/generate-latex
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = resumeRequestSchema.parse(body)

    if (!env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'Resume generation service is not configured.' },
        { status: 503 }
      )
    }

    const result = await generateLaTeXResume(validatedData)

    if (!result?.cleaned?.trim()) {
      return NextResponse.json(
        { error: 'Failed to generate LaTeX code from AI' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      latex: result.cleaned,
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

    return NextResponse.json(
      { error: 'Failed to generate LaTeX code' },
      { status: 500 }
    )
  }
}
