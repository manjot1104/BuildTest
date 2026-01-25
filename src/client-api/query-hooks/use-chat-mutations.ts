import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/client-api/eden'

export interface ChatRequest {
  message: string
  chatId?: string
  streaming?: boolean
  attachments?: Array<{ url: string }>
}

export interface ChatResponse {
  id: string
  demo?: string
  messages?: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    experimental_content?: unknown
  }>
}

export interface CreateOwnershipResponse {
  success: boolean
}

/**
 * Mutation hook for creating chat ownership
 * Uses Eden client for type-safe API calls
 */
export function useCreateChatOwnership() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (chatId: string) => {
      try {
        const response = await api.chat.ownership.post({ chatId })

        if (response.error) {
          const errorMessage =
            typeof response.error.value?.message === 'string'
              ? response.error.value?.message
              : response.error.value?.message ?? 'Failed to create chat ownership'
          throw new Error(errorMessage)
        }

        if (!response.data) {
          throw new Error('Failed to create chat ownership')
        }

        return response.data
      } catch (error) {
        // Fallback to fetch if Eden fails
        console.warn('Eden request failed, falling back to fetch:', error)
        const fetchResponse = await fetch('/api/chat/ownership', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId }),
        })
        if (!fetchResponse.ok) {
          throw new Error('Failed to create chat ownership')
        }
        return (await fetchResponse.json()) as CreateOwnershipResponse
      }
    },
    onSuccess: async (_, chatId) => {
      // Invalidate chat details to refresh ownership
     await queryClient.invalidateQueries({
        queryKey: ['chat', chatId],
      })
    },
  })
}

/**
 * Mutation hook for creating a chat (non-streaming)
 * Note: Streaming requests should use fetch directly, not this hook
 * Uses Eden client for type-safe API calls
 */
export function useCreateChat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ChatRequest): Promise<ChatResponse> => {
      // Skip if streaming is requested (should use fetch directly)
      if (data.streaming) {
        throw new Error(
          'Streaming requests should use fetch directly, not this hook',
        )
      }

      try {
        const response = await api.chat.post(data)

        if (response.error) {
          const errorMessage =
            typeof response.error.value?.message === 'string'
              ? response.error.value?.message
              : response.error.value?.message ?? 'Failed to create chat'
          throw new Error(errorMessage)
        }

        if (!response.data) {
          throw new Error('Failed to create chat')
        }

        return response.data as ChatResponse
      } catch (error) {
        // Fallback to fetch if Eden fails
        console.warn('Eden request failed, falling back to fetch:', error)
        const fetchResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!fetchResponse.ok) {
          throw new Error('Failed to create chat')
        }
        return (await fetchResponse.json()) as ChatResponse
      }
    },
    onSuccess: async (response, variables) => {
      // Invalidate chat details if we got a chat ID back
      if (response.id) {
       await queryClient.invalidateQueries({
          queryKey: ['chat', response.id],
        })
      }
      // Also invalidate if chatId was provided
      if (variables.chatId) {
       await queryClient.invalidateQueries({
          queryKey: ['chat', variables.chatId],
        })
      }
    },
  })
}
