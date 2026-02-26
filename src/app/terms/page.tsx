'use client'

import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { ArrowLeft, Moon, Sun } from 'lucide-react'
import { BuildifyLogo } from '@/components/buildify-logo'
import { Footer } from '@/components/layout/footer'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useState, useEffect, useRef } from 'react'

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

const sectionReveal: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
    },
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

function ContentSection({ id, number, title, children }: {
    id: string
    number: string
    title: string
    children: React.ReactNode
}) {
    return (
        <motion.section
            id={id}
            className="scroll-mt-24 mb-16"
            variants={sectionReveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
        >
            <div className="flex items-baseline gap-3 mb-4">
                <span className="text-xs font-mono text-muted-foreground/50">{number}</span>
                <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            </div>
            <div className="pl-8 text-sm text-muted-foreground leading-[1.8]">
                {children}
            </div>
        </motion.section>
    )
}

function SidebarNav({ activeSection }: { activeSection: string }) {
    const navRef = useRef<HTMLDivElement>(null)
    const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0 })

    useEffect(() => {
        if (!navRef.current) return
        const activeEl = navRef.current.querySelector(`[data-section="${activeSection}"]`) as HTMLElement | null
        if (activeEl) {
            setIndicatorStyle({
                top: activeEl.offsetTop,
                height: activeEl.offsetHeight,
            })
        }
    }, [activeSection])

    return (
        <div className="sticky top-24">
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-muted-foreground/60 mb-4">On this page</p>
            <nav ref={navRef} className="relative">
                {/* Animated indicator line */}
                <div className="absolute left-0 top-0 w-px h-full bg-border/30 rounded-full" />
                <motion.div
                    className="absolute left-0 w-px bg-foreground rounded-full"
                    animate={{
                        top: indicatorStyle.top,
                        height: indicatorStyle.height,
                    }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />

                <div className="space-y-0.5 pl-4">
                    {sections.map((section) => {
                        const isActive = activeSection === section.id
                        return (
                            <a
                                key={section.id}
                                href={`#${section.id}`}
                                data-section={section.id}
                                onClick={(e) => {
                                    e.preventDefault()
                                    document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })
                                }}
                                className={`relative block text-xs py-1.5 transition-all duration-300 ${
                                    isActive
                                        ? 'text-foreground font-medium'
                                        : 'text-muted-foreground/50 hover:text-muted-foreground'
                                }`}
                            >
                                <AnimatePresence>
                                    {isActive && (
                                        <motion.span
                                            layoutId="terms-active-bg"
                                            className="absolute inset-0 -left-4 rounded-r-md bg-muted/40"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                        />
                                    )}
                                </AnimatePresence>
                                <span className="relative">{section.label}</span>
                            </a>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
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
            <section className="relative py-20 md:py-28 px-6">
                <div className="max-w-3xl mx-auto">
                    <motion.span
                        variants={fadeIn}
                        initial="hidden"
                        animate="visible"
                        custom={0}
                        className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground/80"
                    >
                        Legal
                    </motion.span>
                    <div className="mt-4 space-y-2">
                        <RevealText delay={0.1}>
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[0.95]">
                                Terms & Conditions
                            </h1>
                        </RevealText>
                    </div>
                    <motion.p
                        variants={fadeIn}
                        initial="hidden"
                        animate="visible"
                        custom={0.4}
                        className="mt-4 text-sm text-muted-foreground"
                    >
                        Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </motion.p>
                </div>
            </section>

            {/* Content */}
            <main className="relative px-6 pb-32">
                <div className="max-w-6xl mx-auto flex gap-16">
                    {/* Sidebar TOC */}
                    <motion.aside
                        variants={fadeIn}
                        initial="hidden"
                        animate="visible"
                        custom={0.3}
                        className="hidden lg:block w-56 shrink-0"
                    >
                        <SidebarNav activeSection={activeSection} />
                    </motion.aside>

                    {/* Main content */}
                    <motion.div
                        variants={fadeIn}
                        initial="hidden"
                        animate="visible"
                        custom={0.2}
                        className="flex-1 min-w-0 max-w-3xl"
                    >
                        <ContentSection id="acceptance" number="1" title="Acceptance of Terms">
                            <p>
                                By accessing and using Buildify (&quot;the Service&quot;), you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our Service.
                            </p>
                        </ContentSection>

                        <ContentSection id="description" number="2" title="Description of Service">
                            <p>
                                Buildify is an AI-powered application builder that enables users to generate, iterate, and deploy applications through a conversational interface. The Service includes features such as code generation, community builds, and credit-based usage.
                            </p>
                        </ContentSection>

                        <ContentSection id="accounts" number="3" title="User Accounts">
                            <p>
                                To access certain features, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate information and notify us immediately of any unauthorized use.
                            </p>
                        </ContentSection>

                        <ContentSection id="credits" number="4" title="Credits and Subscriptions">
                            <p className="mb-4">
                                Buildify operates on a credit-based system with two types of credits:
                            </p>
                            <div className="grid sm:grid-cols-2 gap-3 mb-4">
                                <div className="rounded-xl border border-border/50 p-4">
                                    <p className="font-medium text-foreground text-xs mb-1">Subscription Credits</p>
                                    <p className="text-xs text-muted-foreground">Allocated per billing cycle. Expire at the end of each cycle.</p>
                                </div>
                                <div className="rounded-xl border border-border/50 p-4">
                                    <p className="font-medium text-foreground text-xs mb-1">Additional Credits</p>
                                    <p className="text-xs text-muted-foreground">Purchased separately. Never expire.</p>
                                </div>
                            </div>
                            <p>
                                Usage costs vary by action type. All purchases are subject to our refund policy.
                            </p>
                        </ContentSection>

                        <ContentSection id="acceptable-use" number="5" title="Acceptable Use">
                            <p className="mb-4">You agree not to:</p>
                            <ul className="space-y-2.5">
                                {[
                                    'Use the Service for any unlawful purpose or in violation of any applicable laws',
                                    'Attempt to reverse engineer, decompile, or extract the underlying AI models',
                                    'Use automated tools to scrape or collect data from the Service',
                                    'Share your account credentials or allow unauthorized access',
                                    'Generate content that is harmful, abusive, or violates third-party rights',
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <span className="mt-2 size-1 rounded-full bg-muted-foreground/40 shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </ContentSection>

                        <ContentSection id="intellectual-property" number="6" title="Intellectual Property">
                            <div className="rounded-xl border border-border/50 bg-muted/20 p-4 mb-4">
                                <p className="text-xs font-medium text-foreground mb-1">You own your code</p>
                                <p className="text-xs text-muted-foreground">Code generated through Buildify is provided for your use. You retain ownership of the applications you build.</p>
                            </div>
                            <p>
                                However, the Buildify platform, its design, AI models, and underlying technology remain the intellectual property of Buildify.
                            </p>
                        </ContentSection>

                        <ContentSection id="rate-limits" number="7" title="Rate Limits">
                            <p className="mb-4">
                                To ensure fair usage, the Service enforces rate limits:
                            </p>
                            <div className="grid sm:grid-cols-2 gap-3 mb-4">
                                <div className="rounded-xl border border-border/50 p-4">
                                    <p className="text-2xl font-bold text-foreground">50</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Messages per day (authenticated)</p>
                                </div>
                                <div className="rounded-xl border border-border/50 p-4">
                                    <p className="text-2xl font-bold text-foreground">3</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Messages per day (anonymous)</p>
                                </div>
                            </div>
                            <p>These limits may be adjusted at our discretion.</p>
                        </ContentSection>

                        <ContentSection id="liability" number="8" title="Limitation of Liability">
                            <p>
                                Buildify is provided &quot;as is&quot; without warranties of any kind. We are not liable for any damages arising from your use of the Service, including but not limited to loss of data, profits, or business opportunities. The generated code is provided as a starting point and should be reviewed before production use.
                            </p>
                        </ContentSection>

                        <ContentSection id="termination" number="9" title="Termination">
                            <p>
                                We reserve the right to suspend or terminate your account at any time for violation of these terms or for any other reason at our sole discretion. Upon termination, your right to use the Service ceases immediately.
                            </p>
                        </ContentSection>

                        <ContentSection id="changes" number="10" title="Changes to Terms">
                            <p>
                                We may update these terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated terms. We will notify users of significant changes via email or through the Service.
                            </p>
                        </ContentSection>

                        {/* Divider */}
                        <div className="my-16 border-t border-border/40" />

                        <ContentSection id="privacy" number="11" title="Privacy Policy">
                            <p className="mb-6">
                                Your privacy is important to us. This section outlines how we handle your data.
                            </p>

                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground mb-3">Information We Collect</h3>
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        {[
                                            { title: 'Account Info', desc: 'Email address, name, and authentication data' },
                                            { title: 'Usage Data', desc: 'Chat messages, generated code, and interaction patterns' },
                                            { title: 'Payment Info', desc: 'Processed securely through Razorpay; we do not store card details' },
                                            { title: 'Technical Data', desc: 'IP address, browser type, and device information' },
                                        ].map((item) => (
                                            <div key={item.title} className="rounded-xl border border-border/50 p-4">
                                                <p className="font-medium text-foreground text-xs mb-1">{item.title}</p>
                                                <p className="text-xs text-muted-foreground">{item.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-foreground mb-3">How We Use Your Data</h3>
                                    <ul className="space-y-2.5">
                                        {[
                                            'To provide and improve the Service',
                                            'To process payments and manage subscriptions',
                                            'To enforce rate limits and prevent abuse',
                                            'To communicate important updates about the Service',
                                        ].map((item, i) => (
                                            <li key={i} className="flex items-start gap-3">
                                                <span className="mt-2 size-1 rounded-full bg-muted-foreground/40 shrink-0" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-foreground mb-3">Data Security</h3>
                                    <p>
                                        We implement industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
                                    </p>
                                </div>
                            </div>
                        </ContentSection>

                        <ContentSection id="contact" number="12" title="Contact">
                            <p>
                                If you have questions about these Terms and Conditions, please contact us through the Service or reach out to our support team.
                            </p>
                        </ContentSection>
                    </motion.div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
