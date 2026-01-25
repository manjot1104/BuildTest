import { useQuery } from '@tanstack/react-query'
import { api } from '@/client-api/eden'

export interface ChatDetails {
  id: string
  demo?: string
  url?: string
  messages?: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    experimental_content?: unknown
  }>
  latestVersion?: {
    demoUrl?: string
  }
}

export interface ChatHistoryItem {
  id: string
  demo?: string
  url?: string
  object?: string
  shareable?: boolean
  privacy?: string
  created_at?: string
  updated_at?: string
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
          throw new Error(
            typeof response.error?.value?.message === 'string'
              ? response.error?.value?.message
              : response.error?.value?.message ?? 'Failed to fetch chat details',
          )
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
          const errorValue = (response.error as { value?: { message?: string } })
            ?.value
          const errorMessage =
            errorValue?.message ?? 'Failed to fetch chat history'
          throw new Error(errorMessage)
        }

        if (!response.data) {
          throw new Error('Failed to fetch chat history')
        }

        const responseData = response.data as { data?: ChatHistoryItem[] }
        return responseData?.data ?? []
      } catch {
        throw new Error('Failed to fetch chat history')
      }
    },
    staleTime: 1000 * 60 * 2,
    retry: 1,
  })
}
