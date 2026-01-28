'use client'

import React, { createContext, useContext, useCallback, useState } from 'react'

interface ChatActionsContextValue {
  sendMessage: (message: string) => void
  isAnswering: boolean
}

const ChatActionsContext = createContext<ChatActionsContextValue | null>(null)

interface ChatActionsProviderProps {
  children: React.ReactNode
  onSendMessage: (message: string) => void
}

export function ChatActionsProvider({
  children,
  onSendMessage,
}: ChatActionsProviderProps) {
  const [isAnswering, setIsAnswering] = useState(false)

  const sendMessage = useCallback(
    (message: string) => {
      setIsAnswering(true)
      onSendMessage(message)
      // Reset after a short delay to allow the UI to update
      setTimeout(() => setIsAnswering(false), 500)
    },
    [onSendMessage],
  )

  return (
    <ChatActionsContext.Provider value={{ sendMessage, isAnswering }}>
      {children}
    </ChatActionsContext.Provider>
  )
}

export function useChatActions() {
  const context = useContext(ChatActionsContext)
  if (!context) {
    // Return a no-op if not within provider (for non-interactive rendering)
    return {
      sendMessage: () => {},
      isAnswering: false,
      isAvailable: false,
    }
  }
  return {
    ...context,
    isAvailable: true,
  }
}
