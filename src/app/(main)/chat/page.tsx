'use client'
import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { ModeSelection } from "./components/mode-selection"
import { KeyRound } from 'lucide-react'
import { EnvVariablesPanel } from '@/components/chat/env-variables-panel'
import { useEnvVariables } from '@/hooks/use-env-variables'
import { useSearchParams } from 'next/navigation'
import { useRouter } from "next/navigation"
import {
    PromptInput,
    PromptInputImageButton,
    PromptInputImagePreview,
    PromptInputMicButton,
    PromptInputSubmit,
    PromptInputTextarea,
    PromptInputToolbar,
    PromptInputTools,
    createImageAttachment,
    createImageAttachmentFromStored,
    savePromptToStorage,
    loadPromptFromStorage,
    clearPromptFromStorage,
    type ImageAttachment,
} from '@/components/ai-elements/prompt-input'
import { ChatMessages } from '@/components/chat/chat-messages'
import { ChatInput } from '@/components/chat/chat-input'
import { CommunityBuildsGrid } from '@/components/chat/community-builds-grid'
import { ForkBanner } from '@/components/chat/fork-banner'
import { PreviewPanel } from '@/components/chat/preview-panel'
import { ResizableLayout } from '@/components/shared/resizable-layout'
import { BottomToolbar } from '@/components/shared/bottom-toolbar'
import { useChat } from '@/hooks/use-chat'
import { ChatActionsProvider } from '@/context/chat-actions'
import { SubscriptionModal } from '@/components/payments/subscription-modal'
import { useUserCredits } from '@/hooks/use-user-credits'
import { useForkChat } from '@/client-api/query-hooks'
import { useStateMachine } from '@/context/state-machine'
import type { MessageBinaryFormat } from '@v0-sdk/react'
import {
    Layout,
    CheckSquare,
    BarChart3,
    FileText,
    ShoppingCart,
    AlertCircle,
    RotateCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BuildifyLogo } from '@/components/buildify-logo'
import { ChatExportMenu } from '@/components/chat/chat-export-menu'

// Component that uses useSearchParams - needs to be wrapped in Suspense
function SearchParamsHandler({
    onReset,
    onChatIdChange,
}: {
    onReset: () => void
    onChatIdChange: (chatId: string | null) => void
}) {
    const searchParams = useSearchParams()

    // Handle reset parameter
    useEffect(() => {
        const reset = searchParams.get('reset')
        if (reset === 'true') {
            onReset()

            // Remove the reset parameter from URL without triggering navigation
            const newUrl = new URL(window.location.href)
            newUrl.searchParams.delete('reset')
            window.history.replaceState({}, '', newUrl.pathname)
        }
    }, [searchParams])

    // Handle chatId from URL
   // Handle chatId from URL
useEffect(() => {
    const chatId = searchParams.get('chatId')
    if (chatId !== null) {              
        onChatIdChange(chatId)
    }
}, [searchParams, onChatIdChange])

    return null
}

export default function ChatPage() {
    const router = useRouter()
    const [chatMode, setChatMode] = useState<"BUILDER" | "AI_CHAT" | null>(null)
    const [message, setMessage] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showChatInterface, setShowChatInterface] = useState(false)

