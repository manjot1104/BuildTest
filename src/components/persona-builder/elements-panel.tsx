'use client'

import React from 'react'
import {
  Heading1, AlignLeft, Image, MousePointerClick, LayoutTemplate, Box,
  Minus, ArrowUpDown, Share2, Play, Star, Menu, ClipboardList, Code2,
} from 'lucide-react'
import { type UseEditorReturn } from './use-editor'
import { type ElementType } from './types'

type IconFC = React.FC<{ className?: string }>

interface ElementDef {
  type: ElementType
  label: string
  icon: IconFC
  desc: string
}

const ELEMENT_GROUPS: { title: string; items: ElementDef[] }[] = [
  {
    title: 'Text',
    items: [
      { type: 'heading',    label: 'Heading',    icon: Heading1 as IconFC,        desc: 'H1–H6 title' },
      { type: 'paragraph',  label: 'Paragraph',  icon: AlignLeft as IconFC,       desc: 'Body text block' },
      { type: 'code-block', label: 'Code Block', icon: Code2 as IconFC,           desc: 'Syntax-highlighted code' },
    ],
  },
  {
    title: 'Media',
    items: [
      { type: 'image',       label: 'Image',       icon: Image as IconFC,         desc: 'Photo or illustration' },
      { type: 'video-embed', label: 'Video',        icon: Play as IconFC,          desc: 'YouTube embed' },
      { type: 'icon',        label: 'Icon',         icon: Star as IconFC,          desc: 'Single icon' },
    ],
  },
  {
    title: 'Interactive',
    items: [
      { type: 'button',       label: 'Button',       icon: MousePointerClick as IconFC, desc: 'Call to action' },
      { type: 'navbar',       label: 'Navbar',        icon: Menu as IconFC,              desc: 'Navigation bar' },
      { type: 'social-links', label: 'Social Links',  icon: Share2 as IconFC,            desc: 'Platform icons' },
      { type: 'form',         label: 'Form',          icon: ClipboardList as IconFC,     desc: 'Contact / signup form' },
    ],
  },
  {
    title: 'Layout',
    items: [
      { type: 'section',   label: 'Section',   icon: LayoutTemplate as IconFC, desc: 'Styled container' },
      { type: 'container', label: 'Container', icon: Box as IconFC,            desc: 'Transparent box' },
      { type: 'divider',   label: 'Divider',   icon: Minus as IconFC,          desc: 'Horizontal rule' },
      { type: 'spacer',    label: 'Spacer',    icon: ArrowUpDown as IconFC,    desc: 'Blank spacing' },
    ],
  },
]

interface ElementsPanelProps {
  editor: Pick<UseEditorReturn, 'addElement'>
}

export function ElementsPanel({ editor }: ElementsPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      {ELEMENT_GROUPS.map(({ title, items }) => (
        <div key={title}>
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {title}
          </p>
          <div className="flex flex-col gap-0.5">
            {items.map(({ type, label, icon: Icon, desc }) => (
              <button
                key={type}
                type="button"
                onClick={() => editor.addElement(type)}
                className="flex items-center gap-2.5 rounded-md border border-transparent px-2 py-2 text-left transition-colors hover:border-border hover:bg-accent"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                  <Icon className="size-3.5" />
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="text-xs font-medium leading-tight">{label}</span>
                  <span className="truncate text-[10px] text-muted-foreground">{desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
