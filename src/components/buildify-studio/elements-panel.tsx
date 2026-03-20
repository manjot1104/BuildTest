'use client'

import React from 'react'
import {
  Heading1, AlignLeft, Image, MousePointerClick, LayoutTemplate, Box,
  Minus, ArrowUpDown, Share2, Play, Star, Menu, ClipboardList, Code2,
  MessageCircle, DollarSign, Rocket, TrendingUp, Zap, HelpCircle, AlertCircle,
} from 'lucide-react'
import { type UseEditorReturn } from './use-editor'
import { type ElementType } from './types'

type IconFC = React.FC<{ className?: string }>

interface ElementDef {
  type: ElementType | 'testimonial-block' | 'pricing-block' | 'hero-block' | 'stats-block' | 'feature-card'
  label: string
  icon: IconFC
  desc: string
  iconClass: string
  isBlock?: boolean
}

const ELEMENT_GROUPS: { title: string; dot: string; items: ElementDef[] }[] = [
  {
    title: 'Text',
    dot: 'bg-blue-500',
    items: [
      { type: 'heading',    label: 'Heading',    icon: Heading1 as IconFC,        desc: 'H1–H6 title',             iconClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
      { type: 'paragraph',  label: 'Paragraph',  icon: AlignLeft as IconFC,       desc: 'Body text block',         iconClass: 'bg-slate-500/15 text-slate-500 dark:text-slate-400' },
      { type: 'code-block', label: 'Code Block', icon: Code2 as IconFC,           desc: 'Syntax-highlighted code', iconClass: 'bg-violet-500/15 text-violet-600 dark:text-violet-400' },
    ],
  },
  {
    title: 'Media',
    dot: 'bg-emerald-500',
    items: [
      { type: 'image',       label: 'Image', icon: Image as IconFC, desc: 'Photo or illustration', iconClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
      { type: 'video-embed', label: 'Video', icon: Play as IconFC,  desc: 'YouTube embed',         iconClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400' },
      { type: 'icon',        label: 'Icon',  icon: Star as IconFC,  desc: 'Single icon',           iconClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
    ],
  },
  {
    title: 'Interactive',
    dot: 'bg-violet-500',
    items: [
      { type: 'button',       label: 'Button',       icon: MousePointerClick as IconFC, desc: 'Call to action',    iconClass: 'bg-violet-500/15 text-violet-600 dark:text-violet-400' },
      { type: 'navbar',       label: 'Navbar',       icon: Menu as IconFC,              desc: 'Navigation bar',    iconClass: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400' },
      { type: 'social-links', label: 'Social Links', icon: Share2 as IconFC,            desc: 'Platform icon row', iconClass: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
      { type: 'form',         label: 'Form',         icon: ClipboardList as IconFC,     desc: 'Contact / signup',  iconClass: 'bg-orange-500/15 text-orange-600 dark:text-orange-400' },
    ],
  },
  {
    title: 'Layout',
    dot: 'bg-teal-500',
    items: [
      { type: 'section',   label: 'Section',   icon: LayoutTemplate as IconFC, desc: 'Styled container', iconClass: 'bg-teal-500/15 text-teal-600 dark:text-teal-400' },
      { type: 'container', label: 'Container', icon: Box as IconFC,            desc: 'Transparent box',  iconClass: 'bg-gray-500/15 text-gray-500 dark:text-gray-400' },
      { type: 'divider',   label: 'Divider',   icon: Minus as IconFC,          desc: 'Horizontal rule',  iconClass: 'bg-gray-400/15 text-gray-400 dark:text-gray-500' },
      { type: 'spacer',    label: 'Spacer',    icon: ArrowUpDown as IconFC,    desc: 'Blank spacing',    iconClass: 'bg-gray-400/15 text-gray-400 dark:text-gray-500' },
    ],
    
  },
{
    title: 'Template Blocks',
    dot: 'bg-pink-500',
    items: [
      { type: 'testimonial-block' as any, label: 'Testimonial', icon: MessageCircle as IconFC, desc: 'Review with rating', iconClass: 'bg-pink-500/15 text-pink-600 dark:text-pink-400', isBlock: true },
      { type: 'pricing-block' as any, label: 'Pricing Card', icon: DollarSign as IconFC, desc: 'Plan with features', iconClass: 'bg-green-500/15 text-green-600 dark:text-green-400', isBlock: true },
      { type: 'hero-block' as any, label: 'Hero Section', icon: Rocket as IconFC, desc: 'Hero with CTA', iconClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400', isBlock: true },
      { type: 'stats-block' as any, label: 'Stats Counter', icon: TrendingUp as IconFC, desc: 'Key metrics display', iconClass: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400', isBlock: true },
      { type: 'feature-card' as any, label: 'Feature Card', icon: Zap as IconFC, desc: 'Icon + title + desc', iconClass: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400', isBlock: true },
      { type: 'faq' as any, label: 'FAQ', icon: HelpCircle as IconFC, desc: 'Questions & answers', iconClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400', isBlock: true },
      { type: 'alert' as any, label: 'Alert Banner', icon: AlertCircle as IconFC, desc: 'Important notification', iconClass: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400', isBlock: true },
    ],
  },
]



interface ElementsPanelProps {
  editor: Pick<UseEditorReturn, 'addElement' | 'addTemplateBlock'>
}

export function ElementsPanel({ editor }: ElementsPanelProps) {
  return (
    <div className="flex flex-col gap-5">
      {ELEMENT_GROUPS.map(({ title, dot, items }) => (
        <div key={title}>
          <div className="mb-2.5 flex items-center gap-2 px-1">
            <span className={`size-1.5 rounded-full ${dot}`} />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {title}
            </p>
          </div>

          <div className="flex flex-col gap-1">
      {items.map(({ type, label, icon: Icon, desc, iconClass, isBlock }) => (
              <button
                key={type}
                type="button"
               onClick={() => {
  if (isBlock) {
    const blockName = (type as string).replace('-block', '').replace('-card', '')
    editor.addTemplateBlock(blockName as 'testimonial' | 'pricing' | 'hero' | 'stats' | 'feature')
  } else {
    editor.addElement(type as ElementType)
  }
}}
                className="group flex cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-all duration-150 hover:border-border/60 hover:bg-accent hover:shadow-sm active:scale-[0.98]"
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-150 group-hover:scale-105 ${iconClass}`}
                >
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
  )
}