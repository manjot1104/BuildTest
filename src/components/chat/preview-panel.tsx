'use client'

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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useState } from 'react'

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

type PreviewDevice = 'mobile' | 'tablet' | 'desktop'

const DEVICE_WIDTHS: Record<PreviewDevice, string> = {
  mobile: '375px',
  tablet: '768px',
  desktop: '100%',
}

function BuildingLoader() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
      <div className="flex flex-col items-center gap-8">
        <div className="relative w-24 h-24">
          <motion.div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-2 bg-gray-300 dark:bg-gray-700"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
          />
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-200">
          Building your app…
        </p>
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
  const [device, setDevice] = useState<PreviewDevice>('desktop')
  const showBuildingLoader = isBuilding && !currentChat?.demo

  return (
    <div
      className={cn(
        'flex flex-col h-full transition-all duration-300',
        isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-black' : 'flex-1',
      )}
    >
      <WebPreview defaultUrl={currentChat?.demo ?? ''}>
       
      <WebPreviewNavigation>
  {/* LEFT SIDE */}
  <WebPreviewNavigationButton
    onClick={() => setRefreshKey((prev) => prev + 1)}
    tooltip="Refresh preview"
    disabled={!currentChat?.demo}
  >
    <RefreshCw className="h-4 w-4" />
  </WebPreviewNavigationButton>

  <WebPreviewUrl
    readOnly
    placeholder="Your app will appear here..."
    value={
      currentChat?.id
        ? `https://ai.technotribes.com/apps/${currentChat.id}`
        : ''
    }
  />

  {/* PUSH NEXT ITEMS TO RHS */}
  <div className="ml-auto flex items-center gap-1">
    {/* 📱 Mobile */}
    <WebPreviewNavigationButton
      onClick={() => setDevice('mobile')}
      tooltip="Mobile preview"
      disabled={!currentChat?.demo}
    >
      <Smartphone
        className={cn(
          'h-4 w-4',
          device === 'mobile' && 'text-blue-500',
        )}
      />
    </WebPreviewNavigationButton>

    {/* 📲 Tablet */}
    <WebPreviewNavigationButton
      onClick={() => setDevice('tablet')}
      tooltip="Tablet preview"
      disabled={!currentChat?.demo}
    >
      <Tablet
        className={cn(
          'h-4 w-4',
          device === 'tablet' && 'text-blue-500',
        )}
      />
    </WebPreviewNavigationButton>

    {/* 💻 Desktop */}
    <WebPreviewNavigationButton
      onClick={() => setDevice('desktop')}
      tooltip="Desktop preview"
      disabled={!currentChat?.demo}
    >
      <Monitor
        className={cn(
          'h-4 w-4',
          device === 'desktop' && 'text-blue-500',
        )}
      />
    </WebPreviewNavigationButton>

    {/* Fullscreen */}
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
  </div>
</WebPreviewNavigation>


        {/*  PREVIEW AREA */}
        {currentChat?.demo ? (
         <div className="flex-1 bg-gray-100 dark:bg-black overflow-auto">
  <div className="flex justify-center h-full">
    <div
      style={{
        width: DEVICE_WIDTHS[device],
        height: '100%',
        transition: 'width 0.3s ease',
      }}
      className="bg-white dark:bg-black shadow-md"
    >
      <WebPreviewBody
        key={refreshKey}
        src={currentChat.demo}
        className="h-full w-full"
      />
    </div>
  </div>
</div>

        ) : showBuildingLoader ? (
          <BuildingLoader />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-black">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              No preview available
            </p>
          </div>
        )}
      </WebPreview>
    </div>
  )
}
