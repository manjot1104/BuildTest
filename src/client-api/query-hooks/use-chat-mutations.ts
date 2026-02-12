import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/client-api/eden'
import {
  type ChatRequestBody,
  type ChatResponse,
  type ChatOwnershipResponse,
  type ForkChatResponse,
} from '@/types/api.types'

/** Eden error response structure */
interface EdenErrorValue {
  message?: string
}

interface EdenError {
  value?: EdenErrorValue
}

/**
 * Mutation hook for creating chat ownership
 * Uses Eden client for type-safe API calls
 */
export function useCreateChatOwnership() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (chatId: string): Promise<ChatOwnershipResponse> => {
      try {
        const response = await api.chat.ownership.post({ chatId })

        if (response.error) {
          const edenError = response.error as EdenError
          const errorMessage =
            typeof edenError?.value?.message === 'string'
              ? edenError.value.message
              : 'Failed to create chat ownership'
          throw new Error(errorMessage)
        }

        if (!response.data) {
          throw new Error('Failed to create chat ownership')
        }

        return response.data as ChatOwnershipResponse
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
        return (await fetchResponse.json()) as ChatOwnershipResponse
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
    mutationFn: async (data: ChatRequestBody): Promise<ChatResponse> => {
      // Skip if streaming is requested (should use fetch directly)
      if (data.streaming) {
        throw new Error(
          'Streaming requests should use fetch directly, not this hook',
        )
      }

      try {
        const response = await api.chat.post(data)

        if (response.error) {
          const edenError = response.error as EdenError
          const errorMessage =
            typeof edenError?.value?.message === 'string'
              ? edenError.value.message
              : 'Failed to create chat'
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

/**
 * Mutation hook for forking a chat
 * Creates a copy of an existing chat for the current user
 */
export function useForkChat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (chatId: string): Promise<ForkChatResponse> => {
      try {
        const response = await api.chat.fork.post({ chatId })

        if (response.error) {
          const edenError = response.error as EdenError
          const errorMessage =
            typeof edenError?.value?.message === 'string'
              ? edenError.value.message
              : 'Failed to fork chat'
          throw new Error(errorMessage)
        }

        if (!response.data) {
          throw new Error('Failed to fork chat')
        }

        return response.data as ForkChatResponse
      } catch (error) {
        // Fallback to fetch if Eden fails
        console.warn('Eden request failed, falling back to fetch:', error)
        const fetchResponse = await fetch('/api/chat/fork', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId }),
        })
        if (!fetchResponse.ok) {
          throw new Error('Failed to fork chat')
        }
        return (await fetchResponse.json()) as ForkChatResponse
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['chat-history'],
      })
    },
  })
}

// Re-export types for convenience
export type { ChatRequestBody, ChatResponse, ChatOwnershipResponse, ForkChatResponse }
