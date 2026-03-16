import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generatePDFFromHtml } from '@/lib/html-to-pdf'
import { getSession } from '@/server/better-auth/server'

const compileRequestSchema = z.object({
  html: z.string().min(1, 'HTML code is required').max(200000),
  fileName: z.string().max(100).optional().default('Resume'),
})

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\- ]/g, '').replace(/\s+/g, '_').slice(0, 50) || 'Resume'
}

/**
 * Compile HTML code to PDF
 * POST /api/resume/compile-html-pdf
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { html, fileName } = compileRequestSchema.parse(body)

    if (!html.trim()) {
      return NextResponse.json(
        { error: 'HTML code is required' },
        { status: 400 }
      )
    }

    const pdfBuffer = await generatePDFFromHtml(html)

    if (!pdfBuffer) {
      return NextResponse.json(
        { error: 'Failed to generate PDF from HTML. Please check HTML syntax.' },
        { status: 500 }
      )
    }

    const safeFilename = sanitizeFilename(fileName)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}_Resume.pdf"`,
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

    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
