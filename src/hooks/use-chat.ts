import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useChatDetails } from './use-chat-api'
import type { MessageBinaryFormat } from '@v0-sdk/react'

interface Chat {
  id: string
  demo?: string
  url?: string
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

  // Use Tanstack Query to fetch chat details
  const {
    data: chatData,
    isLoading: isLoadingChat,
    error: chatError,
  } = useChatDetails(chatId)

  // Update currentChat and chatHistory when chatData changes
  useEffect(() => {
    if (chatData) {
      const demoUrl = chatData.demo ?? chatData.latestVersion?.demoUrl
      setCurrentChat({
        id: chatData.id,
        demo: demoUrl,
        url: chatData.url,
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
  }, [chatData, chatHistory.length])

  // Handle chat loading errors - clear chatId from URL if chat doesn't exist
  useEffect(() => {
    if (chatError && chatId) {
      console.error('Error loading chat:', chatError)
      // Clear chatId from URL if chat not found (404)
      const errorMessage =
        chatError instanceof Error ? chatError.message : String(chatError)
      if (
        errorMessage.includes('404') ||
        errorMessage.includes('not_found') ||
        errorMessage.includes('Chat not found')
      ) {
        // Remove chatId from URL
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('chatId')
        router.replace(newUrl.pathname + newUrl.search, { scroll: false })
        // Clear current chat state
        setCurrentChat(null)
        setChatHistory([])
      } else {
        // For other errors, redirect to chat page
        router.push('/chat')
      }
    }
  }, [chatError, chatId, router])

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
            message?: string
          }
          if (errorData.message) {
            errorMessage = errorData.message
          } else if (response.status === 429) {
            errorMessage =
              'You have exceeded your maximum number of messages for the day. Please try again later.'
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError)
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

      setIsStreaming(true)

      // Add placeholder for streaming response with the stream attached
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
      console.error('Error:', error)

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

    // Try to extract chat ID from the final content if we don't have one yet
    // This is a fallback - the primary way to get chatId is via onChatData callback
    let extractedChatId: string | undefined

    if (!currentChat?.id && finalContent && Array.isArray(finalContent)) {
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

    // Update URL if we found a new chat ID
    if (extractedChatId && !currentChat?.id) {
      updateUrlWithChatId(extractedChatId)
      setCurrentChat({ id: extractedChatId })
    }

    // Determine which chatId to use for invalidating the query
    // Priority: extractedChatId > currentChat.id > chatId from URL
    const chatIdToInvalidate = extractedChatId ?? currentChat?.id ?? chatId

    // Invalidate the query to trigger a refetch and get the latest chat data including demo URL
    if (chatIdToInvalidate) {
      // Wait a bit to allow backend to process chat creation, then invalidate
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['chat', chatIdToInvalidate] })
        
        // If demo URL is still not available, retry after another delay
        setTimeout(() => {
          void queryClient.invalidateQueries({ queryKey: ['chat', chatIdToInvalidate] })
        }, 2000)
      }, 1000)
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
        setCurrentChat({
          id: chatData.id,
          url: chatData.webUrl ?? chatData.url,
        })
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
    handleSendMessage,
    handleStreamingComplete,
    handleChatData,
  }
}
