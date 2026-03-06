'use client'

import React, { useRef, useEffect, useState } from 'react'
import { X, Monitor, Tablet, Smartphone, ExternalLink } from 'lucide-react'
import { type CanvasElement, type CanvasBackground, type EnterAnimation } from './types'

// ─── Device presets ───────────────────────────────────────────────────────────

const DEVICES = [
  { id: 'desktop' as const, label: 'Desktop', Icon: Monitor,    width: 1440, height: 960  },
  { id: 'tablet'  as const, label: 'Tablet',  Icon: Tablet,     width: 768,  height: 1024 },
  { id: 'mobile'  as const, label: 'Mobile',  Icon: Smartphone, width: 390,  height: 844  },
]

// ─── Icon characters ──────────────────────────────────────────────────────────

const ICON_CHARS: Record<string, string> = {
  star: '★', heart: '♥', zap: '⚡', check: '✓', home: '⌂', user: '👤',
  mail: '✉', phone: '☎', globe: '🌐', camera: '📷', code: '</>',
  music: '♪', coffee: '☕', shield: '🛡', rocket: '🚀', smile: '☺',
  diamond: '◆', flame: '🔥', leaf: '🌿', crown: '♛',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBgStyle(bg: CanvasBackground): React.CSSProperties {
  if (bg.type === 'gradient')
    return { background: `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientFrom}, ${bg.gradientTo})` }
  if (bg.type === 'image' && bg.imageUrl)
    return { backgroundImage: `url(${bg.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  return { backgroundColor: bg.color ?? '#ffffff' }
}

function animClass(anim: EnterAnimation | undefined): string {
  if (!anim || anim === 'none') return ''
  const map: Record<EnterAnimation, string> = {
    none: '', fadeIn: 'pb-anim-fadein', slideUp: 'pb-anim-slideup',
    slideDown: 'pb-anim-slidedown', slideLeft: 'pb-anim-slideleft',
    slideRight: 'pb-anim-slideright', zoomIn: 'pb-anim-zoomin', bounce: 'pb-anim-bounce',
  }
  return map[anim] ?? ''
}

// ─── Static element renderer (client-side, mirrors public page) ──────────────

function StaticEl({ el }: { el: CanvasElement }) {
  const { styles } = el

  const getBg = (): string | undefined => {
    if (styles.gradientType === 'linear' && styles.gradientFrom && styles.gradientTo)
      return `linear-gradient(${styles.gradientAngle ?? 135}deg,${styles.gradientFrom},${styles.gradientTo})`
    if (styles.gradientType === 'radial' && styles.gradientFrom && styles.gradientTo)
      return `radial-gradient(circle,${styles.gradientFrom},${styles.gradientTo})`
    return styles.backgroundColor
  }

  const wrapStyle: React.CSSProperties = {
    position: 'absolute',
    left: el.x, top: el.y,
    width: el.width, height: el.height,
    zIndex: el.zIndex,
    opacity: styles.opacity !== undefined ? styles.opacity / 100 : 1,
    display: el.hidden ? 'none' : undefined,
  }

  const inner = (() => {
    switch (el.type) {
      case 'heading': {
        const Tag = `h${el.headingLevel ?? 1}` as React.ElementType
        return (
          <Tag style={{
            width: '100%', height: '100%', margin: 0,
            color: styles.color ?? '#1a1a1a',
            fontSize: styles.fontSize ?? 48,
            fontWeight: styles.fontWeight ?? '700',
            fontFamily: styles.fontFamily,
            textAlign: styles.textAlign,
            letterSpacing: styles.letterSpacing ? `${styles.letterSpacing}px` : undefined,
            lineHeight: styles.lineHeight ?? '1.2',
            padding: styles.padding ?? 4,
            wordBreak: 'break-word', whiteSpace: 'pre-wrap',
            display: 'flex', alignItems: 'center',
          } as React.CSSProperties}>{el.content}</Tag>
        )
      }
      case 'paragraph':
        return (
          <p style={{
            width: '100%', height: '100%', margin: 0,
            color: styles.color ?? '#374151',
            fontSize: styles.fontSize ?? 16,
            fontWeight: styles.fontWeight ?? '400',
            fontFamily: styles.fontFamily,
            textAlign: styles.textAlign,
            letterSpacing: styles.letterSpacing ? `${styles.letterSpacing}px` : undefined,
            lineHeight: styles.lineHeight ?? '1.6',
            padding: styles.padding ?? 4,
            background: getBg(),
            wordBreak: 'break-word', whiteSpace: 'pre-wrap', overflow: 'auto',
          }}>{el.content}</p>
        )
      case 'image':
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={el.content || 'https://placehold.co/320x220/e2e8f0/94a3b8?text=Image'} alt=""
          style={{ width: '100%', height: '100%', objectFit: (styles.objectFit as React.CSSProperties['objectFit']) ?? 'cover', borderRadius: styles.borderRadius ?? 0, border: styles.border, boxShadow: styles.boxShadow, display: 'block' }} />
      case 'button': {
        const btn = (
          <button type="button" style={{
            width: '100%', height: '100%',
            background: getBg() ?? '#3b82f6',
            color: styles.color ?? '#ffffff',
            fontSize: styles.fontSize ?? 16,
            fontWeight: styles.fontWeight ?? '600',
            fontFamily: styles.fontFamily,
            borderRadius: styles.borderRadius ?? 8,
            border: styles.border ?? 'none',
            padding: styles.padding ?? 12,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: styles.boxShadow,
          }}>{el.content}</button>
        )
        return el.link.enabled
          ? <a href={el.link.href} target={el.link.target} rel="noopener noreferrer" style={{ display: 'block', width: '100%', height: '100%', textDecoration: 'none' }}>{btn}</a>
          : btn
      }
      case 'section':
      case 'container':
        return <div style={{ width: '100%', height: '100%', background: getBg(), border: styles.border, borderRadius: styles.borderRadius ?? (el.type === 'section' ? 12 : 8), padding: styles.padding, boxShadow: styles.boxShadow }} />
      case 'divider':
        return <div style={{ width: '100%', height: '100%', backgroundColor: styles.backgroundColor ?? '#e2e8f0', borderRadius: styles.borderRadius ?? 2 }} />
      case 'spacer':
        return <div style={{ width: '100%', height: '100%' }} />
      case 'social-links': {
        const links = el.socialLinks ?? []
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: styles.gap ?? 16, padding: styles.padding ?? 0, flexWrap: 'wrap' }}>
            {links.filter((l) => l.url).map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                style={{ color: styles.iconColor ?? '#374151', fontSize: (styles.iconSize ?? 28) * 0.6, fontWeight: '700', textDecoration: 'none' }}
                title={link.platform}
              >
                {link.platform.slice(0, 2).toUpperCase()}
              </a>
            ))}
          </div>
        )
      }
      case 'video-embed': {
        const ytMatch = el.content.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
        const ytId = ytMatch?.[1]
        return ytId
          ? <iframe src={`https://www.youtube.com/embed/${ytId}`} style={{ width: '100%', height: '100%', border: 'none', borderRadius: styles.borderRadius ?? 8 }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          : <div style={{ width: '100%', height: '100%', backgroundColor: '#0f0f0f', borderRadius: styles.borderRadius ?? 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14 }}>Paste a YouTube URL</div>
      }
      case 'navbar': {
        const rawItems = el.content.split('|').filter(Boolean)
        const navLinks = rawItems.slice(1).map((item) => {
          const sep = item.indexOf('::')
          return sep > -1 ? { label: item.slice(0, sep), href: item.slice(sep + 2) } : { label: item, href: '#' }
        })
        return (
          <nav style={{ width: '100%', height: '100%', background: getBg() ?? '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${styles.padding ?? 24}px`, borderRadius: styles.borderRadius }}>
            <span style={{ fontWeight: '700', fontSize: (styles.fontSize ?? 14) + 2, color: styles.color ?? '#ffffff', fontFamily: styles.fontFamily }}>{rawItems[0] ?? 'Brand'}</span>
            <div style={{ display: 'flex', gap: 24 }}>
              {(navLinks.length > 0 ? navLinks : [{ label: 'Home', href: '#' }, { label: 'About', href: '#' }]).map((item, i) => (
                <a key={i} href={item.href}
                  style={{ fontSize: styles.fontSize ?? 14, fontWeight: styles.fontWeight ?? '500', color: styles.color ?? '#ffffff', textDecoration: 'none', opacity: 0.85 }}>
                  {item.label}
                </a>
              ))}
            </div>
          </nav>
        )
      }
      case 'form': {
        const formFields = el.formFields ?? []
        return (
          <div style={{ width: '100%', height: '100%', background: getBg() ?? '#ffffff', border: styles.border ?? '1px solid #e2e8f0', borderRadius: styles.borderRadius ?? 12, padding: styles.padding ?? 24, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {el.content && <h3 style={{ margin: 0, fontSize: 16, fontWeight: '600', color: '#1a1a1a' }}>{el.content}</h3>}
            {formFields.map((f) => (
              <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: '500', color: '#374151' }}>{f.label}</label>
                {f.type === 'textarea'
                  ? <textarea placeholder={f.placeholder} rows={2} style={{ padding: '6px 10px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 6, fontFamily: 'inherit', resize: 'none' }} />
                  : <input type={f.type} placeholder={f.placeholder} style={{ padding: '6px 10px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 6, fontFamily: 'inherit' }} />
                }
              </div>
            ))}
            <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: '600', cursor: 'pointer', alignSelf: 'flex-start', fontFamily: 'inherit' }}>Submit</button>
          </div>
        )
      }
      case 'code-block':
        return (
          <div style={{ width: '100%', height: '100%', backgroundColor: styles.backgroundColor ?? '#1e1e2e', borderRadius: styles.borderRadius ?? 8, overflow: 'hidden', border: styles.border ?? '1px solid #313244' }}>
            <div style={{ display: 'flex', gap: 6, padding: '10px 14px', borderBottom: '1px solid #313244' }}>
              {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: c, display: 'inline-block' }} />)}
            </div>
            <pre style={{ margin: 0, padding: styles.padding ?? 20, fontSize: styles.fontSize ?? 13, fontFamily: styles.fontFamily ?? '"Fira Code",monospace', color: styles.color ?? '#cdd6f4', lineHeight: styles.lineHeight ?? 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              <code>{el.content}</code>
            </pre>
          </div>
        )
      case 'icon':
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: styles.iconColor ?? '#3b82f6', fontSize: styles.iconSize ?? 48 }}>
            {ICON_CHARS[el.content] ?? ICON_CHARS[el.iconName ?? ''] ?? '★'}
          </div>
        )
      default:
        return null
    }
  })()

  const content = el.link.enabled && el.type !== 'button'
    ? <a href={el.link.href} target={el.link.target} rel="noopener noreferrer" style={{ display: 'block', width: '100%', height: '100%', textDecoration: 'none' }}>{inner}</a>
    : inner

  return (
    <div id={el.anchorId || undefined} className={animClass(el.enterAnimation)} style={wrapStyle}>
      {content}
    </div>
  )
}

