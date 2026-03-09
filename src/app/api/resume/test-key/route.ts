import { NextResponse } from 'next/server'
import { env } from '@/env'

/**
 * Test endpoint to check if OpenRouter API key is configured
 * GET /api/resume/test-key
 */
export async function GET() {
  try {
    const hasKey = !!env.OPENROUTER_API_KEY

    return NextResponse.json({
      hasOpenRouterKey: hasKey,
      keyLength: env.OPENROUTER_API_KEY?.length ?? 0,
      keyPrefix: env.OPENROUTER_API_KEY
        ? env.OPENROUTER_API_KEY.substring(0, 15) + '...'
        : 'N/A',
      message: hasKey
        ? 'OpenRouter API key is configured.'
        : 'OPENROUTER_API_KEY is missing.',
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check API key',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
