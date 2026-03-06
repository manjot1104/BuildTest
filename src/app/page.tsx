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
import { ArrowRight, ArrowUpRight, Zap, Shield, Code2, Layers, Globe, Sparkles, Moon, Sun, SendHorizonal } from 'lucide-react'
import { BuildifyLogo } from '@/components/buildify-logo'
import { CommunityBuildsGrid } from '@/components/chat/community-builds-grid'
import { Footer } from '@/components/layout/footer'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { savePromptToStorage } from '@/components/ai-elements/prompt-input'

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

// --- Main Page ---

export default function LandingPage() {
    const { session, isPending } = useStateMachine()
    const router = useRouter()
    const { theme, setTheme } = useTheme()
    const heroRef = useRef<HTMLDivElement>(null)
    const [navScrolled, setNavScrolled] = useState(false)
    const [prompt, setPrompt] = useState('')

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
        if (!trimmed) return
        savePromptToStorage(trimmed, [])
        if (session?.user) {
            router.push('/chat')
        } else {
            router.push('/login')
        }
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
                            Now in Public Beta
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
                        <div className="relative rounded-2xl border border-border/60 bg-background shadow-lg overflow-hidden focus-within:border-border focus-within:shadow-xl transition-all duration-200">
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                        e.preventDefault()
                                        handlePromptSubmit(prompt)
                                    }
                                }}
                                placeholder="Describe the app you want to build..."
                                rows={3}
                                className="w-full resize-none bg-transparent px-5 pt-4 pb-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none"
                            />
                            <div className="flex items-center justify-between px-4 pb-3 pt-1">
                                <p className="text-xs text-muted-foreground/40">Press Enter to submit &middot; Shift+Enter for new line</p>
                                <Button
                                    size="sm"
                                    onClick={() => handlePromptSubmit(prompt)}
                                    disabled={!prompt.trim()}
                                    className="rounded-xl h-8 px-3 gap-1.5 text-xs font-medium"
                                >
                                    Build
                                    <SendHorizonal className="size-3" />
                                </Button>
                            </div>
                        </div>

                        {/* Example prompts */}
                        <div className="flex flex-wrap gap-2 mt-4 justify-center">
                            {[
                                'A todo app with drag & drop',
                                'A SaaS dashboard with charts',
                                'An e-commerce product page',
                            ].map((example) => (
                                <button
                                    key={example}
                                    onClick={() => handlePromptSubmit(example)}
                                    className="text-xs text-muted-foreground/60 border border-border/40 rounded-full px-3 py-1 hover:border-border hover:text-foreground transition-colors duration-150"
                                >
                                    {example}
                                </button>
                            ))}
                        </div>

                        <p className="text-center mt-5">
                            <button
                                onClick={() => document.getElementById('community')?.scrollIntoView({ behavior: 'smooth' })}
                                className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-150"
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

            {/* ── Features Section ── */}
            <section id="features" className="relative py-32 md:py-40 px-6">
                <div className="max-w-6xl mx-auto">
                    {/* Section header */}
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

                    {/* Bento grid */}
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
                                    <div className="size-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 transition-colors duration-300 group-hover:bg-primary/10">
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
                                    <span className="text-[10px] text-muted-foreground/50 font-mono ml-3">buildify.ai</span>
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
                        Join thousands of developers shipping faster with AI-powered code generation.
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
