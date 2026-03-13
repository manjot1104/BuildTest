'use client'

import React, { useRef, useCallback, useEffect } from 'react'
import {
  Star, Heart, Zap, Check, Home, User, Mail, Phone, Globe, Camera,
  Code, Music, Coffee, Shield, Rocket, Smile, Diamond, Flame, Leaf, Crown,
  Github, Twitter, Linkedin, Instagram, Youtube, Facebook, MessageSquare,
  Play, Search, Settings, Bell, BookOpen, Calendar, Clock, Cloud, Database,
  Download, Edit, Eye, File, Filter, Flag, Gift, Grid, Hash, Image,
  Inbox, Key, Layers, Link, Lock, Map, MapPin, Monitor, Moon, Package,
  PenTool, Percent, PieChart, Printer, Radio, RefreshCw, Save, Send,
  Server, Share2, ShoppingBag, ShoppingCart, Sidebar, Sliders, Smartphone,
  Speaker, Sun, Tag, Target, Terminal, ThumbsUp, Trash2, TrendingUp,
  Truck, Tv, Umbrella, Unlock, Upload, Video, Wifi, Wind, Award,
  BarChart2, Bookmark, Box, Briefcase, Clipboard, Compass, Cpu, CreditCard,
  Disc, DollarSign, Feather, FileText, Folder, HardDrive, Headphones,
  HelpCircle, Activity, Airplay, AlertCircle, AlertTriangle, Anchor,
  Archive, ArrowRight, AtSign, Battery, BellOff, Bluetooth,
  Bold, Cast, CheckCircle, ChevronRight, Circle, Codepen, Command,
  Copy, Crosshair, Delete, Dribbble,
  Droplet, ExternalLink, EyeOff, FastForward,
  Figma, Film, FolderPlus, Framer, Frown, Aperture,
  GitBranch, GitCommit, GitMerge, Gitlab,
  Hexagon, Info, Italic, Layout, LifeBuoy, Loader,
  LogIn, LogOut, Maximize, Meh, Menu, MessageCircle,
  Mic, MinusCircle, MoreHorizontal, MousePointer, Move, Navigation,
  Octagon, Paperclip, Pause, PhoneCall, PlusCircle,
  Power, Repeat, Rewind, RotateCcw, Rss,
  Scissors, Shuffle, SkipBack, SkipForward, Slash, Square,
  StopCircle, Sunrise, Sunset, Tablet, Thermometer, ToggleLeft,
  Wrench, Triangle, Type, UserCheck, UserMinus, UserPlus, UserX, Users,
  VolumeX, Volume2, Watch, XCircle, ZoomIn, ZoomOut,
} from 'lucide-react'
import { type CanvasElement, type EnterAnimation, type HoverAnimation, type SocialPlatform } from './types'
import { findSectionHeading, smoothScrollToElement } from '@/lib/navigation-utils'

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
  // Original 20
  star: Star, heart: Heart, zap: Zap, check: Check, home: Home, user: User,
  mail: Mail, phone: Phone, globe: Globe, camera: Camera, code: Code,
  music: Music, coffee: Coffee, shield: Shield, rocket: Rocket, smile: Smile,
  diamond: Diamond, flame: Flame, leaf: Leaf, crown: Crown,
  // Extended set
  search: Search, settings: Settings, bell: Bell, 'book-open': BookOpen,
  calendar: Calendar, clock: Clock, cloud: Cloud, database: Database,
  download: Download, edit: Edit, eye: Eye, file: File, filter: Filter,
  flag: Flag, gift: Gift, grid: Grid, hash: Hash, image: Image,
  inbox: Inbox, key: Key, layers: Layers, link: Link, lock: Lock,
  map: Map, 'map-pin': MapPin, monitor: Monitor, moon: Moon, package: Package,
  'pen-tool': PenTool, percent: Percent, 'pie-chart': PieChart, printer: Printer,
  radio: Radio, 'refresh-cw': RefreshCw, save: Save, send: Send,
  server: Server, share: Share2, 'shopping-bag': ShoppingBag,
  'shopping-cart': ShoppingCart, sidebar: Sidebar, sliders: Sliders,
  smartphone: Smartphone, speaker: Speaker, sun: Sun, tag: Tag,
  target: Target, terminal: Terminal, 'thumbs-up': ThumbsUp, trash: Trash2,
  'trending-up': TrendingUp, truck: Truck, tv: Tv, umbrella: Umbrella,
  unlock: Unlock, upload: Upload, video: Video, wifi: Wifi, wind: Wind,
  award: Award, 'bar-chart': BarChart2, bookmark: Bookmark, box: Box,
  briefcase: Briefcase, clipboard: Clipboard, compass: Compass, cpu: Cpu,
  'credit-card': CreditCard, disc: Disc, 'dollar-sign': DollarSign,
  feather: Feather, 'file-text': FileText, folder: Folder,
  'hard-drive': HardDrive, headphones: Headphones, 'help-circle': HelpCircle,
  activity: Activity, airplay: Airplay, 'alert-circle': AlertCircle,
  'alert-triangle': AlertTriangle, anchor: Anchor, archive: Archive,
  'arrow-right': ArrowRight, 'at-sign': AtSign, battery: Battery,
  'bell-off': BellOff, bluetooth: Bluetooth, bold: Bold, cast: Cast,
  'check-circle': CheckCircle, 'chevron-right': ChevronRight, circle: Circle,
  codepen: Codepen, command: Command, copy: Copy, crosshair: Crosshair,
  delete: Delete, dribbble: Dribbble, droplet: Droplet,
  'external-link': ExternalLink, 'eye-off': EyeOff, 'fast-forward': FastForward,
  figma: Figma, film: Film, 'folder-plus': FolderPlus, framer: Framer,
  frown: Frown, aperture: Aperture, 'git-branch': GitBranch,
  'git-commit': GitCommit, 'git-merge': GitMerge, gitlab: Gitlab,
  hexagon: Hexagon, info: Info, italic: Italic, layout: Layout,
  'life-buoy': LifeBuoy, loader: Loader, 'log-in': LogIn, 'log-out': LogOut,
  maximize: Maximize, meh: Meh, menu: Menu, 'message-circle': MessageCircle,
  mic: Mic, 'minus-circle': MinusCircle, 'more-horizontal': MoreHorizontal,
  'mouse-pointer': MousePointer, move: Move, navigation: Navigation,
  octagon: Octagon, paperclip: Paperclip, pause: Pause, 'phone-call': PhoneCall,
  'plus-circle': PlusCircle, power: Power, repeat: Repeat, rewind: Rewind,
  'rotate-ccw': RotateCcw, rss: Rss, scissors: Scissors, shuffle: Shuffle,
  'skip-back': SkipBack, 'skip-forward': SkipForward, slash: Slash,
  square: Square, 'stop-circle': StopCircle, sunrise: Sunrise, sunset: Sunset,
  tablet: Tablet, thermometer: Thermometer, 'toggle-left': ToggleLeft,
  tool: Wrench, triangle: Triangle, type: Type, 'user-check': UserCheck,
  'user-minus': UserMinus, 'user-plus': UserPlus, 'user-x': UserX, users: Users,
  'volume-x': VolumeX, volume: Volume2, watch: Watch, 'x-circle': XCircle,
  'zoom-in': ZoomIn, 'zoom-out': ZoomOut, play: Play, github: Github,
  twitter: Twitter, linkedin: Linkedin, instagram: Instagram, youtube: Youtube,
  facebook: Facebook, 'message-square': MessageSquare,
}

