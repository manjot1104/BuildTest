import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generatePDFFromHtml } from '@/lib/html-to-pdf'

const compileRequestSchema = z.object({
  html: z.string().min(1, 'HTML code is required'),
  fileName: z.string().optional().default('Resume'),
})

/**
 * Compile HTML code to PDF
 * POST /api/resume/compile-html-pdf
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const { html, fileName } = compileRequestSchema.parse(body)

    if (!html || html.trim().length === 0) {
      return NextResponse.json(
        { error: 'HTML code is required' },
        { status: 400 }
      )
    }

    // Compile HTML to PDF
    const pdfBuffer = await generatePDFFromHtml(html)

    if (!pdfBuffer) {
      return NextResponse.json(
        { error: 'Failed to generate PDF from HTML. Please check HTML syntax.' },
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
    console.error('Error compiling HTML to PDF:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message || 'Failed to generate PDF' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
