'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Layers, PlusSquare, LayoutTemplate } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { useEditor } from './use-editor'
import { Canvas } from './canvas'
import { ElementsPanel } from './elements-panel'
import { LayerManager } from './layer-manager'
import { InspectorPanel } from './inspector-panel'
import { TopBar } from './top-bar'
import { PublishDialog } from './publish-dialog'
import { TemplateBrowser } from './template-browser'
import { type CanvasElement, type CanvasBackground } from './types'

const DRAFT_KEY = 'persona_builder_draft_v2'

type LeftTab = 'elements' | 'layers' | 'templates'

export function PersonaBuilderEditor() {
  const router = useRouter()
  const editor = useEditor()
  const { state, selectedElement, loadLayout } = editor

  // Start on templates tab if no saved draft exists
  const [leftTab, setLeftTab] = useState<LeftTab>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as { elements?: unknown }
        if (Array.isArray(parsed.elements) && parsed.elements.length > 0) return 'elements'
      }
    } catch { /* ignore */ }
    return 'templates'
  })
  const [publishOpen, setPublishOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing] = useState(false)

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as { elements?: unknown; background?: unknown }
        if (Array.isArray(parsed.elements)) {
          loadLayout(
            parsed.elements as Parameters<typeof loadLayout>[0],
            parsed.background as Parameters<typeof loadLayout>[1],
          )
        }
      }
    } catch {
      // ignore
    }
  }, [loadLayout])

  // Handler for applying a template
  const handleApplyTemplate = useCallback((elements: CanvasElement[], background: CanvasBackground) => {
    loadLayout(elements, background)
    setLeftTab('elements')
    toast.success('Template applied — start editing!')
  }, [loadLayout])

  // Auto-save draft every 30s when dirty
  useEffect(() => {
    if (!state.isDirty) return
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ elements: state.elements, background: state.canvasBackground }),
        )
      } catch {
        // ignore
      }
    }, 30_000)
    return () => clearTimeout(timer)
  }, [state.isDirty, state.elements, state.canvasBackground])

  const handleSaveDraft = useCallback(() => {
    setIsSaving(true)
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ elements: state.elements, background: state.canvasBackground }),
      )
      editor.dispatch({ type: 'SET_DIRTY', isDirty: false })
      toast.success('Draft saved')
    } catch {
      toast.error('Failed to save draft')
    } finally {
      setIsSaving(false)
    }
  }, [state.elements, state.canvasBackground, editor])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        editor.undo()
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        editor.redo()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        if (state.selectedIds.length > 0) editor.duplicateElements(state.selectedIds)
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        editor.selectElements(state.elements.map((el) => el.id))
      } else if (e.key === 'Escape') {
        editor.selectElements([])
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedIds.length > 0) {
        e.preventDefault()
        editor.deleteSelected()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSaveDraft()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedIds, state.elements, editor])

  const handleBack = useCallback(() => {
    if (state.isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Leave without saving?')
      if (!confirmed) return
    }
    router.push('/chat')
  }, [state.isDirty, router])

  const multiSelectLabel =
    state.selectedIds.length > 1 ? `${state.selectedIds.length} selected` : null

  // ── Resizable left sidebar ─────────────────────────────────────────────────
  const [leftWidth, setLeftWidth] = useState(224) // 224 = w-56 default
  const leftWidthRef = useRef(224)

  const handleLeftResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = leftWidthRef.current

    const onMouseMove = (ev: MouseEvent) => {
      const next = Math.max(160, Math.min(480, startWidth + ev.clientX - startX))
      leftWidthRef.current = next
      setLeftWidth(next)
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <TopBar
        editor={editor}
        onBack={handleBack}
        onSaveDraft={handleSaveDraft}
        onPublish={() => setPublishOpen(true)}
        isSaving={isSaving}
        isPublishing={isPublishing}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        {!state.isPreview && (
          <aside
            style={{ width: leftWidth }}
            className="relative flex shrink-0 flex-col border-r border-border bg-background"
          >
            <div className="flex border-b border-border">
              <button
                type="button"
                onClick={() => setLeftTab('templates')}
                className={`flex flex-1 items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                  leftTab === 'templates'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutTemplate className="size-3.5" />
                Templates
              </button>
              <button
                type="button"
                onClick={() => setLeftTab('elements')}
                className={`flex flex-1 items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                  leftTab === 'elements'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <PlusSquare className="size-3.5" />
                Elements
              </button>
              <button
                type="button"
                onClick={() => setLeftTab('layers')}
                className={`flex flex-1 items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                  leftTab === 'layers'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Layers className="size-3.5" />
                Layers
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {leftTab === 'templates' ? (
                <TemplateBrowser
                  onApply={handleApplyTemplate}
                  onStartBlank={() => setLeftTab('elements')}
                />
              ) : leftTab === 'elements' ? (
                <ElementsPanel editor={editor} />
              ) : (
                <LayerManager editor={editor} />
              )}
            </div>

            {/* Drag handle */}
            <div
              onMouseDown={handleLeftResizeStart}
              className="absolute right-0 top-0 z-20 h-full w-1 cursor-col-resize bg-transparent transition-colors hover:bg-primary/40 active:bg-primary/60"
              title="Drag to resize"
            />
          </aside>
        )}

        {/* Canvas */}
        <Canvas editor={editor} />

        {/* Right sidebar */}
        {!state.isPreview && (
          <aside className="flex w-64 shrink-0 flex-col border-l border-border bg-background">
            <div className="border-b border-border px-3 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {multiSelectLabel ?? (selectedElement ? selectedElement.type : 'Properties')}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <InspectorPanel element={selectedElement} editor={editor} />
            </div>
          </aside>
        )}
      </div>

      <PublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        elements={state.elements}
        background={state.canvasBackground}
      />
    </div>
  )
}
