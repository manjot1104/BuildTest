"use client"

import { motion, type Variants } from "framer-motion"
import Link from "next/link"
import { ArrowLeft, Layout, FormInput, ShoppingCart } from "lucide-react"

const fadeIn: Variants = {
    hidden: { opacity: 0, y: 8 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
    }),
}

const tutorials = [
    {
        icon: Layout,
        title: "Building a Landing Page",
       prompt: `
Create a modern SaaS landing page.

Sections:
- Hero section with headline, subtext, CTA button and product screenshot
- Features grid with 3–6 feature cards and icons
- Pricing section with 3 pricing tiers (highlight one plan)
- Testimonials section with user reviews
- Footer with navigation links and social icons

Requirements:
- Responsive layout for mobile and desktop
- Clean modern UI with blue and white color scheme
- Use reusable React components
`,
        tip: "Then iterate with follow-ups to add animations or refine layout.",
    },
    {
        icon: FormInput,
        title: "Creating a Form with Validation",
    prompt: `
Build a multi-step signup form.

Steps:
- Step 1: Email and password input
- Step 2: Personal details (name, profile photo)
- Step 3: Account preferences

Features:
- Email format validation
- Password strength indicator
- Inline error messages
- Next / Previous step navigation
- Progress indicator

UI Requirements:
- Clean centered card layout
- Responsive design
`,
        tip: "Follow up to add specific validations, connect to an API, or style individual fields.",
    },
    {
        icon: ShoppingCart,
        title: "Building a Dashboard",
      prompt: `
Create a professional analytics dashboard.

Layout:
- Left sidebar navigation with icons
- Top header with search and profile menu

Main Content:
- Statistics cards (Users, Revenue, Growth)
- Line chart showing analytics trends
- Bar chart for category performance
- Table displaying recent activity

Requirements:
- Responsive layout
- Clean modern UI
- Card based design
`,
        tip: "Iterate to add interactivity, filtering, date range pickers, or export functionality.",
    },
]

export default function TutorialsPage() {
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
                    Learn
                </p>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-3 leading-tight">
                    Tutorials
                </h1>
                <p className="text-sm text-muted-foreground/80 mt-3 leading-relaxed">
                    Learn how to build common types of applications with Buildify.
                </p>
            </motion.div>

            <div className="border-t border-border/40 mt-8 pt-8 space-y-6">
                {tutorials.map((tutorial, i) => {
                    const Icon = tutorial.icon
                    return (
                        <motion.div
                            key={tutorial.title}
                            initial="hidden"
                            animate="visible"
                            variants={fadeIn}
                            custom={i + 1}
                            className="rounded-xl border border-border/50 p-5"
                        >
                            <div className="flex items-center gap-2.5 mb-3">
                                <div className="size-7 rounded-lg bg-muted/50 flex items-center justify-center">
                                    <Icon className="size-3.5 text-muted-foreground" />
                                </div>
                                <h3 className="text-sm font-medium">{tutorial.title}</h3>
                            </div>
                            <p className="text-[11px] text-muted-foreground/60 mb-2">Example prompt:</p>
                            <div className="rounded-lg bg-muted/40 border border-border/30 px-3.5 py-2.5">
                                <p className="text-xs font-mono text-muted-foreground leading-relaxed">
                                    &quot;{tutorial.prompt}&quot;
                                </p>
                            </div>
                            <p className="text-xs text-muted-foreground/70 mt-3 leading-relaxed">
                                {tutorial.tip}
                            </p>
                        </motion.div>
                    )
                })}
            </div>

            <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                custom={5}
                className="mt-8 rounded-xl border border-border/50 p-4"
            >
                <p className="text-xs font-medium text-muted-foreground">More tutorials coming soon</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1 leading-relaxed">
                    We&apos;re adding more tutorials regularly. Check the changelog for updates.
                </p>
            </motion.div>
        </div>
    )
}
