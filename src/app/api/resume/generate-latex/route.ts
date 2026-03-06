import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateLaTeXResume } from '@/lib/openrouter'
import { env } from '@/env'

const resumeRequestSchema = z.object({
  fullName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().min(1).max(20),
  skills: z.string().min(1),
  experience: z.string().min(1),
  education: z.string().min(1),
  projects: z.string().min(1),
  additionalInstructions: z.string().optional(),
})

/**
 * Generate LaTeX code only (without compiling to PDF)
 * POST /api/resume/generate-latex
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validatedData = resumeRequestSchema.parse(body)

    // Check if API key is available
    const apiKey = env.OPENAI_API_KEY || env.OPENROUTER_API_KEY || env.V0_API_KEY
    if (!apiKey || apiKey.trim().length === 0) {
      console.error('API key is missing')
      return NextResponse.json(
        { error: 'API key is not configured. Please set OPENAI_API_KEY in your .env file.' },
        { status: 500 }
      )
    }

    // Generate LaTeX resume using AI
    const result = await generateLaTeXResume(validatedData)

    if (!result || !result.cleaned || result.cleaned.trim().length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate LaTeX code from AI' },
        { status: 500 }
      )
    }

    // Return both raw AI response and cleaned LaTeX code
    return NextResponse.json({
      latex: result.cleaned,
      rawResponse: result.raw,
      success: true,
    })
  } catch (error) {
    console.error('Error generating LaTeX:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message || 'Failed to generate LaTeX code' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
