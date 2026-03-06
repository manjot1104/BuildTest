import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateLaTeXResume } from '@/lib/openrouter'
import { compileLaTeXToPDF } from '@/lib/latex-to-pdf'
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
  model: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = resumeRequestSchema.parse(body)

    if (!env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY is not configured.' },
        { status: 500 }
      )
    }

    const result = await generateLaTeXResume(validatedData)

    if (!result?.cleaned?.trim()) {
      return NextResponse.json(
        { error: 'Failed to generate LaTeX code from AI' },
        { status: 500 }
      )
    }

    const pdfBuffer = await compileLaTeXToPDF(result.cleaned)

    if (!pdfBuffer) {
      return NextResponse.json(
        { error: 'Failed to compile LaTeX to PDF. Please check LaTeX syntax.' },
        { status: 500 }
      )
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${validatedData.fullName.replace(/\s+/g, '_')}_Resume.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating resume:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message || 'Failed to generate resume' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
