'use server'

import { type ChatDetail } from 'v0-sdk'
import { getSession } from '@/server/better-auth/server'
import {
  createUserChat,
  updateUserChat,
  createAnonymousChatLog,
  getChatCountByUserId,
  getChatCountByIP,
  getUserChat,
  getUserChatsByUserId,
  getCommunityChats,
  getCommunityChatsCount,
  getFeaturedChats,
} from '@/server/db/queries'
import {
  deductCreditsForPrompt,
  hasActiveSubscription,
  addAdditionalCredits,
} from '@/server/services/credits.service'
import { getV0Client } from '@/lib/v0-client'
import { enhanceFirstPrompt, enhanceFollowUpPrompt } from '@/lib/prompt-enhancer'
import {
  type ChatRequestBody,
  type ChatMessage,
  type RateLimitErrorResponse,
  type ChatOwnershipResponse,
  type ForkChatResponse,
  type ChatHistoryItem,
  type CommunityBuildItem,
  type CommunityBuildsPage,
} from '@/types/api.types'
import { RATE_LIMITS, CREDIT_COSTS } from '@/config/credits.config'

// ============================================================================
// Type Definitions
// ============================================================================

/** Insufficient credits response */
interface InsufficientCreditsResponse {
  error: 'insufficient_credits'
  message: string
  required: number
  available: number
}

/** Session type from better-auth */
interface Session {
  user?: {
    id?: string
    name?: string
    email?: string
  }
}

/** Error response with optional status */
interface ErrorResponse {
  error: string
  details?: string
  status?: number
}

/** Success response for chat creation */
interface CreateChatSuccessResponse {
  id: string
  demo?: string
  messages?: ChatMessage[]
}

/** Response type for createChatHandler */
type CreateChatResponse =
  | CreateChatSuccessResponse
  | ErrorResponse
  | RateLimitErrorResponse
  | InsufficientCreditsResponse

/** Response type for getChatDetailsHandler */
type GetChatDetailsResponse = (ChatDetail & { isOwner?: boolean }) | ErrorResponse

/** Response type for createChatOwnershipHandler */
type CreateChatOwnershipResponse = ChatOwnershipResponse | ErrorResponse

/** Response type for getChatHistoryHandler */
type GetChatHistoryResponse = { data: ChatHistoryItem[]; page: number; totalPages: number; totalItems: number } | ErrorResponse

/** Response type for getCommunityBuildsHandler */
type GetCommunityBuildsResponse = CommunityBuildsPage | ErrorResponse

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extracts client IP address from request headers
 * Supports x-forwarded-for and x-real-ip headers
 */
export async function getClientIP(request: Request): Promise<string> {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown'
  }

  if (realIP) {
    return realIP
  }

  return 'unknown'
}

/**
 * Checks rate limiting for the current user or IP
 * Returns error response if rate limit exceeded, null otherwise
 */
async function checkRateLimit(
  session: Session | null,
  request: Request,
): Promise<RateLimitErrorResponse | null> {
  if (session?.user?.id) {
    const chatCount = await getChatCountByUserId({
      userId: session.user.id,
      differenceInHours: 24,
    })

    if (chatCount >= RATE_LIMITS.AUTHENTICATED_MESSAGES_PER_DAY) {
      return {
        error: 'rate_limit:chat',
        message:
          'You have exceeded your maximum number of messages for the day. Please try again later.',
      }
    }
  } else {
    const clientIP = await getClientIP(request)
    const chatCount = await getChatCountByIP({
      ipAddress: clientIP,
      differenceInHours: 24,
    })

    if (chatCount >= RATE_LIMITS.ANONYMOUS_MESSAGES_PER_DAY) {
      return {
        error: 'rate_limit:chat',
        message:
          'You have exceeded your maximum number of messages for the day. Please try again later.',
      }
    }
  }

  return null
}


/**
 * Type guard to check if result is a ChatDetail (not a stream)
 */
function isChatDetail(
  result: ChatDetail | ReadableStream<Uint8Array>,
): result is ChatDetail {
  return !(result instanceof ReadableStream)
}

/**
 * Generates a title from the prompt (first 50 chars or first sentence)
 */
