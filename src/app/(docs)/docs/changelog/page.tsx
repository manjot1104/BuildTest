"use client"

import { motion, type Variants } from "framer-motion"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

const fadeIn: Variants = {
    hidden: { opacity: 0, y: 8 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
    }),
}

const changelog = [
    {
        version: "0.3.0",
        date: "February 2026",
        tag: "Latest",
        changes: [
            "Added in-app documentation pages",
            "Implemented full settings dialog with profile, billing, and limits tabs",
            "Custom Buildify layered-panes logo across sidebar and emails",
            "Fixed payment success page crash — no more hard reloads",
            "Added error boundaries to prevent white-screen crashes",
            "Notifications and Account menu items are now functional",
            "Improved webhook reliability with idempotency and fallback lookups",
            "Welcome email sent after email verification",
        ],
    },
    {
        version: "0.2.0",
        date: "January 2026",
        changes: [
            "Multi-currency support for subscription plans",
            "Credit pack purchases for additional credits",
            "Razorpay payment integration",
            "Email OTP login support",
            "Chat history and starred conversations",
        ],
    },
    {
        version: "0.1.0",
        date: "December 2025",
        changes: [
            "Initial release with AI chat-based app generation",
            "Email/password authentication with Better Auth",
            "Subscription-based credit system",
            "Real-time code preview in chat",
        ],
    },
]

export default function ChangelogPage() {
    return (
        <div className="max-w-2xl">
            <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={0}>
                <Link
                    href="/docs"
                    className="text-xs text-muted-foreground/60 hover:text-foreground inline-flex items-center gap-1.5 mb-6 transition-colors"
                >
                    <ArrowLeft className="size-3" />
                    Docs
                </Link>
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/60 font-medium">
                    Updates
                </p>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-3 leading-tight">
                    Changelog
                </h1>
                <p className="text-sm text-muted-foreground/80 mt-3 leading-relaxed">
                    New updates and improvements to Buildify.
                </p>
            </motion.div>

            <div className="border-t border-border/40 mt-8 pt-8">
                <div className="space-y-10">
                    {changelog.map((release, i) => (
                        <motion.div
                            key={release.version}
                            initial="hidden"
                            animate="visible"
                            variants={fadeIn}
                            custom={i + 1}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-sm font-semibold tabular-nums">v{release.version}</span>
                                <span className="text-[11px] text-muted-foreground/60">{release.date}</span>
                                {release.tag && (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-foreground text-background">
                                        {release.tag}
                                    </span>
                                )}
                            </div>
                            <ul className="space-y-1.5 pl-0">
                                {release.changes.map((change, j) => (
                                    <li key={j} className="text-xs text-muted-foreground/70 leading-relaxed flex gap-2">
                                        <span className="text-muted-foreground/30 shrink-0">—</span>
                                        {change}
                                    </li>
                                ))}
                            </ul>
                            {i < changelog.length - 1 && (
                                <div className="border-t border-border/30 mt-8" />
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    )
}
