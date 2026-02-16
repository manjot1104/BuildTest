'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Sparkles, Zap, Users, Target, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Footer } from '@/components/layout/footer'
import Link from 'next/link'
import { useTheme } from 'next-themes'

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
        description: 'AI-generated code should meet the same standards as hand-written code. We prioritize clean, secure, production-ready output.',
    },
]

export default function AboutPage() {
    const { theme, setTheme } = useTheme()

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Navigation */}
            <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
                            <Sparkles className="size-4 text-primary-foreground" />
                        </div>
                        <span className="font-semibold text-lg">Buildify</span>
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
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/" className="gap-2">
                                <ArrowLeft className="size-4" />
                                Back to Home
                            </Link>
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative py-24 px-6">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="relative z-10 max-w-3xl mx-auto text-center"
                >
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                        About{' '}
                        <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                            Buildify
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                        We are building the future of application development — where anyone can turn an idea into a working application through the power of AI.
                    </p>
                </motion.div>
            </section>

            {/* Mission */}
            <section className="py-16 px-6">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="max-w-3xl mx-auto"
                >
                    <h2 className="text-2xl md:text-3xl font-bold mb-6">Our Mission</h2>
                    <div className="space-y-4 text-muted-foreground">
                        <p>
                            Buildify was born from a simple observation: building software is still too hard and too slow for most people. While AI has made incredible advances, turning those capabilities into practical tools that developers actually want to use requires a different approach.
                        </p>
                        <p>
                            We built Buildify to be that bridge — a conversational interface where you describe what you want and get production-ready code in return. Whether you are a seasoned developer looking to prototype faster or someone with a great idea but limited coding experience, Buildify meets you where you are.
                        </p>
                        <p>
                            Our platform is powered by advanced AI that understands context, follows best practices, and generates clean, deployable code across multiple languages and frameworks.
                        </p>
                    </div>
                </motion.div>
            </section>

            {/* Values */}
            <section className="py-16 px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="text-2xl md:text-3xl font-bold mb-10 text-center"
                    >
                        What We Value
                    </motion.h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        {values.map((value, index) => (
                            <motion.div
                                key={value.title}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className="p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm"
                            >
                                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                                    <value.icon className="size-6 text-primary" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                                <p className="text-muted-foreground">{value.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="max-w-2xl mx-auto text-center"
                >
                    <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to start building?</h2>
                    <p className="text-muted-foreground mb-8">
                        Join thousands of developers using Buildify to ship faster.
                    </p>
                    <Button size="lg" className="h-12 px-8 text-base" asChild>
                        <Link href="/login">Get Started Free</Link>
                    </Button>
                </motion.div>
            </section>

            <Footer />
        </div>
    )
}
