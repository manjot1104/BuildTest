import { Elysia, t } from 'elysia'
import { getSession } from '@/server/better-auth/server'
import {
  createChatOwnershipHandler,
  forkChatHandler,
  getChatDetailsHandler,
  getChatHistoryHandler,
  getCommunityBuildsHandler,
  getFeaturedBuildsHandler,
  getClientIP,
} from '@/server/api/controllers/chat.controller'
import {
  getChatCountByUserId,
  getChatCountByIP,
  getChatDemoUrl,
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
import {
  getAdminStatsHandler,
  getAdminUsersHandler,
  getAdminUserDetailHandler,
  assignSubscriptionHandler,
  cancelUserSubscriptionHandler,
  addCreditsHandler,
  deductCreditsHandler,
  toggleUserRoleHandler,
} from '@/server/api/controllers/admin.controller'
import { executeCodeHandler } from '@/server/api/controllers/sandbox.controller'
import { openRouterChatHandler, openRouterStreamHandler } from '@/server/api/controllers/openrouter.controller'
import {
  startTestRunHandler,
  getTestRunHandler,
  getTestHistoryHandler,
  getTestReportHandler,
  streamTestRunHandler,
  getPublicReportHandler,
  getEmbedBadgeHandler,
} from '@/server/api/controllers/testing.controller'
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
import {
  getGithubStatusHandler,
  pushToGithubHandler,
  getGithubRepoForChatHandler,
} from '@/server/api/controllers/github.controller'
import {
  createDesignHandler,
  listDesignsHandler,
  getDesignByIdHandler,
  updateDesignHandler,
  publishDesignByIdHandler,
  unpublishDesignByIdHandler,
  deleteDesignByIdHandler,
  getPublicDesignHandler,
} from '@/server/api/controllers/studio.controller'
import { env } from '@/env'
import { RATE_LIMITS, CREDIT_COSTS } from '@/config/credits.config'

/** Insufficient credits response type */
interface InsufficientCreditsResponse {
  error: 'insufficient_credits'
  message: string
  required: number
  available: number
}

// Speech-to-text rate limiting (in-memory, per-user, 24h sliding window)
const MAX_STT_BASE64_LENGTH = 15_000_000 // ~15MB base64 string ≈ ~10MB decoded audio
const sttRateLimitMap = new Map<string, { count: number; windowStart: number }>()

// Periodically clean up expired STT rate limit entries to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  const windowMs = 24 * 60 * 60 * 1000
  for (const [key, entry] of sttRateLimitMap) {
    if (now - entry.windowStart >= windowMs) {
      sttRateLimitMap.delete(key)
    }
  }
}, 60 * 60 * 1000) // Clean up every hour

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
  .post(
    '/chat',
    async ({ body, request, set }) => {
      const { message, chatId, streaming, attachments } = body as ChatRequestBody

      const v0 = await getV0Client()

      if (streaming) {
        try {
          const session = await getSession()

          if (session?.user?.id) {
            const chatCount = await getChatCountByUserId({
              userId: session.user.id,
              differenceInHours: 24,
            })

            if (chatCount >= RATE_LIMITS.AUTHENTICATED_MESSAGES_PER_DAY) {
              set.status = 429
              return {
                error: 'rate_limit:chat',
                message:
                  'You have exceeded your maximum number of messages for the day. Please try again later.',
              } satisfies RateLimitErrorResponse
            }

            const isNewChat = !chatId
            const hasSub = await hasActiveSubscription(session.user.id)

            if (!hasSub) {
              set.status = 402
              return {
                error: 'insufficient_credits',
                message: 'You need an active subscription to use this service. Please subscribe to continue.',
                required: isNewChat ? CREDIT_COSTS.NEW_PROMPT : CREDIT_COSTS.FOLLOW_UP_PROMPT,
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
                required: isNewChat ? CREDIT_COSTS.NEW_PROMPT : CREDIT_COSTS.FOLLOW_UP_PROMPT,
                available: 0,
              } satisfies InsufficientCreditsResponse
            }
          } else {
            const clientIP = await getClientIP(request)
            const chatCount = await getChatCountByIP({
              ipAddress: clientIP,
              differenceInHours: 24,
            })

            if (chatCount >= RATE_LIMITS.ANONYMOUS_MESSAGES_PER_DAY) {
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
              stream = (await v0.chats.sendMessage({
                chatId,
                message,
                responseMode: 'experimental_stream',
                ...(attachments && attachments.length > 0 && { attachments }),
              })) as ReadableStream<Uint8Array>
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : String(error)
              if (
                errorMessage.includes('404') ||
                errorMessage.includes('not_found') ||
                errorMessage.includes('Chat not found')
              ) {
                stream = (await v0.chats.create({
                  message: enhanceFirstPrompt(message),
                  responseMode: 'experimental_stream',
                  ...(attachments && attachments.length > 0 && { attachments }),
                })) as ReadableStream<Uint8Array>
              } else {
                throw error
              }
            }
          } else {
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
        } catch {
          set.status = 500
          return {
            error: 'Failed to process streaming request',
            details: 'An internal error occurred',
          } satisfies StreamingErrorResponse
        }
      }

      const result = await createChatHandler({ body, request })

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
  // App demo URL endpoint - GET /api/apps/:chatId (public, no auth)
  .get(
    '/apps/:chatId',
    async ({ params, set }) => {
      try {
        const result = await getChatDemoUrl({ v0ChatId: params.chatId })

        if (!result) {
          set.status = 404
          return { error: 'App not found' }
        }

        try {
          const { db } = await import('@/server/db')
          const { demo_visits, user_chats } = await import('@/server/db/schema')
          const { eq } = await import('drizzle-orm')

          const chatId = params.chatId

          const [chatRecord] = await db
            .select({ user_id: user_chats.user_id })
            .from(user_chats)
            .where(eq(user_chats.v0_chat_id, chatId))
            .limit(1)

          const session = await getSession()
          await db.insert(demo_visits).values({
            id: crypto.randomUUID(),
            demo_id: chatId,
            demo_type: 'community',
            owner_user_id: chatRecord?.user_id ?? null,
            visitor_user_id: session?.user?.id ?? null,
          })
        } catch {
          // Visit logging is non-critical — silently ignore failures
        }

        return result
      } catch {
        set.status = 500
        return { error: 'Failed to fetch app' }
      }
    },
    {
      params: t.Object({
        chatId: t.String(),
      }),
    },
  )
  // Featured builds endpoint - GET /api/chats/featured (must be before :chatId)
  .get(
    '/chats/featured',
    async ({ set }) => {
      const result = await getFeaturedBuildsHandler()

      if (isApiError(result)) {
        set.status = (result as ApiErrorResponse).status ?? 500
      }

      return result
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

    return getStarredChats(session.user.id)
  })
  // Fork chat endpoint - POST /api/chat/fork
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
  .post(
    '/chat/ownership',
    async ({ body, set }) => {
      const result = await createChatOwnershipHandler({ body })

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
  .get(
    '/chats',
    async ({ query, set }) => {
      const result = await getChatHistoryHandler({ query })

      if (isApiError(result)) {
        if (result.error === 'Failed to fetch chat history') {
          set.status = (result as ApiErrorResponse).status ?? 500
        }
      }

      return result
    },
    {
      query: t.Object({
        type: t.Optional(
          t.Union([
            t.Literal('all'),
            t.Literal('builder'),
            t.Literal('openrouter'),
          ]),
        ),
      }),
    },
  )
  // Speech-to-text endpoint - POST /api/speech-to-text
  .post(
    '/speech-to-text',
    async ({ body, set }) => {
      try {
        const session = await getSession()
        if (!session?.user?.id) {
          set.status = 401
          return { error: 'Unauthorized', message: 'You must be signed in to use speech-to-text.' }
        }

        const userId = session.user.id

        const now = Date.now()
        const windowMs = 24 * 60 * 60 * 1000
        const entry = sttRateLimitMap.get(userId)
        if (entry && now - entry.windowStart < windowMs) {
          if (entry.count >= RATE_LIMITS.STT_REQUESTS_PER_DAY) {
            set.status = 429
            return {
              error: 'rate_limit:speech' as const,
              message: 'You have exceeded the maximum number of speech-to-text requests for the day. Please try again later.',
            }
          }
          entry.count++
        } else {
          sttRateLimitMap.set(userId, { count: 1, windowStart: now })
        }

        if (!env.ELEVENLABS_API_KEY) {
          set.status = 500
          return {
            error: 'Speech-to-text is not configured',
            message: 'ElevenLabs API key is not set',
          }
        }

        const audioData = body.audio
        if (!audioData) {
          set.status = 400
          return {
            error: 'Audio data is required',
            message: 'Please provide audio data',
          }
        }

        if (audioData.length > MAX_STT_BASE64_LENGTH) {
          set.status = 413
          return {
            error: 'Payload too large',
            message: 'Audio data exceeds the maximum allowed size of ~10MB.',
          }
        }

        const mimeMatch = /^data:(audio\/[\w.+-]+);base64,/.exec(audioData)
        const mimeType = mimeMatch?.[1] ?? 'audio/webm'

        const base64Data = audioData.replace(/^data:audio\/[\w.+-]+;base64,/, '')
        const audioBuffer = Buffer.from(base64Data, 'base64')

        const modelId = body.modelId || 'scribe_v2'
        const formData = new FormData()
        formData.append('model_id', modelId)
        formData.append(
          'audio',
          new Blob([audioBuffer], { type: mimeType }),
          'audio.webm',
        )

        const response = await fetch(
          'https://api.elevenlabs.io/v1/speech-to-text',
          {
            method: 'POST',
            headers: {
              'xi-api-key': env.ELEVENLABS_API_KEY,
            },
            body: formData,
          },
        )

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as {
            detail?: { message?: string }
          }
          set.status = response.status
          return {
            error: 'Speech-to-text conversion failed',
            message:
              errorData.detail?.message ||
              `ElevenLabs API error: ${response.statusText}`,
          }
        }

        const data = (await response.json()) as { text?: string; language?: string }
        return {
          transcript: data.text || '',
          language: data.language || null,
        }
      } catch {
        set.status = 500
        return {
          error: 'Failed to process speech-to-text',
          message: 'An internal error occurred',
        }
      }
    },
    {
      body: t.Object({
        audio: t.String({ maxLength: MAX_STT_BASE64_LENGTH }),
        modelId: t.Optional(t.String()),
      }),
    },
  )

  // ============================================
  // Payment & Credits Endpoints
  // ============================================

  .get('/payments/plans', async () => {
    return await getPlansHandler()
  })

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

  .get('/payments/credits', async ({ set }) => {
    const result = await getUserCreditsHandler()
    if (isApiError(result)) set.status = (result as ApiErrorResponse).status ?? 500
    return result
  })

  .post(
    '/payments/subscribe',
    async ({ body, set }) => {
      const result = await createSubscriptionOrderHandler({ body })
      if (isApiError(result)) set.status = (result as ApiErrorResponse).status ?? 500
      return result
    },
    {
      body: t.Object({
        planId: t.String(),
        displayCurrency: t.Optional(t.String()),
      }),
    },
  )

  .post(
    '/payments/credits/buy',
    async ({ body, set }) => {
      const result = await createCreditPackOrderHandler({ body })
      if (isApiError(result)) set.status = (result as ApiErrorResponse).status ?? 500
      return result
    },
    {
      body: t.Object({
        packId: t.String(),
        displayCurrency: t.Optional(t.String()),
      }),
    },
  )

  .post(
    '/payments/verify',
    async ({ body, set }) => {
      const result = await verifyPaymentHandler({ body })
      if (isApiError(result)) set.status = (result as ApiErrorResponse).status ?? 500
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

  .get('/payments/history', async ({ set }) => {
    const result = await getPaymentHistoryHandler()
    if (isApiError(result)) set.status = (result as ApiErrorResponse).status ?? 500
    return result
  })

  .get('/payments/usage', async ({ set }) => {
    const result = await getCreditUsageHistoryHandler()
    if (isApiError(result)) set.status = (result as ApiErrorResponse).status ?? 500
    return result
  })

  .post('/payments/cancel', async ({ set }) => {
    const result = await cancelSubscriptionHandler()
    if (isApiError(result)) set.status = (result as ApiErrorResponse).status ?? 500
    return result
  })

  // ============================================
  // Admin Endpoints
  // ============================================

  .get('/admin/stats', async ({ set }) => {
    const result = await getAdminStatsHandler()
    if (isApiError(result)) set.status = (result as ApiErrorResponse).status ?? 500
    return result
  })

  .get('/admin/users', async ({ set }) => {
    const result = await getAdminUsersHandler()
    if (isApiError(result)) set.status = (result as ApiErrorResponse).status ?? 500
    return result
  })

  .get(
    '/admin/users/:id',
    async ({ params, set }) => {
      const result = await getAdminUserDetailHandler({ params })
      if (isApiError(result)) set.status = (result as ApiErrorResponse).status ?? 500
      return result
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  .post(
    '/admin/subscription',
    async ({ body, set }) => {
      const result = await assignSubscriptionHandler({ body })
      if (isApiError(result)) set.status = (result as ApiErrorResponse).status ?? 500
      return result
    },
    {
      body: t.Object({
        userId: t.String(),
        plan_id: t.String(),
        plan_name: t.String(),
        plan_price: t.Optional(t.Number()),
        credits_per_month: t.Number(),
        startDate: t.String(),
        endDate: t.String(),
      }),
    },
  )

  .post(
    '/admin/subscription/cancel',
    async ({ body, set }) => {
      const result = await cancelUserSubscriptionHandler({ body })
      if (isApiError(result)) set.status = (result as ApiErrorResponse).status ?? 500
      return result
    },
    {
      body: t.Object({ userId: t.String() }),
    },
  )

  .post(
    '/admin/credits',
    async ({ body, set }) => {
      const result = await addCreditsHandler({ body })
      if (isApiError(result)) set.status = (result as ApiErrorResponse).status ?? 500
      return result
    },
    {
      body: t.Object({
        userId: t.String(),
        subscriptionCredits: t.Optional(t.Number()),
        additionalCredits: t.Optional(t.Number()),
      }),
    },
  )

  .post(
    '/admin/users/role',
    async ({ body, set }) => {
      const result = await toggleUserRoleHandler({ body })
      if (isApiError(result)) set.status = (result as ApiErrorResponse).status ?? 500
      return result
    },
    {
      body: t.Object({
        userId: t.String(),
        role: t.String(),
        action: t.Union([t.Literal('add'), t.Literal('remove')]),
      }),
    },
  )

  .post(
    '/admin/credits/deduct',
    async ({ body, set }) => {
      const result = await deductCreditsHandler({ body })
      if (isApiError(result)) set.status = (result as ApiErrorResponse).status ?? 500
      return result
    },
    {
      body: t.Object({
        userId: t.String(),
        deductSubscription: t.Optional(t.Number()),
        deductAdditional: t.Optional(t.Number()),
      }),
    },
  )

  // ============================================
  // Resume Builder Endpoints
  // ============================================

  .post(
    '/resume/generate',
    async ({ body, set }) => {
      const { generateResumeLatexHandler } = await import('@/server/api/controllers/resume.controller')
      const result = await generateResumeLatexHandler({ body })
      if (isApiError(result)) set.status = (result as ApiErrorResponse).status ?? 500
      return result
    },
    {
      body: t.Object({
        resumeData: t.Object({
          personalInfo: t.Object({
            name: t.String(),
            email: t.String(),
            phone: t.String(),
            address: t.Optional(t.String()),
            linkedin: t.Optional(t.String()),
            github: t.Optional(t.String()),
            website: t.Optional(t.String()),
          }),
          summary: t.Optional(t.String()),
          experience: t.Array(
            t.Object({
              company: t.String(),
              position: t.String(),
              startDate: t.String(),
              endDate: t.Optional(t.String()),
              description: t.Array(t.String()),
              achievements: t.Optional(t.Array(t.String())),
            }),
          ),
          education: t.Array(
            t.Object({
              institution: t.String(),
              degree: t.String(),
              field: t.Optional(t.String()),
              startDate: t.String(),
              endDate: t.Optional(t.String()),
              gpa: t.Optional(t.String()),
              honors: t.Optional(t.Array(t.String())),
            }),
          ),
          skills: t.Array(
            t.Object({
              category: t.String(),
              items: t.Array(t.String()),
            }),
          ),
          projects: t.Optional(
            t.Array(
              t.Object({
                name: t.String(),
                description: t.String(),
                technologies: t.Array(t.String()),
                link: t.Optional(t.String()),
              }),
            ),
          ),
          certifications: t.Optional(
            t.Array(
              t.Object({
                name: t.String(),
                issuer: t.String(),
                date: t.String(),
                credentialId: t.Optional(t.String()),
              }),
            ),
          ),
          languages: t.Optional(
            t.Array(
              t.Object({
                language: t.String(),
                proficiency: t.String(),
              }),
            ),
          ),
        }),
        templateId: t.Optional(t.String()),
      }),
    },
  )

  .post(
    '/resume/pdf',
    async ({ body, set }) => {
      const { generateResumePDFHandler } = await import('@/server/api/controllers/resume.controller')
      const result = await generateResumePDFHandler({ body })
      if (isApiError(result)) set.status = (result as ApiErrorResponse).status ?? 500
      return result
    },
    {
      body: t.Object({
        resumeId: t.String(),
        latex: t.Optional(t.String()),
      }),
    },
  )

  .get('/resume/list', async ({ set }) => {
    const { getUserResumesHandler } = await import('@/server/api/controllers/resume.controller')
    const result = await getUserResumesHandler()
    if (isApiError(result)) set.status = (result as ApiErrorResponse).status ?? 500
    return result
  })

  .get(
    '/resume/:id',
    async ({ params, set }) => {
      const { getResumeByIdHandler } = await import('@/server/api/controllers/resume.controller')
      const result = await getResumeByIdHandler({ params })
      if (isApiError(result)) set.status = (result as ApiErrorResponse).status ?? 500
      return result
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  .get(
    '/github/repo/:chatId',
    async ({ params, set }) => {
      const result = await getGithubRepoForChatHandler({ params })
      if (result && 'status' in result && result.status) set.status = result.status
      return result
    },
    {
      params: t.Object({ chatId: t.String() }),
    },
  )

  // ============================================
  // Buildify Studio Endpoints
  // ============================================

  .get('/designs', async ({ set }) => {
    const result = await listDesignsHandler()
    if (!Array.isArray(result) && 'status' in result) { set.status = result.status; return result }
    return result
  })

  .post(
    '/design',
    async ({ body, set }) => {
      const result = await createDesignHandler({ body })
      if ('status' in result) { set.status = result.status; return result }
      return result
    },
    {
      body: t.Object({
        title: t.Optional(t.String()),
        layout: t.Optional(t.String()),
        background: t.Optional(t.String()),
      }),
    },
  )

  // IMPORTANT: static paths must come before parameterized ones
  .get(
    '/design/public/:slug',
    async ({ params, set }) => {
      const result = await getPublicDesignHandler({ params })
      if (!result) { set.status = 404; return { error: 'Not found' } }
      return result
    },
    { params: t.Object({ slug: t.String() }) },
  )

  .get(
    '/design/:id',
    async ({ params, set }) => {
      const result = await getDesignByIdHandler({ params })
      if ('status' in result) { set.status = result.status; return result }
      return result
    },
    { params: t.Object({ id: t.String() }) },
  )

  .put(
    '/design/:id',
    async ({ params, body, set }) => {
      const result = await updateDesignHandler({ params, body })
      if ('status' in result) { set.status = result.status; return result }
      return result
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        title: t.Optional(t.String()),
        layout: t.Optional(t.String()),
        background: t.Optional(t.Nullable(t.String())),
      }),
    },
  )

  .post(
    '/design/:id/publish',
    async ({ params, body, set }) => {
      const result = await publishDesignByIdHandler({ params, body })
      if ('status' in result) { set.status = result.status; return result }
      return result
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ slug: t.String(), title: t.Optional(t.String()) }),
    },
  )

  .post(
    '/design/:id/unpublish',
    async ({ params, set }) => {
      const result = await unpublishDesignByIdHandler({ params })
      if ('status' in result) { set.status = result.status; return result }
      return result
    },
    { params: t.Object({ id: t.String() }) },
  )

  .delete(
    '/design/:id',
    async ({ params, set }) => {
      const result = await deleteDesignByIdHandler({ params })
      if ('status' in result) { set.status = result.status; return result }
      return result
    },
    { params: t.Object({ id: t.String() }) },
  )

  // ============================================
  // Testing Engine Endpoints
  // ============================================

  // POST /api/test/run — start a new test run, returns { testRunId } immediately
  .post(
    '/test/run',
    async ({ body, set }) => {
      const result = await startTestRunHandler({ body })
      if (isApiError(result)) set.status = (result as ApiErrorResponse).status ?? 500
      return result
    },
    {
      body: t.Object({
        url: t.String(),
        projectId: t.Optional(t.String()),
      }),
    },
  )

  // GET /api/test/history — past test runs for the authenticated user
  // IMPORTANT: must be declared BEFORE /test/run/:id to avoid route collision
  .get('/test/history', async ({ set }) => {
    const result = await getTestHistoryHandler()
    if (isApiError(result)) set.status = (result as ApiErrorResponse).status ?? 500
    return result
  })

  // GET /api/test/run/:id — polling fallback for run status + live bug list
  .get(
    '/test/run/:id',
    async ({ params, set }) => {
      const result = await getTestRunHandler({ params })
      if (isApiError(result)) set.status = (result as ApiErrorResponse).status ?? 500
      return result
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  // GET /api/test/stream/:id — SSE stream of pipeline events
  // Returns text/event-stream; client opens with EventSource or fetch + ReadableStream.
  // Events: status | test_update | counter | bug_found | complete | error
  .get(
    '/test/stream/:id',
    async ({ params }) => {
      // streamTestRunHandler returns a native Response with Content-Type: text/event-stream
      return streamTestRunHandler({ params })
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  // GET /api/test/run/:id/report — full visual report (all dashboard sections)
  .get(
    '/test/run/:id/report',
    async ({ params, set }) => {
      const result = await getTestReportHandler({ params })
      if (isApiError(result)) set.status = (result as ApiErrorResponse).status ?? 500
      return result
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  // GET /api/test/report/public/:slug — shareable read-only report, no auth required
  // IMPORTANT: declared before /test/run/:id/report to avoid Elysia matching "public" as an id
  .get(
    '/test/report/public/:slug',
    async ({ params, set }) => {
      const result = await getPublicReportHandler({ params })
      if (isApiError(result)) set.status = (result as ApiErrorResponse).status ?? 500
      return result
    },
    {
      params: t.Object({ slug: t.String() }),
    },
  )

  // GET /api/badge/:token — embed badge data for "Tested by Buildify — Score: N"
  // No auth required — token is opaque and non-guessable (nanoid(32))
  .get(
    '/badge/:token',
    async ({ params, set }) => {
      const result = await getEmbedBadgeHandler({ params })
      if (isApiError(result)) set.status = (result as ApiErrorResponse).status ?? 500
      return result
    },
    {
      params: t.Object({ token: t.String() }),
    },
  )