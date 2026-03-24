'use client'

import {
    motion,
    useScroll,
    useTransform,
    useMotionValueEvent,
    useInView,
    type Variants,
} from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useStateMachine } from '@/context/state-machine'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowUpRight, Zap, Shield, Code2, Layers, Globe, Sparkles, Moon, Sun, SendHorizonal, Plus, Mic, X, FileText, Loader2, Wrench, MessageSquareText, FileUser, Palette, ChevronLeft, ChevronRight, Play, Rocket, FlaskConical, ScanEye, Radio, LayoutTemplate, Type, MousePointerClick, Eye, Save, Upload, Monitor, Tablet, Smartphone, Grid3X3, Undo2, Redo2, Terminal, CircleCheck, Fish, Search, ChevronDown } from 'lucide-react'
import { BuildifyLogo } from '@/components/buildify-logo'
import { CommunityBuildsGrid } from '@/components/chat/community-builds-grid'
import { Footer } from '@/components/layout/footer'
import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { savePromptToStorage, createImageAttachment, type ImageAttachment } from '@/components/ai-elements/prompt-input'
import { useSpeechRecord } from '@/hooks/use-speech-record'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

// --- Animation Variants ---

const maskReveal: Variants = {
    hidden: { clipPath: 'inset(0 0 100% 0)' },
    visible: (delay = 0) => ({
        clipPath: 'inset(0 0 0% 0)',
        transition: { duration: 1, ease: [0.77, 0, 0.175, 1], delay },
    }),
}

const slideUp: Variants = {
    hidden: { y: '100%' },
    visible: (delay = 0) => ({
        y: '0%',
        transition: { duration: 0.8, ease: [0.77, 0, 0.175, 1], delay },
    }),
}

const fadeIn: Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: (delay = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1], delay },
    }),
}

const scaleIn: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: (delay = 0) => ({
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1], delay },
    }),
}

const blurIn: Variants = {
    hidden: { opacity: 0, y: 16, filter: 'blur(8px)' },
    visible: (delay = 0) => ({
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: { duration: 0.9, ease: [0.25, 0.1, 0.25, 1], delay },
    }),
}

// --- Floating Elements ---

const FLOATING_ELEMENTS = [
    // Top-left: small code snippet card
    { type: 'card' as const, x: '8%', y: '18%', w: 120, h: 64, delay: 0, dur: 14, range: 20, rotation: 3 },
    // Top-right: abstract circle
    { type: 'circle' as const, x: '85%', y: '15%', w: 48, h: 48, delay: 2, dur: 18, range: 25, rotation: 0 },
    // Left middle: UI button shape
    { type: 'pill' as const, x: '5%', y: '55%', w: 80, h: 32, delay: 1, dur: 16, range: 18, rotation: -5 },
    // Right middle: small card
    { type: 'card' as const, x: '90%', y: '50%', w: 100, h: 56, delay: 3, dur: 15, range: 22, rotation: -4 },
    // Bottom-left: gradient blob
    { type: 'blob' as const, x: '12%', y: '78%', w: 64, h: 64, delay: 1.5, dur: 20, range: 15, rotation: 0 },
    // Bottom-right: circle
    { type: 'circle' as const, x: '82%', y: '80%', w: 36, h: 36, delay: 4, dur: 17, range: 20, rotation: 0 },
]

function FloatingElement({ el }: { el: typeof FLOATING_ELEMENTS[0] }) {
    const content = useMemo(() => {
        switch (el.type) {
            case 'card':
                return (
                    <div className="rounded-xl border border-border/20 bg-background/40 dark:bg-background/20 backdrop-blur-md shadow-lg shadow-black/[0.02] dark:shadow-black/[0.08] p-3 space-y-1.5">
                        <div className="h-1.5 bg-primary/20 rounded-full w-3/4" />
                        <div className="h-1.5 bg-muted-foreground/10 rounded-full w-1/2" />
                        <div className="h-1.5 bg-muted-foreground/8 rounded-full w-2/3" />
                    </div>
                )
            case 'circle':
                return (
                    <div
                        className="rounded-full"
                        style={{
                            width: el.w,
                            height: el.h,
                            background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.03) 70%)',
                            border: '1px solid rgba(59,130,246,0.1)',
                        }}
                    />
                )
            case 'pill':
                return (
                    <div className="rounded-full border border-primary/15 bg-primary/5 backdrop-blur-sm px-4 py-1.5 flex items-center gap-2">
                        <div className="size-2 rounded-full bg-primary/30" />
                        <div className="h-1.5 bg-primary/15 rounded-full w-10" />
                    </div>
                )
            case 'blob':
                return (
                    <div
                        className="rounded-full"
                        style={{
                            width: el.w,
                            height: el.h,
                            background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(59,130,246,0.05) 60%, transparent 80%)',
                            filter: 'blur(4px)',
                        }}
                    />
                )
        }
    }, [el])

    return (
        <motion.div
            className="absolute pointer-events-none z-[1] hidden md:block"
            style={{ left: el.x, top: el.y, width: el.w, height: el.h }}
            initial={{ opacity: 0 }}
            animate={{
                opacity: [0, 0.6, 0.8, 0.6, 0],
                y: [-el.range, el.range, -el.range],
                x: [-el.range * 0.3, el.range * 0.3, -el.range * 0.3],
                rotate: [-el.rotation, el.rotation, -el.rotation],
            }}
            transition={{
                opacity: { duration: el.dur, repeat: Infinity, delay: el.delay, ease: 'easeInOut' },
                y: { duration: el.dur, repeat: Infinity, delay: el.delay, ease: 'easeInOut' },
                x: { duration: el.dur * 1.3, repeat: Infinity, delay: el.delay, ease: 'easeInOut' },
                rotate: { duration: el.dur * 1.5, repeat: Infinity, delay: el.delay, ease: 'easeInOut' },
            }}
        >
            {content}
        </motion.div>
    )
}

