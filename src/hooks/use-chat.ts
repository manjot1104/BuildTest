import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useChatDetails } from './use-chat-api'
import type { MessageBinaryFormat } from '@v0-sdk/react'

interface Chat {
  id: string
  demo?: string
  url?: string
  isOwner?: boolean
  files?: Array<{ name: string; content: string }>
  messages?: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    experimental_content?: unknown
  }>
}

export interface ChatMessage {
  type: 'user' | 'assistant'
  content: string | MessageBinaryFormat
  isStreaming?: boolean
  stream?: ReadableStream<Uint8Array> | null
}

export function useChat(chatId?: string) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [currentChat, setCurrentChat] = useState<Chat | null>(null)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)

  // Use Tanstack Query to fetch chat details
  const {
    data: chatData,
    isLoading: isLoadingChat,
    error: chatError,
  } = useChatDetails(chatId)

  // Reset local state when chatId changes to ensure fresh data load
  // BUT: Don't reset if we're currently streaming or if it's the same chat
  useEffect(() => {
    if (chatId && chatId !== currentChat?.id) {
      if (!isStreaming && !isLoading) {
        setCurrentChat(null)
        setChatHistory([])
        setIsLoading(false)
        setIsStreaming(false)
      }
    }
  }, [chatId, currentChat?.id, isStreaming, isLoading])

  // Update currentChat and chatHistory when chatData changes
  useEffect(() => {
    if (chatData && chatData.id === chatId) {
      const demoUrl =
  chatData.latestVersion?.demoUrl ??
  (chatData as any).demoUrl ??
  chatData.demo
      const files = chatData.latestVersion?.files?.map((f) => ({
        name: f.name,
        content: f.content,
      }))
      setCurrentChat((prev) => {
  const base = prev ?? { id: chatData.id }

  return {
    ...base,
    id: chatData.id,
    demo: demoUrl ?? base.demo,
    url: chatData.url ?? base.url,
    isOwner:
      (chatData as { isOwner?: boolean }).isOwner ??
      base.isOwner ??
      true,
    files: files ?? base.files,
  }
})

      // Only update chat history if it's empty (initial load)
      if (chatData.messages && chatHistory.length === 0) {
        setChatHistory(
          chatData.messages.map((msg) => ({
            type: msg.role,
            content: msg.experimental_content as MessageBinaryFormat ?? msg.content as string | MessageBinaryFormat,
          })),
        )
      }
    }
  }, [chatData, chatId, chatHistory.length])

  // Log chat loading errors (page handles the UI)
  useEffect(() => {
    if (chatError && chatId) {
    }
  }, [chatError, chatId])

  const handleSendMessage = async (
    message: string,
    attachments?: Array<{ url: string }>,
  ) => {
    if (!message.trim() || isLoading) return

    const userMessage = message.trim()
    setIsLoading(true)

    setChatHistory((prev) => [...prev, { type: 'user', content: userMessage }])

    try {
      // Use streaming mode - fetch directly since Eden doesn't handle streaming well
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          chatId: chatId,
          streaming: true,
          ...(attachments && attachments.length > 0 && { attachments }),
        }),
      })

      if (!response.ok) {
        let errorMessage =
          'Sorry, there was an error processing your message. Please try again.'
        try {
          const errorData = (await response.json()) as {
            error?: string
            message?: string
          }
          if (errorData.error === 'insufficient_credits') {
            setShowSubscriptionModal(true)
            setIsLoading(false)
            // Remove the user message we just added since the request didn't go through
            setChatHistory((prev) => prev.slice(0, -1))
            return
          }
          if (errorData.message) {
            errorMessage = errorData.message
          } else if (response.status === 429) {
            errorMessage =
              'You have exceeded your maximum number of messages for the day. Please try again later.'
          }
        } catch {
          if (response.status === 429) {
            errorMessage =
              'You have exceeded your maximum number of messages for the day. Please try again later.'
          }
        }
        throw new Error(errorMessage)
      }

      if (!response.body) {
  throw new Error('No response body for streaming')
}

setIsLoading(false)
setIsStreaming(true)

