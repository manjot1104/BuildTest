"use client"

import { LayoutGrid, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export type ParsedResumeLayoutEstimate = {
  pageCount: number
  lineCount: number
  exceedsTwoPages: boolean
}

type ParsedResumeLayoutStripProps = {
  estimate: ParsedResumeLayoutEstimate
  className?: string
}

/**
 * Compact A4 estimate from the server (raw uploaded resume text), shown after parse on the form step.
 */
export function ParsedResumeLayoutStrip({ estimate, className }: ParsedResumeLayoutStripProps) {
  if (!estimate.lineCount) return null

  return (
    <div
      className={cn(
        "mt-3 overflow-hidden rounded-xl border border-border/60 bg-card",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/30 px-3 py-2 sm:px-3.5">
        <LayoutGrid className="size-3.5 shrink-0 text-primary" />
        <span className="text-xs font-medium">Upload text layout (A4)</span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          approx.
        </span>
      </div>
      <div className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-3.5">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">~{estimate.pageCount}</span> page
          {estimate.pageCount !== 1 ? "s" : ""}
          <span className="mx-1.5 text-border">·</span>
          <span className="font-medium text-foreground">{estimate.lineCount}</span> laid-out lines
          <span className="ml-1.5 text-[10px]">(from extracted file text)</span>
        </p>
        {estimate.exceedsTwoPages && (
          <div className="flex items-start gap-1.5 rounded-md border border-amber-500/25 bg-amber-500/5 px-2 py-1.5 text-[11px] text-amber-800 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-3 shrink-0" />
            <span>Long vs a typical 1–2 page resume — you may want to tighten before generating.</span>
          </div>
        )}
      </div>
    </div>
  )
}
