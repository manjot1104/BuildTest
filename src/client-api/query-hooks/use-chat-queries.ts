import { useQuery } from '@tanstack/react-query'
import { api } from '@/client-api/eden'
import {
  type ChatDetails,
  type ChatHistoryItem,
} from '@/types/api.types'

/** Eden error response structure */
interface EdenErrorValue {
  message?: string
}

interface EdenError {
  value?: EdenErrorValue
}

/** Eden response with data wrapper */
interface ChatHistoryDataResponse {
  data?: ChatHistoryItem[]
}

/**
 * Query hook for fetching chat details by ID
 * Uses Eden client for type-safe API calls
 */
export function useChatDetails(chatId: string | undefined) {
  return useQuery({
    queryKey: ['chat', chatId],
    queryFn: async (): Promise<ChatDetails> => {
      if (!chatId) {
        throw new Error('Chat ID is required')
      }

      try {
        const response = await api.chats({ chatId }).get()

        // Eden returns { data, error, status } structure
        if (response.error) {
          const edenError = response.error as EdenError
          const errorMessage =
            typeof edenError?.value?.message === 'string'
              ? edenError.value.message
              : 'Failed to fetch chat details'
          throw new Error(errorMessage)
        }

        if (!response.data) {
          throw new Error('Failed to fetch chat details')
        }

        return response.data as ChatDetails
      } catch (error) {
        // Fallback to fetch if Eden fails
        console.warn('Eden request failed, falling back to fetch:', error)
        const fetchResponse = await fetch(`/api/chats/${chatId}`)
        if (!fetchResponse.ok) {
          throw new Error('Failed to fetch chat details')
        }
        return (await fetchResponse.json()) as ChatDetails
      }
    },
    enabled: !!chatId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  })
}

/**
 * Query hook for fetching chat history
 * Uses Eden client for type-safe API calls
 */
export function useChatHistory() {
  return useQuery({
    queryKey: ['chat-history'],
    queryFn: async (): Promise<ChatHistoryItem[]> => {
      try {
        const response = await api.chats.get()

        if (response.error) {
          const edenError = response.error as EdenError
          const errorMessage =
            edenError?.value?.message ?? 'Failed to fetch chat history'
          throw new Error(errorMessage)
        }

        if (!response.data) {
          throw new Error('Failed to fetch chat history')
        }

        const responseData = response.data as ChatHistoryDataResponse
        return responseData?.data ?? []
      } catch {
        throw new Error('Failed to fetch chat history')
      }
    },
    staleTime: 1000 * 60 * 2,
    retry: 1,
  })
}

// Re-export types for convenience
export type { ChatDetails, ChatHistoryItem }
