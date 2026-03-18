
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
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useStateMachine } from '@/context/state-machine'
import { useChatHistory } from '@/client-api/query-hooks'
import { X, MessageSquare, ExternalLink, Star, Loader2, Search, ChevronLeft, ChevronRight, FolderOpen } from 'lucide-react'
import { MoveToFolderPopover } from '@/components/chat/move-to-folder-popover'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import React from 'react'

const ITEMS_PER_PAGE = 10

export function ChatHistoryDialog({
    className,
    ...props
}: React.ComponentProps<'div'>) {
    const { historyModal, toggleHistoryModal } = useStateMachine()
    const [filter, setFilter] = React.useState<"all" | "builder" | "openrouter">("all")
    const [searchQuery, setSearchQuery] = React.useState("")
    const [page, setPage] = React.useState(1)
    const router = useRouter()
    const { data: result, isLoading, error } = useChatHistory(filter, page, ITEMS_PER_PAGE)
    const chats = result?.data
    const totalPages = result?.totalPages ?? 1
    const totalItems = result?.totalItems ?? 0
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

    // Reset page when filter changes
    React.useEffect(() => {
        setPage(1)
    }, [filter])

    const handleChatClick = (chat: any) => {
  if (chat.type === 'builder') {
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

    const filteredChats = localChats.filter((chat) => {
        if (!searchQuery.trim()) return true
        const query = searchQuery.toLowerCase()
        const title = (chat.title ?? chat.prompt ?? chat.v0ChatId ?? '').toLowerCase()
        return title.includes(query)
    })

    return (
        <AlertDialog open={historyModal} onOpenChange={toggleHistoryModal}>
            <AlertDialogContent
                className="p-0 gap-0 overflow-hidden rounded-xl border shadow-lg"
                style={{ width: '95vw', maxWidth: '40rem' }}
            >
                <AlertDialogTitle className="sr-only">Chat History</AlertDialogTitle>
                <div className={cn('flex flex-col', className)} {...props}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b bg-muted/20">
                        <div>
                            <h2 className="text-base font-semibold tracking-tight text-foreground">Chat History</h2>
                            <p className="text-xs text-muted-foreground/70 mt-0.5">
                                Your previous conversations
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                            onClick={toggleHistoryModal}
                        >
                            <X className="size-4" />
                        </Button>
                    </div>

                    <div className="px-6 py-3 border-b bg-muted/5">
  <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
    <SelectTrigger className="h-9 text-xs rounded-lg bg-background border-border/50 hover:border-border transition-colors">
      <SelectValue placeholder="Filter" />
    </SelectTrigger>

    <SelectContent className="rounded-xl border-border/50 shadow-xl">
      <SelectItem value="all" className="text-xs focus:bg-accent/50 rounded-md mx-1 my-0.5">All Chats</SelectItem>
      <SelectItem value="builder" className="text-xs focus:bg-accent/50 rounded-md mx-1 my-0.5">Builder</SelectItem>
      <SelectItem value="openrouter" className="text-xs focus:bg-accent/50 rounded-md mx-1 my-0.5">AI Chat</SelectItem>
    </SelectContent>
  </Select>
</div>

                    {/* Search */}
                    <div className="px-6 py-3 border-b bg-muted/5">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50" />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-9 pl-9 pr-3 text-xs rounded-lg bg-background border border-border/50 hover:border-border focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition-colors placeholder:text-muted-foreground/40"
                            />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-2 py-3">
                        {isLoading && (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="size-5 animate-spin text-muted-foreground/50" />
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center justify-center py-20">
                                <p className="text-xs text-destructive/80 font-medium">
                                    Failed to load chat history
                                </p>
                            </div>
                        )}

                        {!isLoading && !error && totalItems === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <div className="size-12 flex items-center justify-center bg-muted/30 rounded-2xl border border-border/50">
                                    <MessageSquare className="size-6 text-muted-foreground/40" />
                                </div>
                                <p className="text-xs text-muted-foreground/60 font-medium">
                                    No conversations yet
                                </p>
                            </div>
                        )}

                        {!isLoading && !error && filteredChats.length > 0 && (
                            <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
                                {filteredChats.map((chat) => (
                                    <div
                                        key={chat.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => handleChatClick(chat)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleChatClick(chat) }}
                                        className="flex items-center gap-4 px-4 py-3 hover:bg-accent/40 transition-all text-left group rounded-xl border border-transparent hover:border-border/40 cursor-pointer"
                                    >
                                        <div className="size-8 rounded-lg bg-muted/40 flex items-center justify-center shrink-0 group-hover:bg-background transition-colors border border-border/20">
                                            <MessageSquare className="size-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate text-foreground/90 group-hover:text-foreground transition-colors">
                                                {chat.title ?? chat.prompt ?? `Chat ${chat.v0ChatId.slice(0, 8)}...`}
                                            </p>
                                            {chat.createdAt && (
                                                <p className="text-[10px] text-muted-foreground/50 mt-1 font-medium">
                                                    {formatDistanceToNow(new Date(chat.createdAt), {
                                                        addSuffix: true,
                                                    })}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    if (chat.type === 'builder') {
                                                        router.push(`/chat?chatId=${chat.v0ChatId}`)
                                                    } else {
                                                        router.push(`/ai-chat?chatId=${chat.v0ChatId}`)
                                                    }
                                                    toggleHistoryModal()
                                                }}
                                                className="p-1.5 rounded-md transition-colors text-muted-foreground/40 hover:text-foreground hover:bg-background border border-transparent hover:border-border/50"
                                                title="Open chat"
                                            >
                                                <ExternalLink className="size-3.5" />
                                            </button>
                                            <MoveToFolderPopover chatId={chat.v0ChatId} currentFolderId={chat.folderId}>
                                              <button
                                                type="button"
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-1.5 rounded-md transition-colors text-muted-foreground/40 hover:text-foreground hover:bg-background border border-transparent hover:border-border/50"
                                                title="Move to folder"
                                              >
                                                <FolderOpen className="size-3.5" />
                                              </button>
                                            </MoveToFolderPopover>
                                            <button
                                                type="button"
                                                onClick={(e) =>
                                                    handleStarToggle(e, chat.v0ChatId, chat.isStarred)
                                                }
                                                className={cn(
                                                    "p-1.5 rounded-md transition-all border border-transparent hover:border-border/50",
                                                    chat.isStarred ? "text-amber-400 bg-amber-400/5 border-amber-400/20" : "text-muted-foreground/40 hover:text-amber-400 hover:bg-background"
                                                )}
                                                title={chat.isStarred ? "Unstar" : "Star"}
                                            >
                                                <Star
                                                    className={cn(
                                                        'size-3.5 transition-transform group-hover/star:scale-110',
                                                        chat.isStarred ? 'fill-amber-400' : ''
                                                    )}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!isLoading && !error && searchQuery.trim() && filteredChats.length === 0 && totalItems > 0 && (
                            <div className="flex flex-col items-center justify-center py-12 gap-2">
                                <Search className="size-5 text-muted-foreground/30" />
                                <p className="text-xs text-muted-foreground/60 font-medium">
                                    No matches found
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {!isLoading && !error && totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/10">
                            <p className="text-[10px] text-muted-foreground/60 font-medium">
                                Page {page} of {totalPages}
                            </p>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 rounded-md"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                >
                                    <ChevronLeft className="size-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 rounded-md"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                >
                                    <ChevronRight className="size-3.5" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </AlertDialogContent>
        </AlertDialog>
    )
}
