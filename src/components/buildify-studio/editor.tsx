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
import { PreviewModal } from './preview-modal'
import { type CanvasElement, type CanvasBackground } from './types'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const DEFAULT_BACKGROUND: CanvasBackground = {
  type: 'solid',
  color: '#ffffff',
  gradientFrom: '#f8fafc',
  gradientTo: '#f1f5f9',
  gradientAngle: 135,
  imageUrl: '',
}

const LEGACY_DRAFT_KEY = 'buildify_studio_draft_v2'

type LeftTab = 'elements' | 'layers' | 'templates'

interface BuildifyStudioEditorProps {
  /** When provided, load this design from DB and save back to it. */
  designId?: string
}

export function BuildifyStudioEditor({ designId }: BuildifyStudioEditorProps) {
  const router = useRouter()
  const editor = useEditor()
  const { state, selectedElement, loadLayout } = editor

  // Track the DB record id (may differ from prop on first-save of a new design)
  const [currentId, setCurrentId] = useState<string | undefined>(designId)
  const currentIdRef = useRef<string | undefined>(designId)

  // Keep refs to latest state to avoid stale closures in save/publish
  const elementsRef = useRef(state.elements)
  elementsRef.current = state.elements
  const bgRef = useRef(state.canvasBackground)
  bgRef.current = state.canvasBackground

  // Clipboard for copy/paste
  const clipboardRef = useRef<CanvasElement[]>([])

  // ── Tabs ────────────────────────────────────────────────────────────────────
  const [leftTab, setLeftTab] = useState<LeftTab>(() => {
    // Open templates tab for brand-new designs with no draft
    if (designId) return 'elements'
    try {
      const saved = localStorage.getItem(LEGACY_DRAFT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as { elements?: unknown }
        if (Array.isArray(parsed.elements) && parsed.elements.length > 0) return 'elements'
      }
    } catch { /* ignore */ }
    return 'templates'
  })

  const [publishOpen, setPublishOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing] = useState(false)
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null)
  const [designTitle, setDesignTitle] = useState('Untitled')

  // Blank canvas confirmation
  const [blankConfirmOpen, setBlankConfirmOpen] = useState(false)
  // Template apply confirmation
  const [pendingTemplate, setPendingTemplate] = useState<{ elements: CanvasElement[]; background: CanvasBackground } | null>(null)

  // ── Load from DB (if designId provided) ───────────────────────────────────
  useEffect(() => {
    if (designId) {
      // Load from DB
      void fetch(`/api/design/${designId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { layout?: string; background?: string | null; slug?: string | null; title?: string; isPublished?: boolean } | null) => {
          if (!data) return
          try {
            const elements = JSON.parse(data.layout ?? '[]') as CanvasElement[]
            const background = data.background ? (JSON.parse(data.background) as CanvasBackground) : undefined
            loadLayout(elements, background)
          } catch { /* ignore parse errors */ }
          if (data.slug) setPublishedSlug(data.slug)
          if (data.title) setDesignTitle(data.title)
        })
      return
    }
    // No designId — try to migrate from legacy localStorage draft
    try {
      const saved = localStorage.getItem(LEGACY_DRAFT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as { elements?: unknown; background?: unknown }
        if (Array.isArray(parsed.elements)) {
          loadLayout(
            parsed.elements as Parameters<typeof loadLayout>[0],
            parsed.background as Parameters<typeof loadLayout>[1],
          )
        }
      }
    } catch { /* ignore */ }
  }, [designId, loadLayout])

  // ── Save draft to DB ───────────────────────────────────────────────────────
  const isSavingRef = useRef(false)
  const handleSaveDraft = useCallback(async () => {
    if (isSavingRef.current) return // prevent concurrent saves
    isSavingRef.current = true
    setIsSaving(true)
    try {
      const body = {
        title: 'Untitled',
        layout: JSON.stringify(elementsRef.current),
        background: JSON.stringify(bgRef.current),
      }

      if (!currentIdRef.current) {
        // First save — create a new draft
        const res = await fetch('/api/design', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('Failed to create draft')
        const data = (await res.json()) as { id?: string }
        if (data.id) {
          currentIdRef.current = data.id
          setCurrentId(data.id)
          // Update URL so refresh loads the right design
          window.history.replaceState({}, '', `/buildify-studio/${data.id}`)
        }
      } else {
        // Update existing draft
        await fetch(`/api/design/${currentIdRef.current}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      editor.dispatch({ type: 'SET_DIRTY', isDirty: false })
      // Clear legacy localStorage draft after first successful DB save
      localStorage.removeItem(LEGACY_DRAFT_KEY)
      toast.success('Draft saved')
    } catch (err) {
      toast.error('Failed to save draft')
      throw err // Re-throw so callers like onBeforePublish can detect failure
    } finally {
      isSavingRef.current = false
      setIsSaving(false)
    }
  }, [editor])

  // Auto-save: debounce 2s after any change
  useEffect(() => {
    if (!state.isDirty) return
    const timer = setTimeout(() => { void handleSaveDraft() }, 2_000)
    return () => clearTimeout(timer)
  }, [state.isDirty, handleSaveDraft])

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault(); editor.undo()
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault(); editor.redo()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        // Copy selected elements to clipboard ref
        if (state.selectedIds.length > 0) {
          e.preventDefault()
          clipboardRef.current = state.elements.filter((el) => state.selectedIds.includes(el.id))
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        // Paste from clipboard ref
        if (clipboardRef.current.length > 0) {
          e.preventDefault()
          const maxZ = Math.max(...state.elements.map((el) => el.zIndex), 0)
          const copies: CanvasElement[] = clipboardRef.current.map((el, i) => ({
            ...el,
            id: crypto.randomUUID(),
            x: el.x + 30,
            y: el.y + 30,
            zIndex: maxZ + i + 1,
          }))
          for (const copy of copies) {
            editor.dispatch({ type: 'ADD_ELEMENT', element: copy })
          }
          editor.selectElements(copies.map((c) => c.id))
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        if (state.selectedIds.length > 0) editor.duplicateElements(state.selectedIds)
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        editor.selectElements(state.elements.map((el) => el.id))
      } else if (e.key === 'Escape') {
        editor.selectElements([])
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedIds.length > 0) {
        e.preventDefault(); editor.deleteSelected()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); void handleSaveDraft()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedIds, state.elements, editor])

  // ── Back navigation ────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    if (state.isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Leave without saving?')
      if (!confirmed) return
    }
    router.push('/buildify-studio')
  }, [state.isDirty, router])

  // ── Template apply handler ─────────────────────────────────────────────────
  const handleApplyTemplate = useCallback((elements: CanvasElement[], background: CanvasBackground) => {
    if (state.elements.length > 0) {
      // Canvas has content — ask before overwriting
      setPendingTemplate({ elements, background })
    } else {
      loadLayout(elements, background)
      setLeftTab('elements')
      toast.success('Template applied — start editing!')
    }
  }, [loadLayout, state.elements.length])

  // ── Blank canvas handler ───────────────────────────────────────────────────
  const handleStartBlank = useCallback(() => {
    if (state.elements.length > 0) {
      setBlankConfirmOpen(true)
    } else {
      loadLayout([], DEFAULT_BACKGROUND)
      setLeftTab('elements')
    }
  }, [state.elements.length, loadLayout])

  // ── Resizable left sidebar ─────────────────────────────────────────────────
  const [leftWidth, setLeftWidth] = useState(224)
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

  const multiSelectLabel =
    state.selectedIds.length > 1 ? `${state.selectedIds.length} selected` : null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <TopBar
        editor={editor}
        onBack={handleBack}
        onSaveDraft={() => void handleSaveDraft()}
        onPublish={() => setPublishOpen(true)}
        onPreview={() => setPreviewOpen(true)}
        isSaving={isSaving}
        isPublishing={isPublishing}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        {!state.isPreview && (
          <aside
            style={{ width: leftWidth }}
            className="relative flex shrink-0 flex-col border-r border-border bg-card"
          >
            <div className="flex gap-0.5 border-b border-border bg-muted/30 p-1">
              {(
                [
                  { id: 'templates', label: 'Templates', Icon: LayoutTemplate },
                  { id: 'elements', label: 'Elements', Icon: PlusSquare },
                  { id: 'layers', label: 'Layers', Icon: Layers },
                ] as const
              ).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLeftTab(id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[11px] font-medium transition-all ${
                    leftTab === id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {leftTab === 'templates' ? (
                <TemplateBrowser
                  onApply={handleApplyTemplate}
                  onStartBlank={handleStartBlank}
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
          <aside className="flex w-64 shrink-0 flex-col border-l border-border bg-card">
            <div className="border-b border-border bg-muted/30 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
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
        designId={currentId}
        onBeforePublish={handleSaveDraft}
        initialSlug={publishedSlug ?? undefined}
        initialTitle={designTitle}
        onPublished={(slug) => setPublishedSlug(slug)}
      />

      {/* Real-website preview modal */}
      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        elements={state.elements}
        background={state.canvasBackground}
      />

      {/* Blank canvas confirmation */}
      <AlertDialog open={blankConfirmOpen} onOpenChange={setBlankConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start with a blank canvas?</AlertDialogTitle>
            <AlertDialogDescription>
              You have elements on the canvas. Choose what to do with your current work before clearing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-muted text-foreground hover:bg-muted/80"
              onClick={() => {
                void handleSaveDraft().then(() => {
                  loadLayout([], DEFAULT_BACKGROUND)
                  setLeftTab('elements')
                })
              }}
            >
              Save & Clear
            </AlertDialogAction>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                loadLayout([], DEFAULT_BACKGROUND)
                setLeftTab('elements')
              }}
            >
              Discard & Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Template apply confirmation */}
      <AlertDialog open={!!pendingTemplate} onOpenChange={(o) => { if (!o) setPendingTemplate(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply this template?</AlertDialogTitle>
            <AlertDialogDescription>
              You have existing elements on the canvas. Applying a template will replace them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingTemplate(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-muted text-foreground hover:bg-muted/80"
              onClick={() => {
                void handleSaveDraft().then(() => {
                  if (pendingTemplate) {
                    loadLayout(pendingTemplate.elements, pendingTemplate.background)
                    setLeftTab('elements')
                    toast.success('Template applied — start editing!')
                  }
                  setPendingTemplate(null)
                })
              }}
            >
              Save & Apply
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => {
                if (pendingTemplate) {
                  loadLayout(pendingTemplate.elements, pendingTemplate.background)
                  setLeftTab('elements')
                  toast.success('Template applied — start editing!')
                }
                setPendingTemplate(null)
              }}
            >
              Discard & Apply
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}