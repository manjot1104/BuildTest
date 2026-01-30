'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useStateMachine } from '@/context/state-machine'
import { useRouter } from 'next/navigation'
import { ArrowRight, Sparkles, Zap, Shield, Code2, Layers, Globe, ChevronDown, Moon, Sun } from 'lucide-react'
import { useRef } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'

const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
}

const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.3
        }
    }
}

export default function LandingPage() {
    const { session, isPending } = useStateMachine()
    const router = useRouter()
    const { theme, setTheme } = useTheme()
    const containerRef = useRef<HTMLDivElement>(null)
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"]
    })

    const heroY = useTransform(scrollYProgress, [0, 1], [0, 200])
    const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

    const handleGetStarted = () => {
        if (session?.user) {
            router.push('/chat')
        } else {
            router.push('/login')
        }
    }

    return (
        <div ref={containerRef} className="min-h-screen bg-background overflow-hidden">
            {/* Navigation */}
            <motion.nav
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl"
            >
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
                            <Sparkles className="size-4 text-primary-foreground" />
                        </div>
                        <span className="font-semibold text-lg">Technotribes AI</span>
                    </Link>

                    <div className="flex items-center gap-3">
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
                        {!isPending && (
                            session?.user ? (
                                <Button onClick={() => router.push('/chat')} className="gap-2">
                                    Go to Chat
                                    <ArrowRight className="size-4" />
                                </Button>
                            ) : (
                                <Button onClick={() => router.push('/login')} variant="default">
                                    Login
                                </Button>
                            )
                        )}
                    </div>
                </div>
            </motion.nav>

            {/* Hero Section */}
            <motion.section
                style={{ y: heroY, opacity: heroOpacity }}
                className="relative min-h-screen flex items-center justify-center pt-16"
            >
                {/* Background Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

                {/* Gradient Orbs */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/4 -left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-[128px]"
                />
                <motion.div
                    animate={{
                        scale: [1.2, 1, 1.2],
                        opacity: [0.2, 0.4, 0.2]
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px]"
                />

                <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        className="space-y-8"
                    >
                        {/* Badge */}
                        <motion.div
                            variants={fadeInUp}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-background/50 backdrop-blur-sm"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            <span className="text-sm text-muted-foreground">Powered by Advanced AI</span>
                        </motion.div>

                        {/* Main Heading */}
                        <motion.h1
                            variants={fadeInUp}
                            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight"
                        >
                            <span className="block">Build Faster with</span>
                            <span className="block mt-2 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                                AI-Powered Code
                            </span>
                        </motion.h1>

                        {/* Subtitle */}
                        <motion.p
                            variants={fadeInUp}
                            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
                        >
                            Transform your ideas into production-ready applications.
                            Our AI understands your vision and writes clean, efficient code in seconds.
                        </motion.p>

                        {/* CTA Buttons */}
                        <motion.div
                            variants={fadeInUp}
                            className="flex flex-col sm:flex-row items-center justify-center gap-4"
                        >
                            <Button
                                size="lg"
                                onClick={handleGetStarted}
                                className="gap-2 h-12 px-8 text-base group"
                            >
                                Get Started Free
                                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="h-12 px-8 text-base"
                            >
                                Watch Demo
                            </Button>
                        </motion.div>

                        {/* Stats */}
                        <motion.div
                            variants={fadeInUp}
                            className="grid grid-cols-3 gap-8 pt-12 max-w-lg mx-auto"
                        >
                            {[
                                { value: '10K+', label: 'Developers' },
                                { value: '1M+', label: 'Lines Generated' },
                                { value: '99.9%', label: 'Uptime' }
                            ].map((stat, index) => (
                                <div key={index} className="text-center">
                                    <div className="text-2xl md:text-3xl font-bold">{stat.value}</div>
                                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                                </div>
                            ))}
                        </motion.div>
                    </motion.div>

                    {/* Scroll Indicator */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.5 }}
                        className="absolute bottom-8 left-1/2 -translate-x-1/2"
                    >
                        <motion.div
                            animate={{ y: [0, 8, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <ChevronDown className="size-6 text-muted-foreground" />
                        </motion.div>
                    </motion.div>
                </div>
            </motion.section>

            {/* Features Section */}
            <section className="relative py-32 px-6">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-20"
                    >
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">
                            Everything you need to build
                        </h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Powerful features that help you ship faster and focus on what matters most.
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            {
                                icon: Zap,
                                title: 'Lightning Fast',
                                description: 'Generate production-ready code in seconds, not hours. Our AI understands context and delivers precise results.'
                            },
                            {
                                icon: Shield,
                                title: 'Secure by Default',
                                description: 'Built-in security best practices. Your code follows industry standards and stays protected.'
                            },
                            {
                                icon: Code2,
                                title: 'Multiple Languages',
                                description: 'Support for 20+ programming languages. From React to Python, we have got you covered.'
                            },
                            {
                                icon: Layers,
                                title: 'Full Stack Ready',
                                description: 'Generate complete applications with frontend, backend, and database code in one go.'
                            },
                            {
                                icon: Globe,
                                title: 'Deploy Anywhere',
                                description: 'Export your code and deploy to any platform. Vercel, AWS, or your own infrastructure.'
                            },
                            {
                                icon: Sparkles,
                                title: 'AI That Learns',
                                description: 'Our AI improves with every interaction, understanding your coding style and preferences.'
                            }
                        ].map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                whileHover={{ y: -5 }}
                                className="group relative p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors"
                            >
                                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                                    <feature.icon className="size-6 text-primary" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                                <p className="text-muted-foreground">{feature.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-border/40 py-12 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
                            <Sparkles className="size-4 text-primary-foreground" />
                        </div>
                        <span className="font-semibold">Technotribes AI</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {new Date().getFullYear()} Technotribes. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    )
}
