"use client"

import Link from "next/link"
import { motion, type Variants } from "framer-motion"
import { ArrowRight, Zap, BookOpen, MessageSquare, CreditCard } from "lucide-react"

const fadeIn: Variants = {
    hidden: { opacity: 0, y: 8 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
    }),
}

const docLinks = [
    {
        title: "Get Started",
        description: "Create your first project and start building with AI in minutes.",
        href: "/docs/get-started",
        icon: Zap,
    },
    {
        title: "Tutorials",
        description: "Step-by-step guides for common use cases and advanced features.",
        href: "/docs/tutorials",
        icon: BookOpen,
    },
    {
        title: "Changelog",
        description: "Latest updates, fixes, and improvements to Buildify.",
        href: "/docs/changelog",
        icon: MessageSquare,
    },
    {
        title: "Credit System",
        description: "New chat costs 20 credits, follow-ups cost 30. Subscription credits reset monthly.",
        href: "/docs/get-started",
        icon: CreditCard,
    },
]

export default function DocsPage() {
    return (
        <div className="max-w-2xl">
            <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                custom={0}
            >
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/60 font-medium">
                    Documentation
                </p>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-3 leading-tight">
                    Build apps with
                    <br />
                    <span className="text-muted-foreground">conversational AI</span>
                </h1>
                <p className="text-sm text-muted-foreground/80 mt-4 leading-relaxed max-w-lg">
                    Buildify lets you create and iterate on web applications through a chat interface.
                    Describe what you want, and Buildify generates working code — from UI components to full pages.
                </p>
            </motion.div>

            <div className="border-t border-border/40 mt-10 pt-8">
                <div className="grid gap-1">
                    {docLinks.map((item, i) => {
                        const Icon = item.icon
                        return (
                            <motion.div
                                key={item.title}
                                initial="hidden"
                                animate="visible"
                                variants={fadeIn}
                                custom={i + 1}
                            >
                                <Link
                                    href={item.href}
                                    className="group flex items-center gap-4 rounded-xl px-4 py-3.5 -mx-4 hover:bg-muted/40 transition-colors"
                                >
                                    <div className="size-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 group-hover:bg-muted transition-colors">
                                        <Icon className="size-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">{item.title}</p>
                                        <p className="text-xs text-muted-foreground/70 mt-0.5 leading-relaxed">
                                            {item.description}
                                        </p>
                                    </div>
                                    <ArrowRight className="size-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all shrink-0" />
                                </Link>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