const [envPanelOpen, setEnvPanelOpen] = useState(false)
const { variables } = useEnvVariables()
    const [attachments, setAttachments] = useState<ImageAttachment[]>([])
    const [isDragOver, setIsDragOver] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [activePanel, setActivePanel] = useState<'chat' | 'preview'>('chat')
    const [micError, setMicError] = useState<string | null>(null)
    const [urlChatId, setUrlChatId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
        return new URLSearchParams(window.location.search).get('chatId')
    }
    return null
})
useEffect(() => {
  if (chatMode === "AI_CHAT" && !showChatInterface) {
    setShowChatInterface(true)
  }
}, [chatMode])

   useEffect(() => {
  if (urlChatId && chatMode !== "BUILDER") {
    setChatMode("BUILDER")
    setShowChatInterface(true)
  }
}, [urlChatId])

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const {
        currentChat: hookCurrentChat,
        chatHistory,
        isLoading: hookIsLoading,
        isStreaming,
        isLoadingChat,
        chatError,
        handleSendMessage: hookHandleSendMessage,
        handleStreamingComplete: hookHandleStreamingComplete,
        handleChatData: hookHandleChatData,
        showSubscriptionModal,
        setShowSubscriptionModal,
    } = useChat(urlChatId ?? undefined)

    const { credits, subscription, hasActiveSubscription } = useUserCredits()
    const { session } = useStateMachine()
    const forkChat = useForkChat()

    const isViewingOthersChat = !!urlChatId && !!hookCurrentChat?.id && hookCurrentChat.isOwner === false

    const handleFork = async () => {
        if (!urlChatId) return
        try {
            const result = await forkChat.mutateAsync(urlChatId)
            if (result.newChatId) {
                const newUrl = new URL(window.location.href)
                newUrl.searchParams.set('chatId', result.newChatId)
                window.location.href = newUrl.pathname + newUrl.search
            }
        } catch {
          // URL update is non-critical
        }
    }

    const shouldShowPreview =
    !!hookCurrentChat?.demo &&
    !!hookCurrentChat?.id &&
    !isStreaming


    // Sync loading state
    useEffect(() => {
        setIsLoading(hookIsLoading)
    }, [hookIsLoading])

  const handleReset = useCallback(() => {
    setShowChatInterface(false)
    setChatMode(null)
    setMessage('')
    setAttachments([])
    setIsLoading(false)
    setIsFullscreen(false)
    setUrlChatId(null)
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.delete('chatId')
    window.history.replaceState({}, '', newUrl.pathname)
    clearPromptFromStorage()
    setTimeout(() => {
        if (textareaRef.current) {
            textareaRef.current.focus()
        }
    }, 0)
}, [])

