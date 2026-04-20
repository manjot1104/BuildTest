import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { compileLaTeXToPDF } from '@/lib/latex-to-pdf'
import { validateCompileLatexInput } from '@/lib/resume/code-validator'
import { getSession } from '@/server/better-auth/server'

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\- ]/g, '').replace(/\s+/g, '_').slice(0, 50) || 'Resume'
}

/**
 * Compile LaTeX code to PDF
 * POST /api/resume/compile-pdf
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { latex, fileName } = validateCompileLatexInput(body)

    if (!latex.trim()) {
      return NextResponse.json(
        { error: 'LaTeX code is required' },
        { status: 400 }
      )
    }

    const pdfBuffer = await compileLaTeXToPDF(latex)

    if (!pdfBuffer) {
      return NextResponse.json(
        { error: 'Failed to compile LaTeX to PDF. Please check LaTeX syntax.' },
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
      { error: 'Failed to compile PDF' },
      { status: 500 }
    )
  }
}
