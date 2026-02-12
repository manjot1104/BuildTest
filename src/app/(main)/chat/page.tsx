'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
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
    }, [searchParams, onReset])

    // Handle chatId from URL
    useEffect(() => {
        const chatId = searchParams.get('chatId')
        onChatIdChange(chatId)
    }, [searchParams, onChatIdChange])

    return null
}

export default function ChatPage() {
    const [message, setMessage] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showChatInterface, setShowChatInterface] = useState(false)
    const [attachments, setAttachments] = useState<ImageAttachment[]>([])
    const [isDragOver, setIsDragOver] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)
    const [activePanel, setActivePanel] = useState<'chat' | 'preview'>('chat')
    const [urlChatId, setUrlChatId] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return new URLSearchParams(window.location.search).get('chatId')
        }
        return null
    })
    const textareaRef = useRef<HTMLTextAreaElement>(null)

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

    const { credits, hasActiveSubscription } = useUserCredits()
    const { session, openAuthModal } = useStateMachine()
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
        } catch (error) {
            console.error('Failed to fork chat:', error)
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

    const handleReset = () => {
        // Reset all chat-related state
        setShowChatInterface(false)
        setMessage('')
        setAttachments([])
        setIsLoading(false)
        setIsFullscreen(false)
        setRefreshKey((prev) => prev + 1)
        setUrlChatId(null)

        // Clear chatId from URL
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('chatId')
        window.history.replaceState({}, '', newUrl.pathname)

        // Clear any stored data
        clearPromptFromStorage()

        // Focus textarea after reset
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus()
            }
        }, 0)
    }

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
        } catch (error) {
            console.error('Error processing image files:', error)
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
            } catch (error) {
                console.error('Failed to create chat ownership:', error)
            }
        }
    }

    const handleStreamingComplete = async (finalContent: string | MessageBinaryFormat) => {
        // Update chat history with final content
        await hookHandleStreamingComplete(finalContent)
    }

    useEffect(() => {
    if (shouldShowPreview) {
        setRefreshKey((prev) => prev + 1)

        if (window.innerWidth < 768) {
            setActivePanel('preview')
        }
    }
}, [shouldShowPreview])


    if (showChatInterface || chatHistory.length > 0 || urlChatId) {
        return (
            <ChatActionsProvider onSendMessage={(msg) => hookHandleSendMessage(msg)}>
                <SubscriptionModal
                    open={showSubscriptionModal}
                    onOpenChange={setShowSubscriptionModal}
                    hasActiveSubscription={hasActiveSubscription}
                    currentCredits={credits?.totalCredits ?? 0}
                />
                <div className="bg-background h-[calc(100vh-80px)] flex flex-col overflow-hidden">
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
                                                    onSignIn={openAuthModal}
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
            //refreshKey={refreshKey}
           // setRefreshKey={setRefreshKey}
            isBuilding={false}
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

    const suggestions = [
        {
            label: 'Landing Page',
            text: 'Design a modern SaaS landing page with strong visual hierarchy: a bold hero section with headline, supporting subtext, and primary call-to-action; feature sections arranged in clean content grids; tiered pricing cards with visual emphasis on the recommended plan; testimonial carousels for social proof; and a conversion-focused footer. Use a 12-column grid, generous whitespace, soft gradients, rounded surfaces, subtle shadows, and smooth hover and scroll animations. Ensure mobile-first responsiveness, accessible contrast ratios, and clear CTA affordances.',
            icon: Layout,
        },
        {
            label: 'Task Management',
            text: 'Build a productivity-focused task management application using a Kanban-style layout with draggable task cards, status columns, and a collapsible sidebar for projects and filters. Include inline editing, due-date indicators, priority color cues, and completion feedback animations. Define clear hover, active, drag, empty, and loading states, support keyboard navigation, and reduce cognitive load through consistent spacing and grouping.',
            icon: CheckSquare,
        },
        {
            label: 'Dashboard',
            text: 'Create a structured analytics dashboard featuring KPI summary cards, interactive charts, and persistent filter controls. Apply strong visual hierarchy to guide attention, consistent color semantics for data interpretation, and contextual tooltips for clarity. Use a dark UI theme with high contrast, subtle dividers, loading skeletons, and smooth transitions for real-time updates without overwhelming the user.',
            icon: BarChart3,
        },
        {
            label: 'Blog',
            text: 'Develop a content-first blog platform with a typography-driven layout optimized for reading comfort. Include markdown-based authoring, category and tag filtering, sticky table of contents for long-form articles, and reading-progress indicators. Focus on accessibility, readable font scales, rhythmic spacing, and distraction-free article pages.',
            icon: FileText,
        },
        {
            label: 'Shop',
            text: 'Design a high-conversion e-commerce experience with scannable product cards, clear pricing, ratings, and prominent call-to-action placement. Build detailed product pages with image galleries, variant selectors, reviews, and trust signals. Streamline cart and checkout flows using step indicators, inline validation, minimal form friction, responsive layouts, and subtle feedback animations.',
            icon: ShoppingCart,
        },
    ]

    const handleSuggestionClick = (text: string) => {
        setMessage(text)
    }

    return (
        <div className="bg-background min-h-[calc(100vh-80px)] flex flex-col overflow-y-auto">
            <SubscriptionModal
                open={showSubscriptionModal}
                onOpenChange={setShowSubscriptionModal}
                hasActiveSubscription={hasActiveSubscription}
                currentCredits={credits?.totalCredits ?? 0}
            />
            {/* Handle search params with Suspense boundary */}
            <Suspense fallback={null}>
                <SearchParamsHandler
                    onReset={handleReset}
                    onChatIdChange={handleChatIdChange}
                />
            </Suspense>

            {/* Main Content */}
            <div className="pt-[15vh] pb-4 px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl w-full mx-auto">
                    {/* Title */}
                    <h1 className="text-2xl sm:text-3xl font-semibold text-center text-foreground mb-8">
                        Buildify
                    </h1>

                    {/* Prompt Input */}
                    <div className="w-full">
                        <PromptInput
                            onSubmit={handleSendMessage}
                            className="w-full shadow-sm"
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
                                className="min-h-[100px] text-base"
                                disabled={isLoading}
                            />
                            <PromptInputToolbar>
                                <PromptInputTools>
                                    <PromptInputImageButton
                                        onImageSelect={handleImageFiles}
                                        disabled={isLoading}
                                    />
                                </PromptInputTools>
                                <PromptInputTools>
                                    <PromptInputMicButton
                                        onTranscript={(transcript) => {
                                            setMessage(
                                                (prev) => prev + (prev ? ' ' : '') + transcript,
                                            )
                                        }}
                                        onError={(error) => {
                                            console.error('Speech recognition error:', error)
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
                    </div>

                    {/* Suggestions */}
                    <div className="mt-4">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                            {suggestions.map((suggestion) => {
                                const Icon = suggestion.icon
                                return (
                                    <button
                                        key={suggestion.text}
                                        onClick={() => handleSuggestionClick(suggestion.text)}
                                        className={cn(
                                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg",
                                            "bg-muted/50 hover:bg-muted border border-border/50 hover:border-border",
                                            "text-sm text-muted-foreground hover:text-foreground",
                                            "transition-colors duration-150"
                                        )}
                                    >
                                        <Icon className="w-3.5 h-3.5 shrink-0" />
                                        {suggestion.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Keyboard hint */}
                    <p className="text-xs text-muted-foreground/50 text-center mt-6">
                        Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/50 text-[10px] font-mono">Enter</kbd> to send
                    </p>
                </div>
            </div>

            {/* Community Builds - wider container */}
            <div className="px-4 sm:px-6 lg:px-8 pb-16">
                <div className="max-w-5xl w-full mx-auto">
                    <CommunityBuildsGrid />
                </div>
            </div>
        </div>
    )
}