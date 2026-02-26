
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
'use client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    AlertDialog,
    AlertDialogContent,
} from '@/components/ui/alert-dialog'
import { useStateMachine } from '@/context/state-machine'
import { useChatHistory } from '@/client-api/query-hooks'
import { X, MessageSquare, ExternalLink, Star } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import React from 'react'

export function ChatHistoryDialog({
    className,
    ...props
}: React.ComponentProps<'div'>) {
    const { historyModal, toggleHistoryModal } = useStateMachine()
    const router = useRouter()
    const { data: chats, isLoading, error } = useChatHistory()
    const [localChats, setLocalChats] = React.useState<any[]>([])

    React.useEffect(() => {
        if (chats) {
            setLocalChats(
                chats.map((chat) => ({
                    ...chat,
                    isStarred: false,
                }))
            )
        }
    }, [chats])

    const handleChatClick = (v0ChatId: string) => {
        router.push(`/chat?chatId=${v0ChatId}`)
        toggleHistoryModal()
    }

    const handleStarToggle = async (
        e: React.MouseEvent,
        chatId: string,
        isStarred: boolean
    ) => {
        e.stopPropagation()

        await fetch('/api/chat/star', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatId,
                isStarred: !isStarred,
            }),
        })

        setLocalChats((prev) =>
            prev.map((chat) =>
                chat.v0ChatId === chatId
                    ? { ...chat, isStarred: !isStarred }
                    : chat
            )
        )
    }

    return (
        <AlertDialog open={historyModal} onOpenChange={toggleHistoryModal}>
            <AlertDialogContent
                className="p-0 gap-0 overflow-hidden border-border/50"
                style={{ width: '95vw', maxWidth: '40rem' }}
            >
                <div className={cn('flex flex-col', className)} {...props}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pt-5 pb-4">
                        <div>
                            <h2 className="text-base font-semibold tracking-tight">Chat History</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Your previous conversations
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-full text-muted-foreground hover:text-foreground"
                            onClick={toggleHistoryModal}
                        >
                            <X className="size-3.5" />
                        </Button>
                    </div>

                    <div className="border-t border-border/40" />

                    {/* Content */}
                    <div className="px-3 py-3">
                        {isLoading && (
                            <div className="flex items-center justify-center py-12">
                                <div className="h-px w-8 bg-border rounded-full overflow-hidden">
                                    <div
                                        className="h-full w-1/2 bg-foreground/20 rounded-full"
                                        style={{
                                            animation: 'shimmer 1.5s ease-in-out infinite',
                                        }}
                                    />
                                </div>
                                <style>{`
                                    @keyframes shimmer {
                                        0%, 100% { transform: translateX(-100%); }
                                        50% { transform: translateX(200%); }
                                    }
                                `}</style>
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center justify-center py-12">
                                <p className="text-xs text-destructive">
                                    Failed to load chat history.
                                </p>
                            </div>
                        )}

                        {!isLoading && !error && chats?.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 gap-2">
                                <div className="size-10 rounded-full bg-muted/50 flex items-center justify-center">
                                    <MessageSquare className="size-5 text-muted-foreground" />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    No conversations yet
                                </p>
                            </div>
                        )}

                        {!isLoading && !error && chats && chats.length > 0 && (
                            <div className="flex flex-col gap-0.5 max-h-[60vh] overflow-y-auto">
                                {localChats.map((chat) => (
                                    <button
                                        key={chat.id}
                                        onClick={() => handleChatClick(chat.v0ChatId)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {chat.title ?? chat.prompt ?? `Chat ${chat.v0ChatId.slice(0, 8)}...`}
                                            </p>
                                            {chat.createdAt && (
                                                <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                                                    {formatDistanceToNow(new Date(chat.createdAt), {
                                                        addSuffix: true,
                                                    })}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {chat.demoUrl && (
                                                <ExternalLink className="size-3.5 text-muted-foreground/40" />
                                            )}
                                            <button
                                                type="button"
                                                onClick={(e) =>
                                                    handleStarToggle(e, chat.v0ChatId, chat.isStarred)
                                                }
                                                className="p-1 rounded-md hover:bg-muted/80 transition-colors"
                                            >
                                                <Star
                                                    className={cn(
                                                        'size-3.5 transition-colors',
                                                        chat.isStarred
                                                            ? 'fill-amber-400 text-amber-400'
                                                            : 'text-muted-foreground/30 group-hover:text-muted-foreground/60'
                                                    )}
                                                />
                                            </button>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    )
}
