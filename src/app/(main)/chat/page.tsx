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
import { Suggestions, Suggestion } from '@/components/ai-elements/suggestion'
import { ChatMessages } from '@/components/chat/chat-messages'
import { ChatInput } from '@/components/chat/chat-input'
import { PreviewPanel } from '@/components/chat/preview-panel'
import { ResizableLayout } from '@/components/shared/resizable-layout'
import { BottomToolbar } from '@/components/shared/bottom-toolbar'
import { useChat } from '@/hooks/use-chat'
import { ChatActionsProvider } from '@/context/chat-actions'
import type { MessageBinaryFormat } from '@v0-sdk/react'

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
    const [urlChatId, setUrlChatId] = useState<string | null>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const {
        currentChat: hookCurrentChat,
        chatHistory,
        isLoading: hookIsLoading,
        handleSendMessage: hookHandleSendMessage,
        handleStreamingComplete: hookHandleStreamingComplete,
        handleChatData: hookHandleChatData,
    } = useChat(urlChatId ?? undefined)

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

    // Effect to refresh preview when demo URL becomes available after streaming
    useEffect(() => {
        if (hookCurrentChat?.demo) {
            setRefreshKey((prev) => prev + 1)

            // Update preview panel on mobile after demo URL is available
            if (window.innerWidth < 768) {
                setActivePanel('preview')
            }
        }
    }, [hookCurrentChat?.demo])

    if (showChatInterface || chatHistory.length > 0) {
        return (
            <ChatActionsProvider onSendMessage={(msg) => hookHandleSendMessage(msg)}>
                <div className="bg-background h-[calc(100vh-80px)] flex flex-col">
                    {/* Handle search params with Suspense boundary */}
                    <Suspense fallback={null}>
                        <SearchParamsHandler
                            onReset={handleReset}
                            onChatIdChange={handleChatIdChange}
                        />
                    </Suspense>

                    <div className="flex flex-col h-[calc(100vh-64px-40px)] md:h-[calc(100vh-64px)]">
                        <ResizableLayout
                        className="flex-1 min-h-0"
                        singlePanelMode={false}
                        activePanel={activePanel === 'chat' ? 'left' : 'right'}
                        leftPanel={
                            <div className="flex flex-col h-full">
                                <div className="flex-1 overflow-y-auto">
                                    <ChatMessages
                                        chatHistory={chatHistory}
                                        isLoading={isLoading}
                                        currentChat={hookCurrentChat}
                                        onStreamingComplete={handleStreamingComplete}
                                        onChatData={handleChatData}
                                        onStreamingStarted={() => setIsLoading(false)}
                                    />
                                </div>

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
                            </div>
                        }
                        rightPanel={
                            <PreviewPanel
                                currentChat={hookCurrentChat}
                                isFullscreen={isFullscreen}
                                setIsFullscreen={setIsFullscreen}
                                refreshKey={refreshKey}
                                setRefreshKey={setRefreshKey}
                            />
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

    return (
        <div className="bg-background h-[calc(100vh-80px)] flex flex-col">
            {/* Handle search params with Suspense boundary */}
            <Suspense fallback={null}>
                <SearchParamsHandler
                    onReset={handleReset}
                    onChatIdChange={handleChatIdChange}
                />
            </Suspense>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl w-full">
                    <div className="text-center mb-8 md:mb-12">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
                            What can we build together?
                        </h2>
                    </div>

                    {/* Prompt Input */}
                    <div className="max-w-2xl mx-auto">
                        <PromptInput
                            onSubmit={handleSendMessage}
                            className="w-full relative"
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
                                className="min-h-[80px] text-base"
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
                    <div className="mt-4 max-w-2xl mx-auto">
                        <Suggestions>
                            <Suggestion
                                onClick={() => {
                                    setMessage('Landing page')
                                    // Submit after setting message
                                    setTimeout(() => {
                                        const form = textareaRef.current?.form
                                        if (form) {
                                            form.requestSubmit()
                                        }
                                    }, 0)
                                }}
                                suggestion="Landing page"
                            />
                            <Suggestion
                                onClick={() => {
                                    setMessage('Todo app')
                                    setTimeout(() => {
                                        const form = textareaRef.current?.form
                                        if (form) {
                                            form.requestSubmit()
                                        }
                                    }, 0)
                                }}
                                suggestion="Todo app"
                            />
                            <Suggestion
                                onClick={() => {
                                    setMessage('Dashboard')
                                    setTimeout(() => {
                                        const form = textareaRef.current?.form
                                        if (form) {
                                            form.requestSubmit()
                                        }
                                    }, 0)
                                }}
                                suggestion="Dashboard"
                            />
                            <Suggestion
                                onClick={() => {
                                    setMessage('Blog')
                                    setTimeout(() => {
                                        const form = textareaRef.current?.form
                                        if (form) {
                                            form.requestSubmit()
                                        }
                                    }, 0)
                                }}
                                suggestion="Blog"
                            />
                            <Suggestion
                                onClick={() => {
                                    setMessage('E-commerce')
                                    setTimeout(() => {
                                        const form = textareaRef.current?.form
                                        if (form) {
                                            form.requestSubmit()
                                        }
                                    }, 0)
                                }}
                                suggestion="E-commerce"
                            />
                        </Suggestions>
                    </div>
                </div>
            </div>
        </div>
    )
}