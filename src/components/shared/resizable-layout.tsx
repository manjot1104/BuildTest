'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'

interface ResizableLayoutProps {
  leftPanel: React.ReactNode
  rightPanel: React.ReactNode
  defaultLeftWidth?: number
  minLeftWidth?: number
  maxLeftWidth?: number
  className?: string
  singlePanelMode?: boolean
  activePanel?: 'left' | 'right'
}

export function ResizableLayout({
  leftPanel,
  rightPanel,
  defaultLeftWidth = 30,
  minLeftWidth = 20,
  maxLeftWidth = 60,
  className,
  singlePanelMode = false,
  activePanel = 'left',
}: ResizableLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  const updateWidth = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      const newLeftWidth =
        ((clientX - containerRect.left) / containerRect.width) * 100
      const clampedWidth = Math.min(
        Math.max(newLeftWidth, minLeftWidth),
        maxLeftWidth,
      )
      setLeftWidth(clampedWidth)
    },
    [minLeftWidth, maxLeftWidth],
  )

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      updateWidth(e.clientX)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        updateWidth(e.touches[0].clientX)
      }
    }

    const handleEnd = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleEnd)
    document.addEventListener('touchcancel', handleEnd)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleEnd)
      document.removeEventListener('touchcancel', handleEnd)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, updateWidth])

  if (singlePanelMode) {
    return (
      <div ref={containerRef} className={cn('flex flex-col h-full', className)}>
        <div className="flex-1 flex flex-col min-h-0">
          {activePanel === 'left' ? leftPanel : rightPanel}
        </div>
      </div>
    )
  }

  // On mobile, conditionally render to avoid stream duplication
  // On desktop, always render both to prevent iframe remounting
  if (isMobile) {
    return (
      <div ref={containerRef} className={cn('flex h-full', className)}>
        <div className="flex flex-col h-full w-full min-h-0">
          {activePanel === 'left' ? leftPanel : rightPanel}
        </div>
      </div>
    )
  }

  // Desktop: Always render both panels to prevent remounting on resize
  return (
    <div ref={containerRef} className={cn('flex h-full overflow-hidden', className)}>
      <div
        className="flex flex-col min-h-0 min-w-0 overflow-hidden"
        style={{ width: `${leftWidth}%` }}
      >
        {leftPanel}
      </div>

      {/* Resize divider */}
      <div
        className={cn(
          'relative shrink-0 cursor-col-resize select-none',
          'w-1 bg-border dark:bg-input',
          'transition-colors duration-150',
          'hover:bg-primary/50 dark:hover:bg-primary/40',
          isDragging && 'bg-primary dark:bg-primary',
        )}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Wider invisible hit area for easier grabbing */}
        <div className="absolute inset-y-0 -left-1.5 -right-1.5 z-10" />
        {/* Active indicator line */}
        <div
          className={cn(
            'absolute inset-y-0 left-1/2 -translate-x-1/2 w-0 rounded-full',
            'bg-primary transition-all duration-150',
            isDragging && 'w-[3px]',
          )}
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        {rightPanel}
      </div>

      {/* Overlay to prevent iframe from stealing mouse events during drag */}
      {isDragging && (
        <div className="fixed inset-0 z-40 cursor-col-resize" />
      )}
    </div>
  )
}