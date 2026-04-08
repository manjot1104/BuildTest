import React from 'react'
import { VideoElement } from '@/components/buildify-studio/video-element'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { NavbarScrollHandler } from '@/components/buildify-studio/navbar-scroll-handler'
import {
  type CanvasElement,
  type CanvasBackground,
  type EnterAnimation,
  DEVICE_WIDTHS,
  computeResponsiveLayout,
} from '@/components/buildify-studio/types'
import { getStudioLayoutBySlug } from '@/server/db/queries'

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getDesign(slug: string) {
  try {
    return await getStudioLayoutBySlug(slug)
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
  const design = await getDesign(username)
  if (!design) return { title: 'Page not found' }

  const title = `${design.title} — Buildify`
  const description = `Check out "${design.title}" — a page designed and published with Buildify Studio.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
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

  // Text elements use minHeight so content can grow naturally without overflow/overlap
  const isTextEl = el.type === 'heading' || el.type === 'paragraph'
  const wrapStyle: React.CSSProperties = {
    position: 'absolute',
    left: el.x,
    top: el.y,
    width: el.width,
    ...(isTextEl ? { minHeight: el.height } : { height: el.height }),
    zIndex: el.zIndex,
    opacity: styles.opacity !== undefined ? styles.opacity / 100 : 1,
    display: el.hidden ? 'none' : undefined,
  }

  const inner = (() => {
    switch (el.type) {
      case 'heading': {
        const Tag: React.ElementType = `h${el.headingLevel ?? 1}`
        const slugId = el.content.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        return (
          <Tag
            id={slugId}
            data-heading={el.content.toLowerCase()}
            style={{
              width: '100%', minHeight: '100%', margin: 0,
              color: styles.color ?? '#1a1a1a',
              fontSize: styles.fontSize ?? 48,
              fontWeight: styles.fontWeight ?? '700',
              fontFamily: styles.fontFamily,
              textAlign: styles.textAlign,
              letterSpacing: styles.letterSpacing ? `${styles.letterSpacing}px` : undefined,
              lineHeight: styles.lineHeight ?? '1.2',
              padding: styles.padding ?? 4,
              wordBreak: 'normal',
              overflowWrap: 'break-word',
              whiteSpace: 'normal',
              display: 'flex',
              alignItems: 'center',
              justifyContent: styles.textAlign === 'center' ? 'center' : styles.textAlign === 'right' ? 'flex-end' : 'flex-start',
            } as React.CSSProperties}>{el.content}</Tag>
        )
      }
      case 'paragraph':
        return (
          <p style={{
            width: '100%', minHeight: '100%', margin: 0,
            color: styles.color ?? '#374151',
            fontSize: styles.fontSize ?? 16,
            fontWeight: styles.fontWeight ?? '400',
            fontFamily: styles.fontFamily,
            textAlign: styles.textAlign,
            letterSpacing: styles.letterSpacing ? `${styles.letterSpacing}px` : undefined,
            lineHeight: styles.lineHeight ?? '1.6',
            padding: styles.padding ?? 4,
            background: getBg(),
            borderRadius: styles.borderRadius,
            border: styles.border,
            boxShadow: styles.boxShadow,
            wordBreak: 'normal',
            overflowWrap: 'break-word',
            whiteSpace: 'pre-wrap',
            overflow: 'visible',
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
  return (
    <VideoElement
      content={el.content}
      borderRadius={styles.borderRadius}
      videoAutoplay={styles.videoAutoplay}
      videoLoop={styles.videoLoop}
      videoMuted={styles.videoMuted}
    />
  )
}
      case 'navbar': {
        const rawItems = el.content.split('|').filter(Boolean)
        const navLinks = rawItems.slice(1).map((item) => {
          const sep = item.indexOf('::')
          return sep > -1 ? { label: item.slice(0, sep), href: item.slice(sep + 2) } : { label: item, href: '#' }
        })
        return (
          <nav data-el-id={el.id} style={{ width: '100%', height: '100%', background: getBg() ?? '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${el.width < 500 ? 12 : styles.padding ?? 24}px`, borderRadius: styles.borderRadius, overflow: 'hidden' }}>
            <span style={{ fontWeight: '700', fontSize: el.width < 500 ? Math.min((styles.fontSize ?? 14) + 2, 13) : (styles.fontSize ?? 14) + 2, color: styles.color ?? '#ffffff', fontFamily: styles.fontFamily, flexShrink: 0, whiteSpace: 'nowrap' }}>{rawItems[0] ?? 'Brand'}</span>
            <div style={{ display: 'flex', gap: el.width < 500 ? 8 : el.width < 800 ? 14 : 24, flexWrap: 'wrap', overflow: 'hidden', maxHeight: '100%', alignItems: 'center' }}>
              {(navLinks.length > 0 ? navLinks : [{ label: 'Home', href: '#' }, { label: 'About', href: '#' }]).map((item, i) => (
                <a key={i} href={item.href} style={{ fontSize: el.width < 500 ? Math.min(styles.fontSize ?? 14, 11) : styles.fontSize ?? 14, fontWeight: styles.fontWeight ?? '500', color: styles.color ?? '#ffffff', textDecoration: 'none', opacity: 0.85, whiteSpace: 'nowrap' }}>{item.label}</a>
              ))}
            </div>
          </nav>
        )
      }
      case 'form': {
        const formFields = el.formFields ?? []
        return (
          <div style={{ width: '100%', minHeight: '100%', background: getBg() ?? '#ffffff', border: styles.border ?? '1px solid #e2e8f0', borderRadius: styles.borderRadius ?? 12, padding: styles.padding ?? 24, display: 'flex', flexDirection: 'column', gap: 12, boxSizing: 'border-box' }}>
            {el.content && <h3 style={{ margin: 0, fontSize: 16, fontWeight: '600', color: styles.color ?? '#1a1a1a' }}>{el.content}</h3>}
            {formFields.map((f) => (
              <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                <label style={{ fontSize: 12, fontWeight: '500', color: styles.color ?? '#374151' }}>{f.label}{f.required && <span style={{ color: '#ef4444' }}>*</span>}</label>
                {f.type === 'textarea'
                  ? <textarea placeholder={f.placeholder} rows={3} style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical', backgroundColor: 'rgba(255,255,255,0.05)', color: 'inherit', boxSizing: 'border-box' }} />
                  : f.type === 'select'
                    ? <select style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'inherit', backgroundColor: 'rgba(255,255,255,0.05)', color: 'inherit', boxSizing: 'border-box' }}>
                        <option value="">{f.placeholder ?? 'Select...'}</option>
                        {f.options?.map((opt, oi) => <option key={oi} value={opt}>{opt}</option>)}
                      </select>
                    : f.type === 'checkbox'
                      ? <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><input type="checkbox" /> {f.placeholder ?? f.label}</label>
                      : <input type={f.type} placeholder={f.placeholder} style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'inherit', backgroundColor: 'rgba(255,255,255,0.05)', color: 'inherit', boxSizing: 'border-box' }} />
                }
              </div>
            ))}
            <button type="submit" style={{ width: '100%', padding: '10px 16px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 }}>Submit</button>
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

  return <div data-el-id={el.id} className={animClass} style={wrapStyle}>{content}</div>
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PublishedPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const design = await getDesign(username)
  if (!design) notFound()

  let elements: CanvasElement[] = []
  let bg: CanvasBackground | null = null
  try { elements = JSON.parse(design.layout) as CanvasElement[] } catch { elements = [] }
  try { if (design.background) bg = JSON.parse(design.background) as CanvasBackground } catch { bg = null }

  const bgCss = getBgCss(bg)

  // Compute responsive layouts for each device
  const desktopLayout = [...elements].sort((a, b) => a.zIndex - b.zIndex)
  const tabletLayout = [...computeResponsiveLayout(elements, 'tablet')].sort((a, b) => a.zIndex - b.zIndex)
  const mobileLayout = [...computeResponsiveLayout(elements, 'mobile')].sort((a, b) => a.zIndex - b.zIndex)

  const heightOf = (layout: CanvasElement[]) =>
    layout.length > 0 ? Math.max(960, ...layout.map((el) => el.y + el.height)) + 40 : 960

  const desktopH = heightOf(desktopLayout)
  const tabletH = heightOf(tabletLayout)
  const mobileH = heightOf(mobileLayout)

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
        html{scroll-behavior:smooth;overflow-x:hidden;max-width:100vw}
        body{font-family:system-ui,-apple-system,sans-serif;overflow-x:hidden;-webkit-font-smoothing:antialiased;max-width:100vw}
        .pb-desktop,.pb-tablet,.pb-mobile{display:none}
        .pb-desktop{display:block}
        .pb-desktop{position:relative;width:1440px;min-height:${desktopH}px;margin:0 auto;${bgCss};overflow-x:hidden}
        @media(max-width:1439px) and (min-width:769px){
          html{overflow-x:hidden}
          body{overflow-x:hidden;width:100vw}
          .pb-desktop{
            transform:scale(calc(100vw / 1440));
            transform-origin:top left;
            margin-left:calc((100vw - 1440px) / 2);
          }
        }
        @media(max-width:768px) and (min-width:481px){
          .pb-desktop{display:none}
          .pb-tablet{display:block;position:relative;width:100vw;max-width:${DEVICE_WIDTHS.tablet}px;min-height:${tabletH}px;margin:0 auto;${bgCss};overflow-x:hidden}
          body{height:auto;overflow-y:auto}
        }
        @media(max-width:480px){
          .pb-desktop{display:none}
          .pb-tablet{display:none}
          .pb-mobile{display:block;position:relative;width:100vw;max-width:${DEVICE_WIDTHS.mobile}px;min-height:${mobileH}px;margin:0 auto;${bgCss};overflow-x:hidden}
          body{height:auto;overflow-y:auto}
        }
      `}</style>
      {/* Desktop layout */}
      <main className="pb-desktop">
        <NavbarScrollHandler />
        {desktopLayout.map((el) => !el.hidden && <StaticElement key={el.id} el={el} />)}
      </main>
      {/* Tablet layout — pre-computed positions from computeResponsiveLayout */}
      <main className="pb-tablet">
        <NavbarScrollHandler />
        {tabletLayout.map((el) => !el.hidden && <StaticElement key={`t-${el.id}`} el={el} />)}
      </main>
      {/* Mobile layout — pre-computed positions from computeResponsiveLayout */}
      <main className="pb-mobile">
        <NavbarScrollHandler />
        {mobileLayout.map((el) => !el.hidden && <StaticElement key={`m-${el.id}`} el={el} />)}
      </main>
    </>
  )
}
