'use client'

import React, { useRef, useCallback, useEffect } from 'react'
import {
  Star, Heart, Zap, Check, Home, User, Mail, Phone, Globe, Camera,
  Code, Music, Coffee, Shield, Rocket, Smile, Diamond, Flame, Leaf, Crown,
  Github, Twitter, Linkedin, Instagram, Youtube, Facebook, MessageSquare,
  Play,
} from 'lucide-react'
import { type CanvasElement, type EnterAnimation, type HoverAnimation, type SocialPlatform } from './types'

const HANDLE_SIZE = 8

const RESIZE_HANDLES = [
  { dir: 'nw', style: { top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, cursor: 'nw-resize' } },
  { dir: 'n', style: { top: -HANDLE_SIZE / 2, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' } },
  { dir: 'ne', style: { top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, cursor: 'ne-resize' } },
  { dir: 'e', style: { top: '50%', right: -HANDLE_SIZE / 2, transform: 'translateY(-50%)', cursor: 'e-resize' } },
  { dir: 'se', style: { bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, cursor: 'se-resize' } },
  { dir: 's', style: { bottom: -HANDLE_SIZE / 2, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' } },
  { dir: 'sw', style: { bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, cursor: 'sw-resize' } },
  { dir: 'w', style: { top: '50%', left: -HANDLE_SIZE / 2, transform: 'translateY(-50%)', cursor: 'w-resize' } },
] as const

type Dir = (typeof RESIZE_HANDLES)[number]['dir']

// --- Icon map ---
const ICON_MAP: Record<string, React.FC<{ size?: number; color?: string; className?: string }>> = {
  star: Star, heart: Heart, zap: Zap, check: Check, home: Home, user: User,
  mail: Mail, phone: Phone, globe: Globe, camera: Camera, code: Code,
  music: Music, coffee: Coffee, shield: Shield, rocket: Rocket, smile: Smile,
  diamond: Diamond, flame: Flame, leaf: Leaf, crown: Crown,
}

// --- Social icons ---
const SOCIAL_ICON_MAP: Record<SocialPlatform, React.FC<{ size?: number; className?: string }>> = {
  github: Github,
  twitter: Twitter,
  linkedin: Linkedin,
  instagram: Instagram,
  youtube: Youtube,
  facebook: Facebook,
  discord: MessageSquare,
  tiktok: Music,
  website: Globe,
  email: Mail,
}

// --- Animation helpers ---
function getEnterAnimClass(anim: EnterAnimation, isPreview: boolean): string {
  if (!isPreview || anim === 'none') return ''
  const map: Record<EnterAnimation, string> = {
    none: '',
    fadeIn: 'pb-anim-fadein',
    slideUp: 'pb-anim-slideup',
    slideDown: 'pb-anim-slidedown',
    slideLeft: 'pb-anim-slideleft',
    slideRight: 'pb-anim-slideright',
    zoomIn: 'pb-anim-zoomin',
    bounce: 'pb-anim-bounce',
  }
  return map[anim] ?? ''
}

function getHoverAnimClass(anim: HoverAnimation, isPreview: boolean): string {
  if (!isPreview || anim === 'none') return ''
  const map: Record<HoverAnimation, string> = {
    none: '',
    scale: 'pb-hover-scale',
    lift: 'pb-hover-lift',
    glow: 'pb-hover-glow',
  }
  return map[anim] ?? ''
}

// --- Background style helper ---
function getBackgroundStyle(styles: CanvasElement['styles']): React.CSSProperties {
  if (styles.gradientType === 'linear' && styles.gradientFrom && styles.gradientTo) {
    return {
      background: `linear-gradient(${styles.gradientAngle ?? 135}deg, ${styles.gradientFrom}, ${styles.gradientTo})`,
    }
  }
  if (styles.gradientType === 'radial' && styles.gradientFrom && styles.gradientTo) {
    return {
      background: `radial-gradient(circle, ${styles.gradientFrom}, ${styles.gradientTo})`,
    }
  }
  return { backgroundColor: styles.backgroundColor }
}

// --- Main element wrapper style ---
function buildContainerStyle(el: CanvasElement, isSelected: boolean, isMultiSelect: boolean, isPreview: boolean): React.CSSProperties {
  return {
    position: 'absolute',
    left: el.x,
    top: el.y,
    width: el.width,
    height: el.height,
    zIndex: el.zIndex,
    opacity: el.styles.opacity !== undefined ? el.styles.opacity / 100 : 1,
    outline: isSelected && !isPreview
      ? isMultiSelect
        ? '2px solid #f59e0b'
        : '2px solid #3b82f6'
      : 'none',
    outlineOffset: 2,
    cursor: isPreview ? 'default' : 'move',
    userSelect: isPreview ? undefined : 'none',
    display: el.hidden ? 'none' : undefined,
  }
}

// --- Renderers ---

function HeadingRenderer({ element, isSelected, isPreview, onContentChange }: {
  element: CanvasElement
  isSelected: boolean
  isPreview: boolean
  onContentChange: (id: string, content: string) => void
}) {
  const { styles, headingLevel = 1, content } = element
  const Tag: React.ElementType = `h${headingLevel}`
  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    color: styles.color ?? '#1a1a1a',
    fontSize: styles.fontSize ?? 48,
    fontWeight: styles.fontWeight ?? '700',
    fontFamily: styles.fontFamily ?? 'inherit',
    textAlign: styles.textAlign ?? 'left',
    letterSpacing: styles.letterSpacing ? `${styles.letterSpacing}px` : undefined,
    lineHeight: styles.lineHeight ? `${styles.lineHeight}` : '1.2',
    padding: styles.padding ?? 4,
    background: styles.backgroundColor,
    borderRadius: styles.borderRadius ?? 0,
    textDecoration: styles.textDecoration,
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    margin: 0,
    cursor: isSelected && !isPreview ? 'text' : 'inherit',
    outline: isSelected ? '1px dashed #93c5fd' : 'none',
    display: 'flex',
    alignItems: 'center',
  }
  return (
    <Tag
  data-pb-heading
  contentEditable={!isPreview && isSelected}
     
      suppressContentEditableWarning
      onBlur={(e) => onContentChange(element.id, (e.currentTarget as HTMLElement).textContent ?? '')}
      onMouseDown={isSelected && !isPreview ? (e) => e.stopPropagation() : undefined}
      style={style}
    >
      {content}
    </Tag>
  )
}

function ParagraphRenderer({ element, isSelected, isPreview, onContentChange }: {
  element: CanvasElement
  isSelected: boolean
  isPreview: boolean
  onContentChange: (id: string, content: string) => void
}) {
  const { styles, content } = element
  return (
    <div
      contentEditable={!isPreview && isSelected}
      suppressContentEditableWarning
      onBlur={(e) => onContentChange(element.id, (e.currentTarget as HTMLElement).textContent ?? '')}
      onMouseDown={isSelected && !isPreview ? (e) => e.stopPropagation() : undefined}
      style={{
        width: '100%',
        height: '100%',
        color: styles.color ?? '#374151',
        fontSize: styles.fontSize ?? 16,
        fontWeight: styles.fontWeight ?? '400',
        fontFamily: styles.fontFamily ?? 'inherit',
        textAlign: styles.textAlign ?? 'left',
        letterSpacing: styles.letterSpacing ? `${styles.letterSpacing}px` : undefined,
        lineHeight: styles.lineHeight ? `${styles.lineHeight}` : '1.6',
        padding: styles.padding ?? 4,
        background: styles.backgroundColor,
        borderRadius: styles.borderRadius ?? 0,
        textDecoration: styles.textDecoration,
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
        cursor: isSelected && !isPreview ? 'text' : 'inherit',
        outline: isSelected ? '1px dashed #93c5fd' : 'none',
        overflow: 'auto',
      }}
    >
      {content}
    </div>
  )
}

function ImageRenderer({ element }: { element: CanvasElement }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={element.content || 'https://placehold.co/320x220/e2e8f0/94a3b8?text=Image'}
      alt="canvas element"
      draggable={false}
      style={{
        width: '100%',
        height: '100%',
        objectFit: (element.styles.objectFit as React.CSSProperties['objectFit']) ?? 'cover',
        borderRadius: element.styles.borderRadius ?? 0,
        border: element.styles.border,
        boxShadow: element.styles.boxShadow,
        display: 'block',
      }}
    />
  )
}

function ButtonRenderer({ element, isPreview }: { element: CanvasElement; isPreview: boolean }) {
  const { styles, content } = element
  const bgStyle = getBackgroundStyle(styles)
  return (
    <button
      type="button"
      style={{
        width: '100%',
        height: '100%',
        ...bgStyle,
        color: styles.color ?? '#ffffff',
        fontSize: styles.fontSize ?? 16,
        fontWeight: styles.fontWeight ?? '600',
        fontFamily: styles.fontFamily ?? 'inherit',
        borderRadius: styles.borderRadius ?? 8,
        border: styles.border ?? 'none',
        padding: styles.padding ?? 12,
        cursor: isPreview ? 'pointer' : 'inherit',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        letterSpacing: styles.letterSpacing ? `${styles.letterSpacing}px` : undefined,
        boxShadow: styles.boxShadow,
        textDecoration: styles.textDecoration,
        transition: 'opacity 0.15s',
      }}
    >
      {content}
    </button>
  )
}

function SectionRenderer({ element }: { element: CanvasElement }) {
  const { styles } = element
  const bgStyle = getBackgroundStyle(styles)

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        ...bgStyle,
        border: styles.border ?? '2px dashed #e2e8f0',
        borderRadius: styles.borderRadius ?? 12,
        padding: styles.padding ?? 24,
        boxShadow: styles.boxShadow,
        overflow: 'hidden',
      }}
    />
  )
}

