"use client"

import { Bot, User, Share2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

interface SharedMessage {
  role: string
  content: string
  timestamp?: string
}

export function SharedChatView({
  title,
  messages,
  chatType,
  authorName,
  sharedAt,
}: {
  title: string
  messages: SharedMessage[]
  chatType: string
  authorName: string
  sharedAt: string
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="size-8 rounded-lg">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-sm font-semibold truncate max-w-[300px]">{title}</h1>
              <p className="text-[11px] text-muted-foreground">
                Shared by {authorName} · {formatDistanceToNow(new Date(sharedAt), { addSuffix: true })} · {chatType === "BUILDER" ? "Builder" : "AI Chat"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => {
              void navigator.clipboard.writeText(window.location.href)
            }}
          >
            <Share2 className="size-3" />
            Copy link
          </Button>
        </div>
      </header>

      {/* Messages */}
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className="flex gap-3">
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-lg",
                  msg.role === "user"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {msg.role === "user" ? (
                  <User className="size-3.5" />
                ) : (
                  <Bot className="size-3.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {msg.role === "user" ? "You" : "Assistant"}
                </p>
                <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center">
        <p className="text-xs text-muted-foreground">
          Shared from{" "}
          <Link href="/" className="font-medium text-primary hover:underline">
            Buildify
          </Link>
        </p>
      </footer>
    </div>
  )
}
