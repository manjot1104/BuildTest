import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { api } from '@/client-api/eden'
import {
  type ChatDetails,
  type ChatHistoryItem,
  type CommunityBuildItem,
  type CommunityBuildsPage,
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
  page?: number
  totalPages?: number
  totalItems?: number
}

/** Paginated chat history result */
export interface PaginatedChatHistory {
  data: ChatHistoryItem[]
  page: number
  totalPages: number
  totalItems: number
}

/** Paginated community builds response from API */
type CommunityBuildsApiResponse = CommunityBuildsPage

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
export function useChatHistory(type: "all" | "builder" | "openrouter" = "all", page = 1, limit = 10) {
  return useQuery({
    queryKey: ['chat-history', type, page, limit],
    queryFn: async (): Promise<PaginatedChatHistory> => {
      try {
        const response = await api.chats.get({
          query: { type, page: String(page), limit: String(limit) },
        })

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
        return {
          data: responseData?.data ?? [],
          page: responseData?.page ?? 1,
          totalPages: responseData?.totalPages ?? 1,
          totalItems: responseData?.totalItems ?? 0,
        }
      } catch {
        throw new Error('Failed to fetch chat history')
      }
    },
    staleTime: 1000 * 60 * 2,
    retry: 1,
  })
}

/**
 * Infinite query hook for fetching paginated community builds (public)
 * Uses fetch for reliable query-string support
 */
export function useCommunityBuilds(limit = 12) {
  return useInfiniteQuery<CommunityBuildsApiResponse>({
    queryKey: ['community-builds', limit],
    queryFn: async ({ pageParam }): Promise<CommunityBuildsApiResponse> => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: String(limit),
      })
      const res = await fetch(`/api/chats/community?${params}`)
      if (!res.ok) {
        throw new Error('Failed to fetch community builds')
      }
      return (await res.json()) as CommunityBuildsApiResponse
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  })
}

/**
 * Query hook for fetching featured/best community builds (public)
 */
export function useFeaturedBuilds() {
  return useQuery<{ data: CommunityBuildItem[] }>({
    queryKey: ['featured-builds'],
    queryFn: async () => {
      const res = await fetch('/api/chats/featured')
      if (!res.ok) {
        throw new Error('Failed to fetch featured builds')
      }
      return (await res.json()) as { data: CommunityBuildItem[] }
    },
    staleTime: 1000 * 60 * 10, // 10 minutes — these rarely change
    retry: 1,
  })
}

// Re-export types for convenience
export type { ChatDetails, ChatHistoryItem, CommunityBuildItem, CommunityBuildsPage }
