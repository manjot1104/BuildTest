'use server'

import { type ChatDetail } from 'v0-sdk'
import { getSession } from '@/server/better-auth/server'
import {
  createChatOwnership,
  createAnonymousChatLog,
  getChatCountByUserId,
  getChatCountByIP,
  getChatOwnership,
  getChatIdsByUserId,
} from '@/server/db/queries'
import { getV0Client } from '@/lib/v0-client'

// Rate limiting constants
const MAX_MESSAGES_PER_DAY_AUTHENTICATED = 50
const MAX_MESSAGES_PER_DAY_ANONYMOUS = 3



// Utility function to get client IP from request
export async function getClientIP(request: Request): Promise<string> {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded?.split?.(',')?.[0]?.trim() ?? 'unknown'
  }

  if (realIP) {
    return realIP
  }

  return 'unknown'
}

// Rate limiting check
async function checkRateLimit(
  session: { user?: { id?: string } } | null,
  request: Request,
): Promise<{ error: string; message: string } | null> {
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

// Chat request body type
interface ChatRequestBody {
  message: string
  chatId?: string
  streaming?: boolean
  attachments?: Array<{ url: string }>
}

// Type guard to check if result is a ChatDetail (not a stream)
function isChatDetail(
  result: ChatDetail | ReadableStream<Uint8Array>,
): result is ChatDetail {
  return !(result instanceof ReadableStream)
}

// Handler for creating chat or sending message (non-streaming only)
// Note: Streaming requests should use fetch directly, not this controller
export async function createChatHandler({
  body,
  request,
}: {
  body: ChatRequestBody
  request: Request
}) {
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

    let chatResult: ChatDetail | ReadableStream<Uint8Array>

    const v0 = await getV0Client()

    let isNewChat = false

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
          console.warn(
            `Chat ${chatId} not found, creating new chat instead`,
          )
          // Create new chat (non-streaming)
          chatResult = await v0.chats.create({
            message,
            responseMode: 'sync',
            ...(attachments && attachments.length > 0 && { attachments }),
          })
          isNewChat = true
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
      isNewChat = true
    }

    // Type guard to ensure we have a ChatDetail and not a stream
    if (!isChatDetail(chatResult)) {
      throw new Error('Unexpected streaming response in non-streaming handler')
    }

    const chat: ChatDetail = chatResult

    // Create ownership mapping or anonymous log for new chat
    if (isNewChat && chat.id) {
      try {
        if (session?.user?.id) {
          await createChatOwnership({
            v0ChatId: chat.id,
            userId: session.user.id,
          })
        } else {
          const clientIP = await getClientIP(request)
          await createAnonymousChatLog({
            ipAddress: clientIP,
            v0ChatId: chat.id,
          })
        }
      } catch (error) {
        console.error('Failed to create chat ownership/log:', error)
      }
    }

    return {
      id: chat.id,
      demo: chat.demo,
      messages: chat.messages?.map((msg) => ({
        ...msg,
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

// Handler for getting chat details by ID
export async function getChatDetailsHandler({
  params,
}: {
  params: { chatId: string }
}) {
  try {
    const session = await getSession()
    const { chatId } = params

    console.log('Fetching chat details for ID:', chatId)

    if (!chatId) {
      return { error: 'Chat ID is required', status: 400 }
    }

    // Fetch chat details using v0 SDK first
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
    } catch (error) {
      // Handle 404 errors from V0 API - chat doesn't exist
      const errorMessage = error instanceof Error ? error.message : String(error)
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

    // For authenticated users, check ownership after confirming chat exists
    if (session?.user?.id) {
      const ownership = await getChatOwnership({ v0ChatId: chatId })

      if (!ownership) {
        // Chat exists in V0 API but no ownership record
        // Ownership should have been created when user sent first message
        // Return 404 to indicate chat not found (from user's perspective)
        console.log(
          'Chat exists in V0 API but no ownership found for authenticated user',
        )
        return { error: 'Chat not found', status: 404 }
      }

      // Check if user owns this chat
      if (ownership.user_id !== session.user.id) {
        return { error: 'Forbidden', status: 403 }
      }
    } else {
      // Anonymous user - allow access to any chat (they can only access via direct URL)
      console.log('Anonymous access to chat:', chatId)
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

// Handler for creating chat ownership
export async function createChatOwnershipHandler({
  body,
}: {
  body: { chatId: string }
}) {
  try {
    const session = await getSession()
    const { chatId } = body

    if (!chatId) {
      return { error: 'Chat ID is required' }
    }

    if (!session?.user?.id) {
      return { error: 'Unauthorized' }
    }

    await createChatOwnership({
      v0ChatId: chatId,
      userId: session.user.id,
    })

    return { success: true }
  } catch (error) {
    console.error('Error creating chat ownership:', error)
    return {
      error: 'Failed to create chat ownership',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Handler for getting chat history
export async function getChatHistoryHandler() {
  try {
    const session = await getSession()

    // Anonymous users don't have saved chats
    if (!session?.user?.id) {
      return { data: [] }
    }

    console.log('Fetching chats for user:', session.user.id)

    // Get user's chat IDs from our ownership mapping
    const userChatIds = await getChatIdsByUserId({ userId: session.user.id })

    if (userChatIds.length === 0) {
      return { data: [] }
    }

    // Fetch actual chat data from v0 API
    const v0 = await getV0Client()
    const allChats = await v0.chats.find()

    // Filter to only include chats owned by this user
    const userChats =
      allChats.data?.filter((chat) => userChatIds.includes(chat.id)) || []

    console.log('Chats fetched successfully:', userChats.length, 'chats')

    return { data: userChats }
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