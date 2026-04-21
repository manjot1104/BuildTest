"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { FileText, Code, ArrowRight, FileCode, Target, LayoutTemplate, Loader2, Mail } from "lucide-react"

interface Props {
  onSelect: (templateType: "latex" | "html") => void
  onScoreResume?: () => void
  /** Buildify Studio portfolio path — skips resume template browser. */
  onPortfolio?: () => void
  onCoverLetter?: () => void
}

export function TemplateSelection({ onSelect, onScoreResume, onPortfolio, onCoverLetter }: Props) {
  const [pendingCard, setPendingCard] = useState<"latex" | "html" | "portfolio" | "score" | "cover-letter" | null>(null)

  const runWithTransition = (card: "latex" | "html" | "portfolio" | "score" | "cover-letter", cb: () => void) => {
    if (pendingCard) return
    setPendingCard(card)
    window.setTimeout(() => {
      cb()
    }, 180)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex flex-col items-center"
      >
        <div className="mb-3 flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <FileCode className="size-3.5" />
          Choose your format
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Select Resume Format
        </h1>
        <p className="mt-3 mb-10 max-w-xl text-center text-muted-foreground">
          Choose LaTeX or HTML for a traditional resume PDF, open <span className="font-medium text-foreground">Portfolio</span> to send your details into Buildify Studio, or score an existing resume. The builder uses an internal A4 text-layout estimate for resume outputs.
        </p>
      </motion.div>

      <div className="grid w-full max-w-6xl gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {/* LaTeX Card */}
        <motion.button
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => runWithTransition("latex", () => onSelect("latex"))}
          disabled={pendingCard !== null}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-card p-px text-left transition-colors hover:border-primary/50"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative flex flex-col gap-5 p-7">
            <div className="flex items-center justify-between">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <FileText className="size-5 text-primary" />
              </div>
              {pendingCard === "latex" ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : (
                <ArrowRight className="size-4 -translate-x-1 text-muted-foreground/0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-primary" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">LaTeX → PDF</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Professional typography, ATS-friendly format with traditional academic and professional styling. Templates coming soon.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Professional", "ATS-Friendly", "Academic"].map((tag) => (
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

        {/* HTML Card */}
        <motion.button
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => runWithTransition("html", () => onSelect("html"))}
          disabled={pendingCard !== null}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-card p-px text-left transition-colors hover:border-violet-500/50"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative flex flex-col gap-5 p-7">
            <div className="flex items-center justify-between">
              <div className="flex size-12 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
                <Code className="size-5 text-violet-500" />
              </div>
              {pendingCard === "html" ? (
                <Loader2 className="size-4 animate-spin text-violet-500" />
              ) : (
                <ArrowRight className="size-4 -translate-x-1 text-muted-foreground/0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-violet-500" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">HTML → PDF</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Modern design with flexible styling, customizable layouts, and contemporary visual appeal. Includes multiple templates.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Modern", "Customizable", "Flexible"].map((tag) => (
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

        {/* Portfolio → Buildify Studio */}
        <motion.button
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => runWithTransition("portfolio", () => onPortfolio?.())}
          disabled={pendingCard !== null}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-card p-px text-left transition-colors hover:border-amber-500/50"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative flex flex-col gap-5 p-7">
            <div className="flex items-center justify-between">
              <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
                <LayoutTemplate className="size-5 text-amber-500" />
              </div>
              {pendingCard === "portfolio" ? (
                <Loader2 className="size-4 animate-spin text-amber-500" />
              ) : (
                <ArrowRight className="size-4 -translate-x-1 text-muted-foreground/0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-amber-500" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Portfolio</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Fill your resume details, then open studio-ready portfolio layouts in Buildify Studio with your content.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Buildify Studio", "Layouts", "Your details"].map((tag) => (
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

        {/* Score Resume Card */}
        <motion.button
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => runWithTransition("score", () => onScoreResume?.())}
          disabled={pendingCard !== null}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-card p-px text-left transition-colors hover:border-emerald-500/50"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative flex flex-col gap-5 p-7">
            <div className="flex items-center justify-between">
              <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                <Target className="size-5 text-emerald-500" />
              </div>
              {pendingCard === "score" ? (
                <Loader2 className="size-4 animate-spin text-emerald-500" />
              ) : (
                <ArrowRight className="size-4 -translate-x-1 text-muted-foreground/0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-emerald-500" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Score Resume</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                AI-powered FAANG-level review. Get a detailed score, actionable feedback, and improvement suggestions.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["AI Scoring", "ATS Check", "FAANG Review"].map((tag) => (
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

        {/* Cover Letter Card */}
        <motion.button
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => runWithTransition("cover-letter", () => onCoverLetter?.())}
          disabled={pendingCard !== null}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-card p-px text-left transition-colors hover:border-cyan-500/50"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative flex flex-col gap-5 p-7">
            <div className="flex items-center justify-between">
              <div className="flex size-12 items-center justify-center rounded-xl bg-cyan-500/10 ring-1 ring-cyan-500/20">
                <Mail className="size-5 text-cyan-500" />
              </div>
              {pendingCard === "cover-letter" ? (
                <Loader2 className="size-4 animate-spin text-cyan-500" />
              ) : (
                <ArrowRight className="size-4 -translate-x-1 text-muted-foreground/0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-cyan-500" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Cover Letter</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Instantly create a tailored cover letter aligned with your resume tone and job keywords.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Tailored Tone", "Keyword Focus", "Ready to Send"].map((tag) => (
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
