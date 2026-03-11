'use client'

import {
    motion,
    useScroll,
    useTransform,
    useMotionValueEvent,
    type Variants,
} from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useStateMachine } from '@/context/state-machine'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowUpRight, Zap, Shield, Code2, Layers, Globe, Sparkles, Moon, Sun, SendHorizonal, Plus, Mic, X, FileText, Loader2, Wrench, MessageSquareText, FileUser, Palette } from 'lucide-react'
import { BuildifyLogo } from '@/components/buildify-logo'
import { CommunityBuildsGrid } from '@/components/chat/community-builds-grid'
import { Footer } from '@/components/layout/footer'
import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { savePromptToStorage, createImageAttachment, type ImageAttachment } from '@/components/ai-elements/prompt-input'
import { useSpeechRecord } from '@/hooks/use-speech-record'
import Image from 'next/image'

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
    hidden: { opacity: 0 },
    visible: (delay = 0) => ({
        opacity: 1,
        transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1], delay },
    }),
}

const scaleIn: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: (delay = 0) => ({
        opacity: 1,
        scale: 1,
        transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay },
    }),
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
            className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground/80"
        >
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
                                        className="rounded-full h-8 px-4 text-xs font-medium gap-1.5"
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
                className="relative min-h-[100svh] flex flex-col items-center justify-center px-6"
            >
                {/* Subtle background grain */}
                <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03] pointer-events-none"
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
                        <span className="inline-flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground border border-border/60 rounded-full px-4 py-1.5 bg-muted/30">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            Start free — 200 credits included
                        </span>
                    </motion.div>

                    {/* Heading */}
                    <div className="space-y-2 mb-8">
                        <RevealText delay={0.4}>
                            <h1 className="text-[clamp(2.5rem,7vw,5.5rem)] font-bold leading-[0.95] tracking-tighter">
                                Build apps with
                            </h1>
                        </RevealText>
                        <RevealText delay={0.5}>
                            <h1 className="text-[clamp(2.5rem,7vw,5.5rem)] font-bold leading-[0.95] tracking-tighter text-muted-foreground/40">
                                a single prompt.
                            </h1>
                        </RevealText>
                    </div>

                    {/* Subtitle */}
                    <motion.p
                        variants={fadeIn}
                        initial="hidden"
                        animate="visible"
                        custom={0.7}
                        className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-12 leading-relaxed"
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

                        {/* Main input card — no border, only neon shadow */}
                        <div
                            className={cn(
                                "relative rounded-2xl bg-background overflow-hidden transition-all duration-300 border",
                                inputFocused 
                                    ? "border-primary ring-2 ring-primary/20 shadow-md" 
                                    : "border-border shadow-sm hover:border-border/80"
                            )}
                        >
                            {/* Attachment preview strip */}
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
                                                ? 'bg-[#3B7EFF] text-white shadow-[0_2px_12px_rgba(59,126,255,0.55)]'
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
                                    className="rounded-xl h-8 px-4 gap-2 text-xs font-semibold transition-all duration-200"
                                    style={{ boxShadow: '0 2px 14px rgba(59,126,255,0.45)' }}
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
                        <div className="flex flex-wrap gap-2 mt-4 justify-center">
                            {[
                                'A todo app with drag & drop',
                                'A SaaS dashboard with charts',
                                'An e-commerce product page',
                            ].map((example) => (
                                <button
                                    key={example}
                                    onClick={() => handlePromptSubmit(example)}
                                    className="text-xs text-muted-foreground/55 border border-border/40 rounded-full px-3.5 py-1 hover:border-[rgba(59,126,255,0.35)] hover:text-[#3B7EFF] hover:bg-[rgba(59,126,255,0.05)] transition-all duration-150"
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

                {/* Scroll line */}
                <motion.div
                    variants={fadeIn}
                    initial="hidden"
                    animate="visible"
                    custom={1.5}
                    className="absolute bottom-12 left-1/2 -translate-x-1/2"
                >
                    <motion.div
                        className="w-px h-12 bg-gradient-to-b from-transparent via-border to-transparent"
                        animate={{ opacity: [0.3, 0.8, 0.3] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    />
                </motion.div>
            </motion.section>

            {/* ── Stats Bar ── */}
            <section className="relative border-y border-border/40">
                <div className="max-w-5xl mx-auto px-6 py-16">
                    <div className="grid grid-cols-3 gap-8">
                        {[
                            { value: '2K+', label: 'Developers' },
                            { value: '100K+', label: 'Lines Generated' },
                            { value: '99.9%', label: 'Uptime' },
                        ].map((stat, i) => (
                            <RevealText key={i} delay={i * 0.1}>
                                <div className="text-center">
                                    <div className="text-3xl md:text-4xl font-bold tracking-tight">{stat.value}</div>
                                    <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground mt-1">{stat.label}</div>
                                </div>
                            </RevealText>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Free Tier ── */}
            <section className="relative py-32 md:py-40 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="max-w-xl mb-20">
                        <SectionLabel>Free tier</SectionLabel>
                        <RevealText delay={0.1} className="mt-4">
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1]">
                                No credit card.
                            </h2>
                        </RevealText>
                        <RevealText delay={0.2}>
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1] text-muted-foreground/40">
                                No catch.
                            </h2>
                        </RevealText>
                    </div>

                    <div className="grid md:grid-cols-2 gap-20 md:gap-32 items-start">
                        {/* Left — big number + details */}
                        <motion.div
                            variants={fadeIn}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-80px' }}
                            custom={0.2}
                        >
                            <div className="flex items-baseline gap-3">
                                <span className="text-[clamp(4rem,10vw,7rem)] font-bold tracking-tighter leading-none">200</span>
                                <span className="text-lg md:text-xl font-medium text-muted-foreground/60">credits</span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed mt-4 max-w-sm">
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

                        {/* Right — what's included */}
                        <motion.div
                            variants={fadeIn}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-80px' }}
                            custom={0.3}
                            className="space-y-6"
                        >
                            <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground/80">
                                Included in every account
                            </p>
                            {[
                                { step: '01', title: 'Builder', text: 'Generate full-stack apps, dashboards, and landing pages with AI. Uses credits from your balance.' },
                                { step: '02', title: 'AI Chat', text: 'Chat with multiple AI models for brainstorming, debugging, and explanations. Always free.' },
                                { step: '03', title: 'Resume Builder', text: 'Create ATS-friendly resumes from LaTeX templates and export as PDF. Always free.' },
                                { step: '04', title: 'Buildify Studio', text: 'Design and publish web pages visually with a live editor. Always free.' },
                            ].map((item, i) => (
                                <div key={i} className="flex gap-5">
                                    <span className="text-xs font-mono text-muted-foreground/50 mt-1 shrink-0">{item.step}</span>
                                    <div>
                                        <h3 className="text-base font-semibold mb-1">{item.title}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ── Capabilities Section ── */}
            <section id="features" className="relative py-32 md:py-40 px-6 border-t border-border/40">
                <div className="max-w-6xl mx-auto">
                    <div className="max-w-xl mb-20">
                        <SectionLabel>Capabilities</SectionLabel>
                        <RevealText delay={0.1} className="mt-4">
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1]">
                                Everything you need,
                            </h2>
                        </RevealText>
                        <RevealText delay={0.2}>
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1] text-muted-foreground/40">
                                nothing you don&apos;t.
                            </h2>
                        </RevealText>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/50 rounded-2xl overflow-hidden border border-border/50">
                        {[
                            {
                                icon: Zap,
                                title: 'Lightning Fast',
                                description: 'Generate production-ready code in seconds. Our AI understands context and delivers precise, clean results.',
                            },
                            {
                                icon: Shield,
                                title: 'Secure by Default',
                                description: 'Built-in security best practices. Your code follows industry standards from the first line.',
                            },
                            {
                                icon: Code2,
                                title: 'Multi-Language',
                                description: 'Support for 20+ programming languages and frameworks. React, Python, Go, and beyond.',
                            },
                            {
                                icon: Layers,
                                title: 'Full Stack',
                                description: 'Complete applications with frontend, backend, and database — generated from a single conversation.',
                            },
                            {
                                icon: Globe,
                                title: 'Deploy Anywhere',
                                description: 'Export and deploy to any platform. Vercel, AWS, or your own infrastructure.',
                            },
                            {
                                icon: Sparkles,
                                title: 'Iterative AI',
                                description: 'Refine through conversation. Each iteration improves on the last, understanding your preferences.',
                            },
                        ].map((feature, index) => (
                            <motion.div
                                key={index}
                                variants={scaleIn}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: '-60px' }}
                                custom={index * 0.05}
                                className="group relative bg-background p-8 md:p-10 transition-colors duration-300 hover:bg-muted/30"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="size-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 transition-colors duration-300 group-hover:bg-muted">
                                        <feature.icon className="size-5 text-muted-foreground transition-colors duration-300 group-hover:text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold mb-1.5">{feature.title}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Showcase / How It Works ── */}
            <section className="relative py-32 md:py-40 px-6 border-t border-border/40">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-20 md:gap-32 items-center">
                        {/* Left: Text */}
                        <div>
                            <SectionLabel>How it works</SectionLabel>
                            <RevealText delay={0.1} className="mt-4">
                                <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-[1.1]">
                                    From idea to app in three steps.
                                </h2>
                            </RevealText>
                            <motion.div
                                variants={fadeIn}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: '-80px' }}
                                custom={0.3}
                                className="mt-10 space-y-8"
                            >
                                {[
                                    { step: '01', title: 'Describe', text: 'Tell Buildify what you want to build using natural language.' },
                                    { step: '02', title: 'Generate', text: 'AI creates production-ready code with UI components and logic.' },
                                    { step: '03', title: 'Iterate', text: 'Refine through conversation until it matches your vision perfectly.' },
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-5">
                                        <span className="text-xs font-mono text-muted-foreground/50 mt-1 shrink-0">{item.step}</span>
                                        <div>
                                            <h3 className="text-base font-semibold mb-1">{item.title}</h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
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
                            variants={maskReveal}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-100px' }}
                            custom={0.2}
                            className="relative"
                        >
                            <div className="aspect-[4/3] rounded-2xl border border-border/50 bg-muted/20 overflow-hidden">
                                {/* Terminal-style UI mockup */}
                                <div className="h-10 border-b border-border/40 flex items-center px-4 gap-2">
                                    <div className="flex gap-1.5">
                                        <div className="size-2.5 rounded-full bg-border" />
                                        <div className="size-2.5 rounded-full bg-border" />
                                        <div className="size-2.5 rounded-full bg-border" />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground/50 font-mono ml-3">buildify.sh</span>
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
            <section id="community" className="relative py-32 md:py-40 px-6 border-t border-border/40">
                <div className="max-w-6xl mx-auto">
                    <div className="max-w-xl mb-16">
                        <SectionLabel>Community</SectionLabel>
                        <RevealText delay={0.1} className="mt-4">
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1]">
                                Built by developers,
                            </h2>
                        </RevealText>
                        <RevealText delay={0.2}>
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1] text-muted-foreground/40">
                                for developers.
                            </h2>
                        </RevealText>
                        <motion.p
                            variants={fadeIn}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-80px' }}
                            custom={0.3}
                            className="mt-5 text-sm text-muted-foreground leading-relaxed max-w-md"
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
            <section className="relative py-32 md:py-40 px-6 border-t border-border/40">
                <div className="max-w-3xl mx-auto text-center">
                    <SectionLabel>Get started</SectionLabel>
                    <RevealText delay={0.1} className="mt-4">
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1]">
                            Ready to build?
                        </h2>
                    </RevealText>
                    <motion.p
                        variants={fadeIn}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-80px' }}
                        custom={0.3}
                        className="mt-5 text-sm text-muted-foreground leading-relaxed max-w-md mx-auto"
                    >
                        Start with 200 free credits. No credit card, no trial — just sign up and build.
                    </motion.p>
                    <motion.div
                        variants={fadeIn}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-60px' }}
                        custom={0.5}
                        className="mt-10"
                    >
                        <Button
                            size="lg"
                            onClick={handleGetStarted}
                            className="rounded-full h-12 px-8 text-sm font-medium gap-2 group"
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
