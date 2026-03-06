import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { env } from '@/env'

const followUpRequestSchema = z.object({
  currentLatex: z.string().min(1, 'LaTeX code is required'),
  prompt: z.string().min(1, 'Prompt is required'),
})

/**
 * Process follow-up prompt to modify existing LaTeX code
 * POST /api/resume/follow-up
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const { currentLatex, prompt } = followUpRequestSchema.parse(body)

    // Check if API key is available
    const apiKey = env.OPENAI_API_KEY || env.OPENROUTER_API_KEY || env.V0_API_KEY
    if (!apiKey || apiKey.trim().length === 0) {
      console.error('API key is missing')
      return NextResponse.json(
        { error: 'API key is not configured. Please set OPENAI_API_KEY in your .env file.' },
        { status: 500 }
      )
    }

    // Determine which API to use
    const useOpenAI = !!env.OPENAI_API_KEY
    const model = useOpenAI ? (env.OPENAI_MODEL || 'gpt-4o-mini') : 'anthropic/claude-3.5-sonnet'

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }

    // API endpoint
    const apiUrl = useOpenAI
      ? 'https://api.openai.com/v1/chat/completions'
      : 'https://openrouter.ai/api/v1/chat/completions'

    // Add OpenRouter specific headers if using OpenRouter
    if (!useOpenAI) {
      if (env.NEXT_PUBLIC_APP_URL) {
        headers['HTTP-Referer'] = env.NEXT_PUBLIC_APP_URL
      }
      headers['X-Title'] = 'Buildify AI Resume Builder'
    }

    // Build follow-up prompt
    const followUpPrompt = `You are an expert LaTeX resume writer. I have an existing LaTeX resume code, and I want you to modify it based on the following instruction.

EXISTING LATEX CODE:
\`\`\`latex
${currentLatex}
\`\`\`

USER'S REQUEST:
${prompt}

IMPORTANT REQUIREMENTS:
1. Return ONLY the complete modified LaTeX code - no markdown, no explanations, no code blocks
2. Keep the same structure and content, but apply the requested changes
3. Ensure the LaTeX code remains valid and compilable
4. Use MINIMAL LaTeX packages: \\documentclass{article}, \\usepackage[margin=0.75in]{geometry}, \\usepackage{enumitem}
5. DO NOT use complex packages like tikz, fancyhdr, or graphics that require external files
6. Keep the LaTeX code SIMPLE and FAST to compile

Return the complete modified LaTeX document code now. Return ONLY the LaTeX code, nothing else.`

    // Make API request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: useOpenAI ? model : 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'system',
            content: 'You are an expert LaTeX resume writer. Always return ONLY raw LaTeX code without any markdown formatting, explanations, or code blocks.',
          },
          {
            role: 'user',
            content: followUpPrompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || errorData.message || response.statusText
      console.error('API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        apiUsed: useOpenAI ? 'OpenAI' : 'OpenRouter',
      })
      throw new Error(
        `${useOpenAI ? 'OpenAI' : 'OpenRouter'} API error: ${response.status} - ${errorMessage}`
      )
    }

    const result = await response.json()
    const rawResponse = result.choices?.[0]?.message?.content

    if (!rawResponse) {
      throw new Error(`No response returned from ${useOpenAI ? 'OpenAI' : 'OpenRouter'} API`)
    }

    // Clean up the response - remove markdown code blocks if present
    let cleanedCode = rawResponse.trim()

    // Remove markdown code blocks (```latex or ```)
    cleanedCode = cleanedCode.replace(/^```(?:latex)?\s*\n?/gm, '')
    cleanedCode = cleanedCode.replace(/\n?```\s*$/gm, '')

    // Remove any leading/trailing whitespace
    cleanedCode = cleanedCode.trim()

    if (!cleanedCode || cleanedCode.length === 0) {
      throw new Error('Failed to extract LaTeX code from AI response')
    }

    // Return both raw response and cleaned code
    return NextResponse.json({
      latex: cleanedCode,
      rawResponse: rawResponse,
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

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message || 'Failed to process follow-up prompt' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
