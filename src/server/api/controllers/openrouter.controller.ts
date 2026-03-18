import OpenAI from 'openai'
import { getSession } from '@/server/better-auth/server'
import { env } from '@/env'
import type { ApiErrorResponse } from '@/types/api.types'
import { db } from '@/server/db'   // <-- confirm path
import { conversations, conversation_messages } from '@/server/db/schema'
import { nanoid } from 'nanoid'
// ============================================================================
// Types
// ============================================================================

type ChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface OpenRouterResponse {
  reply: string
  usedModel: string
  fallback: boolean
  originalModel: string
  conversationId: string
}

type OpenRouterBody = {
  messages?: { role: string; content: string }[]
  message?: string
  model?: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  topP?: number
}

// ============================================================================
// Constants
// ============================================================================

const BASE_URL = 'https://openrouter.ai/api/v1'

/**
 * Ordered fallback chain — larger, more capable models first.
 * "openrouter/free" is a meta-router that picks the best available free model.
 */
const FALLBACK_CHAIN = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'arcee-ai/trinity-large-preview:free',
  'upstage/solar-pro-3:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'stepfun/step-3.5-flash:free',
  'google/gemma-3-12b-it:free',
  'qwen/qwen3-4b:free',
  'openrouter/free',
] as const

const DEFAULT_SYSTEM_PROMPT = `You are Buildify AI, an expert full-stack developer assistant.
When the user asks you to build an app or write code:
- Generate COMPLETE, WORKING code — never use placeholders or "// TODO" comments.
- Use fenced code blocks with the correct language tag (html, css, javascript, tsx, python, etc.).
- For web apps: always provide the full HTML file with embedded CSS and JS so it runs standalone.
- For React components: provide complete JSX/TSX code with all imports and a default App component.
- Keep explanations brief; let the code speak for itself.
- Use modern best practices (semantic HTML, CSS flexbox/grid, ES6+, React hooks).
When answering general questions: be concise, use markdown formatting.`

// ============================================================================
// Shared Helpers
// ============================================================================

function validateAndBuildMessages(body: OpenRouterBody): {
  apiMessages: ChatMessage[]
  error?: never
} | {
  apiMessages?: never
  error: ApiErrorResponse
} {
  let userMessages: ChatMessage[]
  if (Array.isArray(body.messages) && body.messages.length > 0) {
    userMessages = body.messages.map((m) => ({
      role: m.role as ChatMessage['role'],
      content: m.content,
    }))
  } else if (body.message) {
    userMessages = [{ role: 'user', content: body.message }]
  } else {
    return {
      error: {
        error: "Provide either a 'messages' array or a 'message' string.",
        status: 400,
      },
    }
  }

  return {
    apiMessages: [
      { role: 'system', content: body.systemPrompt ?? DEFAULT_SYSTEM_PROMPT },
      ...userMessages,
    ],
  }
}

async function validateAuth(): Promise<ApiErrorResponse | null> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', status: 401 }
  }
  if (!env.OPENROUTER_API_KEY) {
    return {
      error: 'AI chat service is not configured',
      message: 'OpenRouter API key is not set.',
      status: 503,
    }
  }
  return null
}

function buildFallbackChain(model?: string): string[] {
  const requested = model ?? FALLBACK_CHAIN[0]
  return [requested, ...FALLBACK_CHAIN.filter((m) => m !== requested)]
}

// ============================================================================
// Non-Streaming Handler
// ============================================================================

