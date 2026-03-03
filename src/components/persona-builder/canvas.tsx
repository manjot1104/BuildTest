'use client'

import React, { useRef, useCallback, useMemo, useEffect } from 'react'
import { ZoomIn, ZoomOut, Maximize, Monitor, Tablet, Smartphone } from 'lucide-react'
import { type UseEditorReturn } from './use-editor'
import { ElementRenderer } from './element-renderer'

interface CanvasProps {
  editor: UseEditorReturn
}

function snapToGrid(value: number, size: number, snap: boolean): number {
  if (!snap) return value
  return Math.round(value / size) * size
}

function getCanvasBg(bg: UseEditorReturn['state']['canvasBackground']): React.CSSProperties {
  if (bg.type === 'gradient') {
    return { background: `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientFrom}, ${bg.gradientTo})` }
  }
  if (bg.type === 'image' && bg.imageUrl) {
    return { backgroundImage: `url(${bg.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  }
  return { backgroundColor: bg.color }
}

const DEVICE_LABELS: Record<string, string> = {
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Mobile',
}

export function Canvas({ editor }: CanvasProps) {
  const {
    state,
    selectElement,
    selectElements,
    toggleSelectElement,
    setZoom,
    setPan,
    updateElement,
  } = editor

  const canvasWidth = state.device.width
  const canvasHeight = state.device.height

  const viewportRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const isPanningRef = useRef(false)
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const rubberBandRef = useRef<HTMLDivElement>(null)
  const rubberBandStartRef = useRef({ vpX: 0, vpY: 0 })
  const isRubberBandRef = useRef(false)

  // Sort elements by zIndex for rendering
  const sortedElements = useMemo(
    () => [...state.elements].sort((a, b) => a.zIndex - b.zIndex),
    [state.elements],
  )

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== viewportRef.current && e.target !== canvasRef.current) return
      if (state.isPreview) return

      // Panning: middle mouse or alt+drag
      if (e.button === 1 || e.altKey) {
        e.preventDefault()
        isPanningRef.current = true
        panStartRef.current = { x: e.clientX, y: e.clientY, panX: state.panX, panY: state.panY }

        const onMouseMove = (ev: MouseEvent) => {
          if (!isPanningRef.current) return
          const dx = ev.clientX - panStartRef.current.x
          const dy = ev.clientY - panStartRef.current.y
          setPan(panStartRef.current.panX + dx, panStartRef.current.panY + dy)
        }
        const onMouseUp = () => {
          isPanningRef.current = false
          document.removeEventListener('mousemove', onMouseMove)
          document.removeEventListener('mouseup', onMouseUp)
        }
        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
        return
      }

      // Rubber-band selection (left click on empty canvas)
      if (e.button === 0) {
        const viewportRect = viewportRef.current!.getBoundingClientRect()
        const startVpX = e.clientX - viewportRect.left
        const startVpY = e.clientY - viewportRect.top

        rubberBandStartRef.current = { vpX: startVpX, vpY: startVpY }
        isRubberBandRef.current = false // only activate after min movement

        const rb = rubberBandRef.current
        if (rb) {
          rb.style.left = `${startVpX}px`
          rb.style.top = `${startVpY}px`
          rb.style.width = '0px'
          rb.style.height = '0px'
          rb.style.display = 'none'
        }

        const onMouseMove = (ev: MouseEvent) => {
          const endVpX = ev.clientX - viewportRect.left
          const endVpY = ev.clientY - viewportRect.top
          const dx = endVpX - startVpX
          const dy = endVpY - startVpY

          if (!isRubberBandRef.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
            isRubberBandRef.current = true
          }

          if (isRubberBandRef.current && rb) {
            rb.style.display = 'block'
            rb.style.left = `${Math.min(startVpX, endVpX)}px`
            rb.style.top = `${Math.min(startVpY, endVpY)}px`
            rb.style.width = `${Math.abs(dx)}px`
            rb.style.height = `${Math.abs(dy)}px`
          }
        }

        const onMouseUp = (ev: MouseEvent) => {
          const endVpX = ev.clientX - viewportRect.left
          const endVpY = ev.clientY - viewportRect.top

          if (rb) rb.style.display = 'none'

          if (!isRubberBandRef.current) {
            // Simple click — deselect all
            selectElements([])
          } else {
            // Rubber-band selection
            const s = stateRef.current
            const selLeft = Math.min(startVpX, endVpX)
            const selTop = Math.min(startVpY, endVpY)
            const selRight = Math.max(startVpX, endVpX)
            const selBottom = Math.max(startVpY, endVpY)

            const canvasLeft = (selLeft - s.panX) / s.zoom
            const canvasTop = (selTop - s.panY) / s.zoom
            const canvasRight = (selRight - s.panX) / s.zoom
            const canvasBottom = (selBottom - s.panY) / s.zoom

            const ids = s.elements
              .filter((el) => !el.hidden && !el.locked)
              .filter(
                (el) =>
                  el.x < canvasRight &&
                  el.x + el.width > canvasLeft &&
                  el.y < canvasBottom &&
                  el.y + el.height > canvasTop,
              )
              .map((el) => el.id)
            selectElements(ids)
          }
          isRubberBandRef.current = false
          document.removeEventListener('mousemove', onMouseMove)
          document.removeEventListener('mouseup', onMouseUp)
        }

        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
      }
    },
    [state.isPreview, state.panX, state.panY, selectElements, setPan],
  )

  // Refs for non-passive wheel handler
  const stateRef = useRef(state)
  stateRef.current = state
  const setZoomRef = useRef(setZoom)
  setZoomRef.current = setZoom
  const setPanRef = useRef(setPan)
  setPanRef.current = setPan

  // Non-passive wheel listener
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const s = stateRef.current

      if (e.ctrlKey || e.metaKey) {
        const rect = viewport.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        const delta = e.deltaY > 0 ? 0.9 : 1.1
        const newZoom = Math.min(Math.max(s.zoom * delta, 0.1), 3)
        const newPanX = mouseX - (mouseX - s.panX) * (newZoom / s.zoom)
        const newPanY = mouseY - (mouseY - s.panY) * (newZoom / s.zoom)
        setZoomRef.current(newZoom)
        setPanRef.current(newPanX, newPanY)
      } else {
        setPanRef.current(s.panX - e.deltaX, s.panY - e.deltaY)
      }
    }

    viewport.addEventListener('wheel', handler, { passive: false })
    return () => viewport.removeEventListener('wheel', handler)
  }, [])

  const fitToView = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const rect = viewport.getBoundingClientRect()
    const scaleX = (rect.width - 80) / canvasWidth
    const scaleY = (rect.height - 80) / canvasHeight
    const zoom = Math.min(scaleX, scaleY, 1)
    const panX = (rect.width - canvasWidth * zoom) / 2
    const panY = (rect.height - canvasHeight * zoom) / 2
    setZoom(zoom)
    setPan(panX, panY)
  }, [setZoom, setPan, canvasWidth, canvasHeight])

  const handleDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      const { snap, size } = state.grid
      updateElement(id, { x: snapToGrid(x, size, snap), y: snapToGrid(y, size, snap) })
    },
    [updateElement, state.grid],
  )

  const handleResizeEnd = useCallback(
    (id: string, x: number, y: number, width: number, height: number) => {
      const { snap, size } = state.grid
      updateElement(id, {
        x: snapToGrid(x, size, snap),
        y: snapToGrid(y, size, snap),
        width: snapToGrid(width, size, snap),
        height: snapToGrid(height, size, snap),
      })
    },
    [updateElement, state.grid],
  )

  const handleContentChange = useCallback(
    (id: string, content: string) => {
      updateElement(id, { content }, true)
    },
    [updateElement],
  )

  const handleElementSelect = useCallback(
    (id: string, addToSelection?: boolean) => {
      if (addToSelection) {
        toggleSelectElement(id)
      } else {
        selectElement(id)
      }
    },
    [selectElement, toggleSelectElement],
  )

  const canvasBgStyle = getCanvasBg(state.canvasBackground)

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[#1a1a2e]">
      {/* Canvas viewport */}
      <div
        ref={viewportRef}
        className="relative flex-1 overflow-hidden"
        onMouseDown={handleCanvasMouseDown}
        style={{ cursor: 'default' }}
      >
        {/* Dot grid background */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: `${20 * state.zoom}px ${20 * state.zoom}px`,
            backgroundPosition: `${state.panX}px ${state.panY}px`,
          }}
        />

        {/* Artboard */}
        <div
          ref={canvasRef}
          style={{
            position: 'absolute',
            width: canvasWidth,
            height: canvasHeight,
            transform: `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`,
            transformOrigin: '0 0',
            ...canvasBgStyle,
            boxShadow: '0 8px 60px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}
        >
          {/* Grid overlay */}
          {state.grid.enabled && !state.isPreview && (
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(99,102,241,0.15) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(99,102,241,0.15) 1px, transparent 1px)
                `,
                backgroundSize: `${state.grid.size}px ${state.grid.size}px`,
                zIndex: 1,
              }}
            />
          )}

          {sortedElements.map((el) => (
            <ElementRenderer
              key={el.id}
              element={el}
              isSelected={state.selectedIds.includes(el.id)}
              isMultiSelect={state.selectedIds.length > 1}
              isPreview={state.isPreview}
              zoom={state.zoom}
              canvasRef={canvasRef}
              onSelect={handleElementSelect}
              onDragEnd={handleDragEnd}
              onResizeEnd={handleResizeEnd}
              onContentChange={handleContentChange}
            />
          ))}

          {/* Empty canvas hint */}
          {!state.isPreview && sortedElements.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <p className="text-lg font-medium">Your canvas is empty</p>
                <p className="mt-1 text-sm">Add elements from the left panel to get started</p>
              </div>
            </div>
          )}
        </div>

        {/* Rubber-band selection rect */}
        <div
          ref={rubberBandRef}
          className="pointer-events-none absolute hidden"
          style={{
            border: '1.5px solid #3b82f6',
            background: 'rgba(59,130,246,0.08)',
            zIndex: 99998,
          }}
        />

        {/* Canvas size / device label */}
        <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-black/60 px-2 py-1 font-mono text-xs text-white/70">
          {DEVICE_LABELS[state.device.preset] ?? 'Custom'} — {canvasWidth}×{canvasHeight}
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-white/10 bg-black/70 px-2 py-1 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setZoom(state.zoom / 1.2)}
          className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
          title="Zoom out"
        >
          <ZoomOut className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          className="min-w-[52px] rounded px-2 py-0.5 font-mono text-xs text-white/80 hover:bg-white/10"
          title="Reset zoom"
        >
          {Math.round(state.zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={() => setZoom(state.zoom * 1.2)}
          className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
          title="Zoom in"
        >
          <ZoomIn className="size-4" />
        </button>
        <div className="mx-1 h-4 w-px bg-white/20" />
        <button
          type="button"
          onClick={fitToView}
          className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
          title="Fit to view"
        >
          <Maximize className="size-4" />
        </button>
        <div className="mx-1 h-4 w-px bg-white/20" />
        {/* Device quick-switch */}
        <button
          type="button"
          onClick={() => editor.setDevice({ preset: 'desktop', width: 1440, height: 960 })}
          className={`rounded p-1 ${state.device.preset === 'desktop' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
          title="Desktop (1440×960)"
        >
          <Monitor className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.setDevice({ preset: 'tablet', width: 768, height: 1024 })}
          className={`rounded p-1 ${state.device.preset === 'tablet' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
          title="Tablet (768×1024)"
        >
          <Tablet className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.setDevice({ preset: 'mobile', width: 390, height: 844 })}
          className={`rounded p-1 ${state.device.preset === 'mobile' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
          title="Mobile (390×844)"
        >
          <Smartphone className="size-4" />
        </button>
      </div>

      {/* Pan hint */}
      {!state.isPreview && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-black/40 px-2 py-1 text-xs text-white/40">
          Alt+drag · Ctrl+scroll · Shift+click multi-select
        </div>
      )}
    </div>
  )
}
