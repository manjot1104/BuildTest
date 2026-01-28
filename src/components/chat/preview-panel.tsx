'use client'

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
  refreshKey: number
  setRefreshKey: (key: number | ((prev: number) => number)) => void
  isBuilding?: boolean
}

function BuildingLoader() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
      <div className="flex flex-col items-center gap-8">
        {/* Animated building blocks */}
        <div className="relative w-24 h-24">
          {/* Base platform */}
          <motion.div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-2 bg-gray-300 dark:bg-gray-700 rounded-sm"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.3 }}
          />

          {/* Building blocks */}
          {[0, 1, 2].map((row) => (
            <motion.div
              key={row}
              className="absolute left-1/2 -translate-x-1/2 flex gap-1"
              style={{ bottom: 8 + row * 14 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: 0.3 + row * 0.2,
                repeat: Infinity,
                repeatType: 'reverse',
                repeatDelay: 1.5,
              }}
            >
              {[0, 1, 2 - row].map((block) => (
                <motion.div
                  key={block}
                  className="w-5 h-3 rounded-sm bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    duration: 0.2,
                    delay: 0.3 + row * 0.2 + block * 0.1,
                    repeat: Infinity,
                    repeatType: 'reverse',
                    repeatDelay: 1.5,
                  }}
                />
              ))}
            </motion.div>
          ))}

          {/* Floating particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-blue-400/60 dark:bg-blue-500/60"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${Math.random() * 40}%`,
              }}
              animate={{
                y: [-5, -15, -5],
                opacity: [0.3, 0.8, 0.3],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 2 + Math.random(),
                repeat: Infinity,
                delay: i * 0.3,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        {/* Text */}
        <div className="text-center">
          <motion.p
            className="text-sm font-medium text-gray-700 dark:text-gray-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Building your app
          </motion.p>
          <motion.div
            className="flex items-center justify-center gap-1 mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export function PreviewPanel({
  currentChat,
  isFullscreen,
  setIsFullscreen,
  refreshKey,
  setRefreshKey,
  isBuilding = false,
}: PreviewPanelProps) {
  const showBuildingLoader = isBuilding && !currentChat?.demo

  return (
    <div
      className={cn(
        'flex flex-col h-full transition-all duration-300',
        isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-black' : 'flex-1',
      )}
    >
      <WebPreview
        defaultUrl={currentChat?.demo ?? ''}
        onUrlChange={(url) => {
          // Optional: Handle URL changes if needed
          console.log('Preview URL changed:', url)
        }}
      >
        <WebPreviewNavigation>
          <WebPreviewNavigationButton
            onClick={() => {
              // Force refresh the iframe by updating the refresh key
              setRefreshKey((prev) => prev + 1)
            }}
            tooltip="Refresh preview"
            disabled={!currentChat?.demo}
          >
            <RefreshCw className="h-4 w-4" />
          </WebPreviewNavigationButton>
          <WebPreviewUrl
            readOnly
            placeholder="Your app will appear here..."
            value={currentChat?.id ? `https://ai.technotribes.com/apps/${currentChat.id}` : ''}
          />
          <WebPreviewNavigationButton
            onClick={() => setIsFullscreen(!isFullscreen)}
            tooltip={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            disabled={!currentChat?.demo}
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </WebPreviewNavigationButton>
        </WebPreviewNavigation>
        {currentChat?.demo ? (
          <WebPreviewBody key={refreshKey} src={currentChat.demo} />
        ) : showBuildingLoader ? (
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