setChatHistory((prev) => [
  ...prev,
  {
    type: 'assistant',
    content: [],
    isStreaming: true,
    stream: response.body,
  },
])
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Sorry, there was an error processing your message. Please try again.'

      setChatHistory((prev) => [
        ...prev,
        {
          type: 'assistant',
          content: errorMessage,
        },
      ])
      setIsLoading(false)
    }
  }

  // Function to update URL with chatId using Next.js router
  const updateUrlWithChatId = useCallback(
    (newChatId: string) => {
      const newUrl = new URL(window.location.href)
      if (newUrl.searchParams.get('chatId') !== newChatId) {
        newUrl.searchParams.set('chatId', newChatId)
        router.push(newUrl.pathname + newUrl.search, { scroll: false })
      }
    },
    [router],
  )


  const handleStreamingComplete = async (finalContent: string | MessageBinaryFormat) => {
    

// detect generated files and update sidebar
if (Array.isArray(finalContent)) {
  const fileBlocks = finalContent.filter(
    (item: any) => item?.type === "file"
  )

    if (fileBlocks.length > 0) {
      setCurrentChat((prev) => {
        const base = prev ?? { id: chatId || '' }
        return {
          ...base,
          files: fileBlocks.map((f: any) => ({
            name: f.name,
            content: f.content,
          })),
        }
      })
    }
}

    setIsStreaming(false)
    setIsLoading(false)

    // Update chat history with the final content
    setChatHistory((prev) => {
      const updated = [...prev]
      const lastIndex = updated.length - 1
      if (lastIndex >= 0 && updated[lastIndex]?.isStreaming) {
        updated[lastIndex] = {
          ...updated[lastIndex],
          content: finalContent,
          isStreaming: false,
          stream: undefined,
        }
      }
      return updated
    })

    // Try to extract chat ID from the final content
    // This is a fallback - the primary way to get chatId is via onChatData callback
    let extractedChatId: string | undefined

    if (finalContent && Array.isArray(finalContent)) {
      const searchForChatId = (obj: unknown): void => {
        if (obj && typeof obj === 'object') {
          const objRecord = obj as Record<string, unknown>
          // Only accept chatId if object is 'chat' to avoid using message IDs
          if (
            objRecord.object === 'chat' &&
            objRecord.id &&
            typeof objRecord.id === 'string'
          ) {
            if (
              (objRecord.id.includes('-') && objRecord.id.length > 20) ||
              (objRecord.id.length > 15 && objRecord.id !== 'hello-world')
            ) {
              extractedChatId = objRecord.id
            }
          }

          if (
            !extractedChatId &&
            objRecord.chatId &&
            typeof objRecord.chatId === 'string' &&
            objRecord.chatId.length > 10 &&
            objRecord.chatId !== 'hello-world'
          ) {
            extractedChatId = objRecord.chatId
          }

          if (Array.isArray(obj)) {
            obj.forEach(searchForChatId)
          } else {
            Object.values(objRecord).forEach(searchForChatId)
          }
        }
      }

      finalContent.forEach(searchForChatId)
    }

    // Get chatId from URL (most reliable source as it's updated during streaming)
    const urlParams = new URLSearchParams(window.location.search)
    const urlChatId = urlParams.get('chatId')

    // Update URL if we found a new chat ID and URL doesn't have one
    if (extractedChatId && !urlChatId) {
      updateUrlWithChatId(extractedChatId)
     setCurrentChat((prev) => ({
  ...(prev ?? { id: extractedChatId! }),
  id: extractedChatId!,
}))
    }

    // Determine which chatId to use for fetching - URL is most reliable
    const chatIdToFetch = urlChatId ?? extractedChatId ?? chatId


    // Fetch chat details to get demo URL and title
    if (chatIdToFetch) {
      // Function to fetch and check for demo URL with retries
      const fetchChatDetails = async (attempt: number) => {

        // Force refetch by invalidating first
        await queryClient.invalidateQueries({ queryKey: ['chat', chatIdToFetch] })

        // Then refetch
        const result = await queryClient.fetchQuery({
          queryKey: ['chat', chatIdToFetch],
          staleTime: 0, // Force fresh fetch
        })

       const data = result as {
  demo?: string
  demoUrl?: string
  latestVersion?: { demoUrl?: string }
} | undefined

const demoUrl =
  data?.latestVersion?.demoUrl ??
  data?.demoUrl ??
  data?.demo

        if (demoUrl) {
          setCurrentChat((prev) => {
            const base = prev ?? { id: chatIdToFetch! }
            return {
              ...base,
              demo: demoUrl,
            }
          })
        } else if (attempt < 15) {
          // Retry with exponential backoff (1s, 2s, 3s, 4s, 5s...)
          // Increased attempts to 15 for complex apps that take longer to deploy
          setTimeout(() => {
            void fetchChatDetails(attempt + 1)
          }, 1000 * Math.min(attempt, 5))
        }
      }

      // Start fetching after a short delay to allow backend to process
      setTimeout(() => {
        void fetchChatDetails(1)
      }, 500)
    }
  }

  const handleChatData = async (chatData: {
    id?: string
    object?: string
    webUrl?: string
    url?: string
  }) => {
    if (chatData.id) {
      // Only set currentChat if it's not already set or if this is the main chat object
      // This matches v0-app's behavior to avoid using message IDs or other IDs
      if (!currentChat?.id || chatData.object === 'chat') {
        // Update URL if we don't have a chatId in URL yet
        // This will automatically trigger the query hook to fetch chat details
        if (!chatId || chatId !== chatData.id) {
          updateUrlWithChatId(chatData.id)
        }

        // Update currentChat with basic info
        // The query hook will update it with full details including demo URL
        setCurrentChat((prev) => ({
          ...(prev ?? { id: chatData.id! }),
          id: chatData.id!,
          url: chatData.webUrl ?? chatData.url,
        }))
      }
    }
  }

  return {
    currentChat,
    isLoading,
    setIsLoading,
    isStreaming,
    chatHistory,
    isLoadingChat,
    chatError,
    handleSendMessage,
    handleStreamingComplete,
    handleChatData,
    showSubscriptionModal,
    setShowSubscriptionModal,
  }
}
