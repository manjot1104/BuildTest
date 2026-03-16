'use client'

import React, { useState } from 'react'
import {
  Heading1, AlignLeft, Image, MousePointerClick, LayoutTemplate, Box,
  Minus, ArrowUpDown, Share2, Play, Star, Menu, ClipboardList, Code2,
  Eye, EyeOff, Lock, Unlock, Trash2, ChevronUp, ChevronDown, GripVertical,
} from 'lucide-react'
import { type UseEditorReturn } from './use-editor'
import { type CanvasElement, type ElementType } from './types'

const ICON_MAP: Record<ElementType, React.FC<{ className?: string }>> = {
  heading: Heading1,
  paragraph: AlignLeft,
  image: Image,
  button: MousePointerClick,
  section: LayoutTemplate,
  container: Box,
  divider: Minus,
  spacer: ArrowUpDown,
  'social-links': Share2,
  'video-embed': Play,
  icon: Star,
  navbar: Menu,
  form: ClipboardList,
  'code-block': Code2,
}

const LABEL_MAP: Record<ElementType, string> = {
  heading: 'Heading',
  paragraph: 'Paragraph',
  image: 'Image',
  button: 'Button',
  section: 'Section',
  container: 'Container',
  divider: 'Divider',
  spacer: 'Spacer',
  'social-links': 'Social Links',
  'video-embed': 'Video',
  icon: 'Icon',
  navbar: 'Navbar',
  form: 'Form',
  'code-block': 'Code',
}

// Color dot per element type to quickly identify layer types
const TYPE_DOT: Record<ElementType, string> = {
  heading: 'bg-blue-500',
  paragraph: 'bg-slate-400',
  'code-block': 'bg-violet-500',
  image: 'bg-emerald-500',
  'video-embed': 'bg-rose-500',
  icon: 'bg-amber-500',
  button: 'bg-violet-500',
  navbar: 'bg-indigo-500',
  'social-links': 'bg-sky-500',
  form: 'bg-orange-500',
  section: 'bg-teal-500',
  container: 'bg-gray-400',
  divider: 'bg-gray-400',
  spacer: 'bg-gray-300',
}

interface LayerItemProps {
  element: CanvasElement
  index: number
  total: number
  isSelected: boolean
  isDragOver: boolean
  editor: UseEditorReturn
  onDragStart: (index: number) => void
  onDragOver: (index: number) => void
  onDrop: () => void
}

function LayerItem({ element, index, total, isSelected, isDragOver, editor, onDragStart, onDragOver, onDrop }: LayerItemProps) {
  const Icon = ICON_MAP[element.type] ?? Star
  const label = LABEL_MAP[element.type] ?? element.type
  const dot = TYPE_DOT[element.type] ?? 'bg-gray-400'
  const { selectElement, updateElement, deleteElement, bringForward, sendBackward } = editor

  const displayName =
    element.type === 'heading' || element.type === 'paragraph' || element.type === 'button'
      ? element.content.slice(0, 24) || label
      : label

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index) }}
      onDrop={onDrop}
      onClick={() => selectElement(element.id)}
      className={`group flex h-9 cursor-pointer items-center gap-2 rounded-lg px-2 transition-all duration-100 ${
        isDragOver ? 'border-t-2 border-primary' : ''
      } ${
        isSelected
          ? 'bg-muted text-primary border-primary/20'
          : 'text-foreground hover:bg-accent'
      } ${element.hidden ? 'opacity-50' : ''}`}
    >
      <GripVertical className="size-3 shrink-0 cursor-grab text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
      <span className={`size-1.5 shrink-0 rounded-full ${dot} ${isSelected ? 'opacity-100' : 'opacity-60'}`} />
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate text-[11px] font-medium">{displayName}</span>

      {/* Always-visible state indicators */}
      <div className="flex shrink-0 items-center gap-0.5">
        {element.locked && <Lock className="size-3 text-muted-foreground/60" />}
        {element.hidden && <EyeOff className="size-3 text-muted-foreground/60" />}
      </div>

      {/* Hover actions */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          title={element.hidden ? 'Show' : 'Hide'}
          onClick={(e) => { e.stopPropagation(); updateElement(element.id, { hidden: !element.hidden }) }}
          className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {element.hidden ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
        </button>
        <button
          type="button"
          title={element.locked ? 'Unlock' : 'Lock'}
          onClick={(e) => { e.stopPropagation(); updateElement(element.id, { locked: !element.locked }) }}
          className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {element.locked ? <Lock className="size-3" /> : <Unlock className="size-3" />}
        </button>
        <button
          type="button"
          title="Bring forward"
          onClick={(e) => { e.stopPropagation(); bringForward(element.id) }}
          className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-20"
          disabled={index === total - 1}
        >
          <ChevronUp className="size-3" />
        </button>
        <button
          type="button"
          title="Send backward"
          onClick={(e) => { e.stopPropagation(); sendBackward(element.id) }}
          className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-20"
          disabled={index === 0}
        >
          <ChevronDown className="size-3" />
        </button>
        <button
          type="button"
          title="Delete"
          onClick={(e) => { e.stopPropagation(); deleteElement(element.id) }}
          className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    </div>
  )
}

interface LayerManagerProps {
  editor: UseEditorReturn
}

export function LayerManager({ editor }: LayerManagerProps) {
  const { state, reorderElements } = editor
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const layersTopToBottom = [...state.elements]
    .map((el, originalIndex) => ({ el, originalIndex }))
    .sort((a, b) => b.el.zIndex - a.el.zIndex)

  const handleDrop = () => {
    if (dragFromIndex !== null && dragOverIndex !== null && dragFromIndex !== dragOverIndex) {
      reorderElements(dragFromIndex, dragOverIndex)
    }
    setDragFromIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="mb-3 flex items-center justify-between px-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Layers
        </p>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {state.elements.length}
        </span>
      </div>

      {layersTopToBottom.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <div className="flex size-10 items-center justify-center rounded-xl border-2 border-dashed border-border">
            <LayoutTemplate className="size-4 text-muted-foreground/50" />
          </div>
          <p className="text-xs text-muted-foreground">No layers yet</p>
          <p className="text-[10px] text-muted-foreground/60">Add elements from the Elements tab</p>
        </div>
      )}

      {layersTopToBottom.map(({ el, originalIndex }) => (
        <LayerItem
          key={el.id}
          element={el}
          index={originalIndex}
          total={state.elements.length}
          isSelected={state.selectedIds.includes(el.id)}
          isDragOver={dragOverIndex === originalIndex}
          editor={editor}
          onDragStart={setDragFromIndex}
          onDragOver={setDragOverIndex}
          onDrop={handleDrop}
        />
      ))}
    </div>
  )
}