const handleChatIdChange = (chatId: string | null) => {
    setUrlChatId(chatId)
}

    // Auto-focus the textarea on page load and restore from sessionStorage
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus()
        }

        // Restore prompt data from sessionStorage
        const storedData = loadPromptFromStorage()
        if (storedData) {
            setMessage(storedData.message)
            if (storedData.attachments.length > 0) {
                const restoredAttachments = storedData.attachments.map(
                    createImageAttachmentFromStored,
                )
                setAttachments(restoredAttachments)
            }
        }
    }, [])

    // Save prompt data to sessionStorage whenever message or attachments change
    useEffect(() => {
        if (message.trim() || attachments.length > 0) {
            savePromptToStorage(message, attachments)
        } else {
            // Clear sessionStorage if both message and attachments are empty
            clearPromptFromStorage()
        }
    }, [message, attachments])

    // Image attachment handlers
    const handleImageFiles = async (files: File[]) => {
        try {
            const newAttachments = await Promise.all(
                files.map((file) => createImageAttachment(file)),
            )
            setAttachments((prev) => [...prev, ...newAttachments])
        } catch {
          // Image processing failed silently
        }
    }

    const handleRemoveAttachment = (id: string) => {
        setAttachments((prev) => prev.filter((att) => att.id !== id))
    }

    const handleDragOver = () => {
        setIsDragOver(true)
    }

    const handleDragLeave = () => {
        setIsDragOver(false)
    }

    const handleDrop = () => {
        setIsDragOver(false)
    }

    const handleSendMessage = async (
        e: React.FormEvent<HTMLFormElement>,
        attachmentUrls?: Array<{ url: string }>,
    ) => {
        e.preventDefault()
        if (!message.trim() || isLoading) return

        const userMessage = message.trim()
        const currentAttachments = attachmentUrls ?? attachments.map((att) => ({ url: att.dataUrl }))

        // Clear sessionStorage immediately upon submission
        clearPromptFromStorage()

        setMessage('')
        setAttachments([])

        // Immediately show chat interface
        setShowChatInterface(true)
        setIsLoading(true)

        // Use the hook's handleSendMessage which handles the API call and streaming
        await hookHandleSendMessage(userMessage, currentAttachments)
    }

    const handleChatData = async (chatData: { id?: string }) => {
        if (chatData.id) {
            void hookHandleChatData(chatData)

            // Create ownership record for new chat
            try {
                await fetch('/api/chat/ownership', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        chatId: chatData.id,
                    }),
                })
            } catch {
              // Fork notification is non-critical
            }
        }
    }

    const handleStreamingComplete = async (finalContent: string | MessageBinaryFormat) => {
        // Update chat history with final content
        await hookHandleStreamingComplete(finalContent)
    }

    useEffect(() => {
    if (shouldShowPreview) {

        if (window.innerWidth < 768) {
            setActivePanel('preview')
        }
    }
}, [shouldShowPreview])


    if (chatMode === "AI_CHAT") {
        return (
            <ChatActionsProvider onSendMessage={(msg) => hookHandleSendMessage(msg)}>
                
                <SubscriptionModal
                    open={showSubscriptionModal}
                    onOpenChange={setShowSubscriptionModal}
                    hasActiveSubscription={hasActiveSubscription}
                    currentCredits={credits?.totalCredits ?? 0}
                    currentPlanId={subscription?.plan_id ?? null}
                />
                <div className="bg-background h-[calc(100vh-48px)] flex flex-col overflow-hidden">
                    {/* Handle search params with Suspense boundary */}
                    <Suspense fallback={null}>
                        <SearchParamsHandler
                            onReset={handleReset}
                            onChatIdChange={handleChatIdChange}
                        />
                    </Suspense>

                    <div className="flex flex-col flex-1 min-h-0">
                        <ResizableLayout
                            className="flex-1 min-h-0"
                            singlePanelMode={!shouldShowPreview}
                            activePanel={activePanel === 'chat' ? 'left' : 'right'}
                            leftPanel={
                                <div className="flex flex-col h-full">
                                    {chatError && chatHistory.length === 0 ? (
                                        <div className="flex-1 flex items-center justify-center px-4">
                                            <div className="text-center max-w-sm">
                                                <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
                                                <h3 className="text-base font-medium text-foreground mb-1">
                                                    Failed to load chat
                                                </h3>
                                                <p className="text-sm text-muted-foreground mb-4">
                                                    {chatError instanceof Error
                                                        ? chatError.message
                                                        : 'Something went wrong while loading this chat.'}
                                                </p>
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => window.location.reload()}
                                                        className={cn(
                                                            "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                                                            "bg-primary text-primary-foreground hover:bg-primary/90",
                                                            "transition-colors"
                                                        )}
                                                    >
                                                        <RotateCw className="w-3.5 h-3.5" />
                                                        Retry
                                                    </button>
                                                    <button
                                                        onClick={handleReset}
                                                        className={cn(
                                                            "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                                                            "bg-muted text-muted-foreground hover:bg-muted/80",
                                                            "transition-colors"
                                                        )}
                                                    >
                                                        New chat
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : isLoadingChat && chatHistory.length === 0 ? (
                                        <div className="flex-1 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                                <p className="text-sm text-muted-foreground">Loading chat...</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {chatHistory.length > 0 && (
                                                <div className="flex items-center justify-end px-3 py-1.5 border-b bg-background/80">
                                                    <ChatExportMenu
                                                        chatId={urlChatId ?? hookCurrentChat?.id ?? ""}
                                                        chatType="BUILDER"
                                                        title={chatHistory.find((m) => m.type === 'user')?.content?.toString().slice(0, 60)}
                                                        messages={chatHistory
                                                            .filter((m) => typeof m.content === 'string')
                                                            .map((m) => ({
                                                                role: m.type,
                                                                content: m.content as string,
                                                            }))}
                                                        disabled={isLoading || isStreaming}
                                                    />
                                                </div>
                                            )}
                                            <div className="flex-1 overflow-y-auto">
                                                <ChatMessages
                                                    chatHistory={chatHistory}
                                                    isLoading={isLoading}
                                                    isStreaming={isStreaming}
                                                    currentChat={hookCurrentChat}
                                                    onStreamingComplete={handleStreamingComplete}
                                                    onChatData={handleChatData}
                                                    onStreamingStarted={() => setIsLoading(false)}
                                                />
                                            </div>

                                            {isViewingOthersChat ? (
                                                <ForkBanner
                                                    isAuthenticated={!!session?.user}
                                                    isForking={forkChat.isPending}
                                                    onFork={handleFork}
                                                    onSignIn={() => window.location.href = "/login"}
                                                />
                                            ) : (
                                                <ChatInput
                                                    message={message}
                                                    setMessage={setMessage}
                                                    onSubmit={handleSendMessage}
                                                    isLoading={isLoading}
                                                    showSuggestions={false}
                                                    attachments={attachments}
                                                    onAttachmentsChange={setAttachments}
                                                    textareaRef={textareaRef}
                                                />
                                            )}
                                        </>
                                    )}
                                </div>
                            }
                          rightPanel={
    shouldShowPreview ? (
        <PreviewPanel
            currentChat={hookCurrentChat}
            isFullscreen={isFullscreen}
            setIsFullscreen={setIsFullscreen}
            isBuilding={isLoading || isStreaming}
        />
    ) : null
}

                        />

                        <div className="md:hidden">
                            <BottomToolbar
                                activePanel={activePanel}
                                onPanelChange={setActivePanel}
                                hasPreview={!!hookCurrentChat?.demo}
                            />
                        </div>
                    </div>
                </div>
            </ChatActionsProvider>
        )
    }
