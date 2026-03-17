'use client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    AlertDialog,
    AlertDialogContent,
} from '@/components/ui/alert-dialog'
import { X, Star, ExternalLink, Loader2, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { useQuery } from '@tanstack/react-query'

interface StarredChat {
    id: string
    v0ChatId: string
    title: string | null
    prompt?: string | null
    demoUrl: string | null
    createdAt: string
    type: 'builder' | 'openrouter'
}

async function fetchStarredChats(): Promise<StarredChat[]> {
    const res = await fetch('/api/chat/starred')
    if (!res.ok) throw new Error('Failed to fetch starred chats')
    return res.json() as Promise<StarredChat[]>
}
import { useQueryClient } from '@tanstack/react-query'
export function StarredChatsDialog({
    open,
    onOpenChange,
}: {
    open: boolean
    onOpenChange: (v: boolean) => void
}) {
    const router = useRouter()
const queryClient = useQueryClient()
    const { data: chats, isLoading, error } = useQuery({
        queryKey: ['starred-chats'],
        queryFn: fetchStarredChats,
        enabled: open,
    })

    const handleChatClick = (chat: StarredChat) => {
    if (chat.type === "openrouter") {
        router.push(`/ai-chat?chatId=${chat.v0ChatId}`)
    } else {
        router.push(`/chat?chatId=${chat.v0ChatId}`)
    }

    onOpenChange(false)
}
const handleDeleteChat = async (chatId: string) => {
  try {
    await fetch('/api/chat/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId }),
    })

    queryClient.invalidateQueries({ queryKey: ['starred-chats'] })
    toast.success('Chat deleted successfully')
  } catch (error) {
    console.error('Failed to delete chat:', error)
    toast.error('Failed to delete chat')
  }
}

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent
                className="p-0 gap-0 overflow-hidden rounded-xl border shadow-lg"
                style={{ width: '95vw', maxWidth: '40rem' }}
            >
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
                                            <p className="text-sm font-medium truncate">
                                                {chat.title ?? chat.prompt ?? 'Untitled Chat'}
                                            </p>
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
  onClick={(e) => {
    e.stopPropagation()
    handleDeleteChat(chat.v0ChatId)
  }}
  className="p-1.5 rounded-md transition-colors text-muted-foreground/40 hover:text-destructive hover:bg-background border border-transparent hover:border-border/50"
  title="Delete chat"
>
  <Trash2 className="size-3.5" />
</button>


                                    </div>
                                    
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    )
}
