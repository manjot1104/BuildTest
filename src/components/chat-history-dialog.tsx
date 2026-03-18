
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
'use client'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
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
import { X, MessageSquare, ExternalLink, Star, Loader2, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import React from 'react'
import { useState } from 'react'

export function ChatHistoryDialog({
    className,
    ...props
}: React.ComponentProps<'div'>) {
    const queryClient = useQueryClient()
    const [deletingId, setDeletingId] = useState<string | null>(null)
const [confirmOpen, setConfirmOpen] = useState(false)
const [chatToDelete, setChatToDelete] = useState<string | null>(null)
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
const handleDeleteClick = (e: React.MouseEvent, chat: any) => {
  e.stopPropagation()
  setChatToDelete(chat.v0ChatId || chat.id)
  setConfirmOpen(true)
}

const confirmDelete = async () => {
  if (!chatToDelete) return

  try {
    setDeletingId(chatToDelete)

    await fetch('/api/chat/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: chatToDelete }),
    })

    setLocalChats((prev) =>
      prev.filter((chat) => chat.v0ChatId !== chatToDelete)
    )
 await queryClient.refetchQueries({
  queryKey: ['chat-history']
})

    toast.success('Chat deleted successfully')
  } catch (error) {
    console.error('Failed to delete chat:', error)
    toast.error('Failed to delete chat')
  } finally {
    setDeletingId(null)
    setConfirmOpen(false)
    setChatToDelete(null)
  }
}
    return (
        <>
        <AlertDialog open={historyModal} onOpenChange={toggleHistoryModal}>
            <AlertDialogContent
                className="p-0 gap-0 overflow-hidden rounded-xl border shadow-lg"
                style={{ width: '95vw', maxWidth: '40rem' }}
            >
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

                        {!isLoading && !error && chats?.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <div className="size-12 flex items-center justify-center bg-muted/30 rounded-2xl border border-border/50">
                                    <MessageSquare className="size-6 text-muted-foreground/40" />
                                </div>
                                <p className="text-xs text-muted-foreground/60 font-medium">
                                    No conversations yet
                                </p>
                            </div>
                        )}

                        {!isLoading && !error && chats && chats.length > 0 && (
                            <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
                                {localChats.map((chat) => (
                                    <button
                                        key={chat.id}
                                       onClick={() => handleChatClick(chat)}
                                        className="flex items-center gap-4 px-4 py-3 hover:bg-accent/40 transition-all text-left group rounded-xl border border-transparent hover:border-border/40"
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
                                                    console.log('Chat object:', chat) 
    console.log('ID being sent:', chat.v0ChatId || chat.id)  
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
                                       <button
  type="button"
  
  onClick={(e) => handleDeleteClick(e, chat)}  
  className="p-1.5 rounded-md transition-colors text-muted-foreground/40 hover:text-destructive hover:bg-background border border-transparent hover:border-border/50"
  title="Delete chat"
>
  {deletingId === (chat.v0ChatId || chat.id) ? (
    <Loader2 className="size-3.5 animate-spin" />
  ) : (
    <Trash2 className="size-3.5" />
  )}
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

<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
  <AlertDialogContent className="max-w-xs">
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Delete chat?</h3>
      <p className="text-xs text-muted-foreground">
        This action cannot be undone.
      </p>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmOpen(false)}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={confirmDelete}
          disabled={!!deletingId}
        >
          {deletingId ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            "Delete"
          )}
        </Button>
      </div>
    </div>
  </AlertDialogContent>
</AlertDialog>


        </>
    )
}