function ContainerRenderer({ element }: { element: CanvasElement }) {
  const { styles } = element
  const bgStyle = getBackgroundStyle(styles)
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        ...bgStyle,
        border: styles.border ?? '1px solid #e2e8f0',
        borderRadius: styles.borderRadius ?? 8,
        padding: styles.padding,
        boxShadow: styles.boxShadow,
        overflow: 'hidden',
      }}
    />
  )
}

function DividerRenderer({ element }: { element: CanvasElement }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: element.styles.backgroundColor ?? '#e2e8f0',
        borderRadius: element.styles.borderRadius ?? 2,
        border: element.styles.border,
      }}
    />
  )
}

function SpacerRenderer({ isSelected, isPreview }: { isSelected: boolean; isPreview: boolean }) {
  if (isPreview) return <div style={{ width: '100%', height: '100%' }} />
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isSelected ? 'rgba(59,130,246,0.05)' : 'transparent',
        border: '1px dashed rgba(148,163,184,0.4)',
        borderRadius: 4,
      }}
    >
      <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>spacer</span>
    </div>
  )
}

function SocialLinksRenderer({ element, isPreview }: { element: CanvasElement; isPreview: boolean }) {
  const links = element.socialLinks ?? []
  const iconSize = element.styles.iconSize ?? 28
  const iconColor = element.styles.iconColor ?? '#374151'
  const gap = element.styles.gap ?? 16

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap,
        flexDirection: element.styles.flexDirection ?? 'row',
        justifyContent: element.styles.justifyContent ?? 'flex-start',
        padding: element.styles.padding ?? 0,
        flexWrap: 'wrap',
      }}
    >
      {links.filter((l) => l.url || !isPreview).map((link, i) => {
        const IconComponent = SOCIAL_ICON_MAP[link.platform]
        const inner = (
          <div
            key={i}
            title={link.platform}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isPreview && link.url ? 'pointer' : 'inherit',
              color: iconColor,
              transition: 'opacity 0.15s',
            }}
          >
            {IconComponent ? <IconComponent size={iconSize} /> : (
              <span style={{ fontSize: iconSize * 0.6, fontWeight: '700' }}>
                {link.platform.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
        )
        if (isPreview && link.url) {
          return (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer">
              {inner}
            </a>
          )
        }
        return inner
      })}
      {links.length === 0 && !isPreview && (
        <span style={{ fontSize: 11, color: '#94a3b8' }}>Add social links in inspector</span>
      )}
    </div>
  )
}

