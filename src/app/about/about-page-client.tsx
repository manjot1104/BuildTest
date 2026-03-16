'use client'

import { motion, type Variants } from 'framer-motion'
import { ArrowLeft, ArrowRight, Zap, Users, Target, Heart, Moon, Sun } from 'lucide-react'
import { BuildifyLogo } from '@/components/buildify-logo'
import { Button } from '@/components/ui/button'
import { Footer } from '@/components/layout/footer'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useStateMachine } from '@/context/state-machine'
import { useRouter } from 'next/navigation'

const fadeIn: Variants = {
    hidden: { opacity: 0 },
    visible: (delay = 0) => ({
        opacity: 1,
        transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1], delay },
    }),
}

const slideUp: Variants = {
    hidden: { y: '100%' },
    visible: (delay = 0) => ({
        y: '0%',
        transition: { duration: 0.8, ease: [0.77, 0, 0.175, 1], delay },
    }),
}

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

const values = [
    {
        icon: Zap,
        title: 'Speed',
        description: 'We believe in removing friction from the development process. What used to take days should take minutes.',
    },
    {
        icon: Users,
        title: 'Community',
        description: 'Great software is built together. Our community shares, forks, and improves on each other\'s work.',
    },
    {
        icon: Target,
        title: 'Quality',
        description: 'AI-generated code should meet the same standards as hand-written code. Clean, secure, production-ready.',
    },
    {
        icon: Heart,
        title: 'Accessibility',
        description: 'Everyone should be able to build software. We lower the barrier so ideas matter more than expertise.',
    },
]

export default function AboutPage() {
    const { theme, setTheme } = useTheme()
    const { session } = useStateMachine()
    const router = useRouter()

    return (
        <div className="min-h-screen bg-background">
            {/* Subtle grain */}
            <div
                className="fixed inset-0 opacity-[0.015] dark:opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
            />

            {/* Navigation */}
            <motion.nav
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                custom={0}
                className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-2xl"
            >
                <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <ArrowLeft className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        <BuildifyLogo size="sm" />
                        <span className="font-semibold text-sm tracking-tight">Buildify</span>
                    </Link>
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="size-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Sun className="size-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute size-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    </button>
                </div>
            </motion.nav>

            {/* Hero */}
            <section className="relative py-28 md:py-36 px-6">
                <div className="max-w-3xl mx-auto">
                    <SectionLabel>About</SectionLabel>
                    <div className="mt-4 space-y-2">
                        <RevealText delay={0.1}>
                            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[0.95]">
                                Building the future
                            </h1>
                        </RevealText>
                        <RevealText delay={0.2}>
                            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[0.95] text-muted-foreground/40">
                                of app development.
                            </h1>
                        </RevealText>
                    </div>
                    <motion.p
                        variants={fadeIn}
                        initial="hidden"
                        animate="visible"
                        custom={0.5}
                        className="mt-8 text-base text-muted-foreground leading-relaxed max-w-xl"
                    >
                        We believe anyone should be able to turn an idea into a working
                        application — no matter their experience level.
                    </motion.p>
                </div>
            </section>

            {/* Stats */}
            <section className="relative border-y border-border/40">
                <div className="max-w-5xl mx-auto px-6 py-16">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { value: '2K+', label: 'Developers' },
                            { value: '100K+', label: 'Lines Generated' },
                            { value: '20+', label: 'Languages' },
                            { value: '99.9%', label: 'Uptime' },
                        ].map((stat, i) => (
                            <RevealText key={i} delay={i * 0.08}>
                                <div className="text-center">
                                    <div className="text-3xl md:text-4xl font-bold tracking-tight">{stat.value}</div>
                                    <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground mt-1">{stat.label}</div>
                                </div>
                            </RevealText>
                        ))}
                    </div>
                </div>
            </section>

            {/* Mission */}
            <section className="relative py-32 md:py-40 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-20 md:gap-32 items-start">
                        {/* Left */}
                        <div>
                            <SectionLabel>Our Mission</SectionLabel>
                            <RevealText delay={0.1} className="mt-4">
                                <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-[1.1]">
                                    Software creation, reimagined.
                                </h2>
                            </RevealText>
                            <motion.p
                                variants={fadeIn}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: '-80px' }}
                                custom={0.3}
                                className="mt-6 text-sm text-muted-foreground leading-relaxed"
                            >
                                Building software is still too hard and too slow for most people.
                                We built Buildify to change that.
                            </motion.p>
                        </div>

                        {/* Right */}
                        <motion.div
                            variants={fadeIn}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-80px' }}
                            custom={0.2}
                            className="space-y-6"
                        >
                            {[
                                {
                                    step: '01',
                                    title: 'The Problem',
                                    body: 'While AI has made incredible advances, turning those capabilities into practical tools that developers actually want to use requires a different approach.',
                                },
                                {
                                    step: '02',
                                    title: 'Our Solution',
                                    body: 'A conversational interface where you describe what you want and get production-ready code in return — whether you\'re a seasoned developer or just starting out.',
                                },
                                {
                                    step: '03',
                                    title: 'The Technology',
                                    body: 'Our platform is powered by advanced AI that understands context, follows best practices, and generates clean, deployable code across 20+ languages.',
                                },
                            ].map((item) => (
                                <div key={item.step} className="flex gap-5">
                                    <span className="text-xs font-mono text-muted-foreground/50 mt-1 shrink-0">{item.step}</span>
                                    <div>
                                        <h3 className="text-base font-semibold mb-1">{item.title}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Values */}
            <section className="relative py-32 md:py-40 px-6 border-t border-border/40">
                <div className="max-w-6xl mx-auto">
                    <div className="max-w-xl mb-20">
                        <SectionLabel>Values</SectionLabel>
                        <RevealText delay={0.1} className="mt-4">
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1]">
                                What we believe in.
                            </h2>
                        </RevealText>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-px bg-border/50 rounded-2xl overflow-hidden border border-border/50">
                        {values.map((value, index) => (
                            <motion.div
                                key={value.title}
                                variants={fadeIn}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: '-60px' }}
                                custom={index * 0.08}
                                className="group bg-background p-8 md:p-10 transition-colors duration-300 hover:bg-muted/30"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="size-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 transition-colors duration-300 group-hover:bg-muted">
                                        <value.icon className="size-5 text-muted-foreground transition-colors duration-300 group-hover:text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold mb-1.5">{value.title}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="relative py-32 md:py-40 px-6 border-t border-border/40">
                <div className="max-w-3xl mx-auto text-center">
                    <SectionLabel>Get started</SectionLabel>
                    <RevealText delay={0.1} className="mt-4">
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1]">
                            Ready to start building?
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
                            onClick={() => router.push(session?.user ? '/chat' : '/login')}
                            className="rounded-full h-12 px-8 text-sm font-medium gap-2 group"
                        >
                            {session?.user ? 'Open App' : 'Get Started Free'}
                            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                        </Button>
                    </motion.div>
                </div>
            </section>

            <Footer />
        </div>
    )
}
