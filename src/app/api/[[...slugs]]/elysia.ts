import { Elysia, t } from 'elysia'
import { getSession } from '@/server/better-auth/server'
import {
  createChatOwnershipHandler,
  getChatDetailsHandler,
  getChatHistoryHandler,
  getClientIP,
} from '@/server/api/controllers/chat.controller'
import {
  getChatCountByUserId,
  getChatCountByIP,
} from '@/server/db/queries'
import { createChatHandler } from '@/server/api/controllers/chat.controller'
import { getV0Client } from '@/lib/v0-client'
import {
  type ChatAttachment,
  type ApiErrorResponse,
  type RateLimitErrorResponse,
  isApiError,
} from '@/types/api.types'

const MAX_MESSAGES_PER_DAY_AUTHENTICATED = 50
const MAX_MESSAGES_PER_DAY_ANONYMOUS = 3

/** Streaming error response type */
interface StreamingErrorResponse {
  error: string
  details: string
}

/** Chat request body interface (matches Elysia schema) */
interface ChatRequestBody {
  message: string
  chatId?: string
  streaming?: boolean
  attachments?: ChatAttachment[]
}

export const elysiaApp = new Elysia({ prefix: '/api' })
  // Chat endpoint - POST /api/chat
  // Note: Streaming requests are handled inline (use fetch directly)
  // Non-streaming requests use the controller
  .post(
    '/chat',
    async ({ body, request, set }) => {
      const { message, chatId, streaming, attachments } = body as ChatRequestBody

      const v0 = await getV0Client()

      // Handle streaming requests inline (skip controller, use fetch directly)
      if (streaming) {
        try {
          const session = await getSession()

          // Rate limiting for streaming
          if (session?.user?.id) {
            const chatCount = await getChatCountByUserId({
              userId: session.user.id,
              differenceInHours: 24,
            })

            if (chatCount >= MAX_MESSAGES_PER_DAY_AUTHENTICATED) {
              set.status = 429
              return {
                error: 'rate_limit:chat',
                message:
                  'You have exceeded your maximum number of messages for the day. Please try again later.',
              } satisfies RateLimitErrorResponse
            }
          } else {
            const clientIP = await getClientIP(request)
            const chatCount = await getChatCountByIP({
              ipAddress: clientIP,
              differenceInHours: 24,
            })

            if (chatCount >= MAX_MESSAGES_PER_DAY_ANONYMOUS) {
              set.status = 429
              return {
                error: 'rate_limit:chat',
                message:
                  'You have exceeded your maximum number of messages for the day. Please try again later.',
              } satisfies RateLimitErrorResponse
            }
          }

          let stream: ReadableStream<Uint8Array>

          if (chatId) {
            try {
              // Continue existing chat with streaming
              stream = (await v0.chats.sendMessage({
                chatId,
                message,
                responseMode: 'experimental_stream',
                ...(attachments && attachments.length > 0 && { attachments }),
              })) as ReadableStream<Uint8Array>
            } catch (error) {
              // If chat doesn't exist (404), create a new chat instead
              const errorMessage =
                error instanceof Error ? error.message : String(error)
              if (
                errorMessage.includes('404') ||
                errorMessage.includes('not_found') ||
                errorMessage.includes('Chat not found')
              ) {
                console.warn(
                  `Chat ${chatId} not found, creating new chat instead`,
                )
                // Create new chat with streaming
                stream = (await v0.chats.create({
                  message,
                  responseMode: 'experimental_stream',
                  ...(attachments && attachments.length > 0 && { attachments }),
                })) as ReadableStream<Uint8Array>
              } else {
                // Re-throw other errors
                throw error
              }
            }
          } else {
            // Create new chat with streaming
            stream = (await v0.chats.create({
              message,
              responseMode: 'experimental_stream',
              ...(attachments && attachments.length > 0 && { attachments }),
            })) as ReadableStream<Uint8Array>
          }

          return new Response(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
            },
          })
        } catch (error) {
          console.error('V0 API Streaming Error:', error)
          set.status = 500
          return {
            error: 'Failed to process streaming request',
            details: error instanceof Error ? error.message : 'Unknown error',
          } satisfies StreamingErrorResponse
        }
      }

      // Non-streaming requests use the controller
      const result = await createChatHandler({ body, request })

      // Handle error responses with status codes
      if (isApiError(result)) {
        if (result.error === 'Message is required') {
          set.status = 400
        } else if (result.error === 'rate_limit:chat') {
          set.status = 429
        } else if (result.error === 'Failed to process request') {
          set.status = 500
        }
      }

      return result
    },
    {
      body: t.Object({
        message: t.String(),
        chatId: t.Optional(t.String()),
        streaming: t.Optional(t.Boolean()),
        attachments: t.Optional(
          t.Array(t.Object({ url: t.String() })),
        ),
      }),
    },
  )
  // Chat details endpoint - GET /api/chats/:chatId
  .get(
    '/chats/:chatId',
    async ({ params, set }) => {
      const result = await getChatDetailsHandler({ params })

      // Handle error responses with status codes
      if (isApiError(result)) {
        if (result.error === 'Chat ID is required') {
          set.status = 400
        } else if (result.error === 'Chat not found') {
          set.status = 404
        } else if (result.error === 'Forbidden') {
          set.status = 403
        } else if (result.error === 'Failed to fetch chat details') {
          set.status = 500
        }
      }

      return result
    },
    {
      params: t.Object({
        chatId: t.String(),
      }),
    },
  )
  // Chat ownership endpoint - POST /api/chat/ownership
  // Used to save chat metadata after streaming (prompt, demoUrl, etc.)
  .post(
    '/chat/ownership',
    async ({ body, set }) => {
      const result = await createChatOwnershipHandler({ body })

      // Handle error responses with status codes
      if (isApiError(result)) {
        if (result.error === 'Chat ID is required') {
          set.status = 400
        } else if (result.error === 'Unauthorized') {
          set.status = 401
        } else if (result.error === 'Failed to create chat ownership') {
          set.status = 500
        }
      }

      return result
    },
    {
      body: t.Object({
        chatId: t.String(),
        prompt: t.Optional(t.String()),
        demoUrl: t.Optional(t.String()),
      }),
    },
  )
  // Chat history endpoint - GET /api/chats
  .get('/chats', async ({ set }) => {
    const result = await getChatHistoryHandler()

    // Handle error responses with status codes
    if (isApiError(result)) {
      if (result.error === 'Failed to fetch chat history') {
        set.status = (result as ApiErrorResponse).status ?? 500
      }
    }

    return result
  })
