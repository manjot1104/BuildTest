'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Sparkles, Moon, Sun, FileText, Shield, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Footer } from '@/components/layout/footer'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useState, useEffect } from 'react'

const sections = [
    { id: 'acceptance', label: 'Acceptance of Terms', number: '1' },
    { id: 'description', label: 'Description of Service', number: '2' },
    { id: 'accounts', label: 'User Accounts', number: '3' },
    { id: 'credits', label: 'Credits & Subscriptions', number: '4' },
    { id: 'acceptable-use', label: 'Acceptable Use', number: '5' },
    { id: 'intellectual-property', label: 'Intellectual Property', number: '6' },
    { id: 'rate-limits', label: 'Rate Limits', number: '7' },
    { id: 'liability', label: 'Limitation of Liability', number: '8' },
    { id: 'termination', label: 'Termination', number: '9' },
    { id: 'changes', label: 'Changes to Terms', number: '10' },
    { id: 'privacy', label: 'Privacy Policy', number: '11' },
    { id: 'contact', label: 'Contact', number: '12' },
]

const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
}

export default function TermsPage() {
    const { theme, setTheme } = useTheme()
    const [activeSection, setActiveSection] = useState('acceptance')

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id)
                    }
                }
            },
            { rootMargin: '-20% 0px -70% 0px' }
        )

        for (const section of sections) {
            const el = document.getElementById(section.id)
            if (el) observer.observe(el)
        }

        return () => observer.disconnect()
    }, [])

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
            <section className="relative z-10 py-20 px-6">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="max-w-3xl mx-auto text-center"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-background/50 backdrop-blur-sm mb-6"
                    >
                        <ScrollText className="size-4 text-primary" />
                        <span className="text-sm text-muted-foreground">Legal</span>
                    </motion.div>
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
                        Terms{' '}
                        <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                            & Conditions
                        </span>
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                </motion.div>
            </section>

            {/* Content */}
            <main className="relative z-10 flex-1 px-6 pb-20">
                <div className="max-w-6xl mx-auto flex gap-10">
                    {/* Sidebar TOC - desktop */}
                    <motion.aside
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="hidden lg:block w-64 shrink-0"
                    >
                        <div className="sticky top-24">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">On this page</p>
                            <nav className="space-y-1">
                                {sections.map((section) => (
                                    <a
                                        key={section.id}
                                        href={`#${section.id}`}
                                        className={`block text-sm py-1.5 px-3 rounded-md transition-colors ${
                                            activeSection === section.id
                                                ? 'text-primary bg-primary/10 font-medium'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                        }`}
                                    >
                                        {section.number}. {section.label}
                                    </a>
                                ))}
                            </nav>
                        </div>
                    </motion.aside>

                    {/* Main content */}
                    <motion.div
                        {...fadeIn}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="flex-1 min-w-0 max-w-3xl"
                    >
                        {/* Section: Acceptance */}
                        <section id="acceptance" className="scroll-mt-24 mb-12">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                    <FileText className="size-5 text-primary" />
                                </div>
                                <h2 className="text-2xl font-bold">1. Acceptance of Terms</h2>
                            </div>
                            <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
                                <p className="text-muted-foreground leading-relaxed">
                                    By accessing and using Buildify (&quot;the Service&quot;), you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our Service.
                                </p>
                            </div>
                        </section>

                        {/* Section: Description */}
                        <section id="description" className="scroll-mt-24 mb-12">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                    <Sparkles className="size-5 text-primary" />
                                </div>
                                <h2 className="text-2xl font-bold">2. Description of Service</h2>
                            </div>
                            <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
                                <p className="text-muted-foreground leading-relaxed">
                                    Buildify is an AI-powered application builder that enables users to generate, iterate, and deploy applications through a conversational interface. The Service includes features such as code generation, community builds, and credit-based usage.
                                </p>
                            </div>
                        </section>

                        {/* Section: Accounts */}
                        <section id="accounts" className="scroll-mt-24 mb-12">
                            <h2 className="text-2xl font-bold mb-4">3. User Accounts</h2>
                            <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
                                <p className="text-muted-foreground leading-relaxed">
                                    To access certain features, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate information and notify us immediately of any unauthorized use.
                                </p>
                            </div>
                        </section>

                        {/* Section: Credits */}
                        <section id="credits" className="scroll-mt-24 mb-12">
                            <h2 className="text-2xl font-bold mb-4">4. Credits and Subscriptions</h2>
                            <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 space-y-4">
                                <p className="text-muted-foreground leading-relaxed">
                                    Buildify operates on a credit-based system with two types of credits:
                                </p>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    <div className="rounded-lg bg-muted/50 p-4">
                                        <p className="font-medium text-sm mb-1">Subscription Credits</p>
                                        <p className="text-xs text-muted-foreground">Allocated per billing cycle. Expire at the end of each cycle.</p>
                                    </div>
                                    <div className="rounded-lg bg-muted/50 p-4">
                                        <p className="font-medium text-sm mb-1">Additional Credits</p>
                                        <p className="text-xs text-muted-foreground">Purchased separately. Never expire.</p>
                                    </div>
                                </div>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    Usage costs vary by action type. All purchases are subject to our refund policy.
                                </p>
                            </div>
                        </section>

                        {/* Section: Acceptable Use */}
                        <section id="acceptable-use" className="scroll-mt-24 mb-12">
                            <h2 className="text-2xl font-bold mb-4">5. Acceptable Use</h2>
                            <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
                                <p className="text-muted-foreground mb-4">You agree not to:</p>
                                <ul className="space-y-3">
                                    {[
                                        'Use the Service for any unlawful purpose or in violation of any applicable laws',
                                        'Attempt to reverse engineer, decompile, or extract the underlying AI models',
                                        'Use automated tools to scrape or collect data from the Service',
                                        'Share your account credentials or allow unauthorized access',
                                        'Generate content that is harmful, abusive, or violates third-party rights',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3 text-muted-foreground">
                                            <span className="mt-1.5 size-1.5 rounded-full bg-primary shrink-0" />
                                            <span className="leading-relaxed">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </section>

                        {/* Section: IP */}
                        <section id="intellectual-property" className="scroll-mt-24 mb-12">
                            <h2 className="text-2xl font-bold mb-4">6. Intellectual Property</h2>
                            <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 space-y-4">
                                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                                    <p className="text-sm font-medium text-primary mb-1">You own your code</p>
                                    <p className="text-xs text-muted-foreground">Code generated through Buildify is provided for your use. You retain ownership of the applications you build.</p>
                                </div>
                                <p className="text-muted-foreground leading-relaxed text-sm">
                                    However, the Buildify platform, its design, AI models, and underlying technology remain the intellectual property of Buildify.
                                </p>
                            </div>
                        </section>

                        {/* Section: Rate Limits */}
                        <section id="rate-limits" className="scroll-mt-24 mb-12">
                            <h2 className="text-2xl font-bold mb-4">7. Rate Limits</h2>
                            <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 space-y-4">
                                <p className="text-muted-foreground leading-relaxed">
                                    To ensure fair usage, the Service enforces rate limits:
                                </p>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    <div className="rounded-lg bg-muted/50 p-4">
                                        <p className="text-2xl font-bold">50</p>
                                        <p className="text-xs text-muted-foreground">Messages per day (authenticated)</p>
                                    </div>
                                    <div className="rounded-lg bg-muted/50 p-4">
                                        <p className="text-2xl font-bold">3</p>
                                        <p className="text-xs text-muted-foreground">Messages per day (anonymous)</p>
                                    </div>
                                </div>
                                <p className="text-muted-foreground text-sm">These limits may be adjusted at our discretion.</p>
                            </div>
                        </section>

                        {/* Section: Liability */}
                        <section id="liability" className="scroll-mt-24 mb-12">
                            <h2 className="text-2xl font-bold mb-4">8. Limitation of Liability</h2>
                            <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
                                <p className="text-muted-foreground leading-relaxed">
                                    Buildify is provided &quot;as is&quot; without warranties of any kind. We are not liable for any damages arising from your use of the Service, including but not limited to loss of data, profits, or business opportunities. The generated code is provided as a starting point and should be reviewed before production use.
                                </p>
                            </div>
                        </section>

                        {/* Section: Termination */}
                        <section id="termination" className="scroll-mt-24 mb-12">
                            <h2 className="text-2xl font-bold mb-4">9. Termination</h2>
                            <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
                                <p className="text-muted-foreground leading-relaxed">
                                    We reserve the right to suspend or terminate your account at any time for violation of these terms or for any other reason at our sole discretion. Upon termination, your right to use the Service ceases immediately.
                                </p>
                            </div>
                        </section>

                        {/* Section: Changes */}
                        <section id="changes" className="scroll-mt-24 mb-12">
                            <h2 className="text-2xl font-bold mb-4">10. Changes to Terms</h2>
                            <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
                                <p className="text-muted-foreground leading-relaxed">
                                    We may update these terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated terms. We will notify users of significant changes via email or through the Service.
                                </p>
                            </div>
                        </section>

                        <Separator className="my-12 bg-border/40" />

                        {/* Section: Privacy */}
                        <section id="privacy" className="scroll-mt-24 mb-12">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="size-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                                    <Shield className="size-5 text-purple-500" />
                                </div>
                                <h2 className="text-2xl font-bold">11. Privacy Policy</h2>
                            </div>
                            <p className="text-muted-foreground mb-6 leading-relaxed">
                                Your privacy is important to us. This section outlines how we handle your data.
                            </p>

                            <div className="space-y-6">
                                <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
                                    <h3 className="text-lg font-semibold mb-4">Information We Collect</h3>
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        {[
                                            { title: 'Account Info', desc: 'Email address, name, and authentication data' },
                                            { title: 'Usage Data', desc: 'Chat messages, generated code, and interaction patterns' },
                                            { title: 'Payment Info', desc: 'Processed securely through Razorpay; we do not store card details' },
                                            { title: 'Technical Data', desc: 'IP address, browser type, and device information' },
                                        ].map((item) => (
                                            <div key={item.title} className="rounded-lg bg-muted/50 p-4">
                                                <p className="font-medium text-sm mb-1">{item.title}</p>
                                                <p className="text-xs text-muted-foreground">{item.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
                                    <h3 className="text-lg font-semibold mb-4">How We Use Your Data</h3>
                                    <ul className="space-y-3">
                                        {[
                                            'To provide and improve the Service',
                                            'To process payments and manage subscriptions',
                                            'To enforce rate limits and prevent abuse',
                                            'To communicate important updates about the Service',
                                        ].map((item, i) => (
                                            <li key={i} className="flex items-start gap-3 text-muted-foreground">
                                                <span className="mt-1.5 size-1.5 rounded-full bg-purple-500 shrink-0" />
                                                <span className="leading-relaxed text-sm">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
                                    <h3 className="text-lg font-semibold mb-3">Data Security</h3>
                                    <p className="text-muted-foreground leading-relaxed text-sm">
                                        We implement industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Section: Contact */}
                        <section id="contact" className="scroll-mt-24 mb-12">
                            <h2 className="text-2xl font-bold mb-4">12. Contact</h2>
                            <div className="rounded-xl border border-primary/20 bg-primary/5 backdrop-blur-sm p-6">
                                <p className="text-muted-foreground leading-relaxed">
                                    If you have questions about these Terms and Conditions, please contact us through the Service or reach out to our support team.
                                </p>
                            </div>
                        </section>
                    </motion.div>
                </div>
            </main>

            <div className="relative z-10">
                <Footer />
            </div>
        </div>
    )
}
