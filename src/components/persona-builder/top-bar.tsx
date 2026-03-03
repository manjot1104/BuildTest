'use client'

import React, { useState } from 'react'
import {
  Undo2, Redo2, Eye, EyeOff, Save, Upload, ArrowLeft, Loader2,
  Grid, Copy, Trash2, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type UseEditorReturn } from './use-editor'
import { type CanvasBackground } from './types'

interface TopBarProps {
  editor: UseEditorReturn
  onBack: () => void
  onSaveDraft: () => void
  onPublish: () => void
  isSaving: boolean
  isPublishing: boolean
}

export function TopBar({
  editor,
  onBack,
  onSaveDraft,
  onPublish,
  isSaving,
  isPublishing,
}: TopBarProps) {
  const {
    state, undo, redo, setPreview, canUndo, canRedo,
    duplicateElements, deleteSelected, setGrid, setCanvasBackground,
  } = editor
  const [bgOpen, setBgOpen] = useState(false)

  const hasSelection = state.selectedIds.length > 0
  const multiSelect = state.selectedIds.length > 1
  const bg = state.canvasBackground

  const updBg = (patch: Partial<CanvasBackground>) =>
    setCanvasBackground({ ...bg, ...patch })

  return (
    <div className="relative flex h-12 shrink-0 items-center justify-between border-b border-border/50 bg-background/95 px-3 backdrop-blur">
      {/* Left */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={onBack}
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Exit</span>
        </Button>

        <div className="hidden h-4 w-px bg-border sm:block" />
        <span className="hidden text-sm font-semibold sm:block">Persona Builder</span>

        {state.isDirty && (
          <span className="hidden rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-600 sm:block">
            Unsaved
          </span>
        )}
      </div>

      {/* Center */}
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={undo} disabled={!canUndo} className="h-8 w-8 p-0" title="Undo (Ctrl+Z)">
          <Undo2 className="size-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={redo} disabled={!canRedo} className="h-8 w-8 p-0" title="Redo (Ctrl+Y)">
          <Redo2 className="size-4" />
        </Button>

        <div className="mx-1 h-4 w-px bg-border" />

        {/* Selection actions */}
        {hasSelection && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => duplicateElements(state.selectedIds)}
              className="h-8 gap-1 px-2 text-xs"
              title="Duplicate (Ctrl+D)"
            >
              <Copy className="size-3.5" />
              {multiSelect && <span className="hidden sm:inline">{state.selectedIds.length}</span>}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={deleteSelected}
              className="h-8 gap-1 px-2 text-xs text-destructive hover:text-destructive"
              title="Delete selected (Del)"
            >
              <Trash2 className="size-3.5" />
            </Button>
            <div className="mx-1 h-4 w-px bg-border" />
          </>
        )}

        {/* Grid toggle */}
        <Button
          size="sm"
          variant={state.grid.enabled ? 'secondary' : 'ghost'}
          onClick={() => setGrid({ ...state.grid, enabled: !state.grid.enabled })}
          className="h-8 gap-1.5 px-2 text-xs"
          title="Toggle grid"
        >
          <Grid className="size-3.5" />
          <span className="hidden sm:inline">Grid</span>
        </Button>

        {state.grid.enabled && (
          <Button
            size="sm"
            variant={state.grid.snap ? 'secondary' : 'ghost'}
            onClick={() => setGrid({ ...state.grid, snap: !state.grid.snap })}
            className="h-8 px-2 text-[10px]"
            title="Snap to grid"
          >
            Snap
          </Button>
        )}

        {/* Canvas background */}
        <div className="relative">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setBgOpen((o) => !o)}
            className="h-8 gap-1.5 px-2 text-xs"
            title="Canvas background"
          >
            <span
              className="size-3.5 rounded-sm border border-white/20"
              style={{
                background:
                  bg.type === 'gradient'
                    ? `linear-gradient(135deg, ${bg.gradientFrom}, ${bg.gradientTo})`
                    : bg.type === 'image' && bg.imageUrl
                    ? `url(${bg.imageUrl}) center/cover`
                    : bg.color,
              }}
            />
            <span className="hidden sm:inline">Background</span>
            <ChevronDown className="size-3" />
          </Button>

          {bgOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setBgOpen(false)} />
              <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-border bg-background p-3 shadow-xl">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Canvas Background</p>

                <div className="mb-2 flex gap-1">
                  {(['solid', 'gradient', 'image'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => updBg({ type: t })}
                      className={`flex-1 rounded border px-2 py-1 text-[10px] capitalize transition-colors ${
                        bg.type === t ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {bg.type === 'solid' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bg.color}
                      onChange={(e) => updBg({ color: e.target.value })}
                      className="size-8 cursor-pointer rounded border border-border"
                    />
                    <input
                      value={bg.color}
                      onChange={(e) => updBg({ color: e.target.value })}
                      className="h-7 flex-1 rounded-md border border-input bg-background px-2 font-mono text-xs"
                      placeholder="#ffffff"
                    />
                  </div>
                )}

                {bg.type === 'gradient' && (
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="mb-1 text-[10px] text-muted-foreground">From</p>
                        <input type="color" value={bg.gradientFrom} onChange={(e) => updBg({ gradientFrom: e.target.value })} className="size-8 cursor-pointer rounded border border-border" />
                      </div>
                      <div>
                        <p className="mb-1 text-[10px] text-muted-foreground">To</p>
                        <input type="color" value={bg.gradientTo} onChange={(e) => updBg({ gradientTo: e.target.value })} className="size-8 cursor-pointer rounded border border-border" />
                      </div>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] text-muted-foreground">Angle: {bg.gradientAngle}°</p>
                      <input
                        type="range" min={0} max={360}
                        value={bg.gradientAngle}
                        onChange={(e) => updBg({ gradientAngle: Number(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div
                      className="h-10 rounded"
                      style={{ background: `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientFrom}, ${bg.gradientTo})` }}
                    />
                  </div>
                )}

                {bg.type === 'image' && (
                  <div className="flex flex-col gap-2">
                    <input
                      value={bg.imageUrl}
                      onChange={(e) => updBg({ imageUrl: e.target.value })}
                      className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs"
                      placeholder="https://... image URL"
                    />
                    {bg.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={bg.imageUrl} alt="bg preview" className="h-16 w-full rounded border border-border object-cover" />
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setBgOpen(false)}
                  className="mt-3 w-full rounded bg-primary/10 py-1 text-[10px] text-primary hover:bg-primary/20"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>

        <div className="mx-1 h-4 w-px bg-border" />

        {/* Preview toggle */}
        <Button
          size="sm"
          variant={state.isPreview ? 'default' : 'ghost'}
          onClick={() => setPreview(!state.isPreview)}
          className="h-8 gap-1.5"
          title="Toggle preview"
        >
          {state.isPreview ? (
            <>
              <EyeOff className="size-4" />
              <span className="hidden sm:inline">Edit</span>
            </>
          ) : (
            <>
              <Eye className="size-4" />
              <span className="hidden sm:inline">Preview</span>
            </>
          )}
        </Button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onSaveDraft}
          disabled={isSaving}
          className="h-8 gap-1.5"
        >
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          <span className="hidden sm:inline">Save</span>
        </Button>

        <Button
          size="sm"
          onClick={onPublish}
          disabled={isPublishing || state.elements.length === 0}
          className="h-8 gap-1.5"
        >
          {isPublishing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          <span className="hidden sm:inline">Publish</span>
        </Button>
      </div>
    </div>
  )
}