function VideoEmbedRenderer({ element, isPreview }: { element: CanvasElement; isPreview: boolean }) {
  const url = element.content

  // Extract YouTube video ID
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  const ytId = ytMatch?.[1]

  if (isPreview && ytId) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${ytId}`}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: element.styles.borderRadius ?? 8,
        }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    )
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#0f0f0f',
        borderRadius: element.styles.borderRadius ?? 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        border: '1px solid #2a2a2a',
      }}
    >
      <Play size={40} color="#ffffff" />
      <span style={{ fontSize: 12, color: '#9ca3af' }}>
        {url ? (ytId ? 'YouTube Video' : 'Video Embed') : 'Paste YouTube URL in inspector'}
      </span>
    </div>
  )
}

function IconRenderer({ element }: { element: CanvasElement }) {
  const iconName = (element.content || element.iconName || 'star').toLowerCase()
  const IconComponent = ICON_MAP[iconName] ?? Star
  const iconSize = element.styles.iconSize ?? 48
  const iconColor = element.styles.iconColor ?? '#3b82f6'
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: iconColor,
        background: element.styles.backgroundColor,
        borderRadius: element.styles.borderRadius,
        padding: element.styles.padding,
      }}
    >
      <IconComponent size={iconSize} color={iconColor} />
    </div>
  )
}

function NavbarRenderer({ element, isPreview }: { element: CanvasElement; isPreview: boolean }) {
  const { styles, content } = element
  const items = content.split('|').filter(Boolean)
  const bgStyle = getBackgroundStyle(styles)

const NAV_ALIASES: Record<string, string[]> = {
  services: ['services'],
  skills: ['skills', 'tech stack'],
  work: ['work', 'what we do', 'projects', 'portfolio', 'featured projects'],
  blog: ['blog', 'posts', 'latest posts'],
  contact: ['contact', 'get in touch', 'lets talk'],
  about: ['about', 'about me'],
}

const handleNavClick = (label: string) => {
  const key = label.toLowerCase().trim()
  const aliases = NAV_ALIASES[key] ?? [key]

  //  Try sectionKey first (best)
  const section = document.querySelector(
    `[data-pb-section="${key}"]`
  ) as HTMLElement | null

  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }

  //  fallback → headings
  const headings = document.querySelectorAll('[data-pb-heading]')

  const target = Array.from(headings).find((h) => {
    const text = h.textContent?.toLowerCase() ?? ''
    return aliases.some(a => text.includes(a))
  }) as HTMLElement | undefined

  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
  return (
    <nav
      style={{
        width: '100%',
        height: '100%',
        ...bgStyle,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `0 ${styles.padding ?? 24}px`,
        borderRadius: styles.borderRadius ?? 0,
        boxShadow: styles.boxShadow,
        border: styles.border,
        gap: 8,
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          fontWeight: '700',
          fontSize: (styles.fontSize ?? 14) + 2,
          color: styles.color ?? '#ffffff',
          fontFamily: styles.fontFamily,
          flexShrink: 0,
        }}
      >
        {items[0] ?? 'Brand'}
      </span>

      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        {(items.length > 1 ? items.slice(1) : ['Home', 'About', 'Contact']).map((item, i) => (
          <span
            key={i}
            onClick={() => isPreview && handleNavClick(item)}
            style={{
              fontSize: styles.fontSize ?? 14,
              fontWeight: styles.fontWeight ?? '500',
              color: styles.color ?? '#ffffff',
              fontFamily: styles.fontFamily,
              textDecoration: 'none',
              opacity: 0.85,
              cursor: isPreview ? 'pointer' : 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </nav>
  )
}

function FormRenderer({ element, isPreview }: { element: CanvasElement; isPreview: boolean }) {
  const { styles, content, formFields = [] } = element
  const bgStyle = getBackgroundStyle(styles)
  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 10px',
    fontSize: 13,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    outline: 'none',
    background: '#f9fafb',
    color: '#1a1a1a',
    fontFamily: 'inherit',
    resize: 'none',
  }
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        ...bgStyle,
        border: styles.border ?? '1px solid #e2e8f0',
        borderRadius: styles.borderRadius ?? 12,
        padding: styles.padding ?? 24,
        boxShadow: styles.boxShadow,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {content && (
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: '600', color: '#1a1a1a' }}>
          {content}
        </h3>
      )}
      {formFields.slice(0, 3).map((field) => (
        <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 12, fontWeight: '500', color: '#374151' }}>
            {field.label}
            {field.required && <span style={{ color: '#ef4444' }}>*</span>}
          </label>
          {field.type === 'textarea' ? (
            <textarea
              placeholder={field.placeholder}
              rows={2}
              disabled={!isPreview}
              style={fieldStyle}
            />
          ) : (
            <input
              type={field.type}
              placeholder={field.placeholder}
              disabled={!isPreview}
              style={fieldStyle}
            />
          )}
        </div>
      ))}
      {formFields.length > 3 && (
        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
          +{formFields.length - 3} more fields
        </p>
      )}
      <button
        type={isPreview ? 'submit' : 'button'}
        style={{
          marginTop: 4,
          padding: '8px 16px',
          backgroundColor: '#3b82f6',
          color: '#ffffff',
          border: 'none',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: '600',
          cursor: isPreview ? 'pointer' : 'default',
          alignSelf: 'flex-start',
          fontFamily: 'inherit',
        }}
      >
        Submit
      </button>
    </div>
  )
}

function CodeBlockRenderer({ element }: { element: CanvasElement }) {
  const { styles, content } = element
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: styles.backgroundColor ?? '#1e1e2e',
        borderRadius: styles.borderRadius ?? 8,
        overflow: 'hidden',
        border: styles.border ?? '1px solid #313244',
        boxShadow: styles.boxShadow,
      }}
    >
      {/* Window chrome */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 14px', borderBottom: '1px solid #313244' }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ff5f57', display: 'block' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#febc2e', display: 'block' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#28c840', display: 'block' }} />
      </div>
      <pre
        style={{
          margin: 0,
          padding: styles.padding ?? 20,
          fontSize: styles.fontSize ?? 13,
          fontFamily: styles.fontFamily ?? '"Fira Code", monospace',
          color: styles.color ?? '#cdd6f4',
          lineHeight: styles.lineHeight ?? 1.6,
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        <code>{content}</code>
      </pre>
    </div>
  )
}

// --- Dispatch table ---
function renderContent(
  element: CanvasElement,
  isSelected: boolean,
  isPreview: boolean,
  onContentChange: (id: string, content: string) => void,
) {
  switch (element.type) {
    case 'heading':
      return <HeadingRenderer element={element} isSelected={isSelected} isPreview={isPreview} onContentChange={onContentChange} />
    case 'paragraph':
      return <ParagraphRenderer element={element} isSelected={isSelected} isPreview={isPreview} onContentChange={onContentChange} />
    case 'image':
      return <ImageRenderer element={element} />
    case 'button':
      return <ButtonRenderer element={element} isPreview={isPreview} />
    case 'section':
      return <SectionRenderer element={element} />
    case 'container':
      return <ContainerRenderer element={element} />
    case 'divider':
      return <DividerRenderer element={element} />
    case 'spacer':
      return <SpacerRenderer isSelected={isSelected} isPreview={isPreview} />
    case 'social-links':
      return <SocialLinksRenderer element={element} isPreview={isPreview} />
    case 'video-embed':
      return <VideoEmbedRenderer element={element} isPreview={isPreview} />
    case 'icon':
      return <IconRenderer element={element} />
    case 'navbar':
      return <NavbarRenderer element={element} isPreview={isPreview} />
    case 'form':
      return <FormRenderer element={element} isPreview={isPreview} />
    case 'code-block':
      return <CodeBlockRenderer element={element} />
    default:
      return null
  }
}

// --- Main component ---

interface ElementRendererProps {
  element: CanvasElement
  isSelected: boolean
  isMultiSelect: boolean
  isPreview: boolean
  zoom: number
  canvasRef: React.RefObject<HTMLDivElement | null>
  onSelect: (id: string, addToSelection?: boolean) => void
  onDragEnd: (id: string, x: number, y: number) => void
  onResizeEnd: (id: string, x: number, y: number, width: number, height: number) => void
  onContentChange: (id: string, content: string) => void
}

export function ElementRenderer({
  element,
  isSelected,
  isMultiSelect,
  isPreview,
  zoom,
  canvasRef,
  onSelect,
  onDragEnd,
  onResizeEnd,
  onContentChange,
}: ElementRendererProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const ghostRef = useRef<HTMLDivElement | null>(null)

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      if (isPreview || element.locked) return
      e.stopPropagation()
      e.preventDefault()

      onSelect(element.id, e.shiftKey || e.metaKey)

      const startMouseX = e.clientX
      const startMouseY = e.clientY
      const startElemX = element.x
      const startElemY = element.y

      const ghost = document.createElement('div')
      ghost.style.cssText = `
        position: absolute;
        width: ${element.width}px;
        height: ${element.height}px;
        left: ${element.x}px;
        top: ${element.y}px;
        border: 2px dashed #3b82f6;
        background: rgba(59,130,246,0.08);
        pointer-events: none;
        z-index: 99999;
        border-radius: ${element.styles.borderRadius ?? 0}px;
      `
      canvasRef.current?.appendChild(ghost)
      ghostRef.current = ghost

      const onMouseMove = (ev: MouseEvent) => {
        const dx = (ev.clientX - startMouseX) / zoom
        const dy = (ev.clientY - startMouseY) / zoom
        ghost.style.left = `${startElemX + dx}px`
        ghost.style.top = `${startElemY + dy}px`
      }

      const onMouseUp = (ev: MouseEvent) => {
        const dx = (ev.clientX - startMouseX) / zoom
        const dy = (ev.clientY - startMouseY) / zoom
        ghost.remove()
        ghostRef.current = null
        onDragEnd(element.id, Math.round(startElemX + dx), Math.round(startElemY + dy))
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [element, isPreview, zoom, canvasRef, onSelect, onDragEnd],
  )

  const startResize = useCallback(
    (e: React.MouseEvent, dir: Dir) => {
      if (isPreview || element.locked) return
      e.stopPropagation()
      e.preventDefault()

      const startMouseX = e.clientX
      const startMouseY = e.clientY
      const startX = element.x
      const startY = element.y
      const startW = element.width
      const startH = element.height

      const onMouseMove = (ev: MouseEvent) => {
        const dx = (ev.clientX - startMouseX) / zoom
        const dy = (ev.clientY - startMouseY) / zoom
        let newX = startX, newY = startY, newW = startW, newH = startH

        if (dir.includes('e')) newW = Math.max(20, startW + dx)
        if (dir.includes('s')) newH = Math.max(20, startH + dy)
        if (dir.includes('w')) { newX = startX + dx; newW = Math.max(20, startW - dx) }
        if (dir.includes('n')) { newY = startY + dy; newH = Math.max(20, startH - dy) }

        if (elementRef.current) {
          elementRef.current.style.left = `${newX}px`
          elementRef.current.style.top = `${newY}px`
          elementRef.current.style.width = `${newW}px`
          elementRef.current.style.height = `${newH}px`
        }
      }

      const onMouseUp = (ev: MouseEvent) => {
        const dx = (ev.clientX - startMouseX) / zoom
        const dy = (ev.clientY - startMouseY) / zoom
        let newX = startX, newY = startY, newW = startW, newH = startH

        if (dir.includes('e')) newW = Math.max(20, startW + dx)
        if (dir.includes('s')) newH = Math.max(20, startH + dy)
        if (dir.includes('w')) { newX = startX + dx; newW = Math.max(20, startW - dx) }
        if (dir.includes('n')) { newY = startY + dy; newH = Math.max(20, startH - dy) }

        onResizeEnd(
          element.id,
          Math.round(newX),
          Math.round(newY),
          Math.round(newW),
          Math.round(newH),
        )
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [element, isPreview, zoom, onResizeEnd],
  )

  useEffect(() => {
    return () => {
      ghostRef.current?.remove()
    }
  }, [])

  const enterClass = getEnterAnimClass(element.enterAnimation, isPreview)
  const hoverClass = getHoverAnimClass(element.hoverAnimation, isPreview)
  const containerStyle = buildContainerStyle(element, isSelected, isMultiSelect, isPreview)
  const showHandles = isSelected && !isPreview && !isMultiSelect

  // Link wrapper in preview
  const content = renderContent(element, isSelected, isPreview, onContentChange)
  const inner = element.link.enabled && isPreview ? (
    <a
      href={element.link.href}
      target={element.link.target}
      rel="noopener noreferrer"
      style={{ display: 'block', width: '100%', height: '100%', textDecoration: 'none' }}
    >
      {content}
    </a>
  ) : content

 return (
<div
  ref={elementRef}
  id={element.sectionKey ?? (element.type === 'section' ? element.id : undefined)}
 data-pb-section={element.sectionKey}
  data-pb-heading={element.type === 'heading' ? element.content.toLowerCase() : undefined}
    className={[enterClass, hoverClass].filter(Boolean).join(' ')}
    style={containerStyle}
      onMouseDown={startDrag}
      onClick={(e) => {
        e.stopPropagation()
        if (!isPreview) onSelect(element.id, e.shiftKey || e.metaKey)
      }}
    >
      {inner}

      {showHandles && RESIZE_HANDLES.map(({ dir, style }) => (
        <div
          key={dir}
          style={{
            position: 'absolute',
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            background: '#3b82f6',
            border: '1.5px solid #fff',
            borderRadius: 2,
            zIndex: 100000,
            ...style,
          }}
          onMouseDown={(e) => startResize(e, dir)}
        />
      ))}
    </div>
  )
}