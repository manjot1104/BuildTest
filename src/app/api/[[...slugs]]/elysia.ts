import { Elysia, t } from 'elysia'
import { getSession } from '@/server/better-auth/server'
import {
  createChatOwnershipHandler,
  forkChatHandler,
  getChatDetailsHandler,
  getChatHistoryHandler,
  getCommunityBuildsHandler,
  getClientIP,
} from '@/server/api/controllers/chat.controller'
import {
  getChatCountByUserId,
  getChatCountByIP,
} from '@/server/db/queries'
import { createChatHandler } from '@/server/api/controllers/chat.controller'
import {
  getPlansHandler,
  getLocalizedPlansHandler,
  getUserCreditsHandler,
  createSubscriptionOrderHandler,
  createCreditPackOrderHandler,
  verifyPaymentHandler,
  getPaymentHistoryHandler,
  getCreditUsageHistoryHandler,
  cancelSubscriptionHandler,
} from '@/server/api/controllers/payment.controller'
import { getV0Client } from '@/lib/v0-client'
import { enhanceFirstPrompt } from '@/lib/prompt-enhancer'
import {
  type ChatAttachment,
  type ApiErrorResponse,
  type RateLimitErrorResponse,
  isApiError,
} from '@/types/api.types'
import {
  hasEnoughCredits,
  deductCreditsForPrompt,
  hasActiveSubscription,
} from '@/server/services/credits.service'
import {
  toggleStarChat,
  getStarredChats,
} from '@/server/api/controllers/star.controller'

