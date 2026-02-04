'use client'
import { useEffect, useState } from 'react'

import {
  WebPreview,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
  WebPreviewBody,
} from '@/components/ai-elements/web-preview'
import { RefreshCw, Maximize, Minimize } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface Chat {
  id: string
  demo?: string
  url?: string
}

interface PreviewPanelProps {
  currentChat: Chat | null
  isFullscreen: boolean
  setIsFullscreen: (fullscreen: boolean) => void
  isBuilding?: boolean
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
              className="absolute left-1/2 -translate-x-1/2 w-6 h-3 rounded bg-blue-500"
              style={{ bottom: i * 12 }}
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
type PreviewVersion = {
  id: string
  label: string
  previewUrl: string
  createdAt: string
}



export function PreviewPanel({
  currentChat,
  isFullscreen,
  setIsFullscreen,
  isBuilding = false,
}: PreviewPanelProps) {
  //const [iframeSrc, setIframeSrc] = useState<string | null>(null)
 const [versions, setVersions] = useState<PreviewVersion[]>([])
  const [activeVersion, setActiveVersion] = useState<PreviewVersion | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const [iframeSrc, setIframeSrc] = useState<string | undefined>(undefined)
  const [isReloading, setIsReloading] = useState(false)
  


  // keep iframe src in sync with chat
  useEffect(() => {
    if (currentChat?.demo) {
      setIframeSrc(currentChat.demo)
    }
  }, [currentChat?.demo])
  const previewUrl = activeVersion?.previewUrl ?? iframeSrc

  // keyboard fullscreen toggle
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f') {
        setIsFullscreen(!isFullscreen)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isFullscreen, setIsFullscreen])

  return (
    <div
      className={cn(
        'flex flex-col h-screen min-h-0 transition-all duration-300',
        isFullscreen && 'fixed inset-0 z-50 bg-white dark:bg-black',
      )}
    >
      <WebPreview
        defaultUrl={currentChat?.demo ?? ''}
        className="flex flex-col flex-1 min-h-0"
      >
        {/* ---------------- NAV BAR ---------------- */}
        <WebPreviewNavigation>
          <WebPreviewNavigationButton
  tooltip="Version history"
  onClick={() => setHistoryOpen(true)}
>
  🕘
</WebPreviewNavigationButton>

          <WebPreviewNavigationButton
            tooltip="Refresh preview"
            disabled={!iframeSrc}
            onClick={() => {
  if (!iframeSrc) return

  //  save current version into history
  const newVersion: PreviewVersion = {
    id: crypto.randomUUID(),
    label: `Version ${versions.length + 1}`,
    previewUrl: iframeSrc,
    createdAt: new Date().toLocaleString(),
  }

  setVersions((prev) => [newVersion, ...prev])
  setActiveVersion(null)

  // 2️⃣ reload preview
  setIsReloading(true)
  setIframeSrc(`${currentChat!.demo}?reload=${Date.now()}`)
}}

          >
            <RefreshCw className="h-4 w-4" />
          </WebPreviewNavigationButton>

          <WebPreviewUrl
            readOnly
            value={
              currentChat?.id
                ? `https://ai.technotribes.com/apps/${currentChat.id}`
                : ''
            }
          />

          <WebPreviewNavigationButton
            tooltip={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            disabled={!iframeSrc}
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </WebPreviewNavigationButton>
        </WebPreviewNavigation>
        {activeVersion && (
  <div className="bg-yellow-100 text-yellow-800 text-xs px-3 py-2 flex justify-between">
    Viewing older version (read-only)
    <button
      className="underline"
      onClick={() => setActiveVersion(null)}
    >
      Back to latest
    </button>
  </div>
)}


        {/* ---------------- PREVIEW BODY ---------------- */}
       {iframeSrc ? (
  <div
    className="relative w-full"
    style={{ height: 'calc(100vh - 56px)' }} 
  >
  {iframeSrc && (
  <WebPreviewBody
  src={previewUrl}
  className="h-full w-full"
  onLoad={() => setIsReloading(false)}
/>

)}


{historyOpen && (
  <div className="fixed inset-0 z-50 flex">
    {/* overlay */}
    <div
      className="flex-1 bg-black/30"
      onClick={() => setHistoryOpen(false)}
    />

    {/* drawer */}
    <div className="w-72 bg-white dark:bg-black border-l p-4">
      <h3 className="text-sm font-semibold mb-3">
        Version History
      </h3>

      <div className="space-y-2">
        {versions.map((v, idx) => (
          <button
            key={v.id}
            className={cn(
              'w-full text-left rounded px-2 py-1 text-sm',
              activeVersion?.id === v.id
                ? 'bg-blue-500 text-white'
                : 'hover:bg-muted'
            )}
            onClick={() => {
              setActiveVersion(v)
              setHistoryOpen(false)
            }}
          >
            <div className="font-medium">
              {idx === 0 ? `${v.label} (Latest)` : v.label}
            </div>
            <div className="text-xs opacity-70">
              {v.createdAt}
            </div>
          </button>
        ))}
      </div>
    </div>
  </div>
)}


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
) : isBuilding ? (

          <BuildingLoader />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-black">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                No preview available
              </p>
              <p className="text-xs text-gray-700/50 dark:text-gray-200/50">
                Start a conversation to see your app here
              </p>
            </div>
          </div>
        )}
      </WebPreview>
    </div>
  )
}
