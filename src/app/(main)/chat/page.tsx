'use client'
import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { SeoAuditResults } from '@/components/chat/seo-audit-results'

import { ModeSelection } from "./components/mode-selection"
import { KeyRound, SearchCheckIcon, Maximize2, Minimize2, Layout,
    CheckSquare,
    BarChart3,
    FileText,
    ShoppingCart,
    AlertCircle,
    RotateCw,
} from 'lucide-react'
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

import { cn } from '@/lib/utils'
import { BuildifyLogo } from '@/components/buildify-logo'
import { ChatExportMenu } from '@/components/chat/chat-export-menu'

// ─── Draggable SEO Panel ──────────────────────────────────────────────────────
function DraggableSeoPanel({
    loading,
    result,
    mobileData,
    desktopData,
    onClose,
}: {
    loading: boolean
    result: string | null
    mobileData: any
    desktopData: any
    onClose: () => void
}) {
    const [width, setWidth] = useState(460)
    const [isFull, setIsFull] = useState(false)
    const isResizingRef = useRef(false)

    const startResize = () => {
        isResizingRef.current = true
    }

    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            if (!isResizingRef.current) return
            const newWidth = window.innerWidth - e.clientX
            setWidth(Math.max(360, Math.min(newWidth, window.innerWidth * 0.75)))
        }
        const stopResize = () => {
            isResizingRef.current = false
        }
        window.addEventListener("mousemove", handleMove)
        window.addEventListener("mouseup", stopResize)
        return () => {
            window.removeEventListener("mousemove", handleMove)
            window.removeEventListener("mouseup", stopResize)
        }
    }, [])

    return (
        <div
            style={isFull ? {} : { width }}
            className={cn(
                "fixed z-50 flex flex-col bg-card border border-border/50 shadow-2xl shadow-black/30",
                isFull
                    ? "inset-0 w-screen h-screen rounded-none"
                    : "bottom-0 right-0 top-12 rounded-l-2xl overflow-hidden"
            )}
        >
            {/* Resize handle — left edge */}
            {!isFull && (
                <div
                    onMouseDown={startResize}
                    className="absolute left-0 top-0 h-full w-1 cursor-ew-resize z-10 group"
                >
                    <div className="w-full h-full group-hover:bg-primary/20 transition-colors" />
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/40 shrink-0 bg-muted/20 select-none">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 border border-primary/20">
                    <SearchCheckIcon className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm font-semibold tracking-tight text-foreground">SEO Audit</span>
                {loading && (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent ml-0.5" />
                )}
                <div className="flex items-center gap-0.5 ml-auto">
                    <button
                        onClick={() => setIsFull(!isFull)}
                        title={isFull ? "Minimize" : "Maximize"}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                        {isFull ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                    </button>
                    <button
                        onClick={onClose}
                        title="Close"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors text-xs font-medium"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/40">
                <SeoAuditResults
                    result={result}
                    mobileData={mobileData}
                    desktopData={desktopData}
                    loading={loading}
                    isFull={isFull}
                />
            </div>

            {/* Footer */}
            {result && !loading && (
                <div className="px-4 py-2 border-t border-border/30 shrink-0 bg-muted/10">
                    <p className="text-[10px] text-muted-foreground/30 text-center font-medium">
                        Powered by Google PageSpeed + AI Analysis
                    </p>
                </div>
            )}
        </div>
    )
}


// ─── SearchParamsHandler ──────────────────────────────────────────────────────
function SearchParamsHandler({
    onReset,
    onChatIdChange,
    onAutoPrompt,
}: {
    onReset: () => void
    onChatIdChange: (chatId: string | null) => void
    onAutoPrompt?: (prompt: string, chatId: string) => void
}) {
    const searchParams = useSearchParams()

    useEffect(() => {
        const reset = searchParams.get('reset')
        if (reset === 'true') {
            onReset()
            const newUrl = new URL(window.location.href)
            newUrl.searchParams.delete('reset')
            window.history.replaceState({}, '', newUrl.pathname)
        }
    }, [searchParams])

    useEffect(() => {
        const chatId = searchParams.get('chatId')
        if (chatId !== null) {
            onChatIdChange(chatId)
        }
    }, [searchParams, onChatIdChange])

    const hasHandledRef = useRef(false)
    useEffect(() => {
        if (hasHandledRef.current) return
        const prompt = searchParams.get('prompt')
        const chatId = searchParams.get('chatId')
        if (prompt && chatId && onAutoPrompt) {
            hasHandledRef.current = true
            const newUrl = new URL(window.location.href)
            newUrl.searchParams.delete('prompt')
            window.history.replaceState({}, '', newUrl.toString())
            onAutoPrompt(prompt, chatId)
        }
    }, [searchParams])

    return null
}

// ─── ChatPage ─────────────────────────────────────────────────────────────────
export default function ChatPage() {
    const router = useRouter()
    const [chatMode, setChatMode] = useState<'BUILDER' | 'AI_CHAT' | null>(null)
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
        if (chatMode === 'AI_CHAT' && !showChatInterface) {
            setShowChatInterface(true)
        }
    }, [chatMode])

    useEffect(() => {
        if (urlChatId && chatMode === null) {
            setChatMode('BUILDER')
            setShowChatInterface(true)
        }
    }, [urlChatId, chatMode])

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

    const { credits, subscription, hasActiveSubscription } = useUserCredits()
    const { session } = useStateMachine()
    const forkChat = useForkChat()

    const isViewingOthersChat =
        !!urlChatId && !!hookCurrentChat?.id && hookCurrentChat.isOwner === false

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
            // non-critical
        }
    }

    const shouldShowPreview = !!hookCurrentChat?.id && !isStreaming

    useEffect(() => {
        setIsLoading(hookIsLoading)
    }, [hookIsLoading])

    const autoPromptFiredRef = useRef(false)

    const handleReset = useCallback(() => {
        autoPromptFiredRef.current = false
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
            if (textareaRef.current) textareaRef.current.focus()
        }, 0)
    }, [])

    const handleChatIdChange = (chatId: string | null) => {
        setUrlChatId(chatId)
    }

    // ── SEO Audit state ──
    const [seoAuditResult, setSeoAuditResult] = useState<string | null>(null)
    const [seoAuditLoading, setSeoAuditLoading] = useState(false)
    const [mobileData, setMobileData] = useState<any>(null)
    const [desktopData, setDesktopData] = useState<any>(null)

    const handleAutoPrompt = useCallback((prompt: string, chatId: string) => {
        if (autoPromptFiredRef.current) return
        autoPromptFiredRef.current = true

        if (prompt === 'seo-audit') {
          const appUrl = `${window.location.origin}/apps/${chatId}`
            setSeoAuditLoading(true)
            setSeoAuditResult(null)

            fetch('/api/seo-audit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appUrl }),
            })
                .then((res) => res.json())
                .then((data) => {
                    setSeoAuditResult(data.result ?? 'No result received')
                    setMobileData(data.mobileData ?? null)
                    setDesktopData(data.desktopData ?? null)
                    setSeoAuditLoading(false)
                })
                .catch(() => {
                    setSeoAuditResult('SEO audit failed. Please try again.')
                    setSeoAuditLoading(false)
                })
        }
    }, [])

    useEffect(() => {
        if (textareaRef.current) textareaRef.current.focus()
        const storedData = loadPromptFromStorage()
        if (storedData) {
            setMessage(storedData.message)
            if (storedData.attachments.length > 0) {
                setAttachments(storedData.attachments.map(createImageAttachmentFromStored))
            }
        }
    }, [])

    useEffect(() => {
        if (message.trim() || attachments.length > 0) {
            savePromptToStorage(message, attachments)
        } else {
            clearPromptFromStorage()
        }
    }, [message, attachments])

    const handleImageFiles = async (files: File[]) => {
        try {
            const newAttachments = await Promise.all(files.map((f) => createImageAttachment(f)))
            setAttachments((prev) => [...prev, ...newAttachments])
        } catch {
            // silent
        }
    }

    const handleRemoveAttachment = (id: string) => {
        setAttachments((prev) => prev.filter((a) => a.id !== id))
    }

    const handleSendMessage = async (
        e: React.FormEvent<HTMLFormElement>,
        attachmentUrls?: Array<{ url: string }>,
    ) => {
        e.preventDefault()
        if (!message.trim() || isLoading) return
        const userMessage = message.trim()
        const currentAttachments = attachmentUrls ?? attachments.map((a) => ({ url: a.dataUrl }))
        clearPromptFromStorage()
        setMessage('')
        setAttachments([])
        setShowChatInterface(true)
        setIsLoading(true)
        await hookHandleSendMessage(userMessage, currentAttachments)
    }

    const handleChatData = async (chatData: { id?: string }) => {
        if (chatData.id) {
            void hookHandleChatData(chatData)
            try {
                await fetch('/api/chat/ownership', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chatId: chatData.id }),
                })
            } catch {
                // non-critical
            }
        }
    }

    const handleStreamingComplete = async (finalContent: string | MessageBinaryFormat) => {
        await hookHandleStreamingComplete(finalContent)
    }

    useEffect(() => {
        if (shouldShowPreview && window.innerWidth < 768) {
            setActivePanel('preview')
        }
    }, [shouldShowPreview])

    // ── AI_CHAT mode ──
    if (chatMode === 'AI_CHAT') {
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
                    <Suspense fallback={null}>
                        <SearchParamsHandler
                            onReset={handleReset}
                            onChatIdChange={handleChatIdChange}
                            onAutoPrompt={handleAutoPrompt}
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
                                                <h3 className="text-base font-medium text-foreground mb-1">Failed to load chat</h3>
                                                <p className="text-sm text-muted-foreground mb-4">
                                                    {chatError instanceof Error ? chatError.message : 'Something went wrong.'}
                                                </p>
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => window.location.reload()}
                                                        className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors')}
                                                    >
                                                        <RotateCw className="w-3.5 h-3.5" /> Retry
                                                    </button>
                                                    <button
                                                        onClick={handleReset}
                                                        className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors')}
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
                                                        chatId={urlChatId ?? hookCurrentChat?.id ?? ''}
                                                        chatType="BUILDER"
                                                        title={chatHistory.find((m) => m.type === 'user')?.content?.toString().slice(0, 60)}
                                                        messages={chatHistory.filter((m) => typeof m.content === 'string').map((m) => ({ role: m.type, content: m.content as string }))}
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
                                                    onSignIn={() => (window.location.href = '/login')}
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

    // ── Mode selection ──
    if (!chatMode) {
        return (
            <div className="bg-background h-[calc(100vh-48px)] flex items-center justify-center">
                <Suspense fallback={null}>
                    <SearchParamsHandler
                        onReset={handleReset}
                        onChatIdChange={handleChatIdChange}
                        onAutoPrompt={handleAutoPrompt}
                    />
                </Suspense>
                <ModeSelection
                    onSelect={(mode) => {
                        if (mode === 'AI_CHAT') router.push('/ai-chat')
                        if (mode === 'BUILDER') setChatMode('BUILDER')
                    }}
                />
            </div>
        )
    }

    // ── Suggestions ──
    const suggestions = [
        {
            label: 'Landing Page',
            text: `Create a modern SaaS landing page.\n\nSections:\n- Hero section with headline, subtext and primary CTA\n- Product screenshot or illustration\n- Features grid (3–6 cards with icons)\n- Pricing section with highlighted recommended plan\n- Testimonials section\n- Conversion-focused footer with links and CTA\n\nDesign Requirements:\n- Clean modern UI\n- Generous whitespace\n- Smooth hover and scroll animations\n- Mobile-first responsive layout`,
            icon: Layout,
        },
        {
            label: 'Task Management',
            text: `Build a task management web application with a Kanban-style interface.\n\nFeatures:\n- Sidebar with projects and filters\n- Columns: Todo, In Progress, Done\n- Draggable task cards between columns\n- Task details with title, description and due date\n- Ability to add, edit and delete tasks\n\nUI Requirements:\n- Clean dashboard layout\n- Card based design\n- Responsive interface`,
            icon: CheckSquare,
        },
        {
            label: 'Dashboard',
            text: `Create an analytics dashboard.\n\nLayout:\n- Left sidebar navigation\n- Top header with search and profile\n\nMain Content:\n- KPI stats cards (Users, Revenue, Growth)\n- Line chart for trends\n- Bar chart for category performance\n- Table for recent activity\n\nDesign:\n- Dark modern UI\n- Clear visual hierarchy\n- Responsive layout`,
            icon: BarChart3,
        },
        {
            label: 'Blog',
            text: `Create a modern blog platform.\n\nPages:\n- Homepage with article cards\n- Article detail page\n- Author profile page\n\nFeatures:\n- Category and tag filtering\n- Search functionality\n- Reading progress indicator\n- Pagination for posts\n\nDesign:\n- Typography-focused layout\n- Clean reading experience\n- Responsive design`,
            icon: FileText,
        },
        {
            label: 'Shop',
            text: `Create an e-commerce store.\n\nPages:\n- Product listing page\n- Product detail page\n- Shopping cart\n- Checkout page\n\nFeatures:\n- Product cards with image, price and rating\n- Add to cart functionality\n- Product variants and quantity selector\n- Order summary and checkout flow\n\nDesign:\n- Clean product grid\n- Mobile responsive layout\n- High-conversion UI patterns`,
            icon: ShoppingCart,
        },
    ]

    // ── BUILDER mode ──
    return (
        <ChatActionsProvider onSendMessage={(msg) => hookHandleSendMessage(msg)}>
            <EnvVariablesPanel open={envPanelOpen} onOpenChange={setEnvPanelOpen} />
            <div className={cn('bg-background flex flex-col', showChatInterface ? 'h-[calc(100vh-48px)] overflow-hidden' : 'min-h-[calc(100vh-48px)]')}>
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
                        onAutoPrompt={handleAutoPrompt}
                    />
                </Suspense>

                {showChatInterface ? (
                    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <ResizableLayout
                            className="flex-1 min-h-0"
                            singlePanelMode={!shouldShowPreview}
                            activePanel={activePanel === 'chat' ? 'left' : 'right'}
                            leftPanel={
                                <div className="flex flex-col h-full">
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
                                            onSignIn={() => (window.location.href = '/login')}
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
                                        onSeoAudit={handleAutoPrompt}
                                    />
                                ) : null
                            }
                        />
                    </div>
                ) : (
                    <div className="max-w-2xl w-full mx-auto flex-1 flex flex-col items-center justify-center px-4">
                        <div className="flex items-center justify-center gap-3 mb-3">
                            <div className="size-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/10 flex items-center justify-center">
                                <BuildifyLogo size="lg" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Buildify</h1>
                        </div>
                        <p className="text-sm text-muted-foreground/60 text-center mb-10">Describe what you want to build</p>

                        <div className="w-full">
                            <PromptInput
                                onSubmit={handleSendMessage}
                                className="w-full"
                                onImageDrop={handleImageFiles}
                                isDragOver={isDragOver}
                                onDragOver={() => setIsDragOver(true)}
                                onDragLeave={() => setIsDragOver(false)}
                                onDrop={() => setIsDragOver(false)}
                            >
                                <PromptInputImagePreview attachments={attachments} onRemove={handleRemoveAttachment} />
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
                                        <PromptInputImageButton onImageSelect={handleImageFiles} disabled={isLoading} />
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
                                            onTranscript={(t) => { setMicError(null); setMessage((p) => p + (p ? ' ' : '') + t) }}
                                            onError={(err) => { setMicError(err); setTimeout(() => setMicError(null), 5000) }}
                                            disabled={isLoading}
                                        />
                                        <PromptInputSubmit disabled={!message.trim() || isLoading} status={isLoading ? 'streaming' : 'ready'} />
                                    </PromptInputTools>
                                </PromptInputToolbar>
                            </PromptInput>
                            {micError && <p className="mt-2 text-xs text-destructive animate-in fade-in">{micError}</p>}
                        </div>

                        <div className="mt-3">
                            <div className="flex flex-wrap items-center justify-center gap-1.5">
                                {suggestions.map((s) => {
                                    const Icon = s.icon
                                    return (
                                        <button
                                            key={s.label}
                                            onClick={() => setMessage(s.text)}
                                            className={cn(
                                                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
                                                'hover:bg-muted/60 border border-border/40 hover:border-border/60',
                                                'text-xs text-muted-foreground hover:text-foreground transition-all duration-200',
                                            )}
                                        >
                                            <Icon className="size-3 shrink-0" />
                                            {s.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

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

            {/* SEO Audit Floating Panel */}
            {(seoAuditLoading || seoAuditResult) && (
                <DraggableSeoPanel
                    loading={seoAuditLoading}
                    result={seoAuditResult}
                    mobileData={mobileData}
                    desktopData={desktopData}
                    onClose={() => {
                        setSeoAuditResult(null)
                        setSeoAuditLoading(false)
                        setMobileData(null)
                        setDesktopData(null)
                        autoPromptFiredRef.current = false
                    }}
                />
            )}
        </ChatActionsProvider>
    )
}
