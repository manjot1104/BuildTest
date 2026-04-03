"use client"

import { useMemo } from "react"
import { LayoutGrid } from "lucide-react"
import { plainResumeTextToResumeData } from "@/lib/text-layout/plain-text-to-resume-data"
import {
  computeResumeLayoutStats,
  TEXT_LAYOUT_CLIENT_OPTIONS,
} from "@/lib/text-layout/layout-stats"
import { cn } from "@/lib/utils"

type ScoreLayoutInsightsProps = {
  pastedText: string
  className?: string
}

/**
 * A4 layout estimate for pasted resume text (Pretext-style prepare + layout).
 */
export function ScoreLayoutInsights({ pastedText, className }: ScoreLayoutInsightsProps) {
  const snapshot = pastedText.trim()
  const stats = useMemo(() => {
    if (snapshot.length < 50) {
      return null
    }
    const data = plainResumeTextToResumeData(snapshot)
    return computeResumeLayoutStats(data, TEXT_LAYOUT_CLIENT_OPTIONS)
  }, [snapshot])

  if (!stats || stats.lineCount === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-border/60 bg-muted/10 px-3 py-2.5 text-[11px] text-muted-foreground",
          className,
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          <LayoutGrid className="size-3.5 shrink-0 opacity-70" />
          Paste at least ~50 characters to see an A4 page estimate (text-layout engine).
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-xs sm:px-4",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
        <LayoutGrid className="size-3.5 shrink-0 text-primary" />
        Pasted text · A4 estimate
      </span>
      <span className="text-muted-foreground">
        <span className="font-medium text-foreground">{stats.pageCount}</span> page
        {stats.pageCount !== 1 ? "s" : ""}
        <span className="mx-1.5 text-border">·</span>
        <span className="font-medium text-foreground">{stats.lineCount}</span> lines
      </span>
      {stats.exceedsTwoPages && (
        <span className="text-amber-600 dark:text-amber-400">Long for a typical resume.</span>
      )}
    </div>
  )
}
