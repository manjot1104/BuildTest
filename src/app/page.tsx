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
import { ArrowRight, ArrowUpRight, Zap, Shield, Code2, Layers, Globe, Sparkles, Moon, Sun, SendHorizonal, Plus, Mic, X, FileText, Loader2, Wrench, MessageSquareText, FileUser, Palette } from 'lucide-react'
import { BuildifyLogo } from '@/components/buildify-logo'
import { CommunityBuildsGrid } from '@/components/chat/community-builds-grid'
import { Footer } from '@/components/layout/footer'
import { useRef, useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { savePromptToStorage, createImageAttachment, type ImageAttachment } from '@/components/ai-elements/prompt-input'
import { useSpeechRecord } from '@/hooks/use-speech-record'
import Image from 'next/image'
import { cn } from '@/lib/utils'

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

function FeatureVideo({ src, index }: { src: string; index: number }) {
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
                className="feature-video-inner relative rounded-[20px] overflow-hidden border border-border/30 shadow-lg shadow-black/[0.03] dark:shadow-black/[0.15]"
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
            </motion.div>
        </div>
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
                                        <FeatureVideo src={feature.video} index={index} />
                                    </div>
                                </div>
                            )
                        })}
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
        </div>
    )
}