// ─── Scaled preview canvas ────────────────────────────────────────────────────

function PreviewCanvas({ elements, background, deviceWidth, deviceHeight, containerW, containerH }: {
  elements: CanvasElement[]
  background: CanvasBackground
  deviceWidth: number
  deviceHeight: number
  containerW: number
  containerH: number
}) {
  const scale = Math.min((containerW - 32) / deviceWidth, (containerH - 32) / deviceHeight, 1)
  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex)

  return (
    <div
      style={{
        width: deviceWidth * scale,
        height: deviceHeight * scale,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: '0 8px 48px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.3)',
        borderRadius: 8,
      }}
    >
      <div
        style={{
          width: deviceWidth,
          height: deviceHeight,
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          ...getBgStyle(background),
          fontFamily: 'system-ui, -apple-system, sans-serif',
          overflow: 'hidden',
        }}
      >
        {sorted.map((el) => !el.hidden && <StaticEl key={el.id} el={el} />)}
      </div>
    </div>
  )
}

// ─── Preview modal ────────────────────────────────────────────────────────────

interface PreviewModalProps {
  open: boolean
  onClose: () => void
  elements: CanvasElement[]
  background: CanvasBackground
  publishedSlug?: string
}

export function PreviewModal({ open, onClose, elements, background, publishedSlug }: PreviewModalProps) {
  const [deviceIdx, setDeviceIdx] = useState(0)
  const device = DEVICES[deviceIdx]!
  const contentRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = contentRef.current
    if (!el || !open) return
    const obs = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setContainerSize({ w: r.width, h: r.height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const zoom = containerSize.w > 0
    ? Math.round(Math.min((containerSize.w - 32) / device.width, (containerSize.h - 32) / device.height, 1) * 100)
    : 0

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: '#0d0d11' }}>
      {/* Browser chrome header */}
      <div
        className="flex h-12 shrink-0 items-center gap-3 border-b px-4"
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#141418' }}
      >
        {/* macOS-style traffic lights */}
        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <span className="size-3 rounded-full" style={{ background: '#ff5f57' }} />
          <span className="size-3 rounded-full" style={{ background: '#febc2e' }} />
          <span className="size-3 rounded-full" style={{ background: '#28c840' }} />
        </div>

        {/* Device switcher */}
        <div
          className="flex shrink-0 items-center gap-0.5 rounded-lg p-0.5"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {DEVICES.map((d, i) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDeviceIdx(i)}
              title={`${d.label} (${d.width}×${d.height})`}
              className="rounded-md p-1.5 transition-colors"
              style={{ color: deviceIdx === i ? '#fff' : 'rgba(255,255,255,0.35)', background: deviceIdx === i ? 'rgba(255,255,255,0.12)' : 'transparent' }}
            >
              <d.Icon className="size-3.5" />
            </button>
          ))}
        </div>

        {/* URL bar */}
        <div
          className="flex flex-1 items-center gap-2 rounded-lg px-3 py-1.5"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', maxWidth: 500 }}
        >
          <span className="size-1.5 shrink-0 rounded-full" style={{ background: publishedSlug ? '#28c840' : 'rgba(255,255,255,0.2)' }} />
          <span className="truncate font-mono text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {publishedSlug ? `yoursite.com/p/${publishedSlug}` : 'Preview — not yet published'}
          </span>
        </div>

        <div className="flex flex-1 items-center justify-end gap-2">
          {publishedSlug && (
            <a
              href={`/p/${publishedSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors"
              style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <ExternalLink className="size-3.5" />
              Open live
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            title="Close preview (Esc)"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* Preview content */}
      <div
        ref={contentRef}
        className="flex flex-1 items-center justify-center overflow-auto"
        style={{ background: '#141416', padding: 24 }}
      >
        {containerSize.w > 0 && (
          <PreviewCanvas
            elements={elements}
            background={background}
            deviceWidth={device.width}
            deviceHeight={device.height}
            containerW={containerSize.w}
            containerH={containerSize.h}
          />
        )}
      </div>

      {/* Status bar */}
      <div
        className="flex h-7 shrink-0 items-center justify-center border-t"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#141418' }}
      >
        <span className="font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {device.label} · {device.width}×{device.height} · {zoom > 0 ? `${zoom}% zoom` : '…'}
        </span>
      </div>
    </div>
  )
}