if (!chatMode) {
  return (
    <div className="bg-background h-[calc(100vh-48px)] flex items-center justify-center">
      <Suspense fallback={null}>
        <SearchParamsHandler
          onReset={handleReset}
          onChatIdChange={handleChatIdChange}
        />
      </Suspense>
      <ModeSelection
        onSelect={(mode) => {
          if (mode === "AI_CHAT") {
            router.push("/ai-chat")
          }
          if (mode === "BUILDER") {
            setChatMode("BUILDER")
          }
        }}
      />
    </div>
  )
}
    const suggestions = [
        {
            label: 'Landing Page',
         text: `
Create a modern SaaS landing page.

Sections:
- Hero section with headline, subtext and primary CTA
- Product screenshot or illustration
- Features grid (3–6 cards with icons)
- Pricing section with highlighted recommended plan
- Testimonials section
- Conversion-focused footer with links and CTA

Design Requirements:
- Clean modern UI
- Generous whitespace
- Smooth hover and scroll animations
- Mobile-first responsive layout
`, 
            icon: Layout,
        },
        {
            label: 'Task Management',
           text: `
Build a task management web application with a Kanban-style interface.

Features:
- Sidebar with projects and filters
- Columns: Todo, In Progress, Done
- Draggable task cards between columns
- Task details with title, description and due date
- Ability to add, edit and delete tasks

UI Requirements:
- Clean dashboard layout
- Card based design
- Responsive interface
`,
            icon: CheckSquare,
        },
        {
            label: 'Dashboard',
        text: `
Create an analytics dashboard.

Layout:
- Left sidebar navigation
- Top header with search and profile

Main Content:
- KPI stats cards (Users, Revenue, Growth)
- Line chart for trends
- Bar chart for category performance
- Table for recent activity

Design:
- Dark modern UI
- Clear visual hierarchy
- Responsive layout
`,
            icon: BarChart3,
        },
        {
            label: 'Blog',
        text: `
Create a modern blog platform.

Pages:
- Homepage with article cards
- Article detail page
- Author profile page

Features:
- Category and tag filtering
- Search functionality
- Reading progress indicator
- Pagination for posts

Design:
- Typography-focused layout
- Clean reading experience
- Responsive design
`,
            icon: FileText,
        },
        {
            label: 'Shop',
          text: `
Create an e-commerce store.

Pages:
- Product listing page
- Product detail page
- Shopping cart
- Checkout page

Features:
- Product cards with image, price and rating
- Add to cart functionality
- Product variants and quantity selector
- Order summary and checkout flow

Design:
- Clean product grid
- Mobile responsive layout
- High-conversion UI patterns
`,
            icon: ShoppingCart,
        },
    ]

    const handleSuggestionClick = (text: string) => {
        setMessage(text)
    }

    return (
       <ChatActionsProvider onSendMessage={(msg) => hookHandleSendMessage(msg)}>
         <EnvVariablesPanel open={envPanelOpen} onOpenChange={setEnvPanelOpen} />
      <div className={cn("bg-background flex flex-col", showChatInterface ? "h-[calc(100vh-48px)] overflow-hidden" : "min-h-[calc(100vh-48px)]")}>
           
            <SubscriptionModal
                open={showSubscriptionModal}
                onOpenChange={setShowSubscriptionModal}
                hasActiveSubscription={hasActiveSubscription}
                currentCredits={credits?.totalCredits ?? 0}
            />
            <Suspense fallback={null}>
                <SearchParamsHandler
                    onReset={handleReset}
                    onChatIdChange={handleChatIdChange}
                />
            </Suspense>

        {showChatInterface ? (
  <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

    <ResizableLayout
      className="flex-1 min-h-0"
      singlePanelMode={!shouldShowPreview}
      activePanel={activePanel === "chat" ? "left" : "right"}
      leftPanel={
        <div className="flex flex-col h-full ">

         <div className="flex-1 overflow-y-auto min-h-0">
            <ChatMessages
              chatHistory={chatHistory}
              isLoading={isLoading}
              isStreaming={isStreaming}
              currentChat={hookCurrentChat}
              onStreamingComplete={handleStreamingComplete}
              onChatData={handleChatData}
              onStreamingStarted={() => setIsLoading(false)}
            />
          </div>

          {isViewingOthersChat ? (
            <ForkBanner
              isAuthenticated={!!session?.user}
              isForking={forkChat.isPending}
              onFork={handleFork}
              onSignIn={() => window.location.href = "/login"}
            />
          ) : (
            <ChatInput
              message={message}
              setMessage={setMessage}
              onSubmit={handleSendMessage}
              isLoading={isLoading}
              isStreaming={isStreaming}
              showSuggestions={false}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              textareaRef={textareaRef}
            />
          )}

        </div>
      }
      rightPanel={
        shouldShowPreview ? (
          <PreviewPanel
            currentChat={hookCurrentChat}
            isFullscreen={isFullscreen}
            setIsFullscreen={setIsFullscreen}
            isBuilding={false}
          />
        ) : null
      }
    />

  </div>
) : (
                <div className="max-w-2xl w-full mx-auto flex-1 flex flex-col items-center justify-center px-4">
                    {/* Logo + Title */}
                    <div className="flex items-center justify-center gap-3 mb-3">
                        <div className="size-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/10 flex items-center justify-center">
                            <BuildifyLogo size="lg" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                            Buildify
                        </h1>
                    </div>
                    <p className="text-sm text-muted-foreground/60 text-center mb-10">
                        Describe what you want to build
                    </p>

                    {/* Prompt Input */}
                    <div className="w-full">
                        <PromptInput
                            onSubmit={handleSendMessage}
                            className="w-full"
                            onImageDrop={handleImageFiles}
                            isDragOver={isDragOver}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <PromptInputImagePreview
                                attachments={attachments}
                                onRemove={handleRemoveAttachment}
                            />
                            <PromptInputTextarea
                                ref={textareaRef}
                                onChange={(e) => setMessage(e.target.value)}
                                value={message}
                                placeholder="Describe what you want to build..."
                                className="min-h-[100px] text-sm"
                                disabled={isLoading}
                            />
                            <PromptInputToolbar>
                                <PromptInputTools>
                                    <PromptInputImageButton
                                        onImageSelect={handleImageFiles}
                                        disabled={isLoading}
                                    />
                                    <button
        type="button"
        onClick={() => setEnvPanelOpen(true)}
        title="Environment variables"
        className="relative flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
    >
        <KeyRound className="size-4" />
        {variables.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
                {variables.length}
            </span>
        )}
    </button>
                                </PromptInputTools>
                                <PromptInputTools>
                                    <PromptInputMicButton
                                        onTranscript={(transcript) => {
                                            setMicError(null)
                                            setMessage(
                                                (prev) => prev + (prev ? ' ' : '') + transcript,
                                            )
                                        }}
                                        onError={(error) => {
                                            setMicError(error)
                                            setTimeout(() => setMicError(null), 5000)
                                        }}
                                        disabled={isLoading}
                                    />
                                    <PromptInputSubmit
                                        disabled={!message.trim() || isLoading}
                                        status={isLoading ? 'streaming' : 'ready'}
                                    />
                                </PromptInputTools>
                            </PromptInputToolbar>
                        </PromptInput>
                        {micError && (
                            <p className="mt-2 text-xs text-destructive animate-in fade-in">
                                {micError}
                            </p>
                        )}
                    </div>

                    {/* Suggestions */}
                    <div className="mt-3">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                            {suggestions.map((suggestion) => {
                                const Icon = suggestion.icon
                                return (
                                    <button
                                        key={suggestion.text}
                                        onClick={() => handleSuggestionClick(suggestion.text)}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
                                            "hover:bg-muted/60 border border-border/40 hover:border-border/60",
                                            "text-xs text-muted-foreground hover:text-foreground",
                                            "transition-all duration-200"
                                        )}
                                    >
                                        <Icon className="size-3 shrink-0" />
                                        {suggestion.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Keyboard hint */}
                    <p className="text-[11px] text-muted-foreground/40 text-center mt-5">
                        Press <kbd className="px-1 py-0.5 rounded bg-muted/50 border border-border/30 text-[10px] font-mono">Enter</kbd> to send
                    </p>
                           </div>
)}
          {!showChatInterface && (
<div className="px-4 sm:px-6 lg:px-8 pb-12">
      <div className="max-w-5xl w-full mx-auto">
          <CommunityBuildsGrid />
      </div>
  </div>
)}
        </div>
        </ChatActionsProvider>
    )

}