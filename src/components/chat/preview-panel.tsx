'use client'

import { useEffect, useState, lazy, Suspense } from 'react'


import {
  WebPreview,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
  WebPreviewBody,
} from '@/components/ai-elements/web-preview'

import {
  RefreshCw,
  Maximize,
  Minimize,
  Smartphone,
  Tablet,
  Monitor,
  Code,
  Github,
  FlaskConical,
  Video,
  SearchCheckIcon,
  Loader2,
} from 'lucide-react'

import { CodeViewerDialog } from '@/components/code-viewer/code-viewer'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { TestingLaunchDialog } from '@/components/chat/testing-launch-dialog'


// Lazy-load the GitHub dialog — it's heavy (pulls in React Query hooks, auth client, etc.)
// Only mounted when user actually opens it, never on initial render.
const GithubPushDialog = lazy(() =>
  import('@/components/chat/github-push-dialog').then((m) => ({
    default: m.GithubPushDialog,
  })),
)

/* -------------------- TYPES -------------------- */

interface Chat {
  id: string
  demo?: string
  files?: Array<{ name: string; content: string }>
}

interface PreviewPanelProps {
  currentChat: Chat | null
  isFullscreen: boolean
  setIsFullscreen: (fullscreen: boolean) => void
  isBuilding?: boolean
onSeoAudit?: (prompt: string, chatId: string, mode?: string) => void 
}

type PreviewDevice = 'mobile' | 'tablet' | 'desktop'

const DEVICE_WIDTHS: Record<PreviewDevice, string> = {
  mobile: '375px',
  tablet: '768px',
  desktop: 'calc(100% - 2rem)',
}

/* -------------------- BUILDING LOADER -------------------- */

function BuildingLoader() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-20 h-20">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={cn(
                'absolute left-1/2 -translate-x-1/2 w-6 h-3 rounded bg-blue-500',
                i === 0 && 'bottom-0',
                i === 1 && 'bottom-3',
                i === 2 && 'bottom-6',
              )}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-200">
          Building your app…
        </p>
      </div>
    </div>
  )
}

/* -------------------- PREVIEW PANEL -------------------- */

export function PreviewPanel({
  currentChat,
  isFullscreen,
  setIsFullscreen,
  isBuilding = false,
  onSeoAudit,
}: PreviewPanelProps) {
 
  const [device, setDevice] = useState<PreviewDevice>('desktop')
const [iframeSrc, setIframeSrc] = useState<string | undefined>(currentChat?.demo)
const [videoError, setVideoError] = useState<string | null>(null)
const [videoGenerating, setVideoGenerating] = useState(false)
const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)
  const [isReloading, setIsReloading] = useState(false)
  const [codeDialogOpen, setCodeDialogOpen] = useState(false)
  const [githubDialogOpen, setGithubDialogOpen] = useState(false)
  const [testingDialogOpen, setTestingDialogOpen] = useState(false)

  // Track if dialog has ever been opened — once opened, keep mounted for fast re-open
  const [githubDialogMounted, setGithubDialogMounted] = useState(false)

  const hasFiles = (currentChat?.files?.length ?? 0) > 0


useEffect(() => {
  if (currentChat?.demo) {
    setIframeSrc(currentChat.demo)
  }
}, [currentChat?.demo])

  const effectiveSrc = iframeSrc || currentChat?.demo
const showBuildingLoader = isBuilding && !effectiveSrc



  // keyboard fullscreen toggle (ignore when typing in inputs)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      )
        return
      if (e.key.toLowerCase() === 'f') {
        setIsFullscreen(!isFullscreen)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isFullscreen, setIsFullscreen])

  const openGithubDialog = () => {
    setGithubDialogMounted(true)
    setGithubDialogOpen(true)
  }
