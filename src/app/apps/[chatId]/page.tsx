'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ExternalLink, Loader2, RotateCw } from 'lucide-react'

type AppData = {
  demoUrl: string
  title: string | null
}

type AppState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: AppData }

export default function AppPage() {
  const params = useParams<{ chatId: string }>()
  const chatId = params.chatId
  const [state, setState] = useState<AppState>({ status: 'loading' })
  const [iframeLoading, setIframeLoading] = useState(true)

  useEffect(() => {
  console.log("CHAT ID:", chatId)

  if (!chatId) {
    setState({ status: 'error', message: 'No app ID provided.' })
    return
  }

  let cancelled = false

  async function fetchApp() {
    console.log("FETCHING API FOR:", chatId)

    setState({ status: 'loading' })
    try {
      const res = await fetch(`/api/apps/${chatId}`)

        if (!res.ok) {
          if (res.status === 404) {
            setState({
              status: 'error',
              message: 'This app could not be found. It may have been removed or the link is invalid.',
            })
          } else {
            setState({
              status: 'error',
              message: 'Something went wrong while loading this app. Please try again.',
            })
          }
          return
        }

        const data = (await res.json()) as AppData
        if (!cancelled) {
          setState({ status: 'ready', data })
        }
      } catch (_err) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: 'Failed to connect. Please check your internet and try again.',
          })
        }
      }
    }

    void fetchApp()
    return () => {
      cancelled = true
    }
  }, [chatId])

  if (state.status === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading app...</p>
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h1 className="mb-2 text-xl font-semibold text-foreground">
            App Not Available
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">{state.message}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <RotateCw className="h-3.5 w-3.5" />
              Retry
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const { data } = state
  const title = data.title ?? 'Buildify App'

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      {/* Minimal top bar */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b bg-card px-3">
        <Link
          href="/"
          className="text-xs font-semibold text-foreground hover:text-primary transition-colors"
        >
          Buildify
        </Link>
        <span className="max-w-[50%] truncate text-xs text-muted-foreground">
          {title}
        </span>
        <Link
          href={`/chat?chatId=${chatId}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Open Chat
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Iframe container */}
      <div className="relative flex-1">
        {iframeLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Rendering app...
              </p>
            </div>
          </div>
        )}
        <iframe
          src={data.demoUrl}
          title={title}
          className="h-full w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
          onLoad={() => setIframeLoading(false)}
          onError={() => {
            setIframeLoading(false)
            setState({
              status: 'error',
              message: 'Failed to load the app preview. The demo may no longer be available.',
            })
          }}
        />
      </div>
    </div>
  )
}
