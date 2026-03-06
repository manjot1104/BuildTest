import React from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  type CanvasElement,
  type CanvasBackground,
  type EnterAnimation,
} from '@/components/persona-builder/types'

// ─── Data fetching ────────────────────────────────────────────────────────────

interface PersonaData {
  slug: string
  title: string
  layout: string
  background?: string
  publishedAt: string
}

async function getPersona(slug: string): Promise<PersonaData | null> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const res = await fetch(`${baseUrl}/api/persona/public/${slug}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    return (await res.json()) as PersonaData
  } catch {
    return null
  }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const persona = await getPersona(username)
  if (!persona) return { title: 'Persona not found' }
  return { title: `${persona.title} — Persona`, description: `View ${persona.title}'s persona page.` }
}

// ─── Background helper ────────────────────────────────────────────────────────

function getBgCss(bg: CanvasBackground | null): string {
  if (!bg) return 'background:#ffffff;'
  if (bg.type === 'gradient')
    return `background:linear-gradient(${bg.gradientAngle}deg,${bg.gradientFrom},${bg.gradientTo});`
  if (bg.type === 'image' && bg.imageUrl)
    return `background-image:url(${bg.imageUrl});background-size:cover;background-position:center;`
  return `background:${bg.color ?? '#ffffff'};`
}