function generateTitleFromPrompt(prompt: string): string {
  // Take first sentence or first 50 characters
  const firstSentence = prompt.split(/[.!?]/)[0]
  if (firstSentence && firstSentence.length <= 60) {
    return firstSentence.trim()
  }
  // Truncate to 50 chars with ellipsis
  if (prompt.length > 50) {
    return prompt.substring(0, 50).trim() + '...'
  }
  return prompt.trim()
}

// ============================================================================
// Handler Functions
// ============================================================================

/**
 * Handler for creating chat or sending message (non-streaming only)
 * Note: Streaming requests should use fetch directly, not this controller
 */
export async function createChatHandler({
  body,
  request,
}: {
  body: ChatRequestBody
  request: Request
}): Promise<CreateChatResponse> {
  let creditsDeducted = false
  let creditsUsedAmount = 0
  let sessionUserId: string | undefined
  try {
    const session = await getSession()
    sessionUserId = session?.user?.id
  const { message, chatId, attachments, envVarNames = [] } = body

    if (!message) {
      return { error: 'Message is required' }
    }

    // Ownership check: only the chat owner can send follow-up messages
    if (chatId && session?.user?.id) {
      const existingChat = await getUserChat({ v0ChatId: chatId })
      if (existingChat && existingChat.user_id !== session.user.id) {
        return {
          error: 'forbidden',
          details: 'You cannot send messages to a chat you do not own. Fork the chat first.',
        }
      }
    }

    // Check rate limiting
    const rateLimitResponse = await checkRateLimit(session, request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Determine if this is a new chat or follow-up
    const isNewChat = !chatId

    // Atomically check and deduct credits for authenticated users
    if (session?.user?.id) {
      // Require active subscription
      const hasSub = await hasActiveSubscription(session.user.id)
      if (!hasSub) {
        return {
          error: 'insufficient_credits',
          message:
            'You need an active subscription to use this service. Please subscribe to continue.',
          required: isNewChat ? CREDIT_COSTS.NEW_PROMPT : CREDIT_COSTS.FOLLOW_UP_PROMPT,
          available: 0,
        }
      }

      const deductResult = await deductCreditsForPrompt(
        session.user.id,
        isNewChat,
        chatId,
      )
      if (!deductResult.success) {
        return {
          error: 'insufficient_credits',
          message: deductResult.error ?? 'Failed to deduct credits',
          required: isNewChat ? CREDIT_COSTS.NEW_PROMPT : CREDIT_COSTS.FOLLOW_UP_PROMPT,
          available: 0,
        }
      }
      creditsDeducted = true
      creditsUsedAmount = deductResult.creditsUsed ?? 0
    }

    let chatResult: ChatDetail | ReadableStream<Uint8Array>

    const v0 = await getV0Client()

    let wasNewChat = isNewChat

    if (chatId) {
      try {
        // Continue existing chat (non-streaming)
       chatResult = await v0.chats.sendMessage({
  chatId,
message: enhanceFollowUpPrompt(message, envVarNames),
  ...(attachments && attachments.length > 0 && { attachments }),
})
      } catch (error) {
        // If chat doesn't exist (404), create a new chat instead
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        if (
          errorMessage.includes('404') ||
          errorMessage.includes('not_found') ||
          errorMessage.includes('Chat not found')
        ) {
          // Create new chat (non-streaming)
          chatResult = await v0.chats.create({
           message: enhanceFirstPrompt(message, envVarNames),
            responseMode: 'sync',
            ...(attachments && attachments.length > 0 && { attachments }),
          })
          wasNewChat = true
        } else {
          // Re-throw other errors
          throw error
        }
      }
    } else {
      // Create new chat with enhanced first prompt (non-streaming)
      chatResult = await v0.chats.create({
     message: enhanceFirstPrompt(message, envVarNames),
        responseMode: 'sync',
        ...(attachments && attachments.length > 0 && { attachments }),
      })
      wasNewChat = true
    }

    // Type guard to ensure we have a ChatDetail and not a stream
    if (!isChatDetail(chatResult)) {
      throw new Error('Unexpected streaming response in non-streaming handler')
    }

    const chat: ChatDetail = chatResult

    // Save or update chat data locally
    if (chat.id) {
      try {
        if (session?.user?.id) {
          if (wasNewChat) {
            // Create new chat record with prompt and metadata
            await createUserChat({
              v0ChatId: chat.id,
              userId: session.user.id,
              title: generateTitleFromPrompt(message),
              prompt: message,
              demoUrl: chat.demo ?? undefined,
            })
          } else {
            // Update existing chat with latest demo URL
            await updateUserChat({
              v0ChatId: chat.id,
              demoUrl: chat.demo ?? undefined,
            })
          }
        } else {
          // Anonymous user - just log for rate limiting
          if (wasNewChat) {
            const clientIP = await getClientIP(request)
            await createAnonymousChatLog({
              ipAddress: clientIP,
              v0ChatId: chat.id,
            })
          }
        }
      } catch {
        // Don't fail the request if local save fails
      }
    }

    return {
      id: chat.id,
      demo: chat.demo,
      messages: chat.messages?.map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: typeof msg.content === 'string' ? msg.content : '',
        experimental_content: msg.experimental_content,
      })),
    }
  } catch {
    // Refund credits if they were deducted but the API call failed
    if (creditsDeducted && sessionUserId && creditsUsedAmount > 0) {
      try {
        await addAdditionalCredits(sessionUserId, creditsUsedAmount)
      } catch (refundError) {
        // Refund failed — log for admin manual resolution
        console.error(
          `CRITICAL: Credit refund failed for user ${sessionUserId}, amount: ${creditsUsedAmount}`,
          refundError,
        )
      }
    }

    return {
      error: 'Failed to process request',
    }
  }
}

