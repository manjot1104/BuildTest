'use client'
import { toast } from 'sonner'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { X, Star, ExternalLink, Loader2, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { useQuery, useQueryClient } from '@tanstack/react-query'

interface StarredChat {
    id: string
    v0ChatId: string
    conversationId?: string
    title: string | null
    prompt?: string | null
    demoUrl: string | null
    createdAt: string
    type: 'builder' | 'openrouter'
    is_starred?: boolean
    is3D?: boolean
}

async function fetchStarredChats(): Promise<StarredChat[]> {
    const res = await fetch('/api/chat/starred')
    if (!res.ok) throw new Error('Failed to fetch starred chats')
    return res.json() as Promise<StarredChat[]>
}

export function StarredChatsDialog({
    open,
    onOpenChange,
}: {
    open: boolean
    onOpenChange: (v: boolean) => void
}) {
    const [deletingId, setDeletingId] = useState<string | null>(null)
const [confirmOpen, setConfirmOpen] = useState(false)
const [chatToDelete, setChatToDelete] = useState<StarredChat | null>(null)
    const router = useRouter()
    const queryClient = useQueryClient()
    const { data: chats, isLoading, error } = useQuery({
        queryKey: ['starred-chats'],
        queryFn: fetchStarredChats,
        enabled: open,
    })

 const handleChatClick = (chat: StarredChat) => {
    if (chat.type === "openrouter") {
        router.push(`/ai-chat?chatId=${chat.conversationId}`) 
    }
        else if (chat.is3D) {
        router.push(`/chat?chatId=${chat.v0ChatId}&mode=3d`)  
    
    } else {
        router.push(`/chat?chatId=${chat.v0ChatId}`) 
    }
    onOpenChange(false)
}

    const handleStarToggle = async (
        e: React.MouseEvent,
        chat: StarredChat
    ) => {
        e.stopPropagation()

        try {
            if (chat.type === 'openrouter') {
                
                await fetch('/api/openrouter/star', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        conversationId: chat.conversationId || chat.v0ChatId,
                        starred: false,  
                    }),
                })
            } else {
                
                await fetch('/api/chat/star', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                       chatId: chat.v0ChatId, 
                        isStarred: false,
                    }),
                })
            }

            // Refresh
            await queryClient.invalidateQueries({
                queryKey: ['starred-chats'],
                refetchType: 'all'
            })
            toast.success('Chat unstarred')
        } catch (error) {
            console.error('Failed to unstar:', error)
            toast.error('Failed to unstar chat')
        }
    }

 const handleDeleteClick = (e: React.MouseEvent, chat: StarredChat) => {
    e.stopPropagation()
    setChatToDelete(chat)
    setConfirmOpen(true)
}

const confirmDelete = async () => {
    if (!chatToDelete) return

    try {
        const idToDelete = chatToDelete.conversationId || chatToDelete.v0ChatId
        setDeletingId(idToDelete)

        await fetch('/api/chat/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: idToDelete }),
        })

        await queryClient.invalidateQueries({
            queryKey: ['starred-chats'],
            refetchType: 'all'
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

        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent
                className="p-0 gap-0 overflow-hidden rounded-xl border shadow-lg"
                style={{ width: '95vw', maxWidth: '40rem' }}
            >
                <AlertDialogTitle className="sr-only">Starred Chats</AlertDialogTitle>
                <div className="flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b bg-muted/30">
                        <div>
                            <h2 className="text-base font-semibold tracking-tight">Starred Chats</h2>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                Conversations you marked as important
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground rounded-md"
                            onClick={() => onOpenChange(false)}
                        >
                            <X className="size-3.5" />
                        </Button>
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
                                    Failed to load starred chats
                                </p>
                            </div>
                        )}

                        {!isLoading && !error && chats?.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 gap-2">
                                <div className="size-10 flex items-center justify-center bg-muted rounded-full">
                                    <Star className="size-5 text-muted-foreground" />
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    No starred conversations yet
                                </p>
                            </div>
                        )}

                        {!isLoading && !error && chats && chats.length > 0 && (
                            <div className="flex flex-col gap-0.5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {chats.map((chat) => (
                                    <div
                                        key={chat.v0ChatId}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2.5 rounded-lg",
                                            "hover:bg-accent/50 transition-colors text-left group cursor-pointer"
                                        )}
                                        onClick={() => handleChatClick(chat)}
                                    >
                                        <Star className="size-3.5 fill-amber-400 text-amber-400 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 min-w-0">
    <p className="text-sm font-medium truncate">
        {chat.title ?? chat.prompt ?? 'Untitled Chat'}
    </p>
    {chat.is3D && (
    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
    3D
</span>
    )}
</div>
{chat.createdAt && (
    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
        {formatDistanceToNow(new Date(chat.createdAt), {
            addSuffix: true,
        })}
    </p>
)}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleChatClick(chat)
                                            }}
                                            className="p-1.5 rounded-md transition-colors text-muted-foreground/40 hover:text-foreground hover:bg-background border border-transparent hover:border-border/50"
                                            title="Open chat"
                                        >
                                            <ExternalLink className="size-3.5" />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={(e) => handleStarToggle(e, chat)}
                                            className="p-1.5 rounded-md transition-colors text-amber-400 hover:text-amber-500 hover:bg-amber-400/10 border border-transparent hover:border-amber-400/30"
                                            title="Unstar chat"
                                        >
                                            <Star className="size-3.5 fill-amber-400" />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={(e) => handleDeleteClick(e, chat)}
                                            className="p-1.5 rounded-md transition-colors text-muted-foreground/40 hover:text-destructive hover:bg-background border border-transparent hover:border-border/50"
                                            title="Delete chat"
                                        >
                                           {deletingId === (chat.conversationId || chat.v0ChatId) ? (
    <Loader2 className="size-3.5 animate-spin" />
) : (
    <Trash2 className="size-3.5" />
)}
                                        </button>
                                    </div>
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