'use client'

import React, { useState } from 'react'
import {
  Heading1, AlignLeft, Image, MousePointerClick, LayoutTemplate, Box,
  Minus, ArrowUpDown, Share2, Play, Star, Menu, ClipboardList, Code2,
  Layout, Layers,
} from 'lucide-react'
import { type UseEditorReturn } from './use-editor'
import { type ElementType } from './types'
import { BLOCKS, BLOCK_CATEGORIES } from './blocks'
import { THEMES } from './themes'

type IconFC = React.FC<{ className?: string }>

// ─── Raw element definitions (Tab 2: Elements) ────────────────────────────────

interface ElementDef {
  type: ElementType
  label: string
  icon: IconFC
  desc: string
  iconClass: string
}

const ELEMENT_GROUPS: { title: string; dot: string; items: ElementDef[] }[] = [
  {
    title: 'Text',
    dot: 'bg-blue-500',
    items: [
      { type: 'heading', label: 'Heading', icon: Heading1 as IconFC, desc: 'H1–H6 title', iconClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
      { type: 'paragraph', label: 'Paragraph', icon: AlignLeft as IconFC, desc: 'Body text block', iconClass: 'bg-slate-500/15 text-slate-500 dark:text-slate-400' },
      { type: 'code-block', label: 'Code Block', icon: Code2 as IconFC, desc: 'Syntax-highlighted code', iconClass: 'bg-violet-500/15 text-violet-600 dark:text-violet-400' },
    ],
  },
  {
    title: 'Media',
    dot: 'bg-emerald-500',
    items: [
      { type: 'image', label: 'Image', icon: Image as IconFC, desc: 'Photo or illustration', iconClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
      { type: 'video-embed', label: 'Video', icon: Play as IconFC, desc: 'YouTube embed', iconClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400' },
      { type: 'icon', label: 'Icon', icon: Star as IconFC, desc: 'Single icon', iconClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
    ],
  },
  {
    title: 'Interactive',
    dot: 'bg-violet-500',
    items: [
      { type: 'button', label: 'Button', icon: MousePointerClick as IconFC, desc: 'Call to action', iconClass: 'bg-violet-500/15 text-violet-600 dark:text-violet-400' },
      { type: 'navbar', label: 'Navbar', icon: Menu as IconFC, desc: 'Navigation bar', iconClass: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400' },
      { type: 'social-links', label: 'Social Links', icon: Share2 as IconFC, desc: 'Platform icon row', iconClass: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
      { type: 'form', label: 'Form', icon: ClipboardList as IconFC, desc: 'Contact / signup', iconClass: 'bg-orange-500/15 text-orange-600 dark:text-orange-400' },
    ],
  },
  {
    title: 'Layout',
    dot: 'bg-teal-500',
    items: [
      { type: 'section', label: 'Section', icon: LayoutTemplate as IconFC, desc: 'Styled container', iconClass: 'bg-teal-500/15 text-teal-600 dark:text-teal-400' },
      { type: 'container', label: 'Container', icon: Box as IconFC, desc: 'Transparent box', iconClass: 'bg-gray-500/15 text-gray-500 dark:text-gray-400' },
      { type: 'divider', label: 'Divider', icon: Minus as IconFC, desc: 'Horizontal rule', iconClass: 'bg-gray-400/15 text-gray-400 dark:text-gray-500' },
      { type: 'spacer', label: 'Spacer', icon: ArrowUpDown as IconFC, desc: 'Blank spacing', iconClass: 'bg-gray-400/15 text-gray-400 dark:text-gray-500' },
    ],
  },
]

// ─── Component ─────────────────────────────────────────────────────────────────

interface ElementsPanelProps {
  editor: Pick<UseEditorReturn, 'addElement' | 'addTemplateBlock' | 'addBlock' | 'setTheme' | 'state'>
}

export function ElementsPanel({ editor }: ElementsPanelProps) {
  const [tab, setTab] = useState<'sections' | 'elements'>('sections')
  const [expandedCat, setExpandedCat] = useState<string | null>('hero')

  return (
    <div className="flex flex-col gap-3">
      {/* Tab toggle */}
      <div className="flex gap-1 rounded-lg bg-muted/40 p-0.5">
        {([
          { id: 'sections' as const, label: 'Sections', Icon: Layout },
          { id: 'elements' as const, label: 'Elements', Icon: Layers },
        ]).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[10px] font-semibold transition-all ${
              tab === id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="size-3" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'sections' ? (
        <>
          {/* Theme picker */}
          <div className="px-1">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Theme
            </p>
            <div className="flex flex-wrap gap-2">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => editor.setTheme(theme.id)}
                  title={theme.name}
                  className={`size-7 rounded-full overflow-hidden transition-all hover:scale-110 ${
                    editor.state.themeId === theme.id
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110'
                      : ''
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.surface} 60%, ${theme.colors.background} 100%)`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Section blocks by category */}
          <div className="flex flex-col gap-1">
            {BLOCK_CATEGORIES.map((cat) => {
              const catBlocks = BLOCKS.filter((b) => b.category === cat.id)
              if (catBlocks.length === 0) return null
              const isExpanded = expandedCat === cat.id

              return (
                <div key={cat.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent/50"
                  >
                    <span className={`size-1.5 rounded-full ${cat.dot}`} />
                    <span className="flex-1 text-[11px] font-semibold text-foreground">
                      {cat.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{catBlocks.length}</span>
                    <svg
                      className={`size-3 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="flex flex-col gap-0.5 pb-1 pl-1">
                      {catBlocks.map((block) => (
                        <button
                          key={block.id}
                          type="button"
                          onClick={() => editor.addBlock(block.id)}
                          className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-all hover:bg-accent/60 active:scale-[0.98]"
                        >
                          <span className="min-w-0">
                            <span className="block text-[11px] font-medium leading-tight text-foreground">
                              {block.label}
                            </span>
                            <span className="block truncate text-[10px] text-muted-foreground">
                              {block.description}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      ) : (
        /* Tab 2: Raw elements */
        <div className="flex flex-col gap-4">
          {ELEMENT_GROUPS.map(({ title, dot, items }) => (
            <div key={title}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <span className={`size-1.5 rounded-full ${dot}`} />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {title}
                </p>
              </div>
              <div className="flex flex-col gap-0.5">
                {items.map(({ type, label, icon: Icon, desc, iconClass }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => editor.addElement(type)}
                    className="group flex cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-all duration-150 hover:border-border/60 hover:bg-accent hover:shadow-sm active:scale-[0.98]"
                  >
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-150 group-hover:scale-105 ${iconClass}`}>
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12px] font-semibold leading-tight">{label}</span>
                      <span className="block truncate text-[10px] text-muted-foreground">{desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