/** Insufficient credits response type */
interface InsufficientCreditsResponse {
  error: 'insufficient_credits'
  message: string
  required: number
  available: number
}

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

            // Check credits for authenticated users
            const isNewChat = !chatId
            const hasSub = await hasActiveSubscription(session.user.id)

            if (!hasSub) {
              set.status = 402
              return {
                error: 'insufficient_credits',
                message: 'You need an active subscription to use this service. Please subscribe to continue.',
                required: isNewChat ? 20 : 30,
                available: 0,
              } satisfies InsufficientCreditsResponse
            }

            const creditCheck = await hasEnoughCredits(session.user.id, isNewChat)

            if (!creditCheck.hasCredits) {
              set.status = 402
              return {
                error: 'insufficient_credits',
                message: `Insufficient credits. You need ${creditCheck.required} credits but only have ${creditCheck.available}.`,
                required: creditCheck.required,
                available: creditCheck.available,
              } satisfies InsufficientCreditsResponse
            }

            // Deduct credits before making the API call
            const deductResult = await deductCreditsForPrompt(
              session.user.id,
              isNewChat,
              chatId,
            )
            if (!deductResult.success) {
              set.status = 402
              return {
                error: 'insufficient_credits',
                message: deductResult.error ?? 'Failed to deduct credits',
                required: isNewChat ? 20 : 30,
                available: 0,
              } satisfies InsufficientCreditsResponse
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
                  message: enhanceFirstPrompt(message),
                  responseMode: 'experimental_stream',
                  ...(attachments && attachments.length > 0 && { attachments }),
                })) as ReadableStream<Uint8Array>
              } else {
                // Re-throw other errors
                throw error
              }
            }
          } else {
            // Create new chat with streaming (enhanced first prompt)
            stream = (await v0.chats.create({
              message: enhanceFirstPrompt(message),
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
  // Community builds endpoint - GET /api/chats/community (must be before :chatId)
  .get(
    '/chats/community',
    async ({ query, set }) => {
      const result = await getCommunityBuildsHandler({ query })

      if (isApiError(result)) {
        set.status = (result as ApiErrorResponse).status ?? 500
      }

      return result
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
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
  // Star / Unstar chat
  .post(
    '/chat/star',
    async ({ body, set }) => {
      const session = await getSession()

      if (!session?.user?.id) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      const { chatId, isStarred } = body as {
        chatId: string
        isStarred: boolean
      }

      // const { db } = await import('@/server/db')
      // const { user_chats } = await import('@/server/db/schema')
      // const { and, eq } = await import('drizzle-orm')

      // await db
      //   .update(user_chats)
      //   .set({
      //     is_starred: isStarred,
      //     updated_at: new Date(),
      //   })
      //   .where(
      //     and(
      //       eq(user_chats.id, chatId),
      //       eq(user_chats.user_id, session.user.id),
      //     ),
      //   )
      await toggleStarChat({
  userId: session.user.id,
  chatId,       
  isStarred,
})


      return { success: true }
    },
    {
      body: t.Object({
        chatId: t.String(),
        isStarred: t.Boolean(),
      }),
    },
  )
   .get('/chat/starred', async ({ set }) => {
    const session = await getSession()

    if (!session?.user?.id) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    // const { db } = await import('@/server/db')
    // const { user_chats } = await import('@/server/db/schema')
    // const { and, eq, desc } = await import('drizzle-orm')

    // const starredChats = await db
    //   .select()
    //   .from(user_chats)
    //   .where(
    //     and(
    //       eq(user_chats.user_id, session.user.id),
    //       eq(user_chats.is_starred, true),
    //     ),
    //   )
    //   .orderBy(desc(user_chats.updated_at))

    // return starredChats
    return getStarredChats(session.user.id)

  })
  // Fork chat endpoint - POST /api/chat/fork
  // Creates a copy of an existing chat for the current user
  .post(
    '/chat/fork',
    async ({ body, set }) => {
      const result = await forkChatHandler({ body })

      if (isApiError(result)) {
        if (result.error === 'Unauthorized') {
          set.status = 401
        } else if (result.error === 'Chat ID is required') {
          set.status = 400
        } else if (result.error === 'Failed to fork chat') {
          set.status = 500
        }
      }

      return result
    },
    {
      body: t.Object({
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

  // ============================================
  // Payment & Credits Endpoints
  // ============================================

  // Get all available plans and credit packs - GET /api/payments/plans
  .get('/payments/plans', async () => {
    return await getPlansHandler()
  })

  // Get localized plans with currency conversion - GET /api/payments/plans/localized
  .get(
    '/payments/plans/localized',
    async ({ query }) => {
      return await getLocalizedPlansHandler({ query })
    },
    {
      query: t.Object({
        currency: t.Optional(t.String()),
        country: t.Optional(t.String()),
      }),
    },
  )

  // Get user's credits and subscription status - GET /api/payments/credits
  .get('/payments/credits', async ({ set }) => {
    const result = await getUserCreditsHandler()

    if (isApiError(result)) {
      set.status = (result as ApiErrorResponse).status ?? 500
    }

    return result
  })

  // Create subscription order - POST /api/payments/subscribe
  .post(
    '/payments/subscribe',
    async ({ body, set }) => {
      const result = await createSubscriptionOrderHandler({ body })

      if (isApiError(result)) {
        set.status = (result as ApiErrorResponse).status ?? 500
      }

      return result
    },
    {
      body: t.Object({
        planId: t.String(),
        displayCurrency: t.Optional(t.String()),
      }),
    },
  )

  // Create credit pack order - POST /api/payments/credits/buy
  .post(
    '/payments/credits/buy',
    async ({ body, set }) => {
      const result = await createCreditPackOrderHandler({ body })

      if (isApiError(result)) {
        set.status = (result as ApiErrorResponse).status ?? 500
      }

      return result
    },
    {
      body: t.Object({
        packId: t.String(),
        displayCurrency: t.Optional(t.String()),
      }),
    },
  )

  // Verify payment - POST /api/payments/verify
  .post(
    '/payments/verify',
    async ({ body, set }) => {
      const result = await verifyPaymentHandler({ body })

      if (isApiError(result)) {
        set.status = (result as ApiErrorResponse).status ?? 500
      }

      return result
    },
    {
      body: t.Object({
        razorpay_order_id: t.String(),
        razorpay_payment_id: t.String(),
        razorpay_signature: t.String(),
      }),
    },
  )

  // Get payment history - GET /api/payments/history
  .get('/payments/history', async ({ set }) => {
    const result = await getPaymentHistoryHandler()

    if (isApiError(result)) {
      set.status = (result as ApiErrorResponse).status ?? 500
    }

    return result
  })

  // Get credit usage history - GET /api/payments/usage
  .get('/payments/usage', async ({ set }) => {
    const result = await getCreditUsageHistoryHandler()

    if (isApiError(result)) {
      set.status = (result as ApiErrorResponse).status ?? 500
    }

    return result
  })

  // Cancel subscription - POST /api/payments/cancel
  .post('/payments/cancel', async ({ set }) => {
    const result = await cancelSubscriptionHandler()

    if (isApiError(result)) {
      set.status = (result as ApiErrorResponse).status ?? 500
    }

    return result
  })
