"use client"

import { useMemo } from "react"
import { LayoutGrid, AlertTriangle, FileStack } from "lucide-react"
import {
  computeResumeLayoutStats,
  TEXT_LAYOUT_CLIENT_OPTIONS,
} from "@/lib/text-layout/layout-stats"
import { resumeFormToResumeData, type ResumeFormLike } from "@/lib/text-layout/form-to-resume-data"
import { cn } from "@/lib/utils"

type ResumeLayoutInsightsProps = {
  formValues: ResumeFormLike
  className?: string
}

/**
 * Live A4 metrics from the same prepare/layout engine used in preview (Pretext-style pipeline).
 */
export function ResumeLayoutInsights({ formValues, className }: ResumeLayoutInsightsProps) {
  const snapshot = JSON.stringify(formValues)
  const stats = useMemo(() => {
    const data = resumeFormToResumeData(JSON.parse(snapshot) as ResumeFormLike)
    return computeResumeLayoutStats(data, TEXT_LAYOUT_CLIENT_OPTIONS)
  }, [snapshot])

  const hasContent = stats.lineCount > 0

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-card",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/30 px-3 py-2.5 sm:px-4">
        <LayoutGrid className="size-4 shrink-0 text-primary" />
        <span className="text-sm font-medium">Text layout (A4)</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          Pretext-style engine
        </span>
      </div>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileStack className="size-4 shrink-0 opacity-80" />
            <span>
              <span className="font-medium text-foreground">{stats.pageCount}</span> page
              {stats.pageCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground">{stats.lineCount}</span> laid-out lines
          </div>
          {hasContent && (
            <span
              className={cn(
                "text-xs font-medium",
                stats.fitsOnePage ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400",
              )}
            >
              {stats.fitsOnePage ? "Fits one page" : "Spills to extra pages"}
            </span>
          )}
        </div>
        {stats.exceedsTwoPages && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>Content is long for a typical resume — consider tightening bullets before PDF.</span>
          </div>
        )}
      </div>
      {!hasContent && (
        <p className="border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground">
          Updates as you type (canvas <code className="rounded bg-muted px-0.5">measureText</code> in the browser).
          Typography and margins match HTML PDF export (10mm + 20px inset); the server uses deterministic width
          heuristics when canvas is unavailable.
        </p>
      )}
    </div>
  )
}
