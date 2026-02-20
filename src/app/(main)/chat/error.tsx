"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

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
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
            <div className="size-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <span className="text-destructive text-lg">!</span>
            </div>
            <h2 className="text-base font-semibold tracking-tight">Chat encountered an error</h2>
            <p className="text-xs text-muted-foreground text-center max-w-sm leading-relaxed">
                Something went wrong. Your conversations are safe.
            </p>
            <div className="flex gap-2 mt-2">
                <Button onClick={reset} size="sm" className="h-8 rounded-lg px-4 text-xs">
                    Retry
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => (window.location.href = "/chat")}
                    className="h-8 rounded-lg px-4 text-xs text-muted-foreground"
                >
                    New Chat
                </Button>
            </div>
        </div>
    )
}
