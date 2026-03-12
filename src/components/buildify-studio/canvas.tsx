'use client'

import React, { useRef, useCallback, useMemo, useEffect } from 'react'
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react'
import { type UseEditorReturn } from './use-editor'
import { ElementRenderer } from './element-renderer'
import { computeResponsiveLayout } from './types'

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
    activeDevice,
    selectElement,
    selectElements,
    toggleSelectElement,
    setZoom,
    setPan,
    updateElementResponsive,
    setDevice,
  } = editor

  const canvasWidth = state.device.width

  const viewportRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const isPanningRef = useRef(false)
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const rubberBandRef = useRef<HTMLDivElement>(null)
  const rubberBandStartRef = useRef({ vpX: 0, vpY: 0 })
  const isRubberBandRef = useRef(false)

  // Compute responsive layout (auto-reflow for tablet/mobile) and sort by zIndex
  const sortedElements = useMemo(() => {
    const layout = computeResponsiveLayout(state.elements, activeDevice)
    return [...layout].sort((a, b) => a.zIndex - b.zIndex)
  }, [state.elements, activeDevice])

  // Auto-extend canvas height when reflowed elements exceed the preset height
  const canvasHeight = useMemo(() => {
    const baseHeight = state.device.height
    if (sortedElements.length === 0) return baseHeight
    const maxBottom = sortedElements.reduce(
      (max, el) => Math.max(max, el.y + el.height),
      0,
    )
    return Math.max(baseHeight, maxBottom + 40)
  }, [state.device.height, sortedElements])

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

            const ids = sortedRef.current
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

  // Keep a ref to the computed layout for rubber-band selection
  const sortedRef = useRef(sortedElements)
  sortedRef.current = sortedElements

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
      updateElementResponsive(id, { x: snapToGrid(x, size, snap), y: snapToGrid(y, size, snap) })
    },
    [updateElementResponsive, state.grid],
  )

  const handleResizeEnd = useCallback(
    (id: string, x: number, y: number, width: number, height: number) => {
      const { snap, size } = state.grid
      updateElementResponsive(id, {
        x: snapToGrid(x, size, snap),
        y: snapToGrid(y, size, snap),
        width: snapToGrid(width, size, snap),
        height: snapToGrid(height, size, snap),
      })
    },
    [updateElementResponsive, state.grid],
  )

  const handleContentChange = useCallback(
    (id: string, content: string) => {
      updateElementResponsive(id, { content }, true)
    },
    [updateElementResponsive],
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

  // Bottom-edge resize handle for canvas height
  const handleHeightResize = useCallback(
    (e: React.MouseEvent) => {
      if (state.isPreview) return
      e.preventDefault()
      e.stopPropagation()
      const startY = e.clientY
      const startHeight = state.device.height
      const zoom = state.zoom

      const onMouseMove = (ev: MouseEvent) => {
        const delta = (ev.clientY - startY) / zoom
        const newHeight = Math.max(200, Math.round(startHeight + delta))
        setDevice({ ...state.device, preset: 'custom', height: newHeight })
      }
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = ''
      }
      document.body.style.cursor = 'ns-resize'
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [state.isPreview, state.device, state.zoom, setDevice],
  )

  const canvasBgStyle = getCanvasBg(state.canvasBackground)

 return (
  <div className="relative flex flex-1 flex-col overflow-auto bg-[#141416]">
      {/* Canvas viewport */}
      <div
        ref={viewportRef}
       className="relative flex-1 overflow-auto"
        onMouseDown={handleCanvasMouseDown}
        style={{ cursor: 'default' }}
      >
        {/* Dot grid background */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)`,
            backgroundSize: `${20 * state.zoom}px ${20 * state.zoom}px`,
            backgroundPosition: `${state.panX}px ${state.panY}px`,
          }}
        />

        {/* Artboard */}
        <div
          ref={canvasRef}
          data-builder-canvas
          style={{
            position: 'absolute',
            width: canvasWidth,
            height: canvasHeight,
            transform: `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`,
            transformOrigin: '0 0',
            ...canvasBgStyle,
            boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 20px 80px rgba(0,0,0,0.5)',
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
              <div className="flex flex-col items-center gap-4 text-center">
                <div
                  className="flex size-16 items-center justify-center rounded-2xl border-2 border-dashed"
                  style={{ borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)' }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                <div>
                  <p className="text-base font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Start designing
                  </p>
                  <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    Pick a template or add elements from the left panel
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bottom resize handle */}
          {!state.isPreview && (
            <div
              onMouseDown={handleHeightResize}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                height: 8,
                cursor: 'ns-resize',
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 4,
                  borderRadius: 2,
                  background: 'rgba(99,102,241,0.5)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'rgba(99,102,241,0.9)' }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'rgba(99,102,241,0.5)' }}
              />
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
          {DEVICE_LABELS[state.device.preset] ?? 'Custom'} — {canvasWidth}×{Math.round(canvasHeight)}
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-white/10 bg-black/75 px-1.5 py-1 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setZoom(state.zoom / 1.2)}
          className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          title="Zoom out"
        >
          <ZoomOut className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          className="min-w-[48px] rounded-lg px-2 py-1 font-mono text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          title="Reset to 100%"
        >
          {Math.round(state.zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={() => setZoom(state.zoom * 1.2)}
          className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          title="Zoom in"
        >
          <ZoomIn className="size-3.5" />
        </button>
        <div className="mx-0.5 h-4 w-px bg-white/15" />
        <button
          type="button"
          onClick={fitToView}
          className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          title="Fit to view (F)"
        >
          <Maximize className="size-3.5" />
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