export async function openRouterChatHandler({
  body,
}: {
  body: OpenRouterBody
}): Promise<OpenRouterResponse | ApiErrorResponse> {
  const authError = await validateAuth()
  if (authError) return authError

  const result = validateAndBuildMessages(body)
  if (result.error) return result.error
const session = await getSession()
const userId = session!.user!.id
  const maxTokens = Math.min(Math.max(body.maxTokens ?? 4096, 128), 32768)
  const temperature = Math.min(Math.max(body.temperature ?? 0.7, 0), 2)
  const topP = Math.min(Math.max(body.topP ?? 1, 0), 1)

  const openai = new OpenAI({ baseURL: BASE_URL, apiKey: env.OPENROUTER_API_KEY! })
  const chain = buildFallbackChain(body.model)
  const requested = chain[0]!

  for (const modelId of chain) {
    try {
      const completion = await openai.chat.completions.create({
        model: modelId,
        messages: result.apiMessages,
        max_tokens: maxTokens,
        temperature,
        top_p: topP,
      })
      const reply = completion.choices[0]?.message?.content ?? ''
      if (!reply || reply.trim().length < 20) continue
     // ==========================
//  CREATE CONVERSATION
// ==========================
const conversationId = nanoid()

await db.insert(conversations).values({
  id: conversationId,
  user_id: userId,
  model_name: modelId,
})

// ==========================
//  SAVE USER MESSAGE
// ==========================
const userMessage =
  body.message ??
  body.messages?.[body.messages.length - 1]?.content ??
  ''

await db.insert(conversation_messages).values({
  id: nanoid(),
  conversation_id: conversationId,
  role: 'USER',
  content: userMessage,
})

// ==========================
//  SAVE ASSISTANT MESSAGE
// ==========================
await db.insert(conversation_messages).values({
  id: nanoid(),
  conversation_id: conversationId,
  role: 'ASSISTANT',
  content: reply,
})

// ==========================
// RETURN RESPONSE
// ==========================
return {
  reply,
  usedModel: modelId,
  fallback: modelId !== requested,
  originalModel: requested,
  conversationId, // important
}
    } catch {
      // Model failed, try next in chain
    }
  }

  return {
    error: 'All models are currently unavailable. Please try again later.',
    status: 503,
  }
}

// ============================================================================
// Streaming Handler
// ============================================================================

/**
 * SSE event protocol:
 *   data: {"type":"meta","model":"...","fallback":false}
 *   data: {"type":"delta","content":"..."}
 *   data: {"type":"error","message":"..."}
 *   data: {"type":"done"}
 */
export async function openRouterStreamHandler({
  body,
}: {
  body: OpenRouterBody
}): Promise<Response | ApiErrorResponse> {
  const authError = await validateAuth()
  if (authError) return authError

  const result = validateAndBuildMessages(body)
  if (result.error) return result.error

  const maxTokens = Math.min(Math.max(body.maxTokens ?? 4096, 128), 32768)
  const temperature = Math.min(Math.max(body.temperature ?? 0.7, 0), 2)
  const topP = Math.min(Math.max(body.topP ?? 1, 0), 1)

  const openai = new OpenAI({ baseURL: BASE_URL, apiKey: env.OPENROUTER_API_KEY! })
  const chain = buildFallbackChain(body.model)
  const requested = chain[0]!

  for (const modelId of chain) {
    try {
      const completion = await openai.chat.completions.create({
        model: modelId,
        messages: result.apiMessages,
        max_tokens: maxTokens,
        temperature,
        top_p: topP,
        stream: true,
      })

      const isFallback = modelId !== requested
      const encoder = new TextEncoder()

      const readable = new ReadableStream({
        async start(controller) {
          const send = (obj: Record<string, unknown>) =>
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))

          send({ type: 'meta', model: modelId, fallback: isFallback })

          try {
            for await (const chunk of completion) {
              const content = chunk.choices[0]?.delta?.content
              if (content) {
                send({ type: 'delta', content })
              }
            }
          } catch (streamErr) {
            const msg =
              streamErr instanceof Error ? streamErr.message : 'Stream interrupted'
            send({ type: 'error', message: msg })
          }

          send({ type: 'done' })
          controller.close()
        },
      })

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    } catch {
      // Model creation failed (rate-limited / unavailable), try next
      continue
    }
  }

  return {
    error: 'All models are currently unavailable. Please try again later.',
    status: 503,
  }
}