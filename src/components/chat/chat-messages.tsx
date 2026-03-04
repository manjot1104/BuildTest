'use client'
function getAIConfidence(text: string): "high" | "medium" | "low" {
  if (text.length > 800) return "high"
  if (text.length > 300) return "medium"
  return "low"
}

import React, { useRef, useEffect } from 'react'
import {
  Conversation,
  ConversationContent,
} from '@/components/ai-elements/conversation'
import { Loader } from '@/components/ai-elements/loader'
import { sharedComponents } from '@/components/shared-components'
import { StreamingMessage, Message as V0Message, type MessageBinaryFormat } from '@v0-sdk/react'
import type { ChatMessage } from '@/hooks/use-chat'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { authClient } from '@/server/better-auth/client'
import { cn } from '@/lib/utils'

interface Chat {
  id: string
  demo?: string
  url?: string
}

interface ChatMessagesProps {
  chatHistory: ChatMessage[]
  isLoading: boolean
  isStreaming?: boolean
  currentChat: Chat | null
  onStreamingComplete: (finalContent: string | MessageBinaryFormat) => void
  onChatData: (chatData: { id?: string; webUrl?: string; url?: string }) => void
  onStreamingStarted?: () => void
}
function AIConfidenceBadge({ confidence }: { confidence: "high" | "medium" | "low" }) {
  const styles = {
    high: "text-green-600 bg-green-100",
    medium: "text-yellow-700 bg-yellow-100",
    low: "text-red-600 bg-red-100",
  }

  const labels = {
    high: "High confidence",
    medium: "Medium confidence",
    low: "Low confidence",
  }

  return (
    <span
      className={`text-xs px-2 py-1 rounded-full font-medium ${styles[confidence]}`}
    >
      {labels[confidence]}
    </span>
  )
}

// Unified message wrapper component for consistent styling
function MessageWrapper({
  role,
  children,
}: {
  role: 'user' | 'assistant'
  children: React.ReactNode
}) {
  const { data: session } = authClient.useSession()
  const user = session?.user

  const userInitials =
    user?.name
      ?.split(' ')
      .map((name) => name[0])
      .join('')
      .toUpperCase() ?? 'U'
  const aiInitials = 'AI'

  const isUser = role === 'user'

  return (
    <div
      className={cn(
        'group flex w-full items-start gap-3 py-4',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      {/* Avatar */}
      <div className="shrink-0 mt-1">
        <Avatar
          size="default"
          className={cn(
            'ring-1 ring-border',
            isUser ? 'bg-primary' : 'bg-background',
          )}
        >
          <AvatarFallback
            className={cn(
              'text-xs font-medium',
              isUser
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground',
            )}
          >
            {isUser ? userInitials : aiInitials}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'flex flex-col gap-2 overflow-hidden rounded-lg px-4 py-3 text-sm',
          isUser
            ? 'bg-muted text-foreground max-w-[80%]'
            : 'bg-background text-secondary-foreground max-w-full flex-1',
        )}
      >
        {children}
      </div>
    </div>
  )
}

// Function to preprocess message content and remove V0_FILE markers
function preprocessMessageContent(
  content: MessageBinaryFormat,
): MessageBinaryFormat {
  if (!Array.isArray(content)) return content

  return content.map((row) => {
    if (!Array.isArray(row)) return row

    const processedRow = row.map((item: unknown) => {
      if (typeof item === 'string') {
        let processed = item.replace(/\[V0_FILE\][^:]*:file="[^"]*"\n?/g, '')
        processed = processed.replace(/\[V0_FILE\][^\n]*\n?/g, '')
        processed = processed.replace(/\.\.\. shell \.\.\./g, '')
        processed = processed.replace(/\.\.\.\s*shell\s*\.\.\./g, '')
        processed = processed.replace(/\n\s*\n\s*\n/g, '\n\n')
        processed = processed.replace(/^\s*\n+/g, '')
        processed = processed.replace(/\n+\s*$/g, '')
        processed = processed.trim()

        if (!processed || /^\s*$/.exec(processed)) {
          return ''
        }

        return processed
      }
      return item
    })

    return processedRow as (typeof content)[number]
  }) as MessageBinaryFormat
}

export function ChatMessages({
  chatHistory,
  isLoading,
  isStreaming,
  onStreamingComplete,
  onChatData,
  onStreamingStarted,
}: ChatMessagesProps) {
  const streamingStartedRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Reset the streaming started flag when a new message starts loading
  useEffect(() => {
    if (isLoading) {
      streamingStartedRef.current = false
    }
  }, [isLoading])

  // Auto-scroll when new messages are added
  useEffect(() => {
    scrollToBottom()
  }, [chatHistory.length])

  // Auto-scroll when loading or streaming state changes
  useEffect(() => {
    if (isLoading || isStreaming) {
      scrollToBottom()
    }
  }, [isLoading, isStreaming])

  const showBottomLoader = isLoading || isStreaming

  if (chatHistory.length === 0) {
    return (
      <Conversation>
        <ConversationContent>
          <div>
            {/* Empty conversation - messages will appear here when they load */}
          </div>
        </ConversationContent>
      </Conversation>
    )
  }

  return (
    <Conversation>
      <ConversationContent>
        {chatHistory.map((msg, index) => (
          <MessageWrapper key={`msg-${index}-${msg.type}`} role={msg.type}>
            {msg.isStreaming && msg.stream ? (
              <StreamingMessage
                stream={msg.stream}
                messageId={`msg-${index}`}
                role={msg.type}
                onComplete={(data) => onStreamingComplete(data as MessageBinaryFormat)}
                onChatData={onChatData}
                onChunk={() => {
                  // Hide external loader once we start receiving content (only once)
                  if (onStreamingStarted && !streamingStartedRef.current) {
                    streamingStartedRef.current = true
                    onStreamingStarted()
                  }
                  // Auto-scroll on each streaming chunk
                  scrollToBottom()
                }}
                onError={(error) => console.error('Streaming error:', error)}
                components={sharedComponents}
                showLoadingIndicator={false}
              />
            ) : typeof msg.content === 'string' ? (
              <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            ) : (
              <V0Message
                content={preprocessMessageContent(msg.content)}
                messageId={`msg-${index}`}
                role={msg.type}
                components={sharedComponents}
              />
            )}
          </MessageWrapper>
        ))}
        {showBottomLoader && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader size={16} className="text-gray-500 dark:text-gray-400" />
            <span className="text-xs text-muted-foreground">
              {isLoading && !isStreaming ? 'Thinking...' : 'Generating...'}
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </ConversationContent>
    </Conversation>
  )
} 