/** All available icon names for the picker UI */
export const ICON_NAMES = Object.keys(ICON_MAP)

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
  const hoverMap: Record<HoverAnimation, string> = {
    none: '',
    scale: 'pb-hover-scale',
    lift: 'pb-hover-lift',
    outline: 'pb-hover-glow',
  }
  return hoverMap[anim] ?? ''
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
  // Apply overflow:hidden + borderRadius on the outer container for images
  // so border-radius clips the image properly
  const needsClip = el.type === 'image'
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
    ...(needsClip ? { overflow: 'hidden', borderRadius: el.styles.borderRadius ?? 0 } : {}),
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
    minHeight: '100%',
    color: styles.color ?? '#1a1a1a',
    overflow: 'visible',
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
  }

  const slugId = content.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  return (
    <Tag
      id={slugId}
      data-heading={content.toLowerCase()}
      contentEditable={!isPreview && isSelected}
      suppressContentEditableWarning
      onBlur={(e: React.FocusEvent<HTMLElement>) => onContentChange(element.id, (e.currentTarget as HTMLElement).textContent ?? '')}
      onMouseDown={isSelected && !isPreview ? (e: React.MouseEvent) => e.stopPropagation() : undefined}
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
        minHeight: '100%',
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
        overflow: 'visible',
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
  const ytMatch = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/.exec(url)
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
  const rawItems = content.split('|').filter(Boolean)
  const bgStyle = getBackgroundStyle(styles)
  // Parse "Label::href" format — backward compatible with plain "Label"
  const navItems = (rawItems.length > 1 ? rawItems.slice(1) : ['Home', 'About', 'Contact'])
    .map((item) => {
      const sepIdx = item.indexOf('::')
      if (sepIdx > -1) return { label: item.slice(0, sepIdx), href: item.slice(sepIdx + 2) }
      return { label: item, href: '#' }
    })
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
        {rawItems[0] ?? 'Brand'}
      </span>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        {navItems.map((item, i) => (
          <a
            key={i}
            href={item.href || '#'}
            onClick={(e) => {
              if (item.href && item.href !== '#') return
              e.preventDefault()
              e.stopPropagation()
              if (!isPreview) return

              const targetHeading = findSectionHeading(item.label)
              if (targetHeading) {
                smoothScrollToElement(targetHeading)
              }
            }}
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
            {item.label}
          </a>
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
    padding: '8px 12px',
    fontSize: 13,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    outline: 'none',
    background: '#f9fafb',
    color: '#1a1a1a',
    fontFamily: 'inherit',
    resize: 'none',
    boxSizing: 'border-box',
  }
  return (
    <div
      style={{
        width: '100%',
        minHeight: '100%',
        ...bgStyle,
        border: styles.border ?? '1px solid #e2e8f0',
        borderRadius: styles.borderRadius ?? 12,
        padding: styles.padding ?? 24,
        boxShadow: styles.boxShadow,
        overflow: 'visible',
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
      let isDragging = false
      let ghost: HTMLDivElement | null = null

      // Alignment guide elements
      const guides: HTMLDivElement[] = []
      const SNAP_THRESHOLD = 6

      const clearGuides = () => {
        guides.forEach((g) => g.remove())
        guides.length = 0
      }

      const showGuide = (left: number, top: number, width: number, height: number) => {
        const g = document.createElement('div')
        g.style.cssText = `position:absolute;background:#f43f5e;pointer-events:none;z-index:100000;left:${left}px;top:${top}px;width:${width}px;height:${height}px;`
        canvasRef.current?.appendChild(g)
        guides.push(g)
      }

      const onMouseMove = (ev: MouseEvent) => {
        const dx = (ev.clientX - startMouseX) / zoom
        const dy = (ev.clientY - startMouseY) / zoom

        // Dead zone: require 3px movement before starting drag
        if (!isDragging) {
          if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return
          isDragging = true
          ghost = document.createElement('div')
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
        }

        let newX = startElemX + dx
        let newY = startElemY + dy
        const elCX = newX + element.width / 2
        const elCY = newY + element.height / 2
        const elR = newX + element.width
        const elB = newY + element.height

        // Alignment snapping against other elements
        clearGuides()
        const canvasEl = canvasRef.current
        if (canvasEl) {
          const siblings = canvasEl.querySelectorAll<HTMLDivElement>('[data-element-id]')
          const cW = canvasEl.offsetWidth
          const cH = canvasEl.offsetHeight

          // Canvas center guides
          if (Math.abs(elCX - cW / 2) < SNAP_THRESHOLD) {
            newX = cW / 2 - element.width / 2
            showGuide(cW / 2, 0, 1, cH)
          }
          if (Math.abs(elCY - cH / 2) < SNAP_THRESHOLD) {
            newY = cH / 2 - element.height / 2
            showGuide(0, cH / 2, cW, 1)
          }

          siblings.forEach((sib) => {
            const sibId = sib.getAttribute('data-element-id')
            if (sibId === element.id) return
            const sX = parseFloat(sib.style.left) || 0
            const sY = parseFloat(sib.style.top) || 0
            const sW = sib.offsetWidth
            const sH = sib.offsetHeight
            const sCX = sX + sW / 2
            const sCY = sY + sH / 2

            // Vertical center alignment
            if (Math.abs(elCX - sCX) < SNAP_THRESHOLD) {
              newX = sCX - element.width / 2
              showGuide(sCX, Math.min(newY, sY), 1, Math.max(elB, sY + sH) - Math.min(newY, sY))
            }
            // Left edge
            if (Math.abs(newX - sX) < SNAP_THRESHOLD) {
              newX = sX
              showGuide(sX, Math.min(newY, sY), 1, Math.max(elB, sY + sH) - Math.min(newY, sY))
            }
            // Right edge
            if (Math.abs(elR - (sX + sW)) < SNAP_THRESHOLD) {
              newX = sX + sW - element.width
              showGuide(sX + sW, Math.min(newY, sY), 1, Math.max(elB, sY + sH) - Math.min(newY, sY))
            }
            // Horizontal center
            if (Math.abs(elCY - sCY) < SNAP_THRESHOLD) {
              newY = sCY - element.height / 2
              showGuide(Math.min(newX, sX), sCY, Math.max(elR, sX + sW) - Math.min(newX, sX), 1)
            }
            // Top edge
            if (Math.abs(newY - sY) < SNAP_THRESHOLD) {
              newY = sY
              showGuide(Math.min(newX, sX), sY, Math.max(elR, sX + sW) - Math.min(newX, sX), 1)
            }
            // Bottom edge
            if (Math.abs(elB - (sY + sH)) < SNAP_THRESHOLD) {
              newY = sY + sH - element.height
              showGuide(Math.min(newX, sX), sY + sH, Math.max(elR, sX + sW) - Math.min(newX, sX), 1)
            }
          })
        }

        if (ghost) {
          ghost.style.left = `${newX}px`
          ghost.style.top = `${newY}px`
        }
      }

      const onMouseUp = (ev: MouseEvent) => {
        clearGuides()
        if (!isDragging) {
          // Was just a click, not a drag
          document.removeEventListener('mousemove', onMouseMove)
          document.removeEventListener('mouseup', onMouseUp)
          return
        }
        const dx = (ev.clientX - startMouseX) / zoom
        const dy = (ev.clientY - startMouseY) / zoom
        if (ghost) {
          // Read the snapped position from ghost
          const finalX = parseFloat(ghost.style.left) || (startElemX + dx)
          const finalY = parseFloat(ghost.style.top) || (startElemY + dy)
          ghost.remove()
          ghostRef.current = null
          onDragEnd(element.id, Math.round(finalX), Math.round(finalY))
        }
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
      data-element-id={element.id}
      data-section={
        element.type === 'section' || element.type === 'container'
          ? element.id
          : undefined
      }
      className={[enterClass, hoverClass].filter(Boolean).join(' ')}
      style={containerStyle}
     onMouseDown={(e) => {
  startDrag(e)
}}
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