
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
'use client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
    AlertDialog,
    AlertDialogContent,
} from '@/components/ui/alert-dialog'
import { useStateMachine } from '@/context/state-machine'
import { useChatHistory } from '@/client-api/query-hooks'
import { X, MessageSquare, ExternalLink, Star, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import React from 'react'

export function ChatHistoryDialog({
    className,
    ...props
}: React.ComponentProps<'div'>) {
    const { historyModal, toggleHistoryModal } = useStateMachine()
    const [filter, setFilter] = React.useState<"all" | "builder" | "openrouter">("all")
    const router = useRouter()
    const { data: chats, isLoading, error } = useChatHistory(filter)
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

    const handleChatClick = (chat: any) => {
  if (chat.demoUrl) {
    router.push(`/chat?chatId=${chat.v0ChatId}`)
  } else {
    router.push(`/ai-chat?chatId=${chat.v0ChatId}`)
  }

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
                className="p-0 gap-0 overflow-hidden rounded-xl border shadow-lg"
                style={{ width: '95vw', maxWidth: '40rem' }}
            >
                <div className={cn('flex flex-col', className)} {...props}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b bg-muted/30">
                        <div>
                            <h2 className="text-base font-semibold tracking-tight">Chat History</h2>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                Your previous conversations
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground rounded-md"
                            onClick={toggleHistoryModal}
                        >
                            <X className="size-3.5" />
                        </Button>
                    </div>

                    <div className="px-4 pt-3 pb-1 border-b bg-card/50">
  <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
    <SelectTrigger className="h-8 text-xs rounded-md bg-background">
      <SelectValue placeholder="Filter" />
    </SelectTrigger>

    <SelectContent>
      <SelectItem value="all" className="text-xs">All Chats</SelectItem>
      <SelectItem value="builder" className="text-xs">Builder</SelectItem>
      <SelectItem value="openrouter" className="text-xs">AI Chat</SelectItem>
    </SelectContent>
  </Select>
</div>

                    {/* Content */}
                    <div className="px-3 py-3">
                        {isLoading && (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="size-6 animate-spin text-muted-foreground" />
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center justify-center py-12">
                                <p className="text-[11px] text-destructive">
                                    Failed to load chat history
                                </p>
                            </div>
                        )}

                        {!isLoading && !error && chats?.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 gap-2">
                                <div className="size-10 flex items-center justify-center bg-muted rounded-full">
                                    <MessageSquare className="size-5 text-muted-foreground" />
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    No conversations yet
                                </p>
                            </div>
                        )}

                        {!isLoading && !error && chats && chats.length > 0 && (
                            <div className="flex flex-col gap-0.5 max-h-[60vh] overflow-y-auto">
                                {localChats.map((chat) => (
                                    <button
                                        key={chat.id}
                                       onClick={() => handleChatClick(chat)}
                                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left group rounded-lg"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {chat.title ?? chat.prompt ?? `Chat ${chat.v0ChatId.slice(0, 8)}...`}
                                            </p>
                                            {chat.createdAt && (
                                                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                                    {formatDistanceToNow(new Date(chat.createdAt), {
                                                        addSuffix: true,
                                                    })}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                        <button
  type="button"
  onClick={(e) => {
    e.stopPropagation()

    if (chat.demoUrl) {
      router.push(`/chat?chatId=${chat.v0ChatId}`)
    } else {
      router.push(`/ai-chat?chatId=${chat.v0ChatId}`)
    }

    toggleHistoryModal()
  }}

  className="p-1 transition-colors hover:text-foreground"
>
  <ExternalLink className="size-3.5 text-muted-foreground/40" />
</button>
                                            <button
                                                type="button"
                                                onClick={(e) =>
                                                    handleStarToggle(e, chat.v0ChatId, chat.isStarred)
                                                }
                                                className="p-1 transition-colors hover:text-foreground"
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
