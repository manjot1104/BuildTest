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
} from '@/server/db/queries'
import {
  hasEnoughCredits,
  deductCreditsForPrompt,
  hasActiveSubscription,
} from '@/server/services/credits.service'
import { getV0Client } from '@/lib/v0-client'
import {
  type ChatRequestBody,
  type ChatMessage,
  type RateLimitErrorResponse,
  type ChatOwnershipResponse,
  type ChatHistoryItem,
} from '@/types/api.types'

// ============================================================================
// Type Definitions
// ============================================================================

/** Rate limiting constants */
const MAX_MESSAGES_PER_DAY_AUTHENTICATED = 50
const MAX_MESSAGES_PER_DAY_ANONYMOUS = 3

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
type GetChatDetailsResponse = ChatDetail | ErrorResponse

/** Response type for createChatOwnershipHandler */
type CreateChatOwnershipResponse = ChatOwnershipResponse | ErrorResponse

/** Response type for getChatHistoryHandler */
type GetChatHistoryResponse = { data: ChatHistoryItem[] } | ErrorResponse

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

    if (chatCount >= MAX_MESSAGES_PER_DAY_AUTHENTICATED) {
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

    if (chatCount >= MAX_MESSAGES_PER_DAY_ANONYMOUS) {
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
 * Checks if authenticated user has enough credits for the action
 * Returns error response if insufficient credits, null otherwise
 */
async function checkCredits(
  userId: string,
  isNewChat: boolean,
): Promise<InsufficientCreditsResponse | null> {
  // Check if user has active subscription
  const hasSub = await hasActiveSubscription(userId)

  if (!hasSub) {
    return {
      error: 'insufficient_credits',
      message: 'You need an active subscription to use this service. Please subscribe to continue.',
      required: isNewChat ? 20 : 30,
      available: 0,
    }
  }

  const creditCheck = await hasEnoughCredits(userId, isNewChat)

  if (!creditCheck.hasCredits) {
    return {
      error: 'insufficient_credits',
      message: `Insufficient credits. You need ${creditCheck.required} credits but only have ${creditCheck.available}.`,
      required: creditCheck.required,
      available: creditCheck.available,
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
  try {
    const session = await getSession()
    const { message, chatId, attachments } = body

    if (!message) {
      return { error: 'Message is required' }
    }

    // Check rate limiting
    const rateLimitResponse = await checkRateLimit(session, request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Determine if this is a new chat or follow-up
    const isNewChat = !chatId

    // Check credits for authenticated users
    if (session?.user?.id) {
      const creditsResponse = await checkCredits(session.user.id, isNewChat)
      if (creditsResponse) {
        return creditsResponse
      }

      // Deduct credits before making the API call
      const deductResult = await deductCreditsForPrompt(
        session.user.id,
        isNewChat,
        chatId,
      )
      if (!deductResult.success) {
        return {
          error: 'insufficient_credits',
          message: deductResult.error ?? 'Failed to deduct credits',
          required: isNewChat ? 20 : 30,
          available: 0,
        }
      }
    }

    let chatResult: ChatDetail | ReadableStream<Uint8Array>

    const v0 = await getV0Client()

    let wasNewChat = isNewChat

    if (chatId) {
      try {
        // Continue existing chat (non-streaming)
        chatResult = await v0.chats.sendMessage({
          chatId,
          message,
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
          console.warn(`Chat ${chatId} not found, creating new chat instead`)
          // Create new chat (non-streaming)
          chatResult = await v0.chats.create({
            message,
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
      // Create new chat (non-streaming)
      chatResult = await v0.chats.create({
        message,
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
      } catch (error) {
        console.error('Failed to save chat data locally:', error)
        // Don't fail the request, just log the error
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
  } catch (error) {
    console.error('V0 API Error:', error)

    return {
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error',
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

    console.log('Fetching chat details for ID:', chatId)

    if (!chatId) {
      return { error: 'Chat ID is required', status: 400 }
    }

    // For authenticated users, check ownership first (fast local check)
    if (session?.user?.id) {
      const userChat = await getUserChat({ v0ChatId: chatId })

      if (!userChat) {
        // No ownership record - user doesn't own this chat
        console.log('No ownership record found for authenticated user')
        return { error: 'Chat not found', status: 404 }
      }

      // Check if user owns this chat
      if (userChat.user_id !== session.user.id) {
        return { error: 'Forbidden', status: 403 }
      }
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
      console.log('Chat details fetched successfully from V0 API')

      // Update local record with latest demo URL and title if available
      if (session?.user?.id) {
        const hasUpdates = chatDetails.demo || chatDetails.title
        if (hasUpdates) {
          try {
            await updateUserChat({
              v0ChatId: chatId,
              demoUrl: chatDetails.demo ?? undefined,
              title: chatDetails.title ?? undefined,
            })
          } catch (error) {
            console.error('Failed to update chat data:', error)
          }
        }
      }
    } catch (error) {
      // Handle 404 errors from V0 API - chat doesn't exist
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      if (
        errorMessage.includes('404') ||
        errorMessage.includes('not_found') ||
        errorMessage.includes('Chat not found')
      ) {
        console.error('Chat not found in V0 API:', chatId)
        return { error: 'Chat not found', status: 404 }
      }
      // Re-throw other errors
      throw error
    }

    return chatDetails
  } catch (error) {
    console.error('Error fetching chat details:', error)

    // Log more detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    return {
      error: 'Failed to fetch chat details',
      details: error instanceof Error ? error.message : 'Unknown error',
      status: 500,
    }
  }
}

/**
 * Handler for creating chat ownership (used for streaming chats)
 * When streaming, the chat is created on the client side, so we need
 * to create the ownership record separately
 */
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
      // Update existing chat
      await updateUserChat({
        v0ChatId: chatId,
        demoUrl: demoUrl ?? undefined,
      })
    } else {
      // Create new chat record
      await createUserChat({
        v0ChatId: chatId,
        userId: session.user.id,
        title: prompt ? generateTitleFromPrompt(prompt) : undefined,
        prompt: prompt ?? undefined,
        demoUrl: demoUrl ?? undefined,
      })
    }

    return { success: true }
  } catch (error) {
    console.error('Error creating chat ownership:', error)
    return {
      error: 'Failed to create chat ownership',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Handler for getting chat history
 * Uses local database - no v0 API call needed!
 */
export async function getChatHistoryHandler(): Promise<GetChatHistoryResponse> {
  try {
    const session = await getSession()

    // Anonymous users don't have saved chats
    if (!session?.user?.id) {
      return { data: [] }
    }

    console.log('Fetching chats for user:', session.user.id)

    // Get user's chats from local database (fast!)
    const userChats = await getUserChatsByUserId({
      userId: session.user.id,
      limit: 50,
    })

    // Map to ChatHistoryItem format
    const chatHistory: ChatHistoryItem[] = userChats.map((chat) => ({
      id: chat.id,
      v0ChatId: chat.v0_chat_id,
      title: chat.title,
      prompt: chat.prompt,
      demoUrl: chat.demo_url,
      previewUrl: chat.preview_url,
      createdAt: chat.created_at.toISOString(),
      updatedAt: chat.updated_at.toISOString(),
    }))

    console.log('Chats fetched successfully:', chatHistory.length, 'chats')

    return { data: chatHistory }
  } catch (error) {
    console.error('Error fetching chat history:', error)

    // Log more detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    return {
      error: 'Failed to fetch chat history',
      details: error instanceof Error ? error.message : 'Unknown error',
      status: 500,
    }
  }
}
