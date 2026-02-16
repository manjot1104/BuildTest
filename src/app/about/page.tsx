'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Sparkles, Zap, Users, Target, Heart, Code2, Globe, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Footer } from '@/components/layout/footer'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useStateMachine } from '@/context/state-machine'
import { useRouter } from 'next/navigation'

const values = [
    {
        icon: Zap,
        title: 'Speed',
        description: 'We believe in removing friction from the development process. What used to take days should take minutes.',
        color: 'text-amber-500',
        bg: 'bg-amber-500/10',
    },
    {
        icon: Users,
        title: 'Community',
        description: 'Great software is built together. Our community shares, forks, and improves on each other\'s work.',
        color: 'text-blue-500',
        bg: 'bg-blue-500/10',
    },
    {
        icon: Target,
        title: 'Quality',
        description: 'AI-generated code should meet the same standards as hand-written code. We prioritize clean, secure, production-ready output.',
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10',
    },
    {
        icon: Heart,
        title: 'Accessibility',
        description: 'Everyone should be able to build software. We lower the barrier so ideas matter more than expertise.',
        color: 'text-pink-500',
        bg: 'bg-pink-500/10',
    },
]

const stats = [
    { value: '2K+', label: 'Developers', icon: Users },
    { value: '100K+', label: 'Lines Generated', icon: Code2 },
    { value: '20+', label: 'Languages', icon: Globe },
    { value: '99.9%', label: 'Uptime', icon: Zap },
]

const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2,
        },
    },
}

const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
}

export default function AboutPage() {
    const { theme, setTheme } = useTheme()
    const { session } = useStateMachine()
    const router = useRouter()

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Background */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
            <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                className="fixed top-1/4 -left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px]"
            />
            <motion.div
                animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                className="fixed bottom-1/4 -right-1/4 w-96 h-96 bg-purple-500/15 rounded-full blur-[128px]"
            />

            {/* Navigation */}
            <motion.nav
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl"
            >
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <ArrowLeft className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
                            <Sparkles className="size-4 text-primary-foreground" />
                        </div>
                        <span className="font-semibold text-lg">Buildify</span>
                    </Link>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="size-9"
                    >
                        <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>
                </div>
            </motion.nav>

            {/* Hero */}
            <section className="relative z-10 py-24 md:py-32 px-6">
                <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="max-w-4xl mx-auto text-center space-y-6"
                >
                    <motion.div
                        variants={fadeInUp}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-background/50 backdrop-blur-sm"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                        </span>
                        <span className="text-sm text-muted-foreground">Our Story</span>
                    </motion.div>

                    <motion.h1
                        variants={fadeInUp}
                        className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight"
                    >
                        <span className="block">Building the future of</span>
                        <span className="block mt-2 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                            app development
                        </span>
                    </motion.h1>

                    <motion.p
                        variants={fadeInUp}
                        className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
                    >
                        We believe anyone should be able to turn an idea into a working application — no matter their experience level.
                    </motion.p>
                </motion.div>
            </section>

            {/* Stats */}
            <section className="relative z-10 px-6 pb-20">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4"
                    >
                        {stats.map((stat, index) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: index * 0.1 }}
                                className="relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 text-center"
                            >
                                <stat.icon className="size-5 text-primary mx-auto mb-3" />
                                <p className="text-3xl md:text-4xl font-bold">{stat.value}</p>
                                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Mission */}
            <section className="relative z-10 py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="grid md:grid-cols-2 gap-12 items-center"
                    >
                        {/* Left: heading */}
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/50 bg-background/50 backdrop-blur-sm mb-6">
                                <Sparkles className="size-3.5 text-primary" />
                                <span className="text-xs font-medium text-muted-foreground">Our Mission</span>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                                Software creation, <span className="text-primary">reimagined</span>
                            </h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Building software is still too hard and too slow for most people. We built Buildify to change that.
                            </p>
                        </div>

                        {/* Right: cards */}
                        <div className="space-y-4">
                            {[
                                {
                                    title: 'The Problem',
                                    body: 'While AI has made incredible advances, turning those capabilities into practical tools that developers actually want to use requires a different approach.',
                                },
                                {
                                    title: 'Our Solution',
                                    body: 'A conversational interface where you describe what you want and get production-ready code in return — whether you\'re a seasoned developer or just starting out.',
                                },
                                {
                                    title: 'The Technology',
                                    body: 'Our platform is powered by advanced AI that understands context, follows best practices, and generates clean, deployable code across 20+ languages and frameworks.',
                                },
                            ].map((card, index) => (
                                <motion.div
                                    key={card.title}
                                    initial={{ opacity: 0, x: 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: index * 0.15 }}
                                    className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-5"
                                >
                                    <h3 className="font-semibold mb-2">{card.title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{card.body}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Values */}
            <section className="relative z-10 py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">What we value</h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            The principles that guide everything we build.
                        </p>
                    </motion.div>

                    <div className="grid sm:grid-cols-2 gap-6">
                        {values.map((value, index) => (
                            <motion.div
                                key={value.title}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                whileHover={{ y: -4 }}
                                className="group rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 transition-colors hover:border-border"
                            >
                                <div className={`size-12 rounded-xl ${value.bg} flex items-center justify-center mb-4 transition-colors`}>
                                    <value.icon className={`size-6 ${value.color}`} />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                                <p className="text-muted-foreground leading-relaxed">{value.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            <Separator className="relative z-10 max-w-5xl mx-auto bg-border/40" />

            {/* CTA */}
            <section className="relative z-10 py-24 px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="max-w-2xl mx-auto text-center"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-background/50 backdrop-blur-sm mb-6">
                        <Sparkles className="size-4 text-primary" />
                        <span className="text-sm text-muted-foreground">Get Started</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to start building?</h2>
                    <p className="text-lg text-muted-foreground mb-8">
                        Join thousands of developers using Buildify to ship faster.
                    </p>
                    <Button
                        size="lg"
                        className="h-12 px-8 text-base gap-2 group"
                        onClick={() => router.push(session?.user ? '/chat' : '/login')}
                    >
                        {session?.user ? 'Go to Chat' : 'Get Started Free'}
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                </motion.div>
            </section>

            <div className="relative z-10">
                <Footer />
            </div>
        </div>
    )
}
