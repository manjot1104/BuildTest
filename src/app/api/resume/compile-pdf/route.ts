import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { compileLaTeXToPDF } from '@/lib/latex-to-pdf'

const compileRequestSchema = z.object({
  latex: z.string().min(1, 'LaTeX code is required'),
  fileName: z.string().optional().default('Resume'),
})

/**
 * Compile LaTeX code to PDF
 * POST /api/resume/compile-pdf
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const { latex, fileName } = compileRequestSchema.parse(body)

    if (!latex || latex.trim().length === 0) {
      return NextResponse.json(
        { error: 'LaTeX code is required' },
        { status: 400 }
      )
    }

    // Compile LaTeX to PDF
    const pdfBuffer = await compileLaTeXToPDF(latex)

    if (!pdfBuffer) {
      return NextResponse.json(
        { error: 'Failed to compile LaTeX to PDF. Please check LaTeX syntax.' },
        { status: 500 }
      )
    }

    // Return PDF file
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName.replace(/\s+/g, '_')}_Resume.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error compiling PDF:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message || 'Failed to compile PDF' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
