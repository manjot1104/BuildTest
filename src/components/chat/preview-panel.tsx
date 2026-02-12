'use client'

import { useEffect, useState } from 'react'
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
} from 'lucide-react'

import { CodeViewerDialog } from '@/components/code-viewer/code-viewer'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

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
}

type PreviewDevice = 'mobile' | 'tablet' | 'desktop'

const DEVICE_WIDTHS: Record<PreviewDevice, string> = {
  mobile: '375px',
  tablet: '768px',
  desktop: '100%',
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
}: PreviewPanelProps) {
  const [device, setDevice] = useState<PreviewDevice>('desktop')
  const [iframeSrc, setIframeSrc] = useState<string | undefined>(undefined)
  const [isReloading, setIsReloading] = useState(false)
  const [codeDialogOpen, setCodeDialogOpen] = useState(false)

  const hasFiles = (currentChat?.files?.length ?? 0) > 0

  useEffect(() => {
    if (currentChat?.demo) {
      setIframeSrc(currentChat.demo)
    }
  }, [currentChat?.demo])

  const showBuildingLoader = isBuilding && !currentChat?.demo

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

  return (
    <>
      <div
        className={cn(
          'flex flex-col h-screen min-h-0 transition-all duration-300',
          isFullscreen && 'fixed inset-0 z-50 bg-white dark:bg-black',
        )}
      >
        <WebPreview defaultUrl={currentChat?.demo ?? ''}>

          {/* ---------------- NAV BAR ---------------- */}
          <WebPreviewNavigation>
            <WebPreviewUrl
              readOnly
              placeholder="Your app will appear here..."
              value={
                currentChat?.id
                  ? `https://ai.buildify.sh/apps/${currentChat.id}`
                  : ''
              }
            />

            <div className="flex items-center gap-1">
              <WebPreviewNavigationButton
                tooltip="View source code"
                disabled={!hasFiles}
                onClick={() => setCodeDialogOpen(true)}
              >
                <Code className="h-4 w-4" />
              </WebPreviewNavigationButton>

              <WebPreviewNavigationButton
                tooltip="Refresh preview"
                disabled={!iframeSrc}
                onClick={() => {
                  if (!iframeSrc) return
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
            {iframeSrc ? (
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
                      key={iframeSrc}
                      src={iframeSrc}
                      className="h-full w-full"
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

      {/* Code Viewer Dialog */}
      {hasFiles && (
        <CodeViewerDialog
          files={currentChat!.files!}
          open={codeDialogOpen}
          onOpenChange={setCodeDialogOpen}
        />
      )}
    </>
  )
}
