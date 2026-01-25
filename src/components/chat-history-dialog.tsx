'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogContent,
} from '@/components/ui/alert-dialog'
import { useStateMachine } from '@/context/state-machine'
import { useChatHistory } from '@/client-api/query-hooks'
import { X, MessageSquare, ExternalLink, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'

export function ChatHistoryDialog({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const { historyModal, toggleHistoryModal } = useStateMachine()
  const router = useRouter()
  const { data: chats, isLoading, error } = useChatHistory()

  const handleChatClick = (chatId: string) => {
    router.push(`/chat?chatId=${chatId}`)
    toggleHistoryModal()
  }

  return (
    <AlertDialog open={historyModal} onOpenChange={toggleHistoryModal}>
      <AlertDialogContent
        className="p-0"
        style={{ width: '95vw', maxWidth: '55rem' }}
      >
        <div className={cn('flex flex-col gap-6', className)} {...props}>
          <Card className="overflow-hidden border-0 p-0 shadow-none">
            <CardContent className="relative grid w-full p-0">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute bg-background z-10 top-4 right-4"
                onClick={toggleHistoryModal}
              >
                <X className="size-4" />
              </Button>

              <div className="p-6 md:p-8 relative">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-bold">Chat History</h1>
                    <p className="text-muted-foreground text-balance">
                      View and access your previous conversations
                    </p>
                  </div>

                  {isLoading && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-sm text-destructive">
                        Failed to load chat history. Please try again.
                      </p>
                    </div>
                  )}

                  {!isLoading && !error && chats?.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 gap-2">
                      <MessageSquare className="h-12 w-12 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No chat history found
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Start a new conversation to see it here
                      </p>
                    </div>
                  )}

                  {!isLoading && !error && chats && chats.length > 0 && (
                    <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
                      {chats.map((chat) => (
                        <button
                          key={chat.id}
                          onClick={() => handleChatClick(chat.id)}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                        >
                          <div className="flex-shrink-0">
                            <MessageSquare className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {chat.demo
                                ? `Chat ${chat.id.slice(0, 8)}...`
                                : `Chat ${chat.id.slice(0, 8)}...`}
                            </p>
                            {chat.created_at && (
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(chat.created_at), {
                                  addSuffix: true,
                                })}
                              </p>
                            )}
                          </div>
                          {chat.demo && (
                            <div className="flex-shrink-0">
                              <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
