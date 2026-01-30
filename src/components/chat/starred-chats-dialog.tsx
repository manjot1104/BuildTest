'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogContent,
} from '@/components/ui/alert-dialog'
import { X, MessageSquare, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { useQuery } from '@tanstack/react-query'

async function fetchStarredChats() {
  const res = await fetch('/api/chat/starred')
  if (!res.ok) throw new Error('Failed to fetch starred chats')
  return res.json()
}

export function StarredChatsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const router = useRouter()

  const { data: chats, isLoading } = useQuery({
    queryKey: ['starred-chats'],
    queryFn: fetchStarredChats,
    enabled: open, // fetch only when dialog opens
  })

  const handleChatClick = (v0ChatId: string) => {
    router.push(`/chat?chatId=${v0ChatId}`)
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="p-0"
        style={{ width: '95vw', maxWidth: '55rem' }}
      >
        <Card className="border-0 shadow-none">
          <CardContent className="p-6 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>

            <div className="flex flex-col gap-4">
              <div className="text-center">
                <h1 className="text-2xl font-bold">Starred Chats</h1>
                <p className="text-muted-foreground">
                  Chats you marked as important
                </p>
              </div>

              {!isLoading && chats?.length === 0 && (
                <p className="text-center text-muted-foreground">
                  No starred chats yet
                </p>
              )}

              <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
                {chats?.map((chat: any) => (
                  <div
                    key={chat.id}
                    onClick={() => handleChatClick(chat.v0_chat_id)}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                  >
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {chat.title ?? 'Untitled Chat'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(chat.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>

                    {chat.demo_url && (
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </AlertDialogContent>
    </AlertDialog>
  )
}