//video generation handler
 const handleGenerateVideo = async () => {
  if (!currentChat?.id) return
  setVideoGenerating(true)

  try {
    const res = await fetch('/api/video/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Cinematic seamless looping video background, professional, no text, 16:9, smooth motion.`,
      }),
    })

    const json = await res.json() as {
      taskId?: string
      error?: string
      message?: string
      required?: number
    }

 
    if (res.status === 402 || json.error === 'insufficient_credits') {
      setVideoError(`Not enough credits. You need ${json.required ?? 50} credits to generate a video.`)
      setVideoGenerating(false)
      return
    }

   
    if (json.error === 'generation_failed' || !json.taskId) {
      setVideoError(json.message ?? 'Video generation failed. Credits have been refunded.')
      setVideoGenerating(false)
      return
    }


    const poll = setInterval(async () => {
      const statusRes = await fetch(`/api/video/status?taskId=${json.taskId}`)
      const statusJson = await statusRes.json() as { status?: string; videoUrl?: string }

      if (statusJson.status === 'completed' && statusJson.videoUrl) {
        clearInterval(poll)
        setGeneratedVideoUrl(statusJson.videoUrl)
        setVideoGenerating(false)
        setVideoError(null)
      } else if (statusJson.status === 'failed') {
        clearInterval(poll)
        setVideoError('Video generation failed. Please try again.')
        setVideoGenerating(false)
      }
    }, 3000)

  } catch {
    setVideoError('Something went wrong. Please try again.')
    setVideoGenerating(false)
  }
}

  return (
    <>
      <div
        className={cn(
          'flex flex-col h-full min-h-0 transition-all duration-300',
          isFullscreen && 'fixed inset-0 z-50 bg-white dark:bg-black',
        )}
      >
        <WebPreview defaultUrl={currentChat?.demo ?? ''}>

          {/* ---------------- NAV BAR ---------------- */}
         <WebPreviewNavigation>
          <div className="flex items-center gap-2 flex-1">
  <WebPreviewUrl
    readOnly
    placeholder="Your app will appear here..."
    className="h-8 min-w-0 flex-1 text-xs"
    
value={
  currentChat?.id
    ? `https://buildify.sh/apps/${currentChat.id}`
    : ''
}
  />

</div>

            <div className="flex items-center gap-1 shrink-0 ml-auto">
              <WebPreviewNavigationButton
                tooltip="View source code"
                disabled={!hasFiles}
                onClick={() => setCodeDialogOpen(true)}
              >
                <Code className="h-4 w-4" />
              </WebPreviewNavigationButton>
<WebPreviewNavigationButton
  tooltip="Run SEO Audit"
 onClick={() => {
  if (!currentChat?.id) return
 onSeoAudit?.(
  "seo-audit",
  currentChat.id,
  currentChat?.demo?.includes("three") || currentChat?.demo?.includes("webgl")
    ? "3d"
    : "2d"
)
}}
>
  <SearchCheckIcon className="h-4 w-4" />
</WebPreviewNavigationButton>
              <WebPreviewNavigationButton
                tooltip="Push to GitHub"
                disabled={!hasFiles}
                onClick={openGithubDialog}
              >
                <Github className="h-4 w-4" />
              </WebPreviewNavigationButton>
{/* Video Generate Button */}
<WebPreviewNavigationButton
  tooltip={videoGenerating ? 'Generating video...' : 'Generate AI video background (50 credits)'}
  disabled={!currentChat?.demo || videoGenerating}
  onClick={handleGenerateVideo}
>
  {videoGenerating
    ? <Loader2 className="h-4 w-4 animate-spin" />
    : <Video className="h-4 w-4" />
  }
</WebPreviewNavigationButton>
              {/* Testing button — opens dialog, never navigates directly */}
              <WebPreviewNavigationButton
                tooltip="Run tests"
                onClick={() => setTestingDialogOpen(true)}
              >
                <FlaskConical className="h-4 w-4" />
              </WebPreviewNavigationButton>

              <WebPreviewNavigationButton
                tooltip="Refresh preview"
                disabled={!effectiveSrc}
                onClick={() => {
                  if (!effectiveSrc) return
                  setIsReloading(true)
                  setIframeSrc(`${currentChat!.demo}?reload=${Date.now()}`)
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </WebPreviewNavigationButton>

              <WebPreviewNavigationButton
                tooltip="Mobile view"
                onClick={() => setDevice('mobile')}
                className={device === 'mobile' ? 'bg-muted' : ''}
              >
                <Smartphone className="h-4 w-4" />
              </WebPreviewNavigationButton>

              <WebPreviewNavigationButton
                tooltip="Tablet view"
                onClick={() => setDevice('tablet')}
                className={device === 'tablet' ? 'bg-muted' : ''}
              >
                <Tablet className="h-4 w-4" />
              </WebPreviewNavigationButton>

              <WebPreviewNavigationButton
                tooltip="Desktop view"
                onClick={() => setDevice('desktop')}
                className={device === 'desktop' ? 'bg-muted' : ''}
              >
                <Monitor className="h-4 w-4" />
              </WebPreviewNavigationButton>

              <WebPreviewNavigationButton
                onClick={() => setIsFullscreen(!isFullscreen)}
                tooltip={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                disabled={!currentChat?.demo && !hasFiles}
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </WebPreviewNavigationButton>
            </div>
          </WebPreviewNavigation>

          {/* ---------------- PREVIEW CONTENT ---------------- */}
          <div className="flex-1 min-h-0">
            {effectiveSrc ? (
              <div className="h-full bg-gray-100 dark:bg-black overflow-auto">
                <div className="flex justify-center h-full">
                  <div
                    style={{
                      width: DEVICE_WIDTHS[device],
                      height: '100%',
                      transition: 'width 0.3s ease',
                    }}
                    className="relative bg-white dark:bg-black shadow-md"
                  >
                    <WebPreviewBody
                      key={effectiveSrc}
                      src={effectiveSrc}
                      className="h-full w-full bg-white"
                      onLoad={() => setIsReloading(false)}
                    />

                    {isReloading && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:150ms]" />
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:300ms]" />
                          </div>
                          <p className="text-sm text-white/90">
                            Reloading preview…
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : showBuildingLoader ? (
              <BuildingLoader />
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-black">
                
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  No preview available
                </p>
              </div>
            )}
          </div>

        </WebPreview>
        
      </div>




     
   {/* ── Video Error Modal ── */}
{videoError && (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center">
    {/* backdrop */}
    <div
      className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      onClick={() => setVideoError(null)}
    />
    {/* modal */}
    <div className="relative z-10 w-full max-w-md mx-4 bg-card border border-border rounded-xl shadow-2xl p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
          <span className="text-destructive text-lg">⚠</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Video Generation Failed
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {videoError}
          </p>
        </div>
      </div>
      <div className="flex justify-end mt-5">
        <button
          onClick={() => setVideoError(null)}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

{/* ── Video Ready Modal ── */}
{generatedVideoUrl && (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center">
    {/* backdrop */}
    <div
      className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      onClick={() => setGeneratedVideoUrl(null)}
    />
    {/* modal */}
    <div className="relative z-10 w-full max-w-md mx-4 bg-card border border-border rounded-xl shadow-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          ✨ AI Video Background Ready
        </h3>
        <button
          onClick={() => setGeneratedVideoUrl(null)}
          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-sm"
        >
          ✕
        </button>
      </div>
      <video
        src={generatedVideoUrl}
        autoPlay loop muted playsInline
        className="w-full rounded-lg max-h-48 object-cover"
      />
      <div className="flex gap-2 mt-4">
        <a
          href={generatedVideoUrl}
          download="video-background.mp4"
          className="flex-1 text-center text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Download Video
        </a>
        <button
          onClick={() => setGeneratedVideoUrl(null)}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  </div>
)}


      {/* Code Viewer Dialog */}
      {hasFiles && (
        <CodeViewerDialog
          files={currentChat!.files!}
          open={codeDialogOpen}
          onOpenChange={setCodeDialogOpen}
        />
      )}

      {/* GitHub Push Dialog — lazy loaded, only mounted after first open */}
      {githubDialogMounted && currentChat?.id && (
        <Suspense fallback={null}>
          <GithubPushDialog
            open={githubDialogOpen}
            onOpenChange={setGithubDialogOpen}
            chatId={currentChat.id}
          />
        </Suspense>
      )}

      {/* Testing Launch Dialog — always available, handles its own auth/repo state */}
      {currentChat?.id && (
        <TestingLaunchDialog
          open={testingDialogOpen}
          onOpenChange={setTestingDialogOpen}
          chatId={currentChat.id}
          demoUrl={currentChat.demo}
        />
      )}
    </>
  )
}