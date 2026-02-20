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

const steps = [
    {
        number: "01",
        title: "Subscribe to a plan",
        body: 'To start building, you need an active subscription. Click the "Buy Pro" button in the sidebar to choose a plan. Each plan includes monthly credits that reset with your billing cycle.',
    },
    {
        number: "02",
        title: "Start a new chat",
        body: 'Click "New Chat" in the sidebar to open the chat interface. Describe what you want to build — be as specific or general as you like. Buildify will generate a working application based on your description.',
    },
    {
        number: "03",
        title: "Iterate with follow-ups",
        body: "After the initial generation, send follow-up messages to refine your app. You can ask Buildify to change layouts, add features, fix issues, or adjust styling.",
    },
    {
        number: "04",
        title: "Manage your credits",
        body: "Subscription credits reset each billing cycle. You can purchase additional credit packs that never expire — even after your subscription ends.",
    },
]

const creditCosts = [
    { label: "New chat", value: "20 credits" },
    { label: "Follow-up message", value: "30 credits" },
    { label: "Daily rate limit", value: "50 messages" },
]

const tips = [
    'Be specific about your tech preferences (e.g., "use Tailwind CSS")',
    "Describe the user experience, not just features",
    "Break complex apps into smaller iterations",
    "Use follow-ups to refine rather than starting over",
]

export default function GetStartedPage() {
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
                    Guide
                </p>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-3 leading-tight">
                    Get Started
                </h1>
                <p className="text-sm text-muted-foreground/80 mt-3 leading-relaxed">
                    Start building your first app with Buildify in minutes.
                </p>
            </motion.div>

            <div className="border-t border-border/40 mt-8 pt-8 space-y-8">
                {steps.map((step, i) => (
                    <motion.div
                        key={step.number}
                        initial="hidden"
                        animate="visible"
                        variants={fadeIn}
                        custom={i + 1}
                        className="flex gap-5"
                    >
                        <span className="text-[11px] font-medium text-muted-foreground/40 tabular-nums pt-0.5 shrink-0">
                            {step.number}
                        </span>
                        <div>
                            <h2 className="text-sm font-medium">{step.title}</h2>
                            <p className="text-xs text-muted-foreground/70 mt-1.5 leading-relaxed">
                                {step.body}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Credit costs */}
            <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                custom={6}
                className="mt-10 rounded-xl border border-border/50 p-4"
            >
                <p className="text-xs font-medium text-muted-foreground mb-3">Credit Costs</p>
                <div className="space-y-2">
                    {creditCosts.map((item) => (
                        <div key={item.label} className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground/70">{item.label}</span>
                            <span className="text-xs font-medium tabular-nums">{item.value}</span>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Tips */}
            <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                custom={7}
                className="mt-6 rounded-xl border border-border/50 p-4"
            >
                <p className="text-xs font-medium text-muted-foreground mb-3">Tips for better results</p>
                <ul className="space-y-1.5">
                    {tips.map((tip) => (
                        <li key={tip} className="text-xs text-muted-foreground/70 leading-relaxed flex gap-2">
                            <span className="text-muted-foreground/30 shrink-0">—</span>
                            {tip}
                        </li>
                    ))}
                </ul>
            </motion.div>
        </div>
    )
}
