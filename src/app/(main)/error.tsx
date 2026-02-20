"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function MainError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error("Main layout error boundary caught:", error)
    }, [error])

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-4">
            <div className="size-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <span className="text-destructive text-lg">!</span>
            </div>
            <h2 className="text-base font-semibold tracking-tight">Something went wrong</h2>
            <p className="text-xs text-muted-foreground text-center max-w-sm leading-relaxed">
                An error occurred while loading this page. Please try again.
            </p>
            <div className="flex gap-2 mt-2">
                <Button onClick={reset} size="sm" className="h-8 rounded-lg px-4 text-xs">
                    Try again
                </Button>
                <Button variant="ghost" size="sm" onClick={() => (window.location.href = "/chat")} className="h-8 rounded-lg px-4 text-xs text-muted-foreground">
                    Go to Chat
                </Button>
            </div>
        </div>
    )
}
