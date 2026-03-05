import { NextResponse } from 'next/server'
import { env } from '@/env'

/**
 * Test endpoint to check if API keys are loaded correctly
 * Access: GET /api/resume/test-key
 */
export async function GET() {
  try {
    const openAIKey = env.OPENAI_API_KEY
    const openRouterKey = env.OPENROUTER_API_KEY
    const v0Key = env.V0_API_KEY
    const model = env.OPENAI_MODEL
    
    return NextResponse.json({
      hasOpenAIKey: !!openAIKey,
      hasOpenRouterKey: !!openRouterKey,
      hasV0Key: !!v0Key,
      openAIKeyLength: openAIKey?.length || 0,
      openRouterKeyLength: openRouterKey?.length || 0,
      v0KeyLength: v0Key?.length || 0,
      openAIKeyPrefix: openAIKey ? openAIKey.substring(0, 20) + '...' : 'N/A',
      openRouterKeyPrefix: openRouterKey ? openRouterKey.substring(0, 20) + '...' : 'N/A',
      v0KeyPrefix: v0Key ? v0Key.substring(0, 20) + '...' : 'N/A',
      model: model || 'gpt-4o-mini',
      willUse: openAIKey ? 'OpenAI' : (openRouterKey ? 'OpenRouter' : 'V0_API_KEY'),
      message: openAIKey 
        ? '✅ OPENAI_API_KEY is loaded correctly! Will use OpenAI API.' 
        : openRouterKey
        ? '⚠️ OPENAI_API_KEY missing. Will use OpenRouter API as fallback.'
        : '❌ OPENAI_API_KEY and OPENROUTER_API_KEY missing. Will use V0_API_KEY as last resort.',
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check API keys',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
