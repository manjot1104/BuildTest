"use client"

import { motion } from "framer-motion"
import { Bot, Wrench, ArrowRight, Blocks, MessageSquareText } from "lucide-react"

interface Props {
  onSelect: (mode: "BUILDER" | "AI_CHAT") => void
}

export function ModeSelection({ onSelect }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex flex-col items-center"
      >
        <div className="mb-3 flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <Blocks className="size-3.5" />
          Choose your workspace
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          What would you like to build?
        </h1>
        <p className="mt-3 mb-10 max-w-lg text-center text-muted-foreground">
          Pick a mode to get started. You can switch anytime.
        </p>
      </motion.div>

      <div className="grid w-full max-w-3xl gap-4 md:grid-cols-2">
        {/* Builder Card */}
        <motion.button
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect("BUILDER")}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-card p-px text-left transition-colors hover:border-primary/50"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative flex flex-col gap-5 p-7">
            <div className="flex items-center justify-between">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <Wrench className="size-5 text-primary" />
              </div>
              <ArrowRight className="size-4 -translate-x-1 text-muted-foreground/0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Builder</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Generate full apps, UI layouts, dashboards, and landing pages with guided AI generation.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Apps", "Dashboards", "Landing Pages"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </motion.button>

        {/* AI Chat Card */}
        <motion.button
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect("AI_CHAT")}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-card p-px text-left transition-colors hover:border-violet-500/50"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative flex flex-col gap-5 p-7">
            <div className="flex items-center justify-between">
              <div className="flex size-12 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
                <MessageSquareText className="size-5 text-violet-500" />
              </div>
              <ArrowRight className="size-4 -translate-x-1 text-muted-foreground/0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-violet-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">AI Chat</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Ask questions, debug code, brainstorm ideas, and iterate quickly with real-time AI.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Brainstorm", "Debug", "Explain"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </motion.button>
      </div>
    </div>
  )
}