/**
 * Handler for getting chat details by ID
 */
export async function getChatDetailsHandler({
  params,
}: {
  params: { chatId: string }
}): Promise<GetChatDetailsResponse> {
  try {
    const session = await getSession()
    const { chatId } = params

    if (!chatId) {
      return { error: 'Chat ID is required', status: 400 }
    }

    // Check ownership (non-blocking - allows non-owners to view)
    let isOwner = false
    if (session?.user?.id) {
      const userChat = await getUserChat({ v0ChatId: chatId })
      if (userChat?.user_id === session.user.id) {
        isOwner = true
      }
    }
const localCheck = await getUserChat({ v0ChatId: chatId }).catch(() => null)
if (localCheck && localCheck.demo_url?.startsWith('threed://')) {
  return {
    id: chatId,
    title: localCheck.title ?? chatId,
    prompt: localCheck.prompt ?? undefined,
    demo: undefined,
    isOwner: true,
  } as any
}

    // Fetch chat details from v0 API
    const v0 = await getV0Client()

    let chatDetails: ChatDetail
    try {
      const chatDetailsResult = await v0.chats.getById({ chatId })

      // Type guard to ensure we have a ChatDetail and not a stream
      if (!isChatDetail(chatDetailsResult)) {
        throw new Error('Unexpected streaming response from getById')
      }

      chatDetails = chatDetailsResult

      // Only update local record if owner
      if (isOwner) {
        const hasUpdates = chatDetails.demo || chatDetails.title
        if (hasUpdates) {
          try {
            await updateUserChat({
              v0ChatId: chatId,
              demoUrl: chatDetails.demo ?? undefined,
              title: chatDetails.title ?? undefined,
            })
          } catch {
            // Non-critical update failure
          }
        }
      }
    } catch (error: unknown) {
      // Handle 404 errors from V0 API - chat doesn't exist
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      if (
        errorMessage.includes('404') ||
        errorMessage.includes('not_found') ||
        errorMessage.includes('Chat not found')
      ) {
        return { error: 'Chat not found', status: 404 }
      }
      // Re-throw other errors
      throw error
    }

    const localChat = await getUserChat({ v0ChatId: chatId }).catch(() => null)
const resolvedDemo = chatDetails.demo ?? localChat?.demo_url ?? undefined
return { ...chatDetails, demo: resolvedDemo, isOwner }
  } catch {
    return {
      error: 'Failed to fetch chat details',
      details: 'An internal error occurred',
      status: 500,
    }
  }
}

