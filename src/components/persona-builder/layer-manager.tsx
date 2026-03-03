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

interface LayerItemProps {
  element: CanvasElement
  index: number
  total: number
  isSelected: boolean
  editor: UseEditorReturn
  onDragStart: (index: number) => void
  onDragOver: (index: number) => void
  onDrop: () => void
}

function LayerItem({ element, index, total, isSelected, editor, onDragStart, onDragOver, onDrop }: LayerItemProps) {
  const Icon = ICON_MAP[element.type] ?? Star
  const label = LABEL_MAP[element.type] ?? element.type
  const { selectElement, updateElement, deleteElement, bringForward, sendBackward } = editor

  const displayName =
    element.type === 'heading' || element.type === 'paragraph' || element.type === 'button'
      ? element.content.slice(0, 22) || label
      : label

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index) }}
      onDrop={onDrop}
      onClick={() => selectElement(element.id)}
      className={`group flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
        isSelected
          ? 'bg-primary/15 text-primary'
          : 'hover:bg-accent'
      }`}
    >
      <GripVertical className="size-3 shrink-0 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100" />
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate text-[11px]">{displayName}</span>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
        <button
          type="button"
          title={element.hidden ? 'Show' : 'Hide'}
          onClick={(e) => { e.stopPropagation(); updateElement(element.id, { hidden: !element.hidden }) }}
          className="rounded p-0.5 hover:bg-black/10"
        >
          {element.hidden ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
        </button>
        <button
          type="button"
          title={element.locked ? 'Unlock' : 'Lock'}
          onClick={(e) => { e.stopPropagation(); updateElement(element.id, { locked: !element.locked }) }}
          className="rounded p-0.5 hover:bg-black/10"
        >
          {element.locked ? <Lock className="size-3" /> : <Unlock className="size-3" />}
        </button>
        <button
          type="button"
          title="Bring forward"
          onClick={(e) => { e.stopPropagation(); bringForward(element.id) }}
          className="rounded p-0.5 hover:bg-black/10"
          disabled={index === total - 1}
        >
          <ChevronUp className="size-3" />
        </button>
        <button
          type="button"
          title="Send backward"
          onClick={(e) => { e.stopPropagation(); sendBackward(element.id) }}
          className="rounded p-0.5 hover:bg-black/10"
          disabled={index === 0}
        >
          <ChevronDown className="size-3" />
        </button>
        <button
          type="button"
          title="Delete"
          onClick={(e) => { e.stopPropagation(); deleteElement(element.id) }}
          className="rounded p-0.5 text-destructive hover:bg-black/10"
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
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Layers ({state.elements.length})
      </p>
      {layersTopToBottom.length === 0 && (
        <p className="py-2 text-center text-xs text-muted-foreground">No layers yet</p>
      )}
      {layersTopToBottom.map(({ el, originalIndex }) => (
        <LayerItem
          key={el.id}
          element={el}
          index={originalIndex}
          total={state.elements.length}
          isSelected={state.selectedIds.includes(el.id)}
          editor={editor}
          onDragStart={setDragFromIndex}
          onDragOver={setDragOverIndex}
          onDrop={handleDrop}
        />
      ))}
    </div>
  )
}
