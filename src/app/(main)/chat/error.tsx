"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RotateCcw, MessageSquare } from "lucide-react"

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Chat error boundary caught:", error)
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <h2 className="text-lg font-semibold">Chat encountered an error</h2>
      <p className="text-muted-foreground text-center max-w-md text-sm">
        Something went wrong while loading the chat. Your conversations are safe.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset} variant="default">
          <RotateCcw className="mr-2 h-4 w-4" />
          Retry
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            window.location.href = "/chat"
          }}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>
    </div>
  )
}