/**
 * Handler for creating chat ownership (used for streaming chats)
 * When streaming, the chat is created on the client side, so we need
 * to create the ownership record separately
 */
function generateSmartTitle(prompt: string): string {
  const stopWords = ['with', 'and', 'the', 'for', 'a', 'an', 'of', 'in']

  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(' ')
    .filter(w => w.length > 2 && !stopWords.includes(w))

  const keywords = words.slice(0, 4) 

  return keywords
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
export async function createChatOwnershipHandler({
  body,
}: {
  body: { chatId: string; prompt?: string; demoUrl?: string }
}): Promise<CreateChatOwnershipResponse> {
  try {
    const session = await getSession()
    const { chatId, prompt, demoUrl } = body

    if (!chatId) {
      return { error: 'Chat ID is required' }
    }

    if (!session?.user?.id) {
      return { error: 'Unauthorized' }
    }

    // Create or update the chat record
    const existingChat = await getUserChat({ v0ChatId: chatId })

    if (existingChat) {
      // Only the owner can update an existing chat
      if (existingChat.user_id !== session.user.id) {
        return { error: 'Forbidden: you do not own this chat' }
      }
      await updateUserChat({
        v0ChatId: chatId,
        demoUrl: demoUrl ?? undefined,
      })
    } else {
      // Create new chat record
      await createUserChat({
        v0ChatId: chatId,
        userId: session.user.id,
        title: prompt ? generateSmartTitle(prompt) : undefined,
        prompt: prompt ?? undefined,
        demoUrl: demoUrl ?? undefined,
      })
    }

    return { success: true }
  } catch {
    return {
      error: 'Failed to create chat ownership',
      details: 'An internal error occurred',
    }
  }
}

/**
 * Handler for forking a chat (creating a copy for the current user)
 * Requires authentication. No credit charge.
 */
export async function forkChatHandler({
  body,
}: {
  body: { chatId: string }
}): Promise<ForkChatResponse | ErrorResponse> {
  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return { error: 'Unauthorized', status: 401 }
    }

    const { chatId } = body

    if (!chatId) {
      return { error: 'Chat ID is required', status: 400 }
    }

    const v0 = await getV0Client()
    const forkedChat = await v0.chats.fork({ chatId })

    // Type guard
    if (!isChatDetail(forkedChat)) {
      throw new Error('Unexpected streaming response from fork')
    }

    // Create ownership record for the forking user
    await createUserChat({
      v0ChatId: forkedChat.id,
      userId: session.user.id,
      title: forkedChat.title
        ? `Fork: ${forkedChat.title}`
        : 'Forked chat',
      demoUrl: forkedChat.demo ?? undefined,
    })

    return {
      success: true,
      newChatId: forkedChat.id,
      demoUrl: forkedChat.demo ?? undefined,
    }
  } catch {
    return {
      error: 'Failed to fork chat',
      details: 'An internal error occurred',
      status: 500,
    }
  }
}

/**
 * Handler for getting chat history
 * Uses local database - no v0 API call needed!
 */
export async function getChatHistoryHandler({
  query,
}: {
  query: { type?: "all" | "builder" | "openrouter"; page?: number; limit?: number }
}): Promise<GetChatHistoryResponse> {
  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return { data: [], page: 1, totalPages: 0, totalItems: 0 }
    }

    const type = query?.type ?? "all"
    const page = Math.max(query?.page ?? 1, 1)
    const limit = Math.min(Math.max(query?.limit ?? 10, 1), 50)
    const offset = (page - 1) * limit

    let userChats: any[] = []
    let totalItems = 0

if (type === "builder" || type === "all") {
  const builderChats = await getUserChatsByUserId({
    userId: session.user.id,
    limit: 999,
    type: "builder",
  })

  userChats.push(...builderChats)
}

