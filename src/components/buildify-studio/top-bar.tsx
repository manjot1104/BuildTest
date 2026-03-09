'use client'

import React, { useState } from 'react'
import {
  Undo2, Redo2, Eye, Save, Globe, ArrowLeft, Loader2,
  Grid3X3, Copy, Trash2, ChevronDown, Monitor, Tablet, Smartphone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type UseEditorReturn } from './use-editor'
import { type CanvasBackground } from './types'

interface TopBarProps {
  editor: UseEditorReturn
  onBack: () => void
  onSaveDraft: () => void
  onPublish: () => void
  onPreview: () => void
  isSaving: boolean
  isPublishing: boolean
}

export function TopBar({ editor, onBack, onSaveDraft, onPublish, onPreview, isSaving, isPublishing }: TopBarProps) {
  const {
    state, undo, redo, canUndo, canRedo,
    duplicateElements, deleteSelected, setGrid, setCanvasBackground, setDevice,
  } = editor
  const [bgOpen, setBgOpen] = useState(false)
  const bg = state.canvasBackground
  const hasSelection = state.selectedIds.length > 0

  const updBg = (patch: Partial<CanvasBackground>) =>
    setCanvasBackground({ ...bg, ...patch })

  return (
    <div className="relative flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">

      {/* ── Left ── */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Back</span>
        </button>

        <div className="hidden h-5 w-px bg-border sm:block" />

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight">Buildify Studio</span>
          {state.isDirty && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
              <span className="size-1.5 rounded-full bg-amber-500" />
              Unsaved
            </span>
          )}
        </div>
      </div>

      {/* ── Center ── */}
      <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1.5">

        {/* History group */}
        <div className="flex items-center gap-0.5 rounded-lg border border-border/50 bg-muted/40 p-0.5">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <Undo2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <Redo2 className="size-4" />
          </button>
        </div>

        {/* Selection actions (shown only when elements selected) */}
        {hasSelection && (
          <div className="flex items-center gap-0.5 rounded-lg border border-border/50 bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => duplicateElements(state.selectedIds)}
              title="Duplicate (Ctrl+D)"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              <Copy className="size-4" />
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              title="Delete (Del)"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        )}

        {/* Canvas tools group */}
        <div className="flex items-center gap-0.5 rounded-lg border border-border/50 bg-muted/40 p-0.5">
          {/* Grid toggle */}
          <button
            type="button"
            onClick={() => setGrid({ ...state.grid, enabled: !state.grid.enabled })}
            title="Toggle grid"
            className={`rounded-md p-1.5 transition-colors ${
              state.grid.enabled
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-background hover:text-foreground'
            }`}
          >
            <Grid3X3 className="size-4" />
          </button>

          {/* Canvas background picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setBgOpen((o) => !o)}
              title="Canvas background"
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
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
              <span className="hidden text-xs font-medium sm:inline">BG</span>
              <ChevronDown className="size-3" />
            </button>

            {bgOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setBgOpen(false)} />
                <div className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-xl border border-border bg-background p-4 shadow-2xl">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Canvas Background
                  </p>
                  <div className="mb-3 flex gap-1">
                    {(['solid', 'gradient', 'image'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => updBg({ type: t })}
                        className={`flex-1 rounded-lg border py-1.5 text-[11px] font-medium capitalize transition-colors ${
                          bg.type === t
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:bg-accent'
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
                        className="size-8 cursor-pointer rounded-md border border-border"
                      />
                      <input
                        value={bg.color}
                        onChange={(e) => updBg({ color: e.target.value })}
                        className="h-8 flex-1 rounded-md border border-input bg-background px-2 font-mono text-xs"
                        placeholder="#ffffff"
                      />
                    </div>
                  )}

                  {bg.type === 'gradient' && (
                    <div className="flex flex-col gap-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="mb-1 text-[10px] text-muted-foreground">From</p>
                          <input
                            type="color"
                            value={bg.gradientFrom}
                            onChange={(e) => updBg({ gradientFrom: e.target.value })}
                            className="size-8 cursor-pointer rounded-md border border-border"
                          />
                        </div>
                        <div>
                          <p className="mb-1 text-[10px] text-muted-foreground">To</p>
                          <input
                            type="color"
                            value={bg.gradientTo}
                            onChange={(e) => updBg({ gradientTo: e.target.value })}
                            className="size-8 cursor-pointer rounded-md border border-border"
                          />
                        </div>
                      </div>
                      <div>
                        <p className="mb-1.5 text-[10px] text-muted-foreground">Angle: {bg.gradientAngle}°</p>
                        <input
                          type="range" min={0} max={360}
                          value={bg.gradientAngle}
                          onChange={(e) => updBg({ gradientAngle: Number(e.target.value) })}
                          className="w-full accent-primary"
                        />
                      </div>
                      <div
                        className="h-10 rounded-lg"
                        style={{ background: `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientFrom}, ${bg.gradientTo})` }}
                      />
                    </div>
                  )}

                  {bg.type === 'image' && (
                    <div className="flex flex-col gap-2">
                      <input
                        value={bg.imageUrl}
                        onChange={(e) => updBg({ imageUrl: e.target.value })}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                        placeholder="https://... image URL"
                      />
                      {bg.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={bg.imageUrl}
                          alt="bg preview"
                          className="h-16 w-full rounded-lg border border-border object-cover"
                        />
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setBgOpen(false)}
                    className="mt-3 w-full rounded-lg bg-primary/10 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Preview button → opens full real-website preview modal */}
          <button
            type="button"
            onClick={onPreview}
            title="Preview as published website"
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <Eye className="size-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </button>
        </div>
      </div>

      {/* ── Right ── */}
      <div className="flex items-center gap-2">
        {/* Device switcher */}
        <div className="hidden items-center gap-0.5 rounded-lg border border-border/50 bg-muted/40 p-0.5 md:flex">
          {(
            [
              { preset: 'desktop', width: 1440, height: 960,  Icon: Monitor,    title: 'Desktop (1440)' },
              { preset: 'tablet',  width: 768,  height: 1024, Icon: Tablet,     title: 'Tablet (768)' },
              { preset: 'mobile',  width: 390,  height: 844,  Icon: Smartphone, title: 'Mobile (390)' },
            ] as const
          ).map(({ preset, width, height, Icon, title }) => (
            <button
              key={preset}
              type="button"
              title={title}
              onClick={() => setDevice({ preset, width, height })}
              className={`rounded-md p-1.5 transition-colors ${
                state.device.preset === preset
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground'
              }`}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>

        {/* Canvas height control */}
        <div className="hidden items-center gap-1 md:flex">
          <span className="text-[10px] font-medium text-muted-foreground">H</span>
          <input
            type="number"
            min={200}
            step={100}
            value={state.device.height}
            onChange={(e) => {
              const h = parseInt(e.target.value)
              if (!isNaN(h) && h >= 200) {
                setDevice({ ...state.device, preset: 'custom', height: h })
              }
            }}
            className="h-7 w-16 rounded-md border border-border/50 bg-muted/40 px-1.5 text-center font-mono text-xs text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            title="Canvas height (px)"
          />
          <span className="text-[10px] text-muted-foreground">px</span>
        </div>

        <div className="hidden h-5 w-px bg-border md:block" />

        <Button
          size="sm"
          variant="outline"
          onClick={onSaveDraft}
          disabled={isSaving}
          className="h-8 gap-1.5 px-3 text-xs"
        >
          {isSaving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          <span className="hidden sm:inline">Save</span>
        </Button>

        <Button
          size="sm"
          onClick={onPublish}
          disabled={isPublishing || state.elements.length === 0}
          className="h-8 gap-1.5 px-4 text-xs font-semibold shadow-sm"
        >
          {isPublishing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Globe className="size-3.5" />
          )}
          Publish
        </Button>
      </div>
    </div>
  )
}