// --- Floating Gradient Orb (visible, for section backgrounds) ---
function FloatingOrb({ color, size, top, left, duration, delay }: {
    color: string; size: number; top: string; left: string; duration: number; delay: number
}) {
    return (
        <motion.div
            className="absolute pointer-events-none rounded-full"
            style={{
                width: size,
                height: size,
                top,
                left,
                background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
                filter: 'blur(60px)',
            }}
            animate={{
                x: [0, 40, -20, 30, 0],
                y: [0, -30, 20, -10, 0],
                scale: [1, 1.15, 0.95, 1.1, 1],
            }}
            transition={{
                duration,
                delay,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
        />
    )
}

// --- Reusable Components ---

function RevealText({ children, delay = 0, className = '' }: {
    children: React.ReactNode
    delay?: number
    className?: string
}) {
    return (
        <div className={`overflow-hidden ${className}`}>
            <motion.div
                variants={slideUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                custom={delay}
            >
                {children}
            </motion.div>
        </div>
    )
}

function SectionLabel({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
    return (
        <motion.span
            variants={fadeIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            custom={delay}
            className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.2em] uppercase text-primary/70"
        >
            <span className="inline-block size-1.5 rounded-full bg-primary/50" />
            {children}
        </motion.span>
    )
}

// --- Attachment Preview ---

function getFileTypeInfo(file: File) {
    const type = file.type
    const name = file.name.toLowerCase()
    if (type.startsWith('video/') || name.endsWith('.mp4') || name.endsWith('.mov') || name.endsWith('.webm'))
        return { label: 'Video', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' }
    if (type === 'application/pdf' || name.endsWith('.pdf'))
        return { label: 'PDF', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
    if (type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx'))
        return { label: 'Document', color: '#3B7EFF', bg: 'rgba(59,126,255,0.12)' }
    if (type.includes('spreadsheet') || name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv'))
        return { label: 'Spreadsheet', color: '#16a34a', bg: 'rgba(22,163,74,0.12)' }
    if (type.includes('presentation') || name.endsWith('.ppt') || name.endsWith('.pptx'))
        return { label: 'Presentation', color: '#f97316', bg: 'rgba(249,115,22,0.12)' }
    return { label: 'File', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' }
}

function AttachmentCard({ attachment, onRemove }: { attachment: ImageAttachment; onRemove: () => void }) {
    const isImage = attachment.file.type.startsWith('image/')
    const { label, color, bg } = getFileTypeInfo(attachment.file)
    const shortName = attachment.file.name.length > 22
        ? attachment.file.name.slice(0, 19) + '…'
        : attachment.file.name

    if (isImage && attachment.preview) {
        return (
            <div className="relative group rounded-xl overflow-hidden border border-border/30 shrink-0 w-14 h-14">
                <Image
                    src={attachment.preview}
                    alt={attachment.file.name}
                    width={56}
                    height={56}
                    className="w-14 h-14 object-cover block"
                    unoptimized
                />
                <button
                    type="button"
                    onClick={onRemove}
                    className="absolute top-0.5 right-0.5 size-4 rounded-full bg-black/55 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <X className="size-2.5" />
                </button>
            </div>
        )
    }

    return (
        <div className="relative group flex items-center gap-2.5 rounded-xl bg-muted/50 border border-border/40 pl-2.5 pr-7 py-2 max-w-[200px] shrink-0">
            <div
                className="size-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: bg }}
            >
                <FileText className="size-4" style={{ color }} />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium leading-tight truncate">{shortName}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
            </div>
            <button
                type="button"
                onClick={onRemove}
                className="absolute top-1 right-1 size-4 rounded-full bg-foreground/15 hover:bg-foreground/30 text-foreground flex items-center justify-center transition-colors"
            >
                <X className="size-2.5" />
            </button>
        </div>
    )
}

// --- Hero Prompt Input ---

const ROTATING_WORDS = [
    'portfolio website',
    'landing page',
    'startup website',
    'personal blog',
    'AI-powered tool',
    'SaaS dashboard',
    'mobile app UI',
    'e-commerce store',
]

function DynamicPlaceholder({ paused }: { paused: boolean }) {
    const [index, setIndex] = useState(0)
    const [out, setOut] = useState(false)

    useEffect(() => {
        if (paused) return
        const id = setInterval(() => {
            setOut(true)
            setTimeout(() => {
                setIndex((i) => (i + 1) % ROTATING_WORDS.length)
                setOut(false)
            }, 280)
        }, 2600)
        return () => clearInterval(id)
    }, [paused])

    return (
        <span className="select-none text-sm leading-relaxed">
            <span className="text-muted-foreground/65">Build a </span>
            <span
                style={{
                    display: 'inline-block',
                    opacity: out ? 0 : 1,
                    transform: out ? 'translateY(-6px)' : 'translateY(0)',
                    transition: 'opacity 0.26s ease, transform 0.26s ease',
                    color: '#3B7EFF',
                    fontWeight: 500,
                }}
            >
                {ROTATING_WORDS[index]}
            </span>
        </span>
    )
}

// --- Main Page ---

const FEATURE_DEMOS = [
    {
        title: 'Accessibility Tester',
        description: 'Scan any website for accessibility issues with a single URL. Get detailed WCAG compliance reports, violation breakdowns, and actionable fixes — all powered by automation.',
        bullets: ['Automated WCAG compliance scanning', 'Detailed violation reports with fixes', 'Live test logs and history tracking'],
        video: '/videos/accessibility-tester-demo.mp4',
        href: '/dashboard/accessibility-tester',
    },
    {
        title: 'Builder',
        description: 'Describe any application in plain English and watch it come to life. Buildify generates production-ready, full-stack code from a single conversation.',
        bullets: ['Natural language to working app', 'Full-stack code generation', 'Iterate through conversation'],
        video: '/videos/builder-demo.mp4',
        href: '/chat',
    },
    {
        title: 'Buildify Studio',
        description: 'A visual design tool for building pages, prototypes, and layouts with drag-and-drop precision. No code required — just design and publish.',
        bullets: ['Drag-and-drop page builder', '14+ element types with animations', 'One-click publish to a live URL'],
        video: '/videos/buildify-studio-demo.mp4',
        href: '/buildify-studio',
    },
    {
        title: 'AI Chat',
        description: 'Chat with free open-source AI models to generate and preview apps instantly. Run code right in the browser with a single click.',
        bullets: ['Multiple free AI models', 'Instant in-browser preview', 'No API key required'],
        video: '/videos/ai-chat-demo.mp4',
        href: '/ai-chat',
    },
    {
        title: 'AI Resume Builder',
        description: 'Create professional, ATS-friendly resumes powered by AI. Pick a template, fill in your details, and export a polished PDF in minutes.',
        bullets: ['AI-assisted content writing', 'Multiple professional templates', 'One-click PDF export'],
        video: '/videos/resume-builder-demo.mp4',
        href: '/resume-builder',
    },
] as const

function FeatureVideo({ src, index, onClick }: { src: string; index: number; onClick?: () => void }) {
    const ref = useRef<HTMLVideoElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const isInView = useInView(containerRef, { once: false, margin: '-100px' })

    useEffect(() => {
        const video = ref.current
        if (!video) return
        video.playbackRate = 1.35
        if (isInView) {
            video.play().catch(() => {})
        } else {
            video.pause()
        }
    }, [isInView])

    return (
        <div
            ref={containerRef}
            className="feature-video-outer relative"
        >
            <div
                className="feature-video-glow-track"
                style={{
                    animationPlayState: isInView ? 'running' : 'paused',
                    animationDelay: `${index * 0.4}s`,
                }}
            />
            <motion.div
                variants={maskReveal}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                custom={0.15}
                className="feature-video-inner relative rounded-[20px] overflow-hidden border border-border/30 shadow-lg shadow-black/[0.03] dark:shadow-black/[0.15] cursor-pointer group/video"
                onClick={onClick}
            >
                <video
                    ref={ref}
                    src={src}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className="w-full block"
                />
                {/* Play overlay on hover */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/video:bg-black/30 transition-all duration-300">
                    <div className="size-14 rounded-full bg-white/90 dark:bg-white/80 flex items-center justify-center opacity-0 group-hover/video:opacity-100 scale-75 group-hover/video:scale-100 transition-all duration-300 shadow-xl">
                        <Play className="size-6 text-black fill-black ml-0.5" />
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

// --- AI Chat Flow Section ---

const AI_CHAT_PROMPT = 'Plan a portfolio website with dark theme'

const AI_RESPONSE_LINES = [
    "Here's a plan for your portfolio:",
    '  Dark theme with subtle gradients',
    '  Hero section with animated intro',
    '  Projects grid with hover effects',
    '  Contact form with validation',
]

// Phase: typing → sent → bubble → delay → AI response
type ChatPhase = 'idle' | 'typing' | 'sending' | 'sent' | 'thinking' | 'responding' | 'done'

function FlowAIChatVisual({ inView }: { inView: boolean }) {
    const [phase, setPhase] = useState<ChatPhase>('idle')
    const [typedChars, setTypedChars] = useState(0)
    const [visibleLines, setVisibleLines] = useState(0)
    const [sendPulse, setSendPulse] = useState(false)
    const hasStarted = useRef(false)
    const timers = useRef<ReturnType<typeof setTimeout>[]>([])

    const schedule = useCallback((fn: () => void, ms: number) => {
        const t = setTimeout(fn, ms)
        timers.current.push(t)
        return t
    }, [])

    useEffect(() => {
        if (!inView || hasStarted.current) return
        hasStarted.current = true

        // Natural delay per character — pauses after spaces and punctuation
        const getCharDelay = (index: number) => {
            const base = 45 + Math.random() * 35 // 45–80ms base
            if (index === 0) return base
            const prev = AI_CHAT_PROMPT[index - 1]!
            if (prev === ' ') return base + 80 + Math.random() * 70 // word pause
            if (',.:;!?'.includes(prev)) return base + 150 + Math.random() * 100 // punctuation
            return base
        }

        const typeNextChar = (index: number) => {
            if (index >= AI_CHAT_PROMPT.length) {
                // Pause before sending — cursor blinks for a beat
                schedule(() => {
                    setSendPulse(true)
                    setPhase('sending')

                    schedule(() => {
                        setSendPulse(false)
                        setPhase('sent')

                        schedule(() => {
                            setPhase('thinking')

                            schedule(() => {
                                setPhase('responding')
                                let lineIdx = 0
                                const lineInterval = setInterval(() => {
                                    lineIdx++
                                    setVisibleLines(lineIdx)
                                    if (lineIdx >= AI_RESPONSE_LINES.length) {
                                        clearInterval(lineInterval)
                                        schedule(() => setPhase('done'), 300)
                                    }
                                }, 200)
                                timers.current.push(lineInterval as unknown as ReturnType<typeof setTimeout>)
                            }, 800)
                        }, 400)
                    }, 350)
                }, 300)
                return
            }
            setTypedChars(index + 1)
            schedule(() => typeNextChar(index + 1), getCharDelay(index + 1))
        }

        // Start typing after initial delay
        schedule(() => {
            setPhase('typing')
            typeNextChar(0)
        }, 500)

        return () => { timers.current.forEach(clearTimeout) }
    }, [inView, schedule])

    const isTypingInInput = phase === 'typing'
    const showBubble = phase === 'sent' || phase === 'thinking' || phase === 'responding' || phase === 'done'
    const showThinking = phase === 'thinking'
    const showAIResponse = phase === 'responding' || phase === 'done'

    return (
        <div className="relative">
            {/* Subtle glow behind container */}
            <div className="absolute -inset-4 rounded-3xl bg-primary/[0.04] blur-2xl pointer-events-none" />

            {/* Chat container */}
            <motion.div
                animate={inView ? { y: [0, -4, 0] } : {}}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden"
            >
                {/* Title bar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-muted/30">
                    <div className="flex gap-1.5">
                        <div className="size-2.5 rounded-full bg-border/60" />
                        <div className="size-2.5 rounded-full bg-border/60" />
                        <div className="size-2.5 rounded-full bg-border/60" />
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground/50 ml-2">Buildify Chat</span>
                </div>

                {/* Chat body */}
                <div className="p-5 space-y-4 min-h-[280px] md:min-h-[320px]">
                    {/* User message bubble — appears after send */}
                    {showBubble && (
                        <motion.div
                            initial={{ opacity: 0, y: 12, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                            className="flex justify-end"
                        >
                            <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-primary/10 border border-primary/15 px-4 py-3">
                                <p className="text-sm text-foreground/90 leading-relaxed">
                                    {AI_CHAT_PROMPT}
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* AI thinking indicator */}
                    {showThinking && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="flex justify-start"
                        >
                            <div className="rounded-2xl rounded-tl-md bg-muted/40 border border-border/40 px-4 py-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="size-5 rounded-md bg-primary/10 flex items-center justify-center">
                                        <Sparkles className="size-3 text-primary/60" />
                                    </div>
                                    <span className="text-[11px] font-medium text-muted-foreground/50">Buildify AI</span>
                                </div>
                                <div className="flex items-center gap-1.5 py-1">
                                    <span className="size-1.5 rounded-full bg-primary/40 animate-pulse" />
                                    <span className="size-1.5 rounded-full bg-primary/30 animate-pulse" style={{ animationDelay: '150ms' }} />
                                    <span className="size-1.5 rounded-full bg-primary/20 animate-pulse" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* AI response */}
                    {showAIResponse && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                            className="flex justify-start"
                        >
                            <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-muted/40 border border-border/40 px-4 py-3">
                                {/* AI avatar */}
                                <div className="flex items-center gap-2 mb-2.5">
                                    <div className="size-5 rounded-md bg-primary/10 flex items-center justify-center">
                                        <Sparkles className="size-3 text-primary/60" />
                                    </div>
                                    <span className="text-[11px] font-medium text-muted-foreground/50">Buildify AI</span>
                                </div>
                                <div className="space-y-1">
                                    {AI_RESPONSE_LINES.map((line, i) => (
                                        <motion.p
                                            key={i}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={i < visibleLines ? { opacity: 1, y: 0 } : {}}
                                            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                                            className={cn(
                                                'text-sm leading-relaxed',
                                                line.startsWith('  ')
                                                    ? 'text-muted-foreground/60 pl-3 border-l border-primary/15'
                                                    : 'text-foreground/80 font-medium'
                                            )}
                                        >
                                            {line.trim()}
                                        </motion.p>
                                    ))}
                                    {visibleLines < AI_RESPONSE_LINES.length && (
                                        <div className="flex items-center gap-1.5 pt-1">
                                            <span className="size-1.5 rounded-full bg-primary/40 animate-pulse" />
                                            <span className="size-1.5 rounded-full bg-primary/30 animate-pulse" style={{ animationDelay: '150ms' }} />
                                            <span className="size-1.5 rounded-full bg-primary/20 animate-pulse" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Input bar — active during typing phase */}
                <div className="px-4 pb-4">
                    <div className={cn(
                        'flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors duration-200',
                        isTypingInInput ? 'border-primary/30 bg-background/80' : 'border-border/40 bg-background/60'
                    )}>
                        <div className="flex-1 min-h-[20px] flex items-center">
                            {isTypingInInput ? (
                                <p className="text-sm text-foreground/80 leading-relaxed">
                                    {AI_CHAT_PROMPT.slice(0, typedChars)}
                                    <span className="inline-block w-[2px] h-[14px] bg-primary/70 ml-0.5 align-middle animate-pulse" />
                                </p>
                            ) : (
                                <span className="text-xs text-muted-foreground/30">
                                    {showBubble ? 'Type a message...' : 'Type a message...'}
                                </span>
                            )}
                        </div>
                        <motion.div
                            animate={sendPulse ? { scale: [1, 0.85, 1.15, 1] } : {}}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                            className={cn(
                                'size-7 rounded-lg flex items-center justify-center transition-colors duration-200',
                                isTypingInInput || phase === 'sending'
                                    ? 'bg-primary shadow-sm shadow-primary/20'
                                    : 'bg-primary/10'
                            )}
                        >
                            <SendHorizonal className={cn(
                                'size-3.5 transition-colors duration-200',
                                isTypingInInput || phase === 'sending'
                                    ? 'text-primary-foreground'
                                    : 'text-primary/40'
                            )} />
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

// --- Chat → Studio Unified Transition ---

function FlowChatToStudioTransition() {
    const transitionRef = useRef<HTMLDivElement>(null)
    const { scrollYProgress } = useScroll({
        target: transitionRef,
        offset: ['start start', 'end end'],
    })

    // Phase 1 (0–0.25): Container moves center + scales up
    const containerX = useTransform(scrollYProgress, [0, 0.2], ['0%', '0%'])
    const containerScale = useTransform(scrollYProgress, [0, 0.15, 0.3], [0.85, 1.02, 1])
    const containerWidth = useTransform(scrollYProgress, [0.1, 0.35], ['100%', '100%'])

    // Phase 2 (0.15–0.4): Chat content fades out
    const chatContentOpacity = useTransform(scrollYProgress, [0.1, 0.3], [1, 0])
    const chatContentY = useTransform(scrollYProgress, [0.1, 0.3], [0, -20])

    // Phase 2.5 (0.2–0.4): Title bar label morphs
    const chatLabelOpacity = useTransform(scrollYProgress, [0.2, 0.3], [1, 0])
    const studioLabelOpacity = useTransform(scrollYProgress, [0.3, 0.4], [0, 1])

    // Phase 3 (0.3–0.5): Grid lines appear
    const gridOpacity = useTransform(scrollYProgress, [0.3, 0.45], [0, 0.5])

    // Phase 4 (0.4–0.9): UI elements form inside
    const navbarOpacity = useTransform(scrollYProgress, [0.38, 0.48], [0, 1])
    const navbarY = useTransform(scrollYProgress, [0.38, 0.48], [-12, 0])
    const heroOpacity = useTransform(scrollYProgress, [0.46, 0.56], [0, 1])
    const heroScale = useTransform(scrollYProgress, [0.46, 0.56], [0.95, 1])
    const cardsOpacity = useTransform(scrollYProgress, [0.56, 0.7], [0, 1])
    const cardsY = useTransform(scrollYProgress, [0.56, 0.7], [16, 0])
    const footerOpacity = useTransform(scrollYProgress, [0.7, 0.8], [0, 1])

    // Connection line glow
    const lineProgress = useTransform(scrollYProgress, [0, 1], [0, 100])

    return (
        <section ref={transitionRef} className="relative" style={{ height: '250vh' }}>
            <div className="sticky top-0 h-screen flex items-center justify-center px-6 overflow-hidden">
                {/* Connection line (energy flow) */}
                <motion.div
                    className="absolute left-1/2 -translate-x-1/2 w-px top-0 bg-gradient-to-b from-transparent via-primary/20 to-transparent pointer-events-none"
                    style={{
                        height: useTransform(lineProgress, (v) => `${Math.min(v * 1.2, 100)}%`),
                        opacity: useTransform(scrollYProgress, [0, 0.05, 0.9, 1], [0, 0.6, 0.6, 0]),
                    }}
                >
                    {/* Glowing dot at tip */}
                    <motion.div
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 size-2 rounded-full bg-primary/40 blur-sm"
                        style={{ opacity: useTransform(scrollYProgress, [0, 0.05, 0.85, 1], [0, 1, 1, 0]) }}
                    />
                </motion.div>

                {/* The single transforming container */}
                <motion.div
                    style={{ scale: containerScale, x: containerX, width: containerWidth }}
                    className="relative w-full max-w-lg md:max-w-xl rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden"
                >
                    {/* Title bar — morphing label */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-muted/30">
                        <div className="flex gap-1.5">
                            <div className="size-2.5 rounded-full bg-border/60" />
                            <div className="size-2.5 rounded-full bg-border/60" />
                            <div className="size-2.5 rounded-full bg-border/60" />
                        </div>
                        <div className="relative ml-2">
                            <motion.span style={{ opacity: chatLabelOpacity }} className="text-[11px] font-medium text-muted-foreground/50 absolute whitespace-nowrap">
                                Buildify Chat
                            </motion.span>
                            <motion.span style={{ opacity: studioLabelOpacity }} className="text-[11px] font-medium text-muted-foreground/50 whitespace-nowrap">
                                Buildify Studio
                            </motion.span>
                        </div>
                        {/* Studio toolbar — fades in */}
                        <motion.div style={{ opacity: studioLabelOpacity }} className="ml-auto flex items-center gap-2">
                            <div className="h-5 w-14 rounded-md bg-border/20 flex items-center justify-center">
                                <Layers className="size-3 text-muted-foreground/30" />
                            </div>
                            <div className="h-5 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                                <Palette className="size-3 text-primary/40" />
                            </div>
                        </motion.div>
                    </div>

                    {/* Body area */}
                    <div className="relative" style={{ aspectRatio: '16/11' }}>
                        {/* Chat content — fades out */}
                        <motion.div
                            style={{ opacity: chatContentOpacity, y: chatContentY }}
                            className="absolute inset-0 p-5 space-y-3"
                        >
                            <div className="flex justify-end">
                                <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-primary/10 border border-primary/15 px-4 py-2.5">
                                    <p className="text-xs text-foreground/70">Plan a portfolio website with dark theme</p>
                                </div>
                            </div>
                            <div className="flex justify-start">
                                <div className="max-w-[80%] rounded-2xl rounded-tl-md bg-muted/40 border border-border/40 px-4 py-2.5">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <Sparkles className="size-2.5 text-primary/50" />
                                        <span className="text-[10px] text-muted-foreground/40">Buildify AI</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="h-2 w-[90%] rounded bg-muted-foreground/8" />
                                        <div className="h-2 w-[70%] rounded bg-muted-foreground/6" />
                                        <div className="h-2 w-[80%] rounded bg-muted-foreground/5" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Grid lines — appear during morph */}
                        <motion.div style={{ opacity: gridOpacity }} className="absolute inset-4 pointer-events-none">
                            {[20, 40, 60, 80].map((pct) => (
                                <div key={`v-${pct}`} className="absolute top-0 bottom-0 w-px bg-primary/8" style={{ left: `${pct}%` }} />
                            ))}
                            {[20, 40, 60, 80].map((pct) => (
                                <div key={`h-${pct}`} className="absolute left-0 right-0 h-px bg-primary/8" style={{ top: `${pct}%` }} />
                            ))}
                        </motion.div>

                        {/* Real UI forming inside — the same container */}
                        <div className="absolute inset-0 p-3 md:p-4 flex flex-col gap-2">
                            {/* Navbar */}
                            <motion.div
                                style={{ opacity: navbarOpacity, y: navbarY }}
                                className="flex items-center justify-between px-3 py-2 rounded-lg bg-card/60"
                            >
                                <div className="flex items-center gap-1.5">
                                    <div className="size-4 rounded bg-primary/20 flex items-center justify-center">
                                        <Sparkles className="size-2.5 text-primary/60" />
                                    </div>
                                    <span className="text-[8px] font-bold text-foreground/70 tracking-tight">Portfolio</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <span className="text-[7px] font-medium text-primary/70">Home</span>
                                    <span className="text-[7px] text-muted-foreground/50">About</span>
                                    <span className="text-[7px] text-muted-foreground/50">Work</span>
                                    <div className="h-[18px] px-2 rounded-md bg-primary/15 flex items-center justify-center">
                                        <span className="text-[6px] font-semibold text-primary/70">Contact</span>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Hero section */}
                            <motion.div
                                style={{ opacity: heroOpacity, scale: heroScale }}
                                className="flex-1 flex items-center px-4 rounded-lg bg-gradient-to-br from-primary/[0.03] to-transparent"
                            >
                                <div className="flex-1 py-3">
                                    <p className="text-[6px] font-semibold uppercase tracking-[0.15em] text-primary/50 mb-1">Portfolio</p>
                                    <p className="text-[11px] md:text-[13px] font-bold text-foreground/80 leading-tight">Design your future</p>
                                    <p className="text-[10px] md:text-[12px] font-bold text-foreground/50 leading-tight">with Buildify</p>
                                    <p className="text-[7px] text-muted-foreground/50 mt-1.5 leading-relaxed max-w-[80%]">Crafting digital experiences that inspire and engage your audience.</p>
                                    <div className="mt-2.5 flex gap-1.5">
                                        <div className="h-5 px-2.5 rounded-md bg-primary/20 flex items-center justify-center">
                                            <span className="text-[6px] font-semibold text-primary/80">View Work</span>
                                        </div>
                                        <div className="h-5 px-2 rounded-md border border-border/50 flex items-center justify-center">
                                            <span className="text-[6px] font-medium text-muted-foreground/50">About Me</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-[30%] aspect-[4/5] rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/8 flex items-center justify-center">
                                    <div className="size-8 rounded-full bg-primary/8 flex items-center justify-center">
                                        <Globe className="size-4 text-primary/30" />
                                    </div>
                                </div>
                            </motion.div>

                            {/* 3 Cards */}
                            <motion.div style={{ opacity: cardsOpacity, y: cardsY }} className="grid grid-cols-3 gap-1.5">
                                {[
                                    { title: 'Web Design', desc: 'Modern responsive interfaces' },
                                    { title: 'Branding', desc: 'Identity and visual systems' },
                                    { title: 'Development', desc: 'Full-stack applications' },
                                ].map((card, i) => (
                                    <div key={i} className="rounded-lg border border-border/30 bg-card/40 p-2 group/card cursor-default transition-colors duration-200 hover:bg-primary/[0.04] hover:border-primary/12">
                                        <div className="aspect-[16/9] rounded bg-gradient-to-br from-primary/8 via-primary/4 to-transparent mb-1.5 flex items-center justify-center">
                                            <div className="size-5 rounded bg-primary/10 flex items-center justify-center">
                                                <Code2 className="size-3 text-primary/30" />
                                            </div>
                                        </div>
                                        <p className="text-[7px] font-semibold text-foreground/70 mb-0.5">{card.title}</p>
                                        <p className="text-[6px] text-muted-foreground/45 leading-relaxed">{card.desc}</p>
                                    </div>
                                ))}
                            </motion.div>

                            {/* Footer */}
                            <motion.div
                                style={{ opacity: footerOpacity }}
                                className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-card/40"
                            >
                                <span className="text-[6px] text-muted-foreground/35">&copy; 2026 Portfolio. All rights reserved.</span>
                                <div className="flex gap-2">
                                    <span className="text-[6px] text-muted-foreground/30">Twitter</span>
                                    <span className="text-[6px] text-muted-foreground/30">GitHub</span>
                                    <span className="text-[6px] text-muted-foreground/30">LinkedIn</span>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Input bar / status bar — morphs */}
                    <div className="px-4 pb-3 pt-1">
                        <motion.div
                            style={{ opacity: chatContentOpacity }}
                            className="flex items-center gap-2 rounded-xl border border-border/40 bg-background/60 px-3 py-2"
                        >
                            <span className="text-[10px] text-muted-foreground/25 flex-1">Type a message...</span>
                            <div className="size-6 rounded-lg bg-primary/10 flex items-center justify-center">
                                <SendHorizonal className="size-3 text-primary/35" />
                            </div>
                        </motion.div>
                        <motion.div
                            style={{
                                opacity: useTransform(scrollYProgress, [0.3, 0.45], [0, 1]),
                            }}
                            className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2"
                        >
                            <span className="text-[9px] text-muted-foreground/30">1440 × 900</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-muted-foreground/30">100%</span>
                                <div className="h-1 w-12 rounded-full bg-border/30 overflow-hidden">
                                    <div className="h-full w-1/2 bg-primary/20 rounded-full" />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}

// --- Studio Section — real Buildify Studio editor interface ---

// --- Studio interaction state ---

type StudioAction = 'idle' | 'hover-template' | 'click-template' | 'click-text' | 'editing-text' | 'hover-elements-tab' | 'click-elements-tab' | 'hover-element' | 'click-element' | 'click-color' | 'hover-button' | 'hover-preview' | 'click-preview' | 'preview-mode' | 'click-exit-preview'

function FlowStudioSection() {
    const sectionRef = useRef<HTMLDivElement>(null)
    const isInView = useInView(sectionRef, { once: true, margin: '-100px' })
    const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 })
    const [cursorAction, setCursorAction] = useState<StudioAction>('idle')
    const [cursorVisible, setCursorVisible] = useState(false)
    const [cursorClicking, setCursorClicking] = useState(false)
    const [heroEditing, setHeroEditing] = useState(false)
    const [heroText, setHeroText] = useState("Hi, I'm Ethan Carter")
    const [templateHighlight, setTemplateHighlight] = useState(false)
    const [activeTab, setActiveTab] = useState(0) // 0=Templates, 1=Elements, 2=Layers
    const [newSection, setNewSection] = useState(false)
    const [newCards, setNewCards] = useState(0) // 0, 1, 2, 3
    const [previewMode, setPreviewMode] = useState(false)
    const cursorTimers = useRef<ReturnType<typeof setTimeout>[]>([])

    // Run cursor sequence
    useEffect(() => {
        if (!isInView) return
        const delay = (ms: number) => new Promise<void>(resolve => {
            const t = setTimeout(resolve, ms)
            cursorTimers.current.push(t)
        })

        let cancelled = false

        const click = async () => {
            setCursorClicking(true)
            await delay(150)
            if (!cancelled) setCursorClicking(false)
        }

        const moveTo = async (x: number, y: number, ms = 800) => {
            setCursorPos({ x, y })
            await delay(ms)
        }

        const runSequence = async () => {
            await delay(1200)
            if (cancelled) return
            setCursorVisible(true)

            // 1. Select template
            setCursorAction('idle')
            await moveTo(10, 28, 900)
            if (cancelled) return
            setCursorAction('hover-template')
            await delay(400)
            if (cancelled) return
            setCursorAction('click-template')
            await click()
            if (cancelled) return
            setTemplateHighlight(true)
            await delay(300)
            if (cancelled) return
            setTemplateHighlight(false)
            setCursorAction('idle')
            await delay(600)

            // 2. Switch to Elements tab
            if (cancelled) return
            await moveTo(10, 6, 700)
            if (cancelled) return
            setCursorAction('hover-elements-tab')
            await delay(300)
            if (cancelled) return
            setCursorAction('click-elements-tab')
            await click()
            if (cancelled) return
            setActiveTab(1)
            await delay(500)

            // 3. Click "Section" element to add
            if (cancelled) return
            await moveTo(10, 22, 600)
            if (cancelled) return
            setCursorAction('hover-element')
            await delay(300)
            if (cancelled) return
            setCursorAction('click-element')
            await click()
            if (cancelled) return
            setNewSection(true)
            setCursorAction('idle')
            await delay(800)

            // 4. Click to add cards (3 clicks for 3 cards)
            if (cancelled) return
            await moveTo(10, 32, 500)
            if (cancelled) return
            setCursorAction('hover-element')
            await delay(200)
            for (let c = 1; c <= 3; c++) {
                if (cancelled) return
                await click()
                setNewCards(c)
                await delay(350)
            }
            setCursorAction('idle')
            await delay(500)

            // 5. Switch back to Templates tab
            if (cancelled) return
            setActiveTab(0)

            // 6. Edit hero text
            if (cancelled) return
            await moveTo(38, 30, 900)
            if (cancelled) return
            setCursorAction('click-text')
            await click()
            if (cancelled) return
            setHeroEditing(true)
            setCursorAction('editing-text')

            // Delete + retype
            const original = "Hi, I'm Ethan Carter"
            const edited = "Hey, I'm Ethan"
            for (let i = original.length; i >= edited.length - 2; i--) {
                if (cancelled) return
                setHeroText(original.slice(0, i))
                await delay(55)
            }
            for (let i = 0; i <= edited.length; i++) {
                if (cancelled) return
                setHeroText(edited.slice(0, i))
                await delay(50 + Math.random() * 30)
            }
            await delay(400)
            if (cancelled) return
            setHeroEditing(false)
            setCursorAction('idle')
            await delay(500)

            // 7. Change color
            if (cancelled) return
            await moveTo(89, 55, 1000)
            if (cancelled) return
            setCursorAction('click-color')
            await click()
            // NOTE: removed emerald color change — staying blue only
            setCursorAction('idle')
            await delay(600)

            // 8. Preview mode
            if (cancelled) return
            await moveTo(62, -4, 800) // toolbar Preview button (above editor area, hence negative y)
            if (cancelled) return
            setCursorAction('hover-preview')
            await delay(400)
            if (cancelled) return
            setCursorAction('click-preview')
            await click()
            if (cancelled) return
            setPreviewMode(true)
            setCursorAction('preview-mode')
            await delay(2500)

            // 9. Exit preview
            if (cancelled) return
            await moveTo(62, -4, 600)
            setCursorAction('click-exit-preview')
            await click()
            if (cancelled) return
            setPreviewMode(false)
            setCursorAction('idle')
            await delay(800)

            // Done — hide cursor
            if (cancelled) return
            setCursorVisible(false)

            // Reset after pause
            await delay(2000)
            if (cancelled) return
            setHeroText("Hi, I'm Ethan Carter")
            setHeroEditing(false)
            setActiveTab(0)
            setNewSection(false)
            setNewCards(0)
            setPreviewMode(false)
        }

        runSequence()
        return () => {
            cancelled = true
            cursorTimers.current.forEach(clearTimeout)
        }
    }, [isInView])

    return (
        <section ref={sectionRef} className="relative px-6 py-20 md:py-28 overflow-hidden">
            <div className="max-w-6xl mx-auto w-full">
                {/* Text — top */}
                <div className="max-w-xl mb-12 md:mb-16">
                    <motion.span
                        variants={fadeIn}
                        initial="hidden"
                        animate={isInView ? 'visible' : 'hidden'}
                        custom={0}
                        className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.2em] uppercase text-primary/70 mb-5"
                    >
                        <span className="inline-block size-1.5 rounded-full bg-primary/50" />
                        Step 02
                    </motion.span>

                    <div className="overflow-hidden">
                        <motion.h2
                            variants={slideUp}
                            initial="hidden"
                            animate={isInView ? 'visible' : 'hidden'}
                            custom={0.1}
                            className="text-3xl md:text-[2.75rem] font-bold tracking-tight leading-[1.1]"
                        >
                            Design Visually
                        </motion.h2>
                    </div>

                    <motion.p
                        variants={blurIn}
                        initial="hidden"
                        animate={isInView ? 'visible' : 'hidden'}
                        custom={0.25}
                        className="mt-5 text-base md:text-lg text-muted-foreground/70 leading-relaxed"
                    >
                        Structure your ideas with an intuitive visual editor and real-time layout control.
                    </motion.p>

                    <motion.div
                        variants={fadeIn}
                        initial="hidden"
                        animate={isInView ? 'visible' : 'hidden'}
                        custom={0.4}
                        className="mt-6 flex items-center gap-3"
                    >
                        <div className="size-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                            <Palette className="size-[18px] text-primary/60" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground/60">Drag-and-drop studio</span>
                    </motion.div>
                </div>

                {/* Studio preview — full width */}
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.97 }}
                    animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                    transition={{ duration: 0.9, delay: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                >
                    <div className="relative">
                        <div className="absolute -inset-8 rounded-3xl bg-primary/[0.05] blur-3xl pointer-events-none" />

                        <div className="relative rounded-xl border border-border/50 bg-card shadow-2xl shadow-black/8 dark:shadow-black/25 overflow-hidden">
                            {/* ── Top Toolbar ── */}
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={isInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                className="flex items-center justify-between px-3 py-2 border-b border-border/30 bg-muted/20"
                            >
                                {/* Left: back + title */}
                                <div className="flex items-center gap-2.5">
                                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground/40">
                                        <ChevronLeft className="size-3" />
                                        <span>Back</span>
                                    </div>
                                    <div className="w-px h-3.5 bg-border/30" />
                                    <span className="text-[10px] font-semibold text-foreground/70">Buildify Studio</span>
                                </div>

                                {/* Center: tools */}
                                <div className="flex items-center gap-1">
                                    <div className="flex items-center gap-0.5 px-1">
                                        <button className="size-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:bg-muted/40 transition-colors">
                                            <Undo2 className="size-3" />
                                        </button>
                                        <button className="size-6 rounded-md flex items-center justify-center text-muted-foreground/25">
                                            <Redo2 className="size-3" />
                                        </button>
                                    </div>
                                    <div className="w-px h-3.5 bg-border/20" />
                                    <div className="flex items-center gap-0.5 px-1">
                                        {[Grid3X3, Palette, MousePointerClick].map((Icon, i) => (
                                            <button key={i} className={cn(
                                                'size-6 rounded-md flex items-center justify-center transition-colors',
                                                i === 0 ? 'bg-primary/10 text-primary/70' : 'text-muted-foreground/40 hover:bg-muted/40'
                                            )}>
                                                <Icon className="size-3" />
                                            </button>
                                        ))}
                                    </div>
                                    <div className="w-px h-3.5 bg-border/20" />
                                    <div className="flex items-center gap-0.5 px-1">
                                        {[Monitor, Tablet, Smartphone].map((Icon, i) => (
                                            <button key={i} className={cn(
                                                'size-6 rounded-md flex items-center justify-center transition-colors',
                                                i === 0 ? 'text-foreground/60' : 'text-muted-foreground/30'
                                            )}>
                                                <Icon className="size-3" />
                                            </button>
                                        ))}
                                    </div>
                                    <div className="w-px h-3.5 bg-border/20" />
                                    <div className={cn(
                                        "flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-all duration-200",
                                        cursorAction === 'hover-preview' || cursorAction === 'click-preview' || previewMode
                                            ? 'bg-primary/10 text-primary/70'
                                            : 'text-muted-foreground/40'
                                    )}>
                                        <Eye className="size-3" />
                                        <span className="text-[8px]">{previewMode ? 'Exit Preview' : 'Preview'}</span>
                                    </div>
                                </div>

                                {/* Right: actions */}
                                <div className="flex items-center gap-1.5">
                                    <button className="h-6 px-2.5 rounded-md border border-border/40 flex items-center gap-1.5 text-[8px] text-muted-foreground/50">
                                        <Save className="size-3" />
                                        Save
                                    </button>
                                    <button className="h-6 px-2.5 rounded-md bg-primary text-primary-foreground flex items-center gap-1.5 text-[8px] font-semibold shadow-sm shadow-primary/20">
                                        <Upload className="size-3" />
                                        Publish
                                    </button>
                                </div>
                            </motion.div>

                            {/* ── Main Editor Area ── */}
                            <div className="flex relative" style={{ height: 'clamp(340px, 44vw, 520px)' }}>
                                {/* Animated cursor */}
                                {cursorVisible && (
                                    <motion.div
                                        className="absolute z-50 pointer-events-none"
                                        animate={{ left: `${cursorPos.x}%`, top: `${cursorPos.y}%` }}
                                        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                                    >
                                        {/* Cursor SVG */}
                                        <motion.div
                                            animate={cursorClicking ? { scale: 0.8 } : { scale: 1 }}
                                            transition={{ duration: 0.1 }}
                                        >
                                            <svg width="16" height="20" viewBox="0 0 16 20" fill="none" className="drop-shadow-md">
                                                <path d="M0 0L12.5 12.5H5.5L2.5 19.5L0 0Z" fill="white" stroke="black" strokeWidth="1" strokeLinejoin="round" />
                                            </svg>
                                        </motion.div>
                                        {/* Click ripple */}
                                        {cursorClicking && (
                                            <motion.div
                                                initial={{ scale: 0, opacity: 0.5 }}
                                                animate={{ scale: 2.5, opacity: 0 }}
                                                transition={{ duration: 0.5 }}
                                                className="absolute top-0 left-0 size-4 rounded-full bg-primary/30 -translate-x-1/2 -translate-y-1/2"
                                            />
                                        )}
                                    </motion.div>
                                )}
                                {/* Left Sidebar */}
                                <motion.div
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={isInView
                                        ? previewMode
                                            ? { opacity: 0, x: -20, width: 0, borderWidth: 0, padding: 0 }
                                            : { opacity: 1, x: 0, width: 140, borderWidth: 1, padding: undefined }
                                        : {}
                                    }
                                    transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                                    className="border-r border-border/25 bg-muted/8 flex-shrink-0 hidden md:flex flex-col overflow-hidden"
                                >
                                    {/* Tabs */}
                                    <div className="flex border-b border-border/20 px-1">
                                        {[
                                            { icon: LayoutTemplate, label: 'Templates' },
                                            { icon: Type, label: 'Elements' },
                                            { icon: Layers, label: 'Layers' },
                                        ].map((tab, i) => (
                                            <div
                                                key={i}
                                                className={cn(
                                                    'flex-1 flex flex-col items-center gap-0.5 py-2 cursor-default transition-all duration-200',
                                                    activeTab === i ? 'text-primary/80 border-b-2 border-primary/50' : 'text-muted-foreground/25',
                                                    (cursorAction === 'hover-elements-tab' && i === 1) && 'text-muted-foreground/50'
                                                )}
                                            >
                                                <tab.icon className="size-3" />
                                                <span className="text-[6px] font-medium">{tab.label}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Sidebar content — switches between tabs */}
                                    <div className="flex-1 overflow-hidden px-2 py-2 space-y-1.5">
                                        {activeTab === 0 ? (
                                            <>
                                                {/* Template cards */}
                                                <motion.div
                                                    initial={{ opacity: 0, y: 6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                    className={cn(
                                                        "rounded-lg border bg-card/60 overflow-hidden transition-all duration-300",
                                                        templateHighlight || cursorAction === 'hover-template'
                                                            ? 'border-primary/40 shadow-md shadow-primary/10 scale-[1.02]'
                                                            : 'border-primary/20'
                                                    )}
                                                >
                                                    <div className="h-14 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] p-2 flex flex-col justify-between">
                                                        <div className="flex justify-between">
                                                            <div className="h-1 w-8 rounded bg-white/15" />
                                                            <div className="flex gap-0.5">
                                                                <div className="h-1 w-3 rounded bg-white/8" />
                                                                <div className="h-1 w-3 rounded bg-white/8" />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="h-1.5 w-14 rounded bg-white/25 mb-0.5" />
                                                            <div className="h-1 w-9 rounded bg-blue-400/30" />
                                                        </div>
                                                    </div>
                                                    <div className="px-2 py-1.5 flex items-center justify-between">
                                                        <div>
                                                            <p className="text-[7px] font-semibold text-foreground/65">Developer Dark</p>
                                                            <p className="text-[5.5px] text-muted-foreground/30">Developer</p>
                                                        </div>
                                                        <div className="h-4 px-1.5 rounded bg-primary/15 flex items-center gap-0.5">
                                                            <span className="text-[5.5px] font-medium text-primary/70">Use</span>
                                                            <ArrowRight className="size-2 text-primary/50" />
                                                        </div>
                                                    </div>
                                                </motion.div>

                                                <div className="rounded-lg border border-border/20 bg-card/30 overflow-hidden">
                                                    <div className="h-14 bg-gradient-to-br from-[#fafafa] to-[#f0f0f0] p-2 flex flex-col justify-between">
                                                        <div className="h-1 w-6 rounded bg-black/8" />
                                                        <div className="flex gap-1">
                                                            <div className="size-3.5 rounded bg-blue-500/20" />
                                                            <div className="size-3.5 rounded bg-blue-500/10" />
                                                        </div>
                                                    </div>
                                                    <div className="px-2 py-1.5">
                                                        <p className="text-[7px] font-semibold text-foreground/55">Designer Clean</p>
                                                        <p className="text-[5.5px] text-muted-foreground/25">Designer</p>
                                                    </div>
                                                </div>

                                                <div className="rounded-lg border border-border/12 bg-card/15 overflow-hidden">
                                                    <div className="h-14 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] p-2 flex flex-col justify-between">
                                                        <div className="h-1 w-7 rounded bg-white/6" />
                                                        <div className="h-1 w-10 rounded bg-white/5" />
                                                    </div>
                                                    <div className="px-2 py-1.5">
                                                        <p className="text-[7px] text-foreground/25">Minimal Pro</p>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {/* Elements list */}
                                                <motion.div
                                                    initial={{ opacity: 0, x: -6 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ duration: 0.25 }}
                                                    className="space-y-1"
                                                >
                                                    {[
                                                        { icon: Layers, label: 'Section', desc: 'Content block' },
                                                        { icon: Grid3X3, label: 'Card Grid', desc: '3-column cards' },
                                                        { icon: Type, label: 'Heading', desc: 'Text element' },
                                                        { icon: FileText, label: 'Paragraph', desc: 'Body text' },
                                                        { icon: MousePointerClick, label: 'Button', desc: 'CTA element' },
                                                    ].map((el, i) => (
                                                        <div
                                                            key={el.label}
                                                            className={cn(
                                                                "flex items-center gap-2 px-2 py-1.5 rounded-md transition-all duration-200 cursor-default",
                                                                (cursorAction === 'hover-element' && i === 0) || (cursorAction === 'click-element' && i === 0)
                                                                    ? 'bg-primary/10 border border-primary/20'
                                                                    : (cursorAction === 'hover-element' && i === 1)
                                                                        ? 'bg-primary/10 border border-primary/20'
                                                                        : 'border border-transparent hover:bg-muted/30'
                                                            )}
                                                        >
                                                            <div className="size-6 rounded bg-muted/30 flex items-center justify-center flex-shrink-0">
                                                                <el.icon className="size-3 text-muted-foreground/40" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[7px] font-semibold text-foreground/60">{el.label}</p>
                                                                <p className="text-[5.5px] text-muted-foreground/30">{el.desc}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </motion.div>
                                            </>
                                        )}
                                    </div>
                                </motion.div>

                                {/* Center Canvas */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.97 }}
                                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                                    transition={{ duration: 0.6, delay: 0.3 }}
                                    className="flex-1 bg-muted/5 relative overflow-hidden"
                                >
                                    <motion.div
                                        animate={{ opacity: previewMode ? 0 : 0.2 }}
                                        transition={{ duration: 0.3 }}
                                        className="absolute inset-0 dot-grid-bg"
                                    />

                                    {/* Dark dev portfolio */}
                                    <motion.div
                                        animate={previewMode
                                            ? { left: 0, right: 0, top: 0, bottom: 0, borderRadius: 0 }
                                            : { left: 12, right: 12, top: 10, bottom: 10, borderRadius: 8 }
                                        }
                                        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                                        className={cn(
                                            "absolute border bg-[#0f1117] overflow-hidden shadow-xl flex flex-col text-white/90",
                                            previewMode ? 'border-transparent' : 'border-border/30'
                                        )}
                                    >
                                        {/* Navbar */}
                                        <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/5">
                                            <span className="text-[10px] font-bold text-white/85 tracking-tight">Ethan.dev</span>
                                            <div className="flex items-center gap-4">
                                                {['Work', 'About', 'Skills', 'Contact'].map((link) => (
                                                    <span key={link} className={cn(
                                                        'text-[8px] cursor-default transition-colors duration-200',
                                                        link === 'Contact' ? 'text-white/55 hover:text-white/70' : 'text-white/35 hover:text-white/50'
                                                    )}>{link}</span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Hero */}
                                        <div className="flex-1 flex items-center px-5 gap-4">
                                            <div className="flex-1">
                                                <p className={cn(
                                                    "text-[16px] md:text-[18px] font-extrabold leading-tight transition-all duration-200",
                                                    heroEditing ? 'text-white/95 bg-white/[0.04] rounded px-1 -mx-1 ring-1 ring-blue-400/30' : 'text-white/90'
                                                )}>
                                                    {heroText}
                                                    {heroEditing && <span className="inline-block w-[2px] h-[16px] bg-blue-400/80 ml-0.5 align-middle animate-pulse" />}
                                                </p>
                                                <p className="text-[9px] font-semibold text-blue-400/80 mt-1">Product Designer &amp; Developer</p>
                                                <p className="text-[7px] text-white/30 mt-2 leading-relaxed max-w-[90%]">Designing intuitive products and building polished digital experiences.</p>
                                                <p className="text-[6px] text-white/20 mt-1">Figma · React · TypeScript · Next.js · Tailwind</p>
                                                <div className="mt-3 flex gap-2">
                                                    <div className={cn(
                                                        "h-6 px-2.5 rounded-md flex items-center shadow-sm cursor-default transition-all duration-300",
                                                        'bg-blue-500/80 shadow-blue-500/20 hover:bg-blue-500/90',
                                                        cursorAction === 'hover-button' && 'scale-105 shadow-md shadow-blue-500/30'
                                                    )}>
                                                        <span className="text-[7px] font-semibold text-white">View Work</span>
                                                    </div>
                                                    <div className="h-6 px-2.5 rounded-md border border-white/15 flex items-center cursor-default transition-all duration-200 hover:border-white/25 hover:bg-white/[0.03]">
                                                        <span className="text-[7px] text-white/50">About Me</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 mt-3">
                                                    {[Globe, Code2, FileText, MessageSquareText].map((Icon, i) => (
                                                        <div key={i} className="size-5 rounded bg-white/[0.04] flex items-center justify-center cursor-default transition-colors duration-200 hover:bg-white/[0.08]">
                                                            <Icon className="size-3 text-white/25" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            {/* Code block */}
                                            <div className="w-[40%] rounded-lg bg-[#1a1d27] border border-white/5 p-3 hidden md:block">
                                                <div className="flex gap-1 mb-2.5">
                                                    <div className="size-1.5 rounded-full bg-blue-400/40" />
                                                    <div className="size-1.5 rounded-full bg-blue-300/30" />
                                                    <div className="size-1.5 rounded-full bg-blue-200/25" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <p className="text-[6px] font-mono"><span className="text-white/20">{'// '}</span><span className="text-blue-300/50">portfolio.js</span></p>
                                                    <p className="text-[6px] font-mono text-blue-400/50">const <span className="text-blue-300/70">ethan</span> = {'{'}</p>
                                                    <p className="text-[6px] font-mono pl-2"><span className="text-white/30">role: </span><span className="text-blue-200/50">&quot;Product Designer&quot;</span>,</p>
                                                    <p className="text-[6px] font-mono pl-2"><span className="text-white/30">skills: </span>[<span className="text-blue-200/50">&quot;Figma&quot;</span>, <span className="text-blue-200/50">&quot;React&quot;</span>,</p>
                                                    <p className="text-[6px] font-mono pl-4"><span className="text-blue-200/50">&quot;TypeScript&quot;</span>, <span className="text-blue-200/50">&quot;Next.js&quot;</span>],</p>
                                                    <p className="text-[6px] font-mono pl-2"><span className="text-white/30">focus: </span><span className="text-blue-300/50">&quot;Design Systems&quot;</span>,</p>
                                                    <p className="text-[6px] font-mono pl-2"><span className="text-white/30">projects: </span><span className="text-blue-400/60">12</span>,</p>
                                                    <p className="text-[6px] font-mono pl-2"><span className="text-white/30">available: </span><span className="text-blue-300/60">true</span>,</p>
                                                    <p className="text-[6px] font-mono text-blue-400/50">{'}'}</p>
                                                    <p className="text-[6px] font-mono mt-1"><span className="text-white/15">console.log(</span><span className="text-blue-200/40">&quot;designing the future...&quot;</span><span className="text-white/15">)</span></p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tech stack */}
                                        <div className="px-5 py-2 border-t border-white/[0.03]">
                                            <p className="text-[7px] font-semibold text-white/40 mb-2">Tech Stack</p>
                                            <div className="grid grid-cols-4 gap-1.5">
                                                {[
                                                    { cat: 'Design', items: 'Figma · Framer · Principle' },
                                                    { cat: 'Frontend', items: 'React · Next.js · TypeScript' },
                                                    { cat: 'Styling', items: 'Tailwind · CSS · Motion' },
                                                    { cat: 'Tools', items: 'Git · VS Code · Vercel' },
                                                ].map((s, i) => (
                                                    <div key={i} className="rounded-md bg-white/[0.025] border border-white/[0.04] px-2 py-1.5 cursor-default transition-colors duration-200 hover:bg-white/[0.04] hover:border-white/[0.07]">
                                                        <p className="text-[6px] font-semibold text-white/50">{s.cat}</p>
                                                        <p className="text-[5px] text-white/20 mt-0.5">{s.items}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Featured projects */}
                                        <div className="px-5 pb-2">
                                            <p className="text-[7px] font-semibold text-white/40 mb-2">Featured Projects</p>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {[
                                                    { name: 'Design System', desc: 'Component library with tokens and docs', tech: 'Figma · React · Storybook' },
                                                    { name: 'SaaS Dashboard', desc: 'Analytics UI with real-time charts', tech: 'Next.js · D3.js · Tailwind' },
                                                    { name: 'E-commerce App', desc: 'Modern storefront with checkout flow', tech: 'React · Stripe · Framer' },
                                                ].map((proj, i) => (
                                                    <div key={i} className="rounded-md bg-white/[0.025] border border-white/[0.04] px-2.5 py-2 cursor-default transition-all duration-200 hover:bg-white/[0.04] hover:border-white/[0.08] hover:-translate-y-px">
                                                        <p className="text-[7px] font-semibold text-white/60">{proj.name}</p>
                                                        <p className="text-[5.5px] text-white/25 mt-0.5">{proj.desc}</p>
                                                        <p className="text-[5px] text-white/15 mt-1.5">{proj.tech}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Dynamically added section */}
                                        {newSection && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                                                className="px-5 pb-3 overflow-hidden"
                                            >
                                                <p className="text-[7px] font-semibold text-white/40 mb-2">Testimonials</p>
                                                <div className="grid grid-cols-3 gap-1.5">
                                                    {[
                                                        { quote: 'Incredible design sense and attention to detail.', name: 'Sarah K.' },
                                                        { quote: 'Delivered on time with pixel-perfect results.', name: 'James L.' },
                                                        { quote: 'A true professional. Highly recommended.', name: 'Maria C.' },
                                                    ].map((card, i) => (
                                                        i < newCards && (
                                                            <motion.div
                                                                key={i}
                                                                initial={{ opacity: 0, scale: 0.9, y: 6 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                                                                className="rounded-md bg-white/[0.025] border border-white/[0.04] px-2 py-1.5"
                                                            >
                                                                <p className="text-[5.5px] text-white/30 italic leading-relaxed">&quot;{card.quote}&quot;</p>
                                                                <p className="text-[5px] text-white/50 mt-1 font-medium">— {card.name}</p>
                                                            </motion.div>
                                                        )
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                </motion.div>

                                {/* Right Sidebar — Properties Panel */}
                                <motion.div
                                    initial={{ opacity: 0, x: 14 }}
                                    animate={isInView
                                        ? previewMode
                                            ? { opacity: 0, x: 20, width: 0, borderWidth: 0, padding: 0 }
                                            : { opacity: 1, x: 0, width: 170, borderWidth: 1, padding: undefined }
                                        : {}
                                    }
                                    transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                                    className="border-l border-border/30 bg-muted/10 flex-shrink-0 hidden md:flex flex-col overflow-hidden"
                                >
                                    <div className="px-3 py-2 border-b border-border/25">
                                        <p className="text-[8px] font-semibold text-foreground/55 uppercase tracking-[0.1em]">Properties</p>
                                    </div>
                                    <div className="px-3 py-2.5 space-y-3 flex-1 overflow-hidden">
                                        {/* Position & Size */}
                                        <div>
                                            <p className="text-[7px] font-medium text-muted-foreground/45 mb-1.5">Position &amp; Size</p>
                                            <div className="grid grid-cols-2 gap-1">
                                                {[
                                                    { label: 'X', value: '0' },
                                                    { label: 'Y', value: '0' },
                                                    { label: 'W', value: '960' },
                                                    { label: 'H', value: 'auto' },
                                                ].map((field) => (
                                                    <div key={field.label} className="h-5 rounded-md bg-background/60 border border-border/25 flex items-center px-1.5 gap-1 transition-colors duration-200 hover:border-primary/20">
                                                        <span className="text-[6px] text-muted-foreground/30">{field.label}</span>
                                                        <span className="text-[7px] text-muted-foreground/50 font-mono">{field.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="w-full h-px bg-border/20" />

                                        {/* Typography */}
                                        <div>
                                            <p className="text-[7px] font-medium text-muted-foreground/45 mb-1.5">Typography</p>
                                            <div className="space-y-1">
                                                <div className="h-5 rounded-md bg-background/60 border border-border/25 flex items-center justify-between px-1.5 transition-colors duration-200 hover:border-primary/20">
                                                    <span className="text-[7px] text-muted-foreground/50">Inter</span>
                                                    <ChevronRight className="size-2.5 text-muted-foreground/25" />
                                                </div>
                                                <div className="grid grid-cols-2 gap-1">
                                                    <div className="h-5 rounded-md bg-background/60 border border-border/25 flex items-center px-1.5">
                                                        <span className="text-[7px] text-muted-foreground/50 font-mono">18px</span>
                                                    </div>
                                                    <div className="h-5 rounded-md bg-background/60 border border-border/25 flex items-center px-1.5">
                                                        <span className="text-[7px] text-muted-foreground/50">ExtraBold</span>
                                                    </div>
                                                </div>
                                                <div className="h-5 rounded-md bg-background/60 border border-border/25 flex items-center justify-between px-1.5">
                                                    <span className="text-[7px] text-muted-foreground/40">Line Height</span>
                                                    <span className="text-[7px] text-muted-foreground/50 font-mono">1.15</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-full h-px bg-border/20" />

                                        {/* Fill & Colors */}
                                        <div>
                                            <p className="text-[7px] font-medium text-muted-foreground/45 mb-1.5">Fill</p>
                                            <div className="flex items-center gap-1.5 mb-2">
                                                {[
                                                    { bg: 'bg-blue-500', id: 'blue', active: true },
                                                    { bg: 'bg-blue-300', id: 'light', active: false },
                                                    { bg: 'bg-[#0f1117]', id: 'dark', active: false },
                                                    { bg: 'bg-white', id: 'white', active: false },
                                                ].map((c) => (
                                                    <div key={c.id} className={cn(
                                                        'size-5 rounded-md border cursor-default transition-all duration-200 hover:scale-110',
                                                        c.bg,
                                                        c.active
                                                            ? 'border-primary/50 ring-1 ring-primary/20 scale-110'
                                                            : 'border-border/30',
                                                        cursorAction === 'click-color' && c.id === 'light' && 'ring-2 ring-primary/30 scale-110'
                                                    )} />
                                                ))}
                                                <div className="size-5 rounded-md border border-dashed border-border/30 flex items-center justify-center">
                                                    <Plus className="size-2.5 text-muted-foreground/20" />
                                                </div>
                                            </div>
                                            <div className="h-5 rounded-md bg-background/60 border border-border/25 flex items-center justify-between px-1.5">
                                                <span className="text-[7px] text-muted-foreground/40">Opacity</span>
                                                <div className="flex items-center gap-1">
                                                    <div className="w-12 h-1 rounded-full bg-border/30 overflow-hidden">
                                                        <div className="w-[85%] h-full bg-primary/30 rounded-full" />
                                                    </div>
                                                    <span className="text-[7px] text-muted-foreground/50 font-mono">85%</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-full h-px bg-border/20" />

                                        {/* Border */}
                                        <div>
                                            <p className="text-[7px] font-medium text-muted-foreground/45 mb-1.5">Border</p>
                                            <div className="grid grid-cols-2 gap-1">
                                                <div className="h-5 rounded-md bg-background/60 border border-border/25 flex items-center px-1.5">
                                                    <span className="text-[7px] text-muted-foreground/50 font-mono">0px</span>
                                                </div>
                                                <div className="h-5 rounded-md bg-background/60 border border-border/25 flex items-center px-1.5">
                                                    <span className="text-[7px] text-muted-foreground/50">8px rad</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-3 py-2 border-t border-border/25">
                                        <p className="text-[7px] text-muted-foreground/30 text-center">Select an element to edit its properties</p>
                                    </div>
                                </motion.div>
                            </div>

                            {/* ── Bottom Status Bar ── */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={isInView ? { opacity: 1 } : {}}
                                transition={{ duration: 0.4, delay: 0.6 }}
                                className="flex items-center justify-between px-3 py-1.5 border-t border-border/30 bg-muted/15"
                            >
                                <span className="text-[8px] text-muted-foreground/35">Alt+drag · Ctrl+scroll · Shift+click multi-select</span>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1">
                                        <button className="size-4 rounded flex items-center justify-center text-muted-foreground/30 hover:bg-muted/30 transition-colors">
                                            <Plus className="size-2.5" />
                                        </button>
                                        <span className="text-[8px] text-muted-foreground/45 font-mono">44%</span>
                                        <button className="size-4 rounded flex items-center justify-center text-muted-foreground/30 hover:bg-muted/30 transition-colors">
                                            <X className="size-2.5" />
                                        </button>
                                    </div>
                                    <span className="text-[8px] text-muted-foreground/35">Desktop · 1440×1000 · 44% zoom</span>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}

// --- Studio → Builder: workspace slide transition ---

// UI fragment definitions for the transition
const TRANSITION_FRAGMENTS = {
    left: [
        { label: 'Hero Section', icon: Type, x: '15%', y: '20%', delay: 0.15 },
        { label: 'View Work', icon: MousePointerClick, x: '20%', y: '55%', delay: 0.3 },
        { label: 'Project Card', icon: Layers, x: '10%', y: '75%', delay: 0.45 },
    ],
    right: [
        { label: '<Hero />', icon: Code2, x: '75%', y: '25%', delay: 0.2 },
        { label: '<Projects />', icon: Code2, x: '80%', y: '50%', delay: 0.35 },
        { label: '<Contact />', icon: Code2, x: '70%', y: '72%', delay: 0.5 },
    ],
}

function FlowStudioToBuilderTransition() {
    const ref = useRef<HTMLDivElement>(null)
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start end', 'end start'],
    })

    // Flow line
    const lineHeight = useTransform(scrollYProgress, [0, 0.6], ['0%', '100%'])
    const lineOpacity = useTransform(scrollYProgress, [0, 0.08, 0.85, 1], [0, 0.5, 0.5, 0])
    const lineWidth = useTransform(scrollYProgress, [0.2, 0.35, 0.5, 0.65], [1, 2, 2, 1])
    const dotY = useTransform(scrollYProgress, [0, 0.6], ['0%', '100%'])

    // Fragments
    const fragmentsOpacity = useTransform(scrollYProgress, [0.15, 0.3, 0.7, 0.85], [0, 1, 1, 0])
    // Background grid
    const gridOpacity = useTransform(scrollYProgress, [0.1, 0.25, 0.75, 0.9], [0, 0.06, 0.06, 0])

    return (
        <section ref={ref} className="relative py-16 md:py-24 overflow-hidden">
            {/* Subtle background grid — depth layer */}
            <motion.div
                style={{ opacity: gridOpacity }}
                className="absolute inset-0 dot-grid-bg pointer-events-none"
            />

            {/* Flow line — centered, with glow trail */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0">
                {/* Glow trail */}
                <motion.div
                    style={{ height: lineHeight, opacity: useTransform(lineOpacity, v => v * 0.4) }}
                    className="absolute left-1/2 -translate-x-1/2 w-6 bg-gradient-to-b from-transparent via-primary/10 to-transparent blur-md origin-top"
                />
                {/* Main line with thickness pulse */}
                <motion.div
                    style={{ height: lineHeight, opacity: lineOpacity, width: lineWidth }}
                    className="absolute left-1/2 -translate-x-1/2 bg-gradient-to-b from-primary/15 via-primary/30 to-primary/10 origin-top rounded-full"
                />
                {/* Glowing dot at tip */}
                <motion.div
                    style={{ top: dotY, opacity: lineOpacity }}
                    className="absolute left-1/2 -translate-x-1/2"
                >
                    <div className="size-3 rounded-full bg-primary/50 blur-[3px]" />
                    <div className="absolute inset-0 size-3 rounded-full bg-primary/80 blur-[1px] scale-50" />
                </motion.div>

                {/* Data particles traveling along the line */}
                {[0.12, 0.28, 0.44, 0.58, 0.72].map((startAt, i) => (
                    <motion.div
                        key={`particle-${i}`}
                        style={{
                            top: useTransform(scrollYProgress, [startAt, startAt + 0.15], ['0%', '100%']),
                            opacity: useTransform(scrollYProgress, [startAt, startAt + 0.03, startAt + 0.12, startAt + 0.15], [0, 0.7, 0.7, 0]),
                        }}
                        className="absolute left-1/2 -translate-x-1/2 size-1.5 rounded-full bg-primary/60"
                    />
                ))}
            </div>

            <div className="max-w-6xl mx-auto px-6 relative">
                {/* Left side — UI fragments floating toward positions */}
                <motion.div style={{ opacity: fragmentsOpacity }} className="absolute inset-0 pointer-events-none">
                    {TRANSITION_FRAGMENTS.left.map((frag) => (
                        <motion.div
                            key={frag.label}
                            initial={{ opacity: 0, y: 15, scale: 0.9 }}
                            whileInView={{ opacity: 1, y: 0, scale: 1 }}
                            viewport={{ once: true, margin: '-80px' }}
                            transition={{ duration: 0.5, delay: frag.delay, ease: [0.25, 0.1, 0.25, 1] }}
                            className="absolute"
                            style={{ left: frag.x, top: frag.y }}
                        >
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-card/80 border border-border/30 shadow-sm backdrop-blur-sm">
                                <frag.icon className="size-3 text-primary/40" />
                                <span className="text-[9px] font-medium text-foreground/50">{frag.label}</span>
                            </div>
                        </motion.div>
                    ))}

                    {/* Right side — code fragments */}
                    {TRANSITION_FRAGMENTS.right.map((frag) => (
                        <motion.div
                            key={frag.label}
                            initial={{ opacity: 0, y: 12, x: 10 }}
                            whileInView={{ opacity: 1, y: 0, x: 0 }}
                            viewport={{ once: true, margin: '-80px' }}
                            transition={{ duration: 0.5, delay: frag.delay, ease: [0.25, 0.1, 0.25, 1] }}
                            className="absolute"
                            style={{ left: frag.x, top: frag.y }}
                        >
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0d1117]/80 border border-blue-400/10 shadow-sm backdrop-blur-sm">
                                <frag.icon className="size-3 text-blue-400/40" />
                                <span className="text-[9px] font-mono text-blue-300/50">{frag.label}</span>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Center label */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.6 }}
                    className="relative z-10 flex justify-center py-8"
                >
                    <motion.div
                        style={{ boxShadow: useTransform(scrollYProgress, [0.3, 0.5], ['0 0 0px rgba(59,130,246,0)', '0 0 20px rgba(59,130,246,0.08)']) }}
                        className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-primary/5 border border-primary/10"
                    >
                        <Zap className="size-3.5 text-primary/50" />
                        <span className="text-[11px] font-medium text-primary/50 tracking-wide">Design → Code</span>
                        <ArrowRight className="size-3 text-primary/30" />
                    </motion.div>
                </motion.div>
            </div>
        </section>
    )
}

// --- Builder Section — design to code with GitHub push ---

const BUILD_CODE_LINES = [
    { code: 'import { Hero, Projects, Contact } from "./components"', highlight: '' },
    { code: '', highlight: '' },
    { code: 'export default function Portfolio() {', highlight: '' },
    { code: '  return (', highlight: '' },
    { code: '    <main className="min-h-screen bg-dark">', highlight: '' },
    { code: '      <Hero', highlight: 'hero' },
    { code: '        name="Ethan Carter"', highlight: 'hero' },
    { code: '        role="Product Designer"', highlight: 'hero' },
    { code: '      />', highlight: 'hero' },
    { code: '      <Projects items={3} />', highlight: 'projects' },
    { code: '      <Contact', highlight: 'contact' },
    { code: '        email="hello@ethan.dev"', highlight: 'contact' },
    { code: '      />', highlight: 'contact' },
    { code: '    </main>', highlight: '' },
    { code: '  )', highlight: '' },
    { code: '}', highlight: '' },
]

type BuildPhase = 'idle' | 'clicking' | 'building' | 'syncing' | 'done' | 'pushing' | 'pushed' | 'downloading' | 'downloaded' | 'complete'

function FlowBuilderSection() {
    const sectionRef = useRef<HTMLDivElement>(null)
    const isInView = useInView(sectionRef, { once: true, margin: '-100px' })
    const [phase, setPhase] = useState<BuildPhase>('idle')
    const [visibleLines, setVisibleLines] = useState(0)
    const [activeHighlight, setActiveHighlight] = useState<string | null>(null)
    const [buildProgress, setBuildProgress] = useState(0)
    const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 })
    const [cursorVisible, setCursorVisible] = useState(false)
    const [cursorClicking, setCursorClicking] = useState(false)
    const [pushProgress, setPushProgress] = useState(0)
    const [commitFiles, setCommitFiles] = useState(0)
    const [showToast, setShowToast] = useState<string | null>(null)
    const buildTimers = useRef<ReturnType<typeof setTimeout>[]>([])

    useEffect(() => {
        if (!isInView) return
        let cancelled = false

        const delay = (ms: number) => new Promise<void>(resolve => {
            const t = setTimeout(resolve, ms)
            buildTimers.current.push(t)
        })

        const click = async () => {
            setCursorClicking(true)
            await delay(150)
            if (!cancelled) setCursorClicking(false)
        }

        const toast = async (msg: string) => {
            setShowToast(msg)
            await delay(2000)
            if (!cancelled) setShowToast(null)
        }

        const runSequence = async () => {
            await delay(1000)
            if (cancelled) return

            // 1. Cursor → Generate button
            setCursorVisible(true)
            setCursorPos({ x: 78, y: 50 })
            await delay(800)
            if (cancelled) return

            // 2. Click Generate — button press feedback
            setPhase('clicking')
            await click()
            if (cancelled) return
            await delay(400)

            // 3. Code generation
            if (cancelled) return
            setPhase('building')
            setCursorPos({ x: 75, y: 35 })
            await delay(300)

            for (let i = 0; i < BUILD_CODE_LINES.length; i++) {
                if (cancelled) return
                setVisibleLines(i + 1)
                setBuildProgress(Math.round(((i + 1) / BUILD_CODE_LINES.length) * 100))
                const line = BUILD_CODE_LINES[i]!
                if (line.highlight) setActiveHighlight(line.highlight)
                await delay(120 + Math.random() * 60)
            }

            // 4. Sync
            if (cancelled) return
            setPhase('syncing')
            setActiveHighlight(null)
            await delay(500)

            // 5. Build done
            if (cancelled) return
            setPhase('done')
            setBuildProgress(100)
            await delay(1000)

            // 6. Cursor → Push to GitHub
            if (cancelled) return
            setCursorPos({ x: 90, y: 50 })
            await delay(600)
            if (cancelled) return
            setPhase('pushing')
            await click()

            // 7. Push files
            for (let f = 1; f <= 5; f++) {
                if (cancelled) return
                setCommitFiles(f)
                setPushProgress(f * 20)
                await delay(350)
            }

            // 8. Push complete
            if (cancelled) return
            setPhase('pushed')
            toast('Pushed to ethan-portfolio/main')
            await delay(1200)

            // 9. Cursor → Download
            if (cancelled) return
            setCursorPos({ x: 97, y: 50 })
            await delay(500)
            if (cancelled) return
            setPhase('downloading')
            await click()
            await delay(600)
            if (cancelled) return
            setPhase('downloaded')
            toast('ethan-portfolio.zip downloaded')
            await delay(1500)

            // 10. Complete
            if (cancelled) return
            setPhase('complete')
            setCursorVisible(false)
        }

        runSequence()
        return () => {
            cancelled = true
            buildTimers.current.forEach(clearTimeout)
        }
    }, [isInView])

    return (
        <section ref={sectionRef} className="relative px-6 py-20 md:py-28 overflow-hidden">
            <div className="max-w-6xl mx-auto w-full">
                {/* Text — top */}
                <div className="max-w-xl mb-12 md:mb-16">
                    <motion.span
                        variants={fadeIn}
                        initial="hidden"
                        animate={isInView ? 'visible' : 'hidden'}
                        custom={0}
                        className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.2em] uppercase text-primary/70 mb-5"
                    >
                        <span className="inline-block size-1.5 rounded-full bg-primary/50" />
                        Step 03
                    </motion.span>

                    <div className="overflow-hidden">
                        <motion.h2
                            variants={slideUp}
                            initial="hidden"
                            animate={isInView ? 'visible' : 'hidden'}
                            custom={0.1}
                            className="text-3xl md:text-[2.75rem] font-bold tracking-tight leading-[1.1]"
                        >
                            Build Instantly
                        </motion.h2>
                    </div>

                    <motion.p
                        variants={blurIn}
                        initial="hidden"
                        animate={isInView ? 'visible' : 'hidden'}
                        custom={0.25}
                        className="mt-5 text-base md:text-lg text-muted-foreground/70 leading-relaxed"
                    >
                        Convert your design into functional components and production-ready code.
                    </motion.p>

                    <motion.div
                        variants={fadeIn}
                        initial="hidden"
                        animate={isInView ? 'visible' : 'hidden'}
                        custom={0.4}
                        className="mt-6 flex items-center gap-3"
                    >
                        <div className="size-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                            <Code2 className="size-[18px] text-primary/60" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground/60">Production-ready code generation</span>
                    </motion.div>
                </div>

                {/* Builder preview — full width */}
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.97 }}
                    animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                    transition={{ duration: 0.9, delay: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                >
                    <div className="relative">
                        <motion.div
                            animate={phase === 'complete' ? { opacity: 0.08 } : { opacity: 0.05 }}
                            className="absolute -inset-8 rounded-3xl bg-primary blur-3xl pointer-events-none transition-opacity duration-1000"
                        />

                        <div className="relative rounded-xl border border-border/50 bg-card shadow-2xl shadow-black/8 dark:shadow-black/25 overflow-hidden">
                            {/* Top bar */}
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={isInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/20 relative"
                            >
                                {/* Cursor overlay for toolbar */}
                                {cursorVisible && (
                                    <motion.div
                                        className="absolute z-50 pointer-events-none"
                                        animate={{ left: `${cursorPos.x}%`, top: `${cursorPos.y < 0 ? 50 : 50}%` }}
                                        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                                    >
                                        <motion.div animate={cursorClicking ? { scale: 0.8 } : { scale: 1 }} transition={{ duration: 0.1 }}>
                                            <svg width="14" height="18" viewBox="0 0 16 20" fill="none" className="drop-shadow-md">
                                                <path d="M0 0L12.5 12.5H5.5L2.5 19.5L0 0Z" fill="white" stroke="black" strokeWidth="1" strokeLinejoin="round" />
                                            </svg>
                                        </motion.div>
                                        {cursorClicking && (
                                            <motion.div
                                                initial={{ scale: 0, opacity: 0.5 }}
                                                animate={{ scale: 2.5, opacity: 0 }}
                                                transition={{ duration: 0.4 }}
                                                className="absolute top-0 left-0 size-3 rounded-full bg-primary/30 -translate-x-1/2 -translate-y-1/2"
                                            />
                                        )}
                                    </motion.div>
                                )}

                                <div className="flex items-center gap-2.5">
                                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground/40">
                                        <ChevronLeft className="size-3" />
                                        <span>Back</span>
                                    </div>
                                    <div className="w-px h-3.5 bg-border/30" />
                                    <span className="text-[10px] font-semibold text-foreground/70">Buildify Builder</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Build status */}
                                    <div className={cn(
                                        "flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[8px] transition-all duration-300",
                                        phase === 'done' || phase === 'pushing' || phase === 'pushed' || phase === 'complete'
                                            ? 'bg-primary/10 text-primary/70'
                                            : phase === 'building' || phase === 'syncing'
                                                ? 'bg-primary/5 text-primary/50'
                                                : 'text-muted-foreground/40'
                                    )}>
                                        {phase === 'done' || phase === 'pushing' || phase === 'pushed' || phase === 'complete' ? (
                                            <><CircleCheck className="size-3" /> Built</>
                                        ) : phase === 'building' || phase === 'syncing' ? (
                                            <><Loader2 className="size-3 animate-spin" /> Building... {buildProgress}%</>
                                        ) : (
                                            <><Terminal className="size-3" /> Ready</>
                                        )}
                                    </div>

                                    {/* Generate button */}
                                    <button className={cn(
                                        "h-6 px-2.5 rounded-md flex items-center gap-1.5 text-[8px] font-semibold transition-all duration-200",
                                        phase === 'clicking'
                                            ? 'bg-primary/80 text-primary-foreground scale-95 shadow-lg shadow-primary/30'
                                            : 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                                    )}>
                                        <Zap className="size-3" />
                                        Generate
                                    </button>

                                    {/* Push to GitHub button */}
                                    <button className={cn(
                                        "h-6 px-2.5 rounded-md border flex items-center gap-1.5 text-[8px] font-medium transition-all duration-200",
                                        phase === 'pushing'
                                            ? 'border-primary/40 text-primary/70 bg-primary/5 scale-95'
                                            : phase === 'pushed' || phase === 'downloading' || phase === 'downloaded' || phase === 'complete'
                                                ? 'border-primary/30 text-primary/60 bg-primary/5'
                                                : 'border-border/40 text-muted-foreground/50'
                                    )}>
                                        <Globe className="size-3" />
                                        {phase === 'pushed' || phase === 'downloading' || phase === 'downloaded' || phase === 'complete' ? 'Pushed' : 'Push to GitHub'}
                                    </button>

                                    {/* Download button */}
                                    <button className={cn(
                                        "h-6 px-2.5 rounded-md border flex items-center gap-1.5 text-[8px] font-medium transition-all duration-200",
                                        phase === 'downloading'
                                            ? 'border-primary/40 text-primary/70 bg-primary/5 scale-95'
                                            : phase === 'downloaded' || phase === 'complete'
                                                ? 'border-primary/30 text-primary/60 bg-primary/5'
                                                : 'border-border/40 text-muted-foreground/50'
                                    )}>
                                        <ArrowRight className="size-3 rotate-90" />
                                        {phase === 'downloaded' || phase === 'complete' ? 'Downloaded' : 'Download'}
                                    </button>
                                </div>
                            </motion.div>

                            {/* Main split view: UI + Code */}
                            <div className="flex" style={{ height: 'clamp(340px, 44vw, 520px)' }}>
                                {/* Left — Live UI preview */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
                                    animate={isInView ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : {}}
                                    transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                                    className="flex-1 bg-muted/5 relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 dot-grid-bg opacity-10" />

                                    <div className="absolute inset-2 md:inset-3 rounded-lg border border-border/20 bg-[#0f1117] overflow-hidden shadow-lg flex flex-col text-white/90">
                                        {/* Navbar */}
                                        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                                            <span className="text-[9px] font-bold text-white/85 tracking-tight">Ethan.dev</span>
                                            <div className="flex items-center gap-3">
                                                {['Work', 'About', 'Contact'].map((l) => (
                                                    <span key={l} className="text-[7px] text-white/35">{l}</span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Hero */}
                                        <motion.div
                                            animate={{ boxShadow: activeHighlight === 'hero' ? 'inset 0 0 0 1px rgba(59,130,246,0.3), 0 0 20px rgba(59,130,246,0.08)' : 'inset 0 0 0 0px transparent' }}
                                            transition={{ duration: 0.3 }}
                                            className="flex-1 flex items-center px-4 gap-3 relative"
                                        >
                                            {activeHighlight === 'hero' && (
                                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute top-1 right-2 text-[6px] font-mono text-blue-400/50 bg-blue-400/5 px-1.5 py-0.5 rounded">{'<Hero />'}</motion.div>
                                            )}
                                            <div className="flex-1">
                                                <p className="text-[14px] md:text-[16px] font-extrabold text-white/90 leading-tight">Hey, I&apos;m Ethan</p>
                                                <p className="text-[8px] font-semibold text-blue-400/70 mt-0.5">Product Designer &amp; Developer</p>
                                                <p className="text-[6px] text-white/25 mt-1.5 max-w-[85%]">Designing intuitive products and building polished digital experiences.</p>
                                                <div className="mt-2.5 flex gap-1.5">
                                                    <div className="h-5 px-2 rounded-md bg-blue-500/80 flex items-center"><span className="text-[6px] font-semibold text-white">View Work</span></div>
                                                    <div className="h-5 px-2 rounded-md border border-white/12 flex items-center"><span className="text-[6px] text-white/40">About Me</span></div>
                                                </div>
                                            </div>
                                            <div className="w-[30%] aspect-[4/5] rounded-lg bg-blue-500/[0.06] border border-white/5 flex items-center justify-center hidden md:flex">
                                                <Globe className="size-6 text-blue-400/20" />
                                            </div>
                                        </motion.div>

                                        {/* Projects */}
                                        <motion.div
                                            animate={{ boxShadow: activeHighlight === 'projects' ? 'inset 0 0 0 1px rgba(59,130,246,0.3), 0 0 20px rgba(59,130,246,0.08)' : 'inset 0 0 0 0px transparent' }}
                                            transition={{ duration: 0.3 }}
                                            className="px-4 py-2.5 relative"
                                        >
                                            {activeHighlight === 'projects' && (
                                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute top-1 right-2 text-[6px] font-mono text-blue-400/50 bg-blue-400/5 px-1.5 py-0.5 rounded">{'<Projects />'}</motion.div>
                                            )}
                                            <p className="text-[7px] font-semibold text-white/40 mb-1.5">Featured Projects</p>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {[{ name: 'Design System', tech: 'Figma · React' }, { name: 'SaaS Dashboard', tech: 'Next.js · D3' }, { name: 'E-commerce', tech: 'React · Stripe' }].map((p, i) => (
                                                    <div key={i} className="rounded-md bg-white/[0.02] border border-white/[0.04] px-2 py-1.5">
                                                        <p className="text-[6px] font-semibold text-white/55">{p.name}</p>
                                                        <p className="text-[5px] text-white/20 mt-0.5">{p.tech}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>

                                        {/* Contact */}
                                        <motion.div
                                            animate={{ boxShadow: activeHighlight === 'contact' ? 'inset 0 0 0 1px rgba(59,130,246,0.3), 0 0 20px rgba(59,130,246,0.08)' : 'inset 0 0 0 0px transparent' }}
                                            transition={{ duration: 0.3 }}
                                            className="px-4 py-2 border-t border-white/[0.03] relative"
                                        >
                                            {activeHighlight === 'contact' && (
                                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute top-1 right-2 text-[6px] font-mono text-blue-400/50 bg-blue-400/5 px-1.5 py-0.5 rounded">{'<Contact />'}</motion.div>
                                            )}
                                            <p className="text-[7px] font-semibold text-white/40 mb-1.5">Get in Touch</p>
                                            <div className="flex gap-2">
                                                <div className="flex-1 h-5 rounded bg-white/[0.03] border border-white/[0.05] px-2 flex items-center"><span className="text-[6px] text-white/20">Your email</span></div>
                                                <div className="h-5 px-2.5 rounded bg-blue-500/60 flex items-center"><span className="text-[6px] font-semibold text-white/80">Send</span></div>
                                            </div>
                                        </motion.div>
                                    </div>

                                    {/* Build complete glow */}
                                    {(phase === 'done' || phase === 'pushing' || phase === 'pushed' || phase === 'downloading' || phase === 'downloaded' || phase === 'complete') && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="absolute inset-0 pointer-events-none">
                                            <div className="absolute inset-2 md:inset-3 rounded-lg ring-1 ring-primary/20 shadow-[0_0_30px_-5px] shadow-primary/10" />
                                        </motion.div>
                                    )}
                                </motion.div>

                                <div className="w-px bg-border/30" />

                                {/* Right — Code + Terminal + GitHub */}
                                <motion.div
                                    initial={{ opacity: 0, x: 60 }}
                                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                                    transition={{ duration: 0.7, delay: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
                                    className="w-[40%] md:w-[38%] bg-[#0d1117] flex flex-col hidden md:flex"
                                >
                                    {/* Tab bar */}
                                    <div className="flex items-center px-3 py-1.5 border-b border-white/5 bg-white/[0.02]">
                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-t bg-white/[0.04] border-b border-blue-400/30">
                                            <Code2 className="size-2.5 text-blue-400/50" />
                                            <span className="text-[7px] text-white/50">page.tsx</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2 py-1 ml-1">
                                            <span className="text-[7px] text-white/20">styles.css</span>
                                        </div>
                                    </div>

                                    {/* Code content */}
                                    <div className="flex-1 p-3 overflow-hidden font-mono">
                                        <div className="space-y-0.5">
                                            {BUILD_CODE_LINES.map((line, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, x: -8 }}
                                                    animate={i < visibleLines ? { opacity: 1, x: 0 } : {}}
                                                    transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                                                    className="flex items-start gap-2"
                                                >
                                                    <span className="text-[6px] text-white/15 w-4 text-right flex-shrink-0 select-none pt-px">{i + 1}</span>
                                                    <pre className={cn(
                                                        "text-[6.5px] leading-relaxed whitespace-pre",
                                                        line.highlight && activeHighlight === line.highlight
                                                            ? 'text-blue-300/80 bg-blue-400/[0.06] -mx-1 px-1 rounded'
                                                            : line.code.includes('import') || line.code.includes('export') || line.code.includes('function') || line.code.includes('return')
                                                                ? 'text-blue-400/50'
                                                                : line.code.includes('"')
                                                                    ? 'text-blue-200/45'
                                                                    : line.code.includes('<') || line.code.includes('/>')
                                                                        ? 'text-blue-300/50'
                                                                        : 'text-white/30'
                                                    )}>
                                                        {line.code || ' '}
                                                    </pre>
                                                </motion.div>
                                            ))}
                                            {phase === 'building' && (
                                                <div className="flex items-start gap-2 mt-0.5">
                                                    <span className="text-[6px] text-white/15 w-4 text-right flex-shrink-0">{visibleLines + 1}</span>
                                                    <span className="inline-block w-[4px] h-[10px] bg-blue-400/60 animate-pulse" />
                                                </div>
                                            )}
                                        </div>

                                        {(phase === 'done' || phase === 'pushing' || phase === 'pushed' || phase === 'downloading' || phase === 'downloaded' || phase === 'complete') && (
                                            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                                                className="mt-3 flex items-center gap-2 px-2 py-1.5 rounded bg-primary/5 border border-primary/10"
                                            >
                                                <CircleCheck className="size-3 text-primary/60" />
                                                <span className="text-[7px] text-primary/60">Build complete — ready to deploy</span>
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Terminal + GitHub push */}
                                    <div className="border-t border-white/5 px-3 py-2 bg-white/[0.01]">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <Terminal className="size-2.5 text-white/20" />
                                            <span className="text-[7px] text-white/25">Terminal</span>
                                        </div>
                                        <div className="space-y-0.5 text-[6px] font-mono">
                                            {phase !== 'idle' && phase !== 'clicking' && (
                                                <>
                                                    <p className="text-white/20">$ buildify generate --components</p>
                                                    {buildProgress > 30 && <p className="text-blue-400/30">✓ Hero component generated</p>}
                                                    {buildProgress > 60 && <p className="text-blue-400/30">✓ Projects component generated</p>}
                                                    {buildProgress > 85 && <p className="text-blue-400/30">✓ Contact component generated</p>}
                                                    {(phase === 'done' || phase === 'pushing' || phase === 'pushed' || phase === 'downloading' || phase === 'downloaded' || phase === 'complete') && (
                                                        <p className="text-blue-300/40">✓ Build complete in 1.2s</p>
                                                    )}
                                                </>
                                            )}
                                            {/* GitHub push output */}
                                            {(phase === 'pushing' || phase === 'pushed' || phase === 'downloading' || phase === 'downloaded' || phase === 'complete') && (
                                                <>
                                                    <div className="w-full h-px bg-white/5 my-1" />
                                                    <p className="text-white/20">$ git push origin main</p>
                                                    {commitFiles >= 1 && <p className="text-blue-400/30">  page.tsx</p>}
                                                    {commitFiles >= 2 && <p className="text-blue-400/30">  styles.css</p>}
                                                    {commitFiles >= 3 && <p className="text-blue-400/30">  components/Hero.tsx</p>}
                                                    {commitFiles >= 4 && <p className="text-blue-400/30">  components/Projects.tsx</p>}
                                                    {commitFiles >= 5 && <p className="text-blue-400/30">  components/Contact.tsx</p>}
                                                    {(phase === 'pushed' || phase === 'downloading' || phase === 'downloaded' || phase === 'complete') && (
                                                        <>
                                                            <p className="text-blue-300/40 mt-0.5">✓ Pushed to ethan-portfolio/main</p>
                                                            <p className="text-white/15">  &quot;Initial commit: portfolio site&quot;</p>
                                                        </>
                                                    )}
                                                    {(phase === 'downloaded' || phase === 'complete') && (
                                                        <>
                                                            <div className="w-full h-px bg-white/5 my-1" />
                                                            <p className="text-blue-300/40">✓ ethan-portfolio.zip — 2.4 MB</p>
                                                        </>
                                                    )}
                                                    {phase === 'pushing' && (
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <div className="w-20 h-1 rounded-full bg-white/5 overflow-hidden">
                                                                <motion.div className="h-full bg-blue-400/30 rounded-full" animate={{ width: `${pushProgress}%` }} transition={{ duration: 0.3 }} />
                                                            </div>
                                                            <span className="text-white/20">{pushProgress}%</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Toast notification */}
                            {showToast && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, x: '-50%' }}
                                    animate={{ opacity: 1, y: 0, x: '-50%' }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                    className="absolute bottom-12 left-1/2 z-50 flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 shadow-lg shadow-primary/5 backdrop-blur-sm"
                                >
                                    <CircleCheck className="size-3.5 text-primary/70" />
                                    <span className="text-[9px] font-medium text-primary/80 whitespace-nowrap">{showToast}</span>
                                </motion.div>
                            )}

                            {/* Bottom status */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={isInView ? { opacity: 1 } : {}}
                                transition={{ duration: 0.4, delay: 0.6 }}
                                className="flex items-center justify-between px-4 py-1.5 border-t border-border/30 bg-muted/15"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-[8px] text-muted-foreground/35">page.tsx</span>
                                    <span className="text-[8px] text-muted-foreground/25">·</span>
                                    <span className="text-[8px] text-muted-foreground/35">{BUILD_CODE_LINES.length} lines</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {phase !== 'idle' && (
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-16 h-1 rounded-full bg-border/30 overflow-hidden">
                                                <motion.div className="h-full bg-primary/40 rounded-full" animate={{ width: `${buildProgress}%` }} transition={{ duration: 0.3 }} />
                                            </div>
                                            <span className="text-[8px] text-muted-foreground/40 font-mono">{buildProgress}%</span>
                                        </div>
                                    )}
                                    <span className="text-[8px] text-muted-foreground/30">TypeScript · React</span>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}

// --- Builder → Testing transition (URL handoff) ---

function FlowBuilderToTestingTransition() {
    const ref = useRef<HTMLDivElement>(null)
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start end', 'end start'],
    })

    // URL pill position — starts top-center, curves down to center-left (where input will be)
    const urlY = useTransform(scrollYProgress, [0.1, 0.5, 0.8], ['0%', '50%', '100%'])
    const urlX = useTransform(scrollYProgress, [0.1, 0.4, 0.8], ['50%', '45%', '30%'])
    const urlScale = useTransform(scrollYProgress, [0.1, 0.3, 0.6, 0.8], [0.85, 1, 1, 0.9])
    const urlOpacity = useTransform(scrollYProgress, [0.05, 0.15, 0.7, 0.85], [0, 1, 1, 0])
    const urlGlow = useTransform(scrollYProgress, [0.15, 0.35, 0.6], [0, 1, 0.3])

    // Connecting line from top
    const lineOpacity = useTransform(scrollYProgress, [0, 0.1, 0.8, 0.95], [0, 0.4, 0.4, 0])
    const lineHeight = useTransform(scrollYProgress, [0, 0.6], ['0%', '100%'])

    // Label
    const labelOpacity = useTransform(scrollYProgress, [0.25, 0.4, 0.65, 0.8], [0, 1, 1, 0])

    return (
        <section ref={ref} className="relative py-12 md:py-16 overflow-hidden">
            {/* Connecting line */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0">
                <motion.div
                    style={{ height: lineHeight, opacity: lineOpacity }}
                    className="absolute left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-primary/15 via-primary/25 to-primary/10 origin-top"
                />
            </div>

            {/* Floating URL pill */}
            <motion.div
                style={{
                    left: urlX,
                    top: urlY,
                    scale: urlScale,
                    opacity: urlOpacity,
                    x: '-50%',
                    y: '-50%',
                    boxShadow: useTransform(urlGlow, v => `0 0 ${v * 20}px rgba(59,130,246,${v * 0.15})`),
                }}
                className="absolute z-10 flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-primary/20 shadow-lg backdrop-blur-sm"
            >
                <Globe className="size-3.5 text-primary/50 flex-shrink-0" />
                <span className="text-[11px] font-mono text-primary/70 whitespace-nowrap">ethan.dev</span>
                <ArrowRight className="size-3 text-primary/30" />
            </motion.div>

            {/* Center label */}
            <motion.div
                style={{ opacity: labelOpacity }}
                className="relative z-10 flex justify-center py-4"
            >
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/8">
                    <Rocket className="size-3.5 text-primary/40" />
                    <span className="text-[10px] font-medium text-primary/40">Deployed → Testing</span>
                    <FlaskConical className="size-3.5 text-primary/40" />
                </div>
            </motion.div>
        </section>
    )
}

// --- Testing Section (TinyFish) ---

type TestPhase = 'idle' | 'typing-url' | 'running' | 'expanding' | 'complete'

function FlowTestingSection() {
    const sectionRef = useRef<HTMLDivElement>(null)
    const isInView = useInView(sectionRef, { once: true, margin: '-100px' })
    const [phase, setPhase] = useState<TestPhase>('idle')
    const [urlChars, setUrlChars] = useState(0)
    const [progress, setProgress] = useState(0)
    const [pages, setPages] = useState(0)
    const [tests, setTests] = useState(0)
    const [fishX, setFishX] = useState(10)
    const [expandSource, setExpandSource] = useState(false)
    const testTimers = useRef<ReturnType<typeof setTimeout>[]>([])

    const testUrl = 'https://ethan.dev'

    useEffect(() => {
        if (!isInView) return
        let cancelled = false
        const delay = (ms: number) => new Promise<void>(resolve => {
            const t = setTimeout(resolve, ms)
            testTimers.current.push(t)
        })

        const run = async () => {
            await delay(800)
            if (cancelled) return

            // 1. Type URL
            setPhase('typing-url')
            for (let i = 1; i <= testUrl.length; i++) {
                if (cancelled) return
                setUrlChars(i)
                await delay(40 + Math.random() * 25)
            }
            await delay(500)
            if (cancelled) return

            // 2. Run tests
            setPhase('running')
            const totalSteps = 30
            for (let s = 1; s <= totalSteps; s++) {
                if (cancelled) return
                setProgress(Math.round((s / totalSteps) * 100))
                setPages(Math.min(Math.floor(s / 6) + 1, 5))
                setTests(Math.min(Math.floor(s / 3) + 1, 10))
                setFishX(10 + (s / totalSteps) * 80)
                await delay(80 + Math.random() * 40)
            }
            await delay(400)
            if (cancelled) return

            // 3. Expand panels
            setPhase('expanding')
            setExpandSource(true)
            await delay(1200)
            if (cancelled) return

            // 4. Complete
            setPhase('complete')
        }

        run()
        return () => { cancelled = true; testTimers.current.forEach(clearTimeout) }
    }, [isInView])

    return (
        <section ref={sectionRef} className="relative px-6 py-20 md:py-28 overflow-hidden">
            <div className="max-w-6xl mx-auto w-full">
                {/* Text header */}
                <div className="max-w-xl mb-12 md:mb-16">
                    <motion.span
                        variants={fadeIn} initial="hidden"
                        animate={isInView ? 'visible' : 'hidden'} custom={0}
                        className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.2em] uppercase text-primary/70 mb-5"
                    >
                        <span className="inline-block size-1.5 rounded-full bg-primary/50" />
                        Step 04
                    </motion.span>
                    <div className="overflow-hidden">
                        <motion.h2 variants={slideUp} initial="hidden"
                            animate={isInView ? 'visible' : 'hidden'} custom={0.1}
                            className="text-3xl md:text-[2.75rem] font-bold tracking-tight leading-[1.1]"
                        >
                            Ship &amp; Test
                        </motion.h2>
                    </div>
                    <motion.p variants={blurIn} initial="hidden"
                        animate={isInView ? 'visible' : 'hidden'} custom={0.25}
                        className="mt-5 text-base md:text-lg text-muted-foreground/70 leading-relaxed"
                    >
                        Deploy seamlessly and test your product with integrated AI-powered testing.
                    </motion.p>
                    <motion.div variants={fadeIn} initial="hidden"
                        animate={isInView ? 'visible' : 'hidden'} custom={0.4}
                        className="mt-6 flex items-center gap-3"
                    >
                        <div className="size-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                            <FlaskConical className="size-[18px] text-primary/60" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground/60">AI-powered test automation</span>
                    </motion.div>
                </div>

                {/* TinyFish UI */}
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.97 }}
                    animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                    transition={{ duration: 0.9, delay: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                >
                    <div className="relative">
                        <div className="absolute -inset-8 rounded-3xl bg-primary/[0.04] blur-3xl pointer-events-none" />

                        <div className="relative rounded-xl border border-border/50 bg-card shadow-2xl shadow-black/8 dark:shadow-black/25 overflow-hidden">
                            {/* TinyFish header */}
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={isInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                className="px-5 py-4 border-b border-border/30 bg-muted/15"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Fish className="size-5 text-primary/70" />
                                        <span className="text-[13px] font-bold text-foreground/80">TestFish</span>
                                        <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary/60 uppercase tracking-wider">Beta</span>
                                    </div>
                                    <span className="text-[9px] text-muted-foreground/40">AI-powered &middot; 6 test categories</span>
                                </div>
                                <p className="text-[18px] md:text-[22px] font-bold text-foreground/85 leading-tight">
                                    Test any site. Automatically.
                                </p>
                            </motion.div>

                            {/* URL Input + Run Tests */}
                            <div className="px-5 py-4 border-b border-border/20">
                                <div className="flex gap-2">
                                    <div className={cn(
                                        "flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors duration-200",
                                        phase === 'typing-url' ? 'border-primary/30 bg-background/80' : 'border-border/30 bg-background/50'
                                    )}>
                                        <Search className="size-3.5 text-muted-foreground/30 flex-shrink-0" />
                                        <div className="flex-1 min-h-[18px] flex items-center">
                                            {phase !== 'idle' ? (
                                                <span className="text-[12px] text-foreground/70 font-mono">
                                                    {testUrl.slice(0, urlChars)}
                                                    {phase === 'typing-url' && urlChars < testUrl.length && (
                                                        <span className="inline-block w-[2px] h-[13px] bg-primary/60 ml-0.5 align-middle animate-pulse" />
                                                    )}
                                                </span>
                                            ) : (
                                                <span className="text-[12px] text-muted-foreground/30">Enter URL to test...</span>
                                            )}
                                        </div>
                                    </div>
                                    <button className={cn(
                                        "px-4 py-2.5 rounded-lg flex items-center gap-2 text-[11px] font-semibold transition-all duration-200",
                                        phase === 'running'
                                            ? 'bg-primary/70 text-primary-foreground cursor-wait'
                                            : phase === 'complete' || phase === 'expanding'
                                                ? 'bg-primary/10 text-primary/70 border border-primary/20'
                                                : 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                                    )}>
                                        {phase === 'running' ? (
                                            <><Loader2 className="size-3.5 animate-spin" /> Running...</>
                                        ) : phase === 'complete' || phase === 'expanding' ? (
                                            <><CircleCheck className="size-3.5" /> Complete</>
                                        ) : (
                                            <><FlaskConical className="size-3.5" /> Run Tests</>
                                        )}
                                    </button>
                                </div>

                                {/* Progress bar */}
                                {(phase === 'running' || phase === 'expanding' || phase === 'complete') && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        transition={{ duration: 0.3 }}
                                        className="mt-3"
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[9px] text-muted-foreground/50">
                                                {phase === 'complete' ? 'All tests completed' : `Testing in progress... ${progress}%`}
                                            </span>
                                            {/* Fish indicator */}
                                            <motion.div
                                                animate={{ x: phase === 'running' ? [0, 3, 0] : 0 }}
                                                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                                            >
                                                <Fish className="size-3 text-primary/40" />
                                            </motion.div>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-border/30 overflow-hidden">
                                            <motion.div
                                                className="h-full bg-primary/50 rounded-full"
                                                animate={{ width: `${progress}%` }}
                                                transition={{ duration: 0.2 }}
                                            />
                                        </div>
                                        {/* Scanning fish */}
                                        {phase === 'running' && (
                                            <div className="relative h-4 mt-1">
                                                <motion.div
                                                    animate={{ left: `${fishX}%` }}
                                                    transition={{ duration: 0.3, ease: 'linear' }}
                                                    className="absolute top-0"
                                                >
                                                    <Fish className="size-3.5 text-primary/30" style={{ transform: 'scaleX(-1)' }} />
                                                </motion.div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </div>

                            {/* Panels area */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border/15" style={{ minHeight: phase === 'idle' || phase === 'typing-url' ? 0 : undefined }}>
                                {/* Source Code Analysis */}
                                {(phase === 'running' || phase === 'expanding' || phase === 'complete') && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        transition={{ duration: 0.4, delay: 0.1 }}
                                        className="bg-card p-4"
                                    >
                                        <button
                                            className="flex items-center justify-between w-full text-left mb-2"
                                            onClick={() => setExpandSource(!expandSource)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Code2 className="size-3.5 text-primary/50" />
                                                <span className="text-[11px] font-semibold text-foreground/70">Source Code Analysis</span>
                                            </div>
                                            <motion.div animate={{ rotate: expandSource ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                                <ChevronDown className="size-3.5 text-muted-foreground/30" />
                                            </motion.div>
                                        </button>
                                        {expandSource && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                transition={{ duration: 0.3 }}
                                                className="space-y-2 pt-1"
                                            >
                                                {[
                                                    { label: 'HTML Structure', status: 'Analyzed', ok: true },
                                                    { label: 'CSS Validation', status: 'Valid', ok: true },
                                                    { label: 'JS Bundle Size', status: '142 KB', ok: true },
                                                    { label: 'Meta Tags', status: 'Complete', ok: true },
                                                ].map((item) => (
                                                    <div key={item.label} className="flex items-center justify-between py-1 border-b border-border/10 last:border-0">
                                                        <span className="text-[9px] text-muted-foreground/50">{item.label}</span>
                                                        <span className={cn("text-[9px] font-medium", item.ok ? 'text-primary/60' : 'text-muted-foreground/40')}>
                                                            {item.ok && <CircleCheck className="size-2.5 inline mr-1" />}
                                                            {item.status}
                                                        </span>
                                                    </div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </motion.div>
                                )}

                                {/* Test Budget */}
                                {(phase === 'running' || phase === 'expanding' || phase === 'complete') && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        transition={{ duration: 0.4, delay: 0.2 }}
                                        className="bg-card p-4"
                                    >
                                        <div className="flex items-center gap-2 mb-3">
                                            <FlaskConical className="size-3.5 text-primary/50" />
                                            <span className="text-[11px] font-semibold text-foreground/70">Test Budget</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-lg bg-muted/20 border border-border/20 p-3 text-center">
                                                <motion.p
                                                    key={pages}
                                                    initial={{ scale: 1.2, opacity: 0.5 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    className="text-[20px] font-bold text-foreground/80"
                                                >
                                                    {pages}
                                                </motion.p>
                                                <p className="text-[8px] text-muted-foreground/40 mt-0.5">pages crawled</p>
                                            </div>
                                            <div className="rounded-lg bg-muted/20 border border-border/20 p-3 text-center">
                                                <motion.p
                                                    key={tests}
                                                    initial={{ scale: 1.2, opacity: 0.5 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    className="text-[20px] font-bold text-foreground/80"
                                                >
                                                    {tests}
                                                </motion.p>
                                                <p className="text-[8px] text-muted-foreground/40 mt-0.5">tests generated</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {/* Results footer */}
                            {phase === 'complete' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4 }}
                                    className="px-5 py-3 border-t border-border/20 bg-primary/[0.02] flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2">
                                        <CircleCheck className="size-4 text-primary/60" />
                                        <span className="text-[11px] font-medium text-primary/70">All tests passed — no critical issues found</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] text-muted-foreground/40">5 pages · 10 tests · 0 failures</span>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}

function FlowAIChatSection() {
    const sectionRef = useRef<HTMLDivElement>(null)
    const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

    return (
        <section ref={sectionRef} className="relative min-h-screen flex items-center px-6 py-20 md:py-28 overflow-hidden">
            <div className="max-w-6xl mx-auto w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
                    {/* Text — staggered entrance */}
                    <div>
                        <motion.span
                            variants={fadeIn}
                            initial="hidden"
                            animate={isInView ? 'visible' : 'hidden'}
                            custom={0}
                            className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.2em] uppercase text-primary/70 mb-5"
                        >
                            <span className="inline-block size-1.5 rounded-full bg-primary/50" />
                            Step 01
                        </motion.span>

                        <div className="overflow-hidden">
                            <motion.h2
                                variants={slideUp}
                                initial="hidden"
                                animate={isInView ? 'visible' : 'hidden'}
                                custom={0.1}
                                className="text-3xl md:text-[2.75rem] font-bold tracking-tight leading-[1.1]"
                            >
                                Plan with AI
                            </motion.h2>
                        </div>

                        <motion.p
                            variants={blurIn}
                            initial="hidden"
                            animate={isInView ? 'visible' : 'hidden'}
                            custom={0.25}
                            className="mt-5 text-base md:text-lg text-muted-foreground/70 leading-relaxed max-w-lg"
                        >
                            Describe what you want to build and let AI generate the foundation instantly.
                        </motion.p>

                        <motion.div
                            variants={fadeIn}
                            initial="hidden"
                            animate={isInView ? 'visible' : 'hidden'}
                            custom={0.4}
                            className="mt-8 flex items-center gap-3"
                        >
                            <div className="size-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                                <MessageSquareText className="size-[18px] text-primary/60" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground/60">AI-powered chat interface</span>
                        </motion.div>
                    </div>

                    {/* Visual — chat UI */}
                    <motion.div
                        variants={scaleIn}
                        initial="hidden"
                        animate={isInView ? 'visible' : 'hidden'}
                        custom={0.15}
                    >
                        <FlowAIChatVisual inView={isInView} />
                    </motion.div>
                </div>
            </div>
        </section>
    )
}

export default function LandingPage() {
    const { session, isPending } = useStateMachine()
    const router = useRouter()
    const { theme, setTheme } = useTheme()
    const heroRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [navScrolled, setNavScrolled] = useState(false)
    const [prompt, setPrompt] = useState('')
    const [inputFocused, setInputFocused] = useState(false)
    const [attachments, setAttachments] = useState<ImageAttachment[]>([])
    const [openVideoIndex, setOpenVideoIndex] = useState<number | null>(null)
    const dialogVideoRef = useRef<HTMLVideoElement>(null)
    const { state: micState, error: micError, clearError: clearMicError, toggle: toggleMic } = useSpeechRecord(
        (text) => setPrompt((prev) => (prev ? `${prev} ${text}` : text)),
    )

    useEffect(() => {
        if (!micError) return
        const t = setTimeout(clearMicError, 5000)
        return () => clearTimeout(t)
    }, [micError, clearMicError])

    const { scrollYProgress } = useScroll({
        target: heroRef,
        offset: ['start start', 'end start'],
    })

    const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])
    const heroScale = useTransform(scrollYProgress, [0, 0.6], [1, 0.96])

    useMotionValueEvent(scrollYProgress, 'change', (latest) => {
        setNavScrolled(latest > 0.05)
    })

    const handleGetStarted = () => {
        if (session?.user) {
            router.push('/chat')
        } else {
            router.push('/login')
        }
    }

    const handlePromptSubmit = (value: string) => {
        const trimmed = value.trim()
        if (!trimmed && attachments.length === 0) return
        savePromptToStorage(trimmed, attachments)
        if (session?.user) {
            router.push('/chat')
        } else {
            router.push('/login')
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? [])
        if (!files.length) return
        const newAttachments = await Promise.all(
            files.map((file) => {
                if (file.type.startsWith('image/')) return createImageAttachment(file)
                return Promise.resolve<ImageAttachment>({
                    id: Math.random().toString(36).slice(2, 9),
                    file,
                    dataUrl: '',
                    preview: '',
                })
            })
        )
        setAttachments((prev) => [...prev, ...newAttachments])
        e.target.value = ''
    }

    return (
        <div className="min-h-screen bg-background">
            {/* ── Navigation ── */}
            <motion.nav
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
            >
                <div
                    className={`mx-auto transition-all duration-500 ${
                        navScrolled
                            ? 'max-w-2xl mt-3 rounded-full border border-border/60 bg-background/70 backdrop-blur-2xl shadow-lg px-4'
                            : 'max-w-7xl border-b border-transparent px-6'
                    }`}
                >
                    <div className="flex items-center justify-between h-14">
                        <Link href="/" className="flex items-center gap-2 group">
                            <BuildifyLogo size="sm" />
                            <span className="font-semibold text-sm tracking-tight">Buildify</span>
                        </Link>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className="size-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Sun className="size-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                                <Moon className="absolute size-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            </button>
                            {!isPending && (
                                session?.user ? (
                                        <Button
                                            size="sm"
                                            onClick={() => router.push('/chat')}
                                            className="rounded-full h-8 px-4 text-xs font-semibold gap-1.5 shadow-sm border-primary/20"
                                        >
                                            Open App
                                            <ArrowRight className="size-3" />
                                        </Button>
                                    ) : (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => router.push('/login')}
                                        className="rounded-full h-8 px-4 text-xs font-medium"
                                    >
                                        Sign in
                                    </Button>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </motion.nav>

            {/* ── Hero Section ── */}
            <motion.section
                ref={heroRef}
                style={{ opacity: heroOpacity, scale: heroScale }}
               className="relative min-h-[100svh] flex flex-col items-center justify-center px-6 overflow-hidden"
            >
                {/* Aurora mesh background */}
                <div className="hero-aurora" />

                {/* Subtle perspective grid */}
                <div className="hero-grid" />

                {/* Large animated gradient blobs — visually prominent */}
                <motion.div
                    className="absolute pointer-events-none rounded-full"
                    style={{
                        width: 800,
                        height: 800,
                        top: '-20%',
                        left: '-15%',
                        background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.04) 40%, transparent 65%)',
                        filter: 'blur(80px)',
                    }}
                    animate={{
                        x: [0, 80, 30, -40, 0],
                        y: [0, 50, -30, 20, 0],
                        scale: [1, 1.1, 0.95, 1.05, 1],
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute pointer-events-none rounded-full"
                    style={{
                        width: 700,
                        height: 700,
                        bottom: '-15%',
                        right: '-10%',
                        background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, rgba(99,102,241,0.04) 40%, transparent 65%)',
                        filter: 'blur(80px)',
                    }}
                    animate={{
                        x: [0, -60, 20, -30, 0],
                        y: [0, -40, 30, -20, 0],
                        scale: [1, 1.08, 0.97, 1.05, 1],
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
                />
                <motion.div
                    className="absolute pointer-events-none rounded-full"
                    style={{
                        width: 500,
                        height: 500,
                        top: '25%',
                        left: '40%',
                        background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 60%)',
                        filter: 'blur(60px)',
                    }}
                    animate={{
                        scale: [0.8, 1.3, 0.9, 1.2, 0.8],
                        opacity: [0.3, 0.7, 0.4, 0.6, 0.3],
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                />

                {/* Floating UI elements — visible animated cards/shapes */}
                {FLOATING_ELEMENTS.map((el, i) => (
                    <FloatingElement key={i} el={el} />
                ))}

                {/* Subtle background grain */}
                <div className="absolute inset-0 opacity-[0.012] dark:opacity-[0.025] pointer-events-none"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                    }}
                />

                <div className="relative z-10 max-w-4xl mx-auto text-center">
                    {/* Pill badge */}
                    <motion.div
                        variants={fadeIn}
                        initial="hidden"
                        animate="visible"
                        custom={0.3}
                        className="mb-8"
                    >
                        <span className="pill-shimmer inline-flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground border border-border/60 rounded-full px-4 py-1.5 bg-muted/30 backdrop-blur-sm">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Start free — 200 credits included
                        </span>
                    </motion.div>

                    {/* Heading */}
                    <div className="space-y-1 mb-10">
                        <RevealText delay={0.4}>
                            <h1 className="text-[clamp(2.5rem,7.5vw,5.5rem)] font-bold leading-[0.93] tracking-tighter text-shimmer">
                                Build apps with
                            </h1>
                        </RevealText>
                        <RevealText delay={0.5}>
                            <h1 className="text-[clamp(2.5rem,7.5vw,5.5rem)] font-bold leading-[0.93] tracking-tighter text-muted-foreground/35">
                                a single prompt.
                            </h1>
                        </RevealText>
                    </div>

                    {/* Subtitle */}
                    <motion.p
                        variants={blurIn}
                        initial="hidden"
                        animate="visible"
                        custom={0.7}
                        className="text-base md:text-lg text-muted-foreground/80 max-w-xl mx-auto mb-14 leading-[1.7]"
                    >
                        Describe what you want. Buildify generates production&#8209;ready
                        code — complete with UI, logic, and deployable output.
                    </motion.p>

                    {/* Prompt input */}
                    <motion.div
                        variants={fadeIn}
                        initial="hidden"
                        animate="visible"
                        custom={0.9}
                        className="w-full max-w-2xl mx-auto"
                    >
                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt"
                            multiple
                            className="hidden"
                            onChange={handleFileChange}
                        />

                        {/* Main input card */}
                        <div
                            className={cn(
                                "relative rounded-2xl bg-background overflow-hidden transition-all duration-300 border",
                                inputFocused
                                    ? "border-primary ring-2 ring-primary/20 shadow-md"
                                    : "border-border/60 dark:border-border/80 shadow-sm hover:border-border/80 dark:hover:border-border"
                            )}
                        >                            {/* Attachment preview strip */}
                            {attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 px-4 pt-4">
                                    {attachments.map((att) => (
                                        <AttachmentCard
                                            key={att.id}
                                            attachment={att}
                                            onRemove={() => setAttachments((a) => a.filter((x) => x.id !== att.id))}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Textarea with animated placeholder overlay */}
                            <div className="relative">
                                {!prompt && (
                                    <div className="absolute top-5 left-5 pointer-events-none">
                                        <DynamicPlaceholder paused={inputFocused} />
                                    </div>
                                )}
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onFocus={() => setInputFocused(true)}
                                    onBlur={() => setInputFocused(false)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                            e.preventDefault()
                                            handlePromptSubmit(prompt)
                                        }
                                    }}
                                    placeholder=""
                                    className="w-full resize-none bg-transparent px-5 pt-5 pb-3 text-sm min-h-[96px] leading-relaxed focus:outline-none"
                                />
                            </div>

                            {/* Toolbar */}
                            <div className="flex items-center justify-between px-3 pb-3 pt-0.5">
                                {/* Left: upload + mic */}
                                <div className="flex items-center gap-0.5">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="size-8 rounded-xl flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-all duration-150"
                                        title="Attach media"
                                    >
                                        <Plus className="size-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={toggleMic}
                                        disabled={micState === 'processing'}
                                        title={
                                            micState === 'recording'
                                                ? 'Stop recording'
                                                : micState === 'processing'
                                                ? 'Processing…'
                                                : 'Voice input'
                                        }
                                        className={[
                                            'size-8 rounded-xl flex items-center justify-center transition-all duration-200',
                                            micState === 'recording'
                                                ? 'bg-[#3B7EFF] text-white shadow-md'
                                                : micState === 'processing'
                                                ? 'text-muted-foreground/50 cursor-wait'
                                                : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/60',
                                        ].join(' ')}
                                    >
                                        {micState === 'processing' ? (
                                            <Loader2 className="size-4 animate-spin" />
                                        ) : (
                                            <Mic className={['size-4', micState === 'recording' ? 'animate-pulse' : ''].join(' ')} />
                                        )}
                                    </button>
                                </div>

                                {/* Right: Build button */}
                                <Button
                                    size="sm"
                                    onClick={() => handlePromptSubmit(prompt)}
                                    className="rounded-xl h-8 px-4 gap-2 text-xs font-semibold transition-all duration-200 shadow-md"
                                >
                                    Build
                                    <SendHorizonal className="size-3.5" />
                                </Button>
                            </div>

                        </div>

                        {/* Mic error toast */}
                        {micError && (
                            <div className="flex items-center gap-2 mt-3 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-800/40">
                                <p className="text-xs text-red-600 dark:text-red-400 leading-tight flex-1">{micError}</p>
                                <button
                                    type="button"
                                    onClick={clearMicError}
                                    className="text-red-400 hover:text-red-600 dark:hover:text-red-300 shrink-0 transition-colors"
                                >
                                    <X className="size-3.5" />
                                </button>
                            </div>
                        )}

                        {/* Suggestion chips */}
                        <div className="flex flex-wrap gap-2.5 mt-5 justify-center">
                            {[
                                'A todo app with drag & drop',
                                'A SaaS dashboard with charts',
                                'An e-commerce product page',
                            ].map((example) => (
                                <button
                                    key={example}
                                    onClick={() => handlePromptSubmit(example)}
                                    className="text-xs text-muted-foreground/55 border border-border/40 rounded-full px-4 py-1.5 hover:border-[rgba(59,126,255,0.35)] hover:text-[#3B7EFF] hover:bg-[rgba(59,126,255,0.05)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-200"
                                >
                                    {example}
                                </button>
                            ))}
                        </div>

                        <p className="text-center mt-5">
                            <button
                                onClick={() => document.getElementById('community')?.scrollIntoView({ behavior: 'smooth' })}
                                className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors duration-150"
                            >
                                or browse community examples
                            </button>
                        </p>
                    </motion.div>
                </div>

                {/* Scroll indicator */}
                <motion.div
                    variants={fadeIn}
                    initial="hidden"
                    animate="visible"
                    custom={1.5}
                    className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
                >
                    <motion.span
                        className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/25 font-medium"
                        animate={{ opacity: [0.15, 0.45, 0.15] }}
                        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        Scroll
                    </motion.span>
                    <motion.div
                        className="w-px h-10 bg-gradient-to-b from-primary/30 via-border/40 to-transparent"
                        animate={{ opacity: [0.2, 0.6, 0.2], scaleY: [0.7, 1, 0.7] }}
                        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ transformOrigin: 'top' }}
                    />
                </motion.div>
            </motion.section>

            {/* ── Stats Bar ── */}
            <section className="relative bg-muted/20 stats-section">
                <div className="max-w-5xl mx-auto px-6 py-16">
                    <div className="grid grid-cols-3 gap-8 md:gap-16">
                        {[
                            { value: '2K+', label: 'Developers' },
                            { value: '100K+', label: 'Lines Generated' },
                            { value: '99.9%', label: 'Uptime' },
                        ].map((stat, i) => (
                            <motion.div
                                key={i}
                                variants={blurIn}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: '-60px' }}
                                custom={i * 0.15}
                                className="text-center"
                            >
                                <div className="text-3xl md:text-5xl font-bold tracking-tighter stat-value">{stat.value}</div>
                                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70 mt-2">{stat.label}</div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Free Tier ── */}
            <section className="relative py-20 md:py-28 px-6 overflow-hidden">
                {/* Code wall — absolute background cascade */}
                <div className="code-wall" aria-hidden="true">
                    <div className="code-wall-scroll">
                        {[0, 1].map((copy) => (
                            <div key={copy} className="code-wall-track">
                                {/* Col 1 */}
                                <div className="code-col">
                                    <div className="code-line"><span className="cw-kw">import</span> {'{'} buildApp {'}'} <span className="cw-kw">from</span> <span className="cw-str">&quot;buildify&quot;</span></div>
                                    <div className="code-line"><span className="cw-kw">import</span> {'{'} ai {'}'} <span className="cw-kw">from</span> <span className="cw-str">&quot;@buildify/chat&quot;</span></div>
                                    <div className="code-line">&nbsp;</div>
                                    <div className="code-line"><span className="cw-kw">const</span> app = <span className="cw-kw">await</span> <span className="cw-fn">buildApp</span>({'{'}</div>
                                    <div className="code-line">  name: <span className="cw-str">&quot;my-saas&quot;</span>,</div>
                                    <div className="code-line">  stack: <span className="cw-str">&quot;nextjs&quot;</span>,</div>
                                    <div className="code-line">  features: [<span className="cw-str">&quot;auth&quot;</span>, <span className="cw-str">&quot;db&quot;</span>, <span className="cw-str">&quot;api&quot;</span>]</div>
                                    <div className="code-line">{'}'})</div>
                                    <div className="code-line">&nbsp;</div>
                                    <div className="code-line"><span className="cw-cm">// AI Chat — always free</span></div>
                                    <div className="code-line"><span className="cw-kw">const</span> response = <span className="cw-kw">await</span> <span className="cw-fn">ai.chat</span>({'{'}</div>
                                    <div className="code-line">  model: <span className="cw-str">&quot;claude-4&quot;</span>,</div>
                                    <div className="code-line">  prompt: <span className="cw-str">&quot;Debug my auth flow&quot;</span></div>
                                    <div className="code-line">{'}'})</div>
                                    <div className="code-line">&nbsp;</div>
                                    <div className="code-line"><span className="cw-kw">export default function</span> <span className="cw-fn">Resume</span>() {'{'}</div>
                                    <div className="code-line">  <span className="cw-kw">return</span> (</div>
                                    <div className="code-line">    {'<'}<span className="cw-fn">LaTeXResume</span></div>
                                    <div className="code-line">      template=<span className="cw-str">&quot;modern&quot;</span></div>
                                    <div className="code-line">      exportAs=<span className="cw-str">&quot;pdf&quot;</span></div>
                                    <div className="code-line">    /{'>'}</div>
                                    <div className="code-line">  )</div>
                                    <div className="code-line">{'}'}</div>
                                    <div className="code-line">&nbsp;</div>
                                    <div className="code-line"><span className="cw-kw">await</span> <span className="cw-fn">studio.publish</span>({'{'}</div>
                                    <div className="code-line">  slug: <span className="cw-str">&quot;my-portfolio&quot;</span>,</div>
                                    <div className="code-line">  elements: canvas.<span className="cw-fn">export</span>()</div>
                                    <div className="code-line">{'}'})</div>
                                </div>
                                {/* Col 2 */}
                                <div className="code-col">
                                    <div className="code-line"><span className="cw-cm">// Generate full-stack apps</span></div>
                                    <div className="code-line"><span className="cw-kw">const</span> project = <span className="cw-kw">await</span> <span className="cw-fn">generate</span>({'{'}</div>
                                    <div className="code-line">  prompt: <span className="cw-str">&quot;SaaS dashboard&quot;</span>,</div>
                                    <div className="code-line">  credits: <span className="cw-num">20</span></div>
                                    <div className="code-line">{'}'})</div>
                                    <div className="code-line">&nbsp;</div>
                                    <div className="code-line"><span className="cw-kw">function</span> <span className="cw-fn">CreditBadge</span>() {'{'}</div>
                                    <div className="code-line">  <span className="cw-kw">const</span> {'{'} credits {'}'} = <span className="cw-fn">useCredits</span>()</div>
                                    <div className="code-line">  <span className="cw-kw">return</span> {'<'}Badge{'>'}{'{'}credits{'}'} left{'<'}/{'>'}</div>
                                    <div className="code-line">{'}'}</div>
                                    <div className="code-line">&nbsp;</div>
                                    <div className="code-line"><span className="cw-kw">const</span> tools = [</div>
                                    <div className="code-line">  <span className="cw-str">&quot;Builder&quot;</span>,    <span className="cw-cm">// 20 credits</span></div>
                                    <div className="code-line">  <span className="cw-str">&quot;AI Chat&quot;</span>,    <span className="cw-cm">// free</span></div>
                                    <div className="code-line">  <span className="cw-str">&quot;Resume&quot;</span>,     <span className="cw-cm">// free</span></div>
                                    <div className="code-line">  <span className="cw-str">&quot;Studio&quot;</span>,     <span className="cw-cm">// free</span></div>
                                    <div className="code-line">]</div>
                                    <div className="code-line">&nbsp;</div>
                                    <div className="code-line">{'<'}<span className="cw-fn">Canvas</span></div>
                                    <div className="code-line">  device=<span className="cw-str">&quot;desktop&quot;</span></div>
                                    <div className="code-line">  grid={'{{'}snap: <span className="cw-num">true</span>{'}}'}</div>
                                    <div className="code-line">  onPublish={'{'}handleDeploy{'}'}</div>
                                    <div className="code-line">/{'>'}</div>
                                    <div className="code-line">&nbsp;</div>
                                    <div className="code-line"><span className="cw-kw">const</span> page = <span className="cw-kw">await</span> <span className="cw-fn">fetch</span>(</div>
                                    <div className="code-line">  <span className="cw-str">&quot;/p/my-portfolio&quot;</span></div>
                                    <div className="code-line">)</div>
                                </div>
                                {/* Col 3 */}
                                <div className="code-col">
                                    <div className="code-line"><span className="cw-kw">import</span> {'{'} Studio {'}'} <span className="cw-kw">from</span> <span className="cw-str">&quot;buildify&quot;</span></div>
                                    <div className="code-line">&nbsp;</div>
                                    <div className="code-line">{'<'}<span className="cw-fn">Studio</span></div>
                                    <div className="code-line">  elements={'{'}14{'}'}</div>
                                    <div className="code-line">  dragDrop</div>
                                    <div className="code-line">  animations</div>
                                    <div className="code-line">/{'>'}</div>
                                    <div className="code-line">&nbsp;</div>
                                    <div className="code-line"><span className="cw-cm">// 200 free credits on signup</span></div>
                                    <div className="code-line"><span className="cw-kw">const</span> account = <span className="cw-kw">await</span> <span className="cw-fn">signUp</span>({'{'}</div>
                                    <div className="code-line">  email,</div>
                                    <div className="code-line">  freeCredits: <span className="cw-num">200</span></div>
                                    <div className="code-line">{'}'})</div>
                                    <div className="code-line">&nbsp;</div>
                                    <div className="code-line"><span className="cw-kw">async function</span> <span className="cw-fn">iterate</span>() {'{'}</div>
                                    <div className="code-line">  <span className="cw-kw">const</span> v2 = <span className="cw-kw">await</span> <span className="cw-fn">ai.refine</span>({'{'}</div>
                                    <div className="code-line">    app: project,</div>
                                    <div className="code-line">    feedback: <span className="cw-str">&quot;Add dark mode&quot;</span></div>
                                    <div className="code-line">  {'}'})</div>
                                    <div className="code-line">{'}'}</div>
                                    <div className="code-line">&nbsp;</div>
                                    <div className="code-line"><span className="cw-kw">const</span> resume = {'{'}</div>
                                    <div className="code-line">  name: <span className="cw-str">&quot;Jane Doe&quot;</span>,</div>
                                    <div className="code-line">  template: <span className="cw-str">&quot;minimal&quot;</span>,</div>
                                    <div className="code-line">  sections: [<span className="cw-str">&quot;exp&quot;</span>, <span className="cw-str">&quot;edu&quot;</span>]</div>
                                    <div className="code-line">{'}'}</div>
                                </div>
                                {/* Col 4 */}
                                <div className="code-col">
                                    <div className="code-line"><span className="cw-kw">const</span> config = {'{'}</div>
                                    <div className="code-line">  runtime: <span className="cw-str">&quot;edge&quot;</span>,</div>
                                    <div className="code-line">  regions: [<span className="cw-str">&quot;iad1&quot;</span>],</div>
                                    <div className="code-line">{'}'}</div>
                                    <div className="code-line">&nbsp;</div>
                                    <div className="code-line"><span className="cw-kw">export async function</span> <span className="cw-fn">POST</span>(req) {'{'}</div>
                                    <div className="code-line">  <span className="cw-kw">const</span> body = <span className="cw-kw">await</span> req.<span className="cw-fn">json</span>()</div>
                                    <div className="code-line">  <span className="cw-kw">const</span> result = <span className="cw-kw">await</span> <span className="cw-fn">build</span>(body)</div>
                                    <div className="code-line">  <span className="cw-kw">return</span> Response.<span className="cw-fn">json</span>(result)</div>
                                    <div className="code-line">{'}'}</div>
                                    <div className="code-line">&nbsp;</div>
                                    <div className="code-line"><span className="cw-cm">// Deploy in one click</span></div>
                                    <div className="code-line"><span className="cw-kw">await</span> <span className="cw-fn">deploy</span>({'{'}</div>
                                    <div className="code-line">  project: <span className="cw-str">&quot;my-saas&quot;</span>,</div>
                                    <div className="code-line">  env: <span className="cw-str">&quot;production&quot;</span></div>
                                    <div className="code-line">{'}'})</div>
                                    <div className="code-line">&nbsp;</div>
                                    <div className="code-line"><span className="cw-kw">const</span> {'{'} data {'}'} = <span className="cw-fn">useQuery</span>({'{'}</div>
                                    <div className="code-line">  queryKey: [<span className="cw-str">&quot;credits&quot;</span>],</div>
                                    <div className="code-line">  queryFn: <span className="cw-fn">getCredits</span></div>
                                    <div className="code-line">{'}'})</div>
                                    <div className="code-line">&nbsp;</div>
                                    <div className="code-line"><span className="cw-kw">return</span> {'<'}<span className="cw-fn">Dashboard</span></div>
                                    <div className="code-line">  credits={'{'}data{'}'}</div>
                                    <div className="code-line">  tools={'{'}tools{'}'}</div>
                                    <div className="code-line">/{'>'}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Darken overlay on left half so text is readable */}
                <div className="code-wall-text-overlay" />

                {/* Content overlay */}
                <div className="relative z-10 max-w-6xl mx-auto">
                    <div className="max-w-xl mb-10">
                        <SectionLabel>Free tier</SectionLabel>
                        <RevealText delay={0.1} className="mt-5">
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.08]">
                                No credit card.
                            </h2>
                        </RevealText>
                        <RevealText delay={0.2}>
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.08] text-muted-foreground/50">
                                No catch.
                            </h2>
                        </RevealText>
                    </div>

                    <div className="grid md:grid-cols-2 gap-20 md:gap-28 items-center">
                        {/* Left — big number + details */}
                        <motion.div
                            variants={fadeIn}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-80px' }}
                            custom={0.2}
                        >
                            <div className="flex items-baseline gap-3">
                                <span className="text-[clamp(4rem,10vw,7rem)] font-bold tracking-tighter leading-none stat-value">200</span>
                                <span className="text-lg md:text-xl font-medium text-muted-foreground/70">credits</span>
                            </div>
                            <p className="text-[15px] text-muted-foreground leading-[1.7] mt-5 max-w-sm">
                                Every new account starts with 200 credits on signup.
                                Use them in the Builder to generate full applications — or explore every other tool for free, forever.
                            </p>
                            <motion.div
                                variants={fadeIn}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: '-60px' }}
                                custom={0.5}
                                className="mt-8"
                            >
                                <Button
                                    onClick={handleGetStarted}
                                    className="rounded-full h-10 px-6 text-sm font-medium gap-2 group"
                                >
                                    Create free account
                                    <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                                </Button>
                            </motion.div>
                        </motion.div>

                        {/* Right — 3D cube with floating UI panels */}
                        <div className="cube-scene cube-float">
                            {/* Background UI panels */}
                            <div className="cube-bg-panels">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className={`cube-bg-panel cube-bg-panel-${i + 1}`}>
                                        <div className="cube-panel-line cube-panel-line-w60" />
                                        <div className="cube-panel-line cube-panel-line-w80" />
                                        <div className="cube-panel-line cube-panel-line-w40" />
                                    </div>
                                ))}
                            </div>

                            {/* 3D Cube */}
                            <div className="cube-wrapper">
                                <div className="cube-3d">
                                    <div className="cube-face cube-front" />
                                    <div className="cube-face cube-back" />
                                    <div className="cube-face cube-right" />
                                    <div className="cube-face cube-left" />
                                    <div className="cube-face cube-top" />
                                    <div className="cube-face cube-bottom" />
                                </div>
                            </div>

                            {/* Glow behind cube */}
                            <div className="cube-glow" />
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Feature Demos Section ── */}
            <div className="section-divider" />
            <section className="relative py-20 md:py-28 px-6 overflow-hidden">
                {/* Animated background orbs */}
                <FloatingOrb color="rgba(59,130,246,0.06)" size={500} top="5%" left="-5%" duration={22} delay={0} />
                <FloatingOrb color="rgba(139,92,246,0.05)" size={400} top="40%" left="85%" duration={18} delay={3} />
                <FloatingOrb color="rgba(59,130,246,0.04)" size={350} top="75%" left="10%" duration={20} delay={6} />

                <div className="max-w-6xl mx-auto relative">
                    <div className="max-w-xl mb-24">
                        <SectionLabel>Features</SectionLabel>
                        <RevealText delay={0.1} className="mt-5">
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.08]">
                                Everything you need to build.
                            </h2>
                        </RevealText>
                        <motion.p
                            variants={fadeIn}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-80px' }}
                            custom={0.3}
                            className="mt-6 text-[15px] text-muted-foreground leading-relaxed max-w-md"
                        >
                            Four powerful tools, one platform. From AI-powered code generation to visual design — see each feature in action.
                        </motion.p>
                    </div>

                    <div className="space-y-32 md:space-y-44">
                        {FEATURE_DEMOS.map((feature, index) => {
                            const isReversed = index % 2 !== 0
                            return (
                                <div
                                    key={feature.title}
                                    className="grid md:grid-cols-2 gap-12 md:gap-20 items-center"
                                >
                                    {/* Text side */}
                                    <div className={isReversed ? 'md:order-2' : ''}>
                                        <motion.span
                                            variants={blurIn}
                                            initial="hidden"
                                            whileInView="visible"
                                            viewport={{ once: true, margin: '-60px' }}
                                            custom={0}
                                            className="feature-index inline-flex items-center gap-3 text-xs font-mono text-muted-foreground/40 mb-4"
                                        >
                                            <span className="inline-block w-6 h-px bg-gradient-to-r from-border to-transparent" />
                                            {String(index + 1).padStart(2, '0')}
                                        </motion.span>
                                        <RevealText delay={0.05}>
                                            <h3 className="text-2xl md:text-[2rem] font-bold tracking-tight leading-tight">
                                                {feature.title}
                                            </h3>
                                        </RevealText>
                                        <motion.p
                                            variants={blurIn}
                                            initial="hidden"
                                            whileInView="visible"
                                            viewport={{ once: true, margin: '-60px' }}
                                            custom={0.15}
                                            className="mt-4 text-[15px] text-muted-foreground leading-[1.7]"
                                        >
                                            {feature.description}
                                        </motion.p>
                                        <motion.ul
                                            variants={fadeIn}
                                            initial="hidden"
                                            whileInView="visible"
                                            viewport={{ once: true, margin: '-60px' }}
                                            custom={0.25}
                                            className="mt-6 space-y-3"
                                        >
                                            {feature.bullets.map((bullet, bi) => (
                                                <motion.li
                                                    key={bullet}
                                                    variants={fadeIn}
                                                    initial="hidden"
                                                    whileInView="visible"
                                                    viewport={{ once: true, margin: '-40px' }}
                                                    custom={0.25 + bi * 0.08}
                                                    className="flex items-center gap-3 text-sm text-muted-foreground"
                                                >
                                                    <span className="size-1 rounded-full bg-primary/60 shrink-0" />
                                                    {bullet}
                                                </motion.li>
                                            ))}
                                        </motion.ul>
                                        <motion.div
                                            variants={fadeIn}
                                            initial="hidden"
                                            whileInView="visible"
                                            viewport={{ once: true, margin: '-60px' }}
                                            custom={0.45}
                                            className="mt-8"
                                        >
                                            <Link
                                                href={feature.href}
                                                className="group/link inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-all duration-300"
                                            >
                                                Try {feature.title}
                                                <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
                                            </Link>
                                        </motion.div>
                                    </div>

                                    {/* Video side */}
                                    <div className={`relative ${isReversed ? 'md:order-1' : ''}`}>
                                        {/* Floating ambient glow behind video */}
                                        <motion.div
                                            className="absolute -inset-8 pointer-events-none rounded-3xl hidden md:block"
                                            style={{
                                                background: `radial-gradient(ellipse at ${isReversed ? '30%' : '70%'} 50%, rgba(59,130,246,0.06) 0%, transparent 60%)`,
                                                filter: 'blur(40px)',
                                            }}
                                            animate={{
                                                x: [0, isReversed ? -15 : 15, 0],
                                                y: [0, -10, 0],
                                                scale: [1, 1.05, 1],
                                            }}
                                            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: index * 2 }}
                                        />
                                        <FeatureVideo src={feature.video} index={index} onClick={() => setOpenVideoIndex(index)} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* ── Developer Flow Pipeline Section ── */}
            <div className="section-divider" />
            <section className="relative py-20 md:py-28 px-6 overflow-hidden">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-16">
                        <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.2em] uppercase text-primary/70">
                            <span className="inline-block size-1.5 rounded-full bg-primary/50" />
                            The Buildify Flow
                        </span>
                        <h2 className="mt-5 text-3xl md:text-5xl font-bold tracking-tight leading-[1.08]">
                            From idea to live &mdash; all in one place
                        </h2>
                        <p className="mt-4 text-base md:text-lg text-muted-foreground/60 max-w-2xl mx-auto">
                            Plan, design, build, test, and launch &mdash; without switching tools.
                        </p>
                    </div>

                    {/* Pipeline */}
                    <div className="relative">
                        {/* Connecting line (desktop) */}
                        <div className="absolute top-6 left-[calc(100%/14)] right-[calc(100%/14)] h-px bg-border/60 hidden md:block" />

                        {/* Connecting line (mobile) */}
                        <div className="absolute top-0 bottom-0 left-6 w-px bg-border/60 md:hidden" />

                        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 md:gap-3">
                            {[
                                { icon: MessageSquareText, title: 'AI Chat' },
                                { icon: Palette, title: 'Studio' },
                                { icon: Code2, title: 'Builder' },
                                { icon: Rocket, title: 'Deploy' },
                                { icon: FlaskConical, title: 'Testing' },
                                { icon: ScanEye, title: 'Accessibility' },
                                { icon: Radio, title: 'Live' },
                            ].map((step, index) => (
                                <div key={step.title} className="relative flex md:flex-col items-center md:items-center gap-4 md:gap-0">
                                    {/* Node dot */}
                                    <div className="relative z-10 size-12 rounded-xl border border-border/80 bg-background flex items-center justify-center shrink-0">
                                        <step.icon className="size-[18px] text-primary/70" />
                                    </div>

                                    {/* Arrow between cards (desktop only) */}
                                    {index < 6 && (
                                        <div className="absolute top-6 -right-[calc(50%-6px)] hidden md:flex items-center -translate-y-1/2 z-20 pointer-events-none">
                                            <ArrowRight className="size-3 text-muted-foreground/30" />
                                        </div>
                                    )}

                                    {/* Title */}
                                    <span className="md:mt-3 text-sm font-medium text-foreground/80 text-center">
                                        {step.title}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Buildify Developer Flow — 6 Full-Screen Sections ── */}

            {/* 1. AI Chat (Planning) — Text Left, Visual Right */}
            <div className="section-divider" />
            <FlowAIChatSection />

            {/* Transition: AI Chat → Studio (single container transforms) */}
            <FlowChatToStudioTransition />

            {/* 2. Studio (Design) — Visual Left, Text Right */}
            <FlowStudioSection />

            {/* Transition: Studio → Builder (continuous scroll) */}
            <FlowStudioToBuilderTransition />

            {/* 3. Builder (Development) */}
            <FlowBuilderSection />

            {/* Transition: Builder → Testing (URL handoff) */}
            <FlowBuilderToTestingTransition />

            {/* 4. Deploy + Testing (TinyFish) */}
            <FlowTestingSection />

            {/* 5. Accessibility — Text Left, Visual Right */}
            <div className="section-divider" />
            <section className="relative min-h-screen flex items-center px-6 py-20 md:py-28 overflow-hidden">
                <div className="max-w-6xl mx-auto w-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
                        {/* Text */}
                        <div>
                            <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.2em] uppercase text-primary/70 mb-5">
                                <span className="inline-block size-1.5 rounded-full bg-primary/50" />
                                Step 05
                            </span>
                            <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight leading-[1.1]">
                                Ensure Accessibility
                            </h2>
                            <p className="mt-5 text-base md:text-lg text-muted-foreground/70 leading-relaxed max-w-lg">
                                Automatically detect and fix accessibility issues for an inclusive experience.
                            </p>
                            <div className="mt-8 flex items-center gap-3">
                                <div className="size-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                                    <ScanEye className="size-[18px] text-primary/60" />
                                </div>
                                <span className="text-sm font-medium text-muted-foreground/60">Automated a11y scanning</span>
                            </div>
                        </div>
                        {/* Visual placeholder */}
                        <div className="relative">
                            <div className="aspect-[4/3] rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm flex items-center justify-center">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="size-14 rounded-2xl border border-primary/10 bg-primary/5 flex items-center justify-center">
                                        <ScanEye className="size-6 text-primary/40" />
                                    </div>
                                    <span className="text-xs text-muted-foreground/40">Accessibility report preview</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 6. Live (Final Output) — Visual Left, Text Right */}
            <div className="section-divider" />
            <section className="relative min-h-screen flex items-center px-6 py-20 md:py-28 overflow-hidden">
                <div className="max-w-6xl mx-auto w-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
                        {/* Visual placeholder */}
                        <div className="relative md:order-1 order-2">
                            <div className="aspect-[4/3] rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm flex items-center justify-center">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="size-14 rounded-2xl border border-primary/10 bg-primary/5 flex items-center justify-center">
                                        <Radio className="size-6 text-primary/40" />
                                    </div>
                                    <span className="text-xs text-muted-foreground/40">Live product preview</span>
                                </div>
                            </div>
                        </div>
                        {/* Text */}
                        <div className="md:order-2 order-1">
                            <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.2em] uppercase text-primary/70 mb-5">
                                <span className="inline-block size-1.5 rounded-full bg-primary/50" />
                                Step 06
                            </span>
                            <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight leading-[1.1]">
                                Go Live
                            </h2>
                            <p className="mt-5 text-base md:text-lg text-muted-foreground/70 leading-relaxed max-w-lg">
                                Launch your product and make it available to users instantly.
                            </p>
                            <div className="mt-8 flex items-center gap-3">
                                <div className="size-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                                    <Radio className="size-[18px] text-primary/60" />
                                </div>
                                <span className="text-sm font-medium text-muted-foreground/60">Instant public launch</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Capabilities Section ── */}
            <div className="section-divider" />
            <section id="features" className="relative py-20 md:py-28 px-6 dot-grid-bg overflow-hidden">
                <FloatingOrb color="rgba(59,130,246,0.05)" size={400} top="20%" left="80%" duration={20} delay={2} />
                <FloatingOrb color="rgba(139,92,246,0.04)" size={350} top="60%" left="-5%" duration={18} delay={5} />
                <div className="max-w-6xl mx-auto">
                    <div className="max-w-xl mb-12">
                        <SectionLabel>Capabilities</SectionLabel>
                        <RevealText delay={0.1} className="mt-5">
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.08]">
                                Everything you need,
                            </h2>
                        </RevealText>
                        <RevealText delay={0.2}>
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.08] text-muted-foreground/40">
                                nothing you don&apos;t.
                            </h2>
                        </RevealText>
                    </div>

                    {/* Floating glow orb */}
                    <div className="cap-glow-orb" />

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 relative">
                        {[
                            { icon: Zap, title: 'Lightning Fast', description: 'Generate production-ready code in seconds. Our AI understands context and delivers precise results.' },
                            { icon: Shield, title: 'Secure by Default', description: 'Built-in security best practices. Your code follows industry standards from the first line.' },
                            { icon: Code2, title: 'Multi-Language', description: 'Support for 20+ programming languages and frameworks. React, Python, Go, and beyond.' },
                            { icon: Layers, title: 'Full Stack', description: 'Complete applications with frontend, backend, and database — generated from a single conversation.' },
                            { icon: Globe, title: 'Deploy Anywhere', description: 'Export and deploy to any platform. Vercel, AWS, or your own infrastructure.' },
                            { icon: Sparkles, title: 'Iterative AI', description: 'Refine through conversation. Each iteration improves on the last, understanding your preferences.' },
                        ].map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-40px' }}
                                transition={{ duration: 0.4, delay: index * 0.07 }}
                                className={`cap-card cap-card-glow-${index + 1} group`}
                            >
                                <div className="space-y-4">
                                    <div className="size-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                                        <feature.icon className="size-[18px] text-muted-foreground/70" />
                                    </div>
                                    <div>
                                        <h3 className="text-[15px] font-semibold mb-2">{feature.title}</h3>
                                        <p className="text-sm text-muted-foreground/70 leading-[1.7]">{feature.description}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Showcase / How It Works ── */}
            <div className="section-divider" />
            <section className="relative py-20 md:py-28 px-6 overflow-hidden">
                <FloatingOrb color="rgba(59,130,246,0.05)" size={350} top="15%" left="70%" duration={16} delay={1} />
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-20 md:gap-32 items-center">
                        {/* Left: Text */}
                        <div>
                            <SectionLabel>How it works</SectionLabel>
                            <RevealText delay={0.1} className="mt-5">
                                <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-[1.08]">
                                    From idea to app in three steps.
                                </h2>
                            </RevealText>
                            <div className="mt-12 space-y-10">
                                {[
                                    { step: '01', title: 'Describe', text: 'Tell Buildify what you want to build using natural language.' },
                                    { step: '02', title: 'Generate', text: 'AI creates production-ready code with UI components and logic.' },
                                    { step: '03', title: 'Iterate', text: 'Refine through conversation until it matches your vision perfectly.' },
                                ].map((item, i) => (
                                    <motion.div
                                        key={i}
                                        variants={blurIn}
                                        initial="hidden"
                                        whileInView="visible"
                                        viewport={{ once: true, margin: '-60px' }}
                                        custom={0.2 + i * 0.15}
                                        className="flex gap-5 group"
                                    >
                                        <span className="text-xs font-mono text-muted-foreground/40 mt-1 shrink-0 transition-all duration-300 group-hover:text-primary/60 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.2)]">{item.step}</span>
                                        <div>
                                            <h3 className="text-[15px] font-semibold mb-1.5">{item.title}</h3>
                                            <p className="text-sm text-muted-foreground/80 leading-[1.7]">{item.text}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            <motion.div
                                variants={fadeIn}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: '-60px' }}
                                custom={0.5}
                                className="mt-10"
                            >
                                <Button
                                    variant="ghost"
                                    onClick={handleGetStarted}
                                    className="group rounded-full px-0 text-sm font-medium gap-2 text-foreground hover:bg-transparent"
                                >
                                    Try it now
                                    <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                </Button>
                            </motion.div>
                        </div>

                        {/* Right: Visual */}
                        <motion.div
                            variants={scaleIn}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-100px' }}
                            custom={0.3}
                            className="relative"
                        >
                            <div className="absolute -inset-4 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 rounded-3xl blur-2xl pointer-events-none" />
                            <div className="relative aspect-[4/3] rounded-2xl border border-border/40 bg-muted/10 overflow-hidden shadow-lg shadow-black/[0.03] dark:shadow-black/[0.12]">
                                {/* Terminal-style UI mockup */}
                                <div className="h-10 border-b border-border/30 flex items-center px-4 gap-2 bg-muted/30">
                                    <div className="flex gap-1.5">
                                        <div className="size-2.5 rounded-full bg-red-400/40" />
                                        <div className="size-2.5 rounded-full bg-yellow-400/40" />
                                        <div className="size-2.5 rounded-full bg-green-400/40" />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground/40 font-mono ml-3">buildify.sh</span>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="flex gap-3 items-start">
                                        <div className="size-6 rounded-full bg-primary/10 shrink-0 mt-0.5" />
                                        <div className="space-y-2 flex-1">
                                            <div className="h-3 bg-muted/60 rounded-full w-3/4" />
                                            <div className="h-3 bg-muted/40 rounded-full w-1/2" />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 items-start">
                                        <div className="size-6 rounded-full bg-muted/40 shrink-0 mt-0.5" />
                                        <div className="space-y-2 flex-1">
                                            <div className="rounded-xl border border-border/40 bg-background/50 p-4 space-y-2">
                                                <div className="h-2.5 bg-primary/15 rounded-full w-full" />
                                                <div className="h-2.5 bg-primary/10 rounded-full w-5/6" />
                                                <div className="h-2.5 bg-primary/8 rounded-full w-2/3" />
                                                <div className="h-2.5 bg-primary/5 rounded-full w-3/4" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 items-start">
                                        <div className="size-6 rounded-full bg-primary/10 shrink-0 mt-0.5" />
                                        <div className="space-y-2 flex-1">
                                            <div className="h-3 bg-muted/60 rounded-full w-2/3" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ── Community Builds Section ── */}
            <div className="section-divider" />
            <section id="community" className="relative py-20 md:py-28 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="max-w-xl mb-20">
                        <SectionLabel>Community</SectionLabel>
                        <RevealText delay={0.1} className="mt-5">
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.08]">
                                Built by developers,
                            </h2>
                        </RevealText>
                        <RevealText delay={0.2}>
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.08] text-muted-foreground/40">
                                for developers.
                            </h2>
                        </RevealText>
                        <motion.p
                            variants={fadeIn}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-80px' }}
                            custom={0.3}
                            className="mt-6 text-[15px] text-muted-foreground leading-relaxed max-w-md"
                        >
                            Explore what others are creating with Buildify. Get inspired, fork a project, and make it your own.
                        </motion.p>
                    </div>

                    <motion.div
                        variants={fadeIn}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-60px' }}
                        custom={0.2}
                    >
                        <CommunityBuildsGrid showHeader={false} />
                    </motion.div>
                </div>
            </section>

            {/* ── CTA Section ── */}
            <div className="section-divider" />
            <section className="relative py-20 md:py-28 px-6 overflow-hidden">
                <div className="cta-glow" />
                <FloatingOrb color="rgba(59,130,246,0.08)" size={400} top="10%" left="20%" duration={14} delay={0} />
                <FloatingOrb color="rgba(139,92,246,0.06)" size={300} top="50%" left="70%" duration={16} delay={3} />
                <div className="max-w-3xl mx-auto text-center relative">
                    <SectionLabel>Get started</SectionLabel>
                    <RevealText delay={0.1} className="mt-5">
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.08]">
                            Ready to build?
                        </h2>
                    </RevealText>
                    <motion.p
                        variants={blurIn}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-80px' }}
                        custom={0.3}
                        className="mt-6 text-[15px] text-muted-foreground leading-relaxed max-w-md mx-auto"
                    >
                        Start with 200 free credits. No credit card, no trial — just sign up and build.
                    </motion.p>
                    <motion.div
                        variants={blurIn}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-60px' }}
                        custom={0.5}
                        className="mt-10"
                    >
                        <Button
                            size="lg"
                            onClick={handleGetStarted}
                            className="rounded-full h-12 px-8 text-sm font-medium gap-2 group hover:scale-[1.03] active:scale-[0.98] transition-all duration-300"
                            style={{ boxShadow: '0 4px 30px rgba(59,126,255,0.35), 0 0 60px rgba(59,126,255,0.1)' }}
                        >
                            Start Building — It&apos;s Free
                            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                        </Button>
                    </motion.div>
                </div>
            </section>

            {/* ── Footer ── */}
            <Footer />

            {/* ── Video Demo Dialog ── */}
            <Dialog
                open={openVideoIndex !== null}
                onOpenChange={(open) => {
                    if (!open) setOpenVideoIndex(null)
                }}
            >
                <DialogContent
                    showCloseButton
                    className="sm:max-w-4xl max-h-[90vh] p-0 gap-0 bg-black border-white/10 overflow-hidden"
                >
                    <DialogTitle className="sr-only">
                        {openVideoIndex !== null ? FEATURE_DEMOS[openVideoIndex]?.title : 'Video'} Demo
                    </DialogTitle>
                    {openVideoIndex !== null && (
                        <>
                            {/* Video */}
                            <div className="relative w-full">
                                <video
                                    ref={dialogVideoRef}
                                    key={FEATURE_DEMOS[openVideoIndex]?.video}
                                    src={FEATURE_DEMOS[openVideoIndex]?.video}
                                    controls
                                    autoPlay
                                    playsInline
                                    className="w-full block max-h-[70vh] object-contain bg-black"
                                />
                            </div>

                            {/* Bottom bar: title + navigation */}
                            <div className="flex items-center justify-between px-4 py-3 bg-black/80 border-t border-white/10">
                                {/* Prev button */}
                                <button
                                    onClick={() => setOpenVideoIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
                                    disabled={openVideoIndex === 0}
                                    className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="size-4" />
                                    <span className="hidden sm:inline">Previous</span>
                                </button>

                                {/* Title */}
                                <div className="text-center">
                                    <p className="text-sm font-medium text-white">
                                        {FEATURE_DEMOS[openVideoIndex]?.title}
                                    </p>
                                    <p className="text-xs text-white/50">
                                        {openVideoIndex + 1} / {FEATURE_DEMOS.length}
                                    </p>
                                </div>

                                {/* Next button */}
                                <button
                                    onClick={() => setOpenVideoIndex((prev) => (prev !== null && prev < FEATURE_DEMOS.length - 1 ? prev + 1 : prev))}
                                    disabled={openVideoIndex === FEATURE_DEMOS.length - 1}
                                    className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <span className="hidden sm:inline">Next</span>
                                    <ChevronRight className="size-4" />
                                </button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