if (type === "openrouter" || type === "all") {
  const { db } = await import("@/server/db")
  const { conversations } = await import("@/server/db/schema")
  const { eq, desc } = await import("drizzle-orm")

  const aiChats = await db
    .select()
    .from(conversations)
    .where(eq(conversations.user_id, session.user.id))
    .orderBy(desc(conversations.created_at))

  userChats.push(
    ...aiChats.map((chat) => ({
      id: chat.id,
      v0_chat_id: chat.id,
      title: chat.title,
      prompt: null,
      demo_url: null,
      preview_url: null,
      created_at: chat.created_at,
      updated_at: chat.created_at,
      chat_type: "OPENROUTER",
      folder_id: null,
    }))
  )
}

    const allChats: ChatHistoryItem[] = userChats
      .filter((chat) => chat.v0_chat_id)
      .map((chat) => ({
        id: chat.id,
        v0ChatId: chat.v0_chat_id!,
        title: chat.title,
        prompt: chat.prompt,
        demoUrl: chat.demo_url,
        previewUrl: chat.preview_url,
        createdAt: chat.created_at.toISOString(),
        updatedAt: chat.updated_at.toISOString(),
        type: (chat.chat_type?.toLowerCase() === 'openrouter' || !chat.demo_url && chat.v0_chat_id && chat.v0_chat_id === chat.id ? 'openrouter' : 'builder') as 'builder' | 'openrouter',
        folderId: chat.folder_id ?? null,
      }))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

    totalItems = allChats.length
    const totalPages = Math.ceil(totalItems / limit)
    const paginatedChats = allChats.slice(offset, offset + limit)

    return { data: paginatedChats, page, totalPages, totalItems }
  } catch (error: any) {
    return {
      error: "Failed to fetch chat history",
      details: error.message || "An internal error occurred",
      status: 500,
    }
  }
}

/**
 * Handler for getting community builds (public endpoint)
 * Returns paginated chats with demo_url set, including author info
 */
export async function getCommunityBuildsHandler({
  query,
}: {
  query: { page?: string; limit?: string }
}): Promise<GetCommunityBuildsResponse> {
  try {
    const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1)
    const limit = Math.min(30, Math.max(1, parseInt(query.limit ?? '12', 10) || 12))
    const offset = (page - 1) * limit

    const [chats, total] = await Promise.all([
      getCommunityChats({ limit, offset }),
      getCommunityChatsCount(),
    ])

   const data: CommunityBuildItem[] = chats
  .filter((chat) => chat.v0_chat_id)
  .map((chat) => ({
    id: chat.id,
    v0ChatId: chat.v0_chat_id!,
    title: chat.title,
    prompt: chat.prompt,
    demoUrl: chat.demo_url,
    previewUrl: chat.preview_url,
    createdAt: chat.created_at.toISOString(),
    updatedAt: chat.updated_at.toISOString(),
    authorName: chat.author_name,
    authorImage: chat.author_image,
  }))

    return {
      data,
      total,
      page,
      limit,
      hasMore: offset + data.length < total,
    }
  } catch {
    return {
      error: 'Failed to fetch community builds',
      details: 'An internal error occurred',
      status: 500,
    }
  }
}

/** Hardcoded featured/best chat IDs */
const FEATURED_CHAT_IDS = [
  'unSTagzurr3',
  'p1MPkIWe8uf',
  'mqAy74clyRY',
  's9a45Mv5S5h',
  'pwAhgqhDp0K',
  'BiZl3MMj1fB',
]

/**
 * Handler for getting featured/best community builds (public endpoint)
 * Returns the hardcoded best builds with author info
 */
export async function getFeaturedBuildsHandler(): Promise<
  { data: CommunityBuildItem[] } | ErrorResponse
> {
  try {
    const chats = await getFeaturedChats(FEATURED_CHAT_IDS)

    const data: CommunityBuildItem[] = chats
  .filter((chat) => chat.v0_chat_id)
  .map((chat) => ({
    id: chat.id,
    v0ChatId: chat.v0_chat_id!,
    title: chat.title,
    prompt: chat.prompt,
    demoUrl: chat.demo_url,
    previewUrl: chat.preview_url,
    createdAt: chat.created_at.toISOString(),
    updatedAt: chat.updated_at.toISOString(),
    authorName: chat.author_name,
    authorImage: chat.author_image,
  }))

    return { data }
  } catch {
    return {
      error: 'Failed to fetch featured builds',
      details: 'An internal error occurred',
      status: 500,
    }
  }
}