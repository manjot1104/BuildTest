'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    AlertDialog,
    AlertDialogContent,
} from '@/components/ui/alert-dialog'
import { X, Star, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { useQuery } from '@tanstack/react-query'

interface StarredChat {
    id: string
    v0_chat_id: string
    conversation_id?: string | null
    title: string | null
    last_message?: string | null
    demo_url: string | null
    created_at: string
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
    const router = useRouter()

    const { data: chats, isLoading, error } = useQuery({
        queryKey: ['starred-chats'],
        queryFn: fetchStarredChats,
        enabled: open,
    })

    const handleChatClick = (chat: any) => {
    if (chat.chat_type === "OPENROUTER") {
        router.push(`/ai-chat?chatId=${chat.conversation_id}`)
    } else {
        router.push(`/chat?chatId=${chat.v0_chat_id}`)
    }

    onOpenChange(false)
}

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent
                className="hk-neon-dialog p-0 gap-0 overflow-hidden rounded-none"
                style={{ width: '95vw', maxWidth: '40rem' }}
            >
                <div className="flex flex-col">
                    {/* Header */}
                    <div className="hk-neon-dialog-header flex items-center justify-between px-5 pt-5 pb-4">
                        <div>
                            <h2 className="hk-neon-dialog-title text-base font-semibold tracking-tight">Starred Chats</h2>
                            <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                                // conversations you marked as important
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hk-neon-close size-7 text-muted-foreground hover:text-foreground"
                            onClick={() => onOpenChange(false)}
                        >
                            <X className="size-3.5" />
                        </Button>
                    </div>

                    {/* Content */}
                    <div className="px-3 py-3">
                        {isLoading && (
                            <div className="flex items-center justify-center py-12">
                                <div className="h-px w-12 overflow-hidden" style={{ background: 'linear-gradient(90deg, transparent, var(--neon-cyan), transparent)' }}>
                                    <div
                                        className="h-full w-1/2"
                                        style={{
                                            background: 'var(--neon-cyan)',
                                            boxShadow: '0 0 8px var(--neon-cyan)',
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
                                <p className="font-mono text-[11px] text-destructive">
                                    // failed to load starred chats
                                </p>
                            </div>
                        )}

                        {!isLoading && !error && chats?.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 gap-2">
                                <div className="hk-neon-empty-icon size-10 flex items-center justify-center">
                                    <Star className="size-5 text-muted-foreground" />
                                </div>
                                <p className="font-mono text-[11px] text-muted-foreground mt-1">
                                    // no starred conversations yet
                                </p>
                            </div>
                        )}

                        {!isLoading && !error && chats && chats.length > 0 && (
                            <div className="flex flex-col gap-0.5 max-h-[60vh] overflow-y-auto">
                                {chats.map((chat) => (
                                    <button
                                      key={chat.conversation_id || chat.v0_chat_id}
                                        onClick={() => handleChatClick(chat)}
                                        className={cn(
                                            "hk-neon-list-item flex items-center gap-3 px-3 py-2.5",
                                            "hover:bg-muted/50 transition-colors text-left group"
                                        )}
                                    >
                                        <Star className="size-3.5 fill-amber-400 text-amber-400 shrink-0" style={{ filter: 'drop-shadow(0 0 3px rgb(251 191 36 / 0.4))' }} />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-mono text-sm font-medium truncate">
                                                {chat.title ?? chat.last_message ?? 'Untitled Chat'}
                                            </p>
                                            {chat.created_at && (
                                                <p className="font-mono text-[10px] text-muted-foreground/60 mt-0.5">
                                                    {formatDistanceToNow(new Date(chat.created_at), {
                                                        addSuffix: true,
                                                    })}
                                                </p>
                                            )}
                                        </div>
                                        {chat.demo_url && (
                                            <ExternalLink className="size-3.5 text-muted-foreground/40 group-hover:text-[var(--neon-cyan)] transition-colors" />
                                        )}
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