function enterAnimClass(anim: EnterAnimation | undefined): string {
  if (!anim || anim === 'none') return ''
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

// ─── Static element renderer ──────────────────────────────────────────────────

function StaticElement({ el }: { el: CanvasElement }) {
  const { styles } = el
  const animClass = enterAnimClass(el.enterAnimation)

  const getBg = (): string | undefined => {
    if (styles.gradientType === 'linear' && styles.gradientFrom && styles.gradientTo)
      return `linear-gradient(${styles.gradientAngle ?? 135}deg,${styles.gradientFrom},${styles.gradientTo})`
    if (styles.gradientType === 'radial' && styles.gradientFrom && styles.gradientTo)
      return `radial-gradient(circle,${styles.gradientFrom},${styles.gradientTo})`
    return styles.backgroundColor
  }

  const wrapStyle: React.CSSProperties = {
    position: 'absolute',
    left: el.x,
    top: el.y,
    width: el.width,
    height: el.height,
    zIndex: el.zIndex,
    opacity: styles.opacity !== undefined ? styles.opacity / 100 : 1,
    display: el.hidden ? 'none' : undefined,
  }

  const inner = (() => {
    switch (el.type) {
      case 'heading': {
        const Tag: React.ElementType = `h${el.headingLevel ?? 1}`
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
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            display: 'flex',
            alignItems: 'center',
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
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            overflow: 'auto',
          }}>{el.content}</p>
        )
      case 'image':
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={el.content || 'https://placehold.co/320x220/e2e8f0/94a3b8?text=Image'} alt="" style={{ width: '100%', height: '100%', objectFit: (styles.objectFit as React.CSSProperties['objectFit']) ?? 'cover', borderRadius: styles.borderRadius ?? 0, border: styles.border, boxShadow: styles.boxShadow, display: 'block' }} />
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
        return el.link.enabled ? <a href={el.link.href} target={el.link.target} rel="noopener noreferrer" style={{ display: 'block', width: '100%', height: '100%', textDecoration: 'none' }}>{btn}</a> : btn
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
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: styles.iconColor ?? '#374151', fontSize: (styles.iconSize ?? 28) * 0.6, fontWeight: '700', textDecoration: 'none' }} title={link.platform}>
                {link.platform.slice(0, 2).toUpperCase()}
              </a>
            ))}
          </div>
        )
      }
      case 'video-embed': {
        const ytMatch = el.content.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
        const ytId = ytMatch?.[1]
        return ytId ? (
          <iframe src={`https://www.youtube.com/embed/${ytId}`} style={{ width: '100%', height: '100%', border: 'none', borderRadius: styles.borderRadius ?? 8 }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        ) : (
          <div style={{ width: '100%', height: '100%', backgroundColor: '#0f0f0f', borderRadius: styles.borderRadius ?? 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14 }}>Video</div>
        )
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
                <a key={i} href={item.href} style={{ fontSize: styles.fontSize ?? 14, fontWeight: styles.fontWeight ?? '500', color: styles.color ?? '#ffffff', textDecoration: 'none', opacity: 0.85 }}>{item.label}</a>
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
                {f.type === 'textarea' ? <textarea placeholder={f.placeholder} rows={2} style={{ padding: '6px 10px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 6, fontFamily: 'inherit', resize: 'none' }} /> : <input type={f.type} placeholder={f.placeholder} style={{ padding: '6px 10px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 6, fontFamily: 'inherit' }} />}
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
              {['#ff5f57','#febc2e','#28c840'].map((c, i) => <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: c, display: 'inline-block' }} />)}
            </div>
            <pre style={{ margin: 0, padding: styles.padding ?? 20, fontSize: styles.fontSize ?? 13, fontFamily: styles.fontFamily ?? '"Fira Code",monospace', color: styles.color ?? '#cdd6f4', lineHeight: styles.lineHeight ?? 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              <code>{el.content}</code>
            </pre>
          </div>
        )
      case 'icon':
        return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: styles.iconColor ?? '#3b82f6', fontSize: styles.iconSize ?? 48 }}>★</div>
      default:
        return null
    }
  })()

  const content = el.link.enabled && el.type !== 'button' ? (
    <a href={el.link.href} target={el.link.target} rel="noopener noreferrer" style={{ display: 'block', width: '100%', height: '100%', textDecoration: 'none' }}>
      {inner}
    </a>
  ) : inner

  return <div id={el.anchorId || undefined} className={animClass} style={wrapStyle}>{content}</div>
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PersonaPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const persona = await getPersona(username)
  if (!persona) notFound()

  let elements: CanvasElement[] = []
  let bg: CanvasBackground | null = null
  try { elements = JSON.parse(persona.layout) as CanvasElement[] } catch { elements = [] }
  try { if (persona.background) bg = JSON.parse(persona.background) as CanvasBackground } catch { bg = null }

  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex)
  const bgCss = getBgCss(bg)

  return (
    <>
      <style>{`
        @keyframes pb-fadein    {from{opacity:0}to{opacity:1}}
        @keyframes pb-slideup   {from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pb-slidedown {from{opacity:0;transform:translateY(-28px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pb-slideleft {from{opacity:0;transform:translateX(28px)}to{opacity:1;transform:translateX(0)}}
        @keyframes pb-slideright{from{opacity:0;transform:translateX(-28px)}to{opacity:1;transform:translateX(0)}}
        @keyframes pb-zoomin    {from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}
        @keyframes pb-bounce    {0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        .pb-anim-fadein{animation:pb-fadein 0.6s ease forwards}
        .pb-anim-slideup{animation:pb-slideup 0.6s ease forwards}
        .pb-anim-slidedown{animation:pb-slidedown 0.6s ease forwards}
        .pb-anim-slideleft{animation:pb-slideleft 0.6s ease forwards}
        .pb-anim-slideright{animation:pb-slideright 0.6s ease forwards}
        .pb-anim-zoomin{animation:pb-zoomin 0.5s ease forwards}
        .pb-anim-bounce{animation:pb-bounce 1s ease infinite}
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{font-family:system-ui,-apple-system,sans-serif}
        main{position:relative;width:1440px;height:960px;margin:0 auto;${bgCss}overflow:hidden}
        @media(max-width:1460px){main{transform-origin:top left;transform:scale(calc(100vw / 1440));height:calc(960px * (100vw / 1440))}}
      `}</style>
      <main>
        {sorted.map((el) => <StaticElement key={el.id} el={el} />)}
      </main>
    </>
  )
}