"use client"

import { useMemo } from "react"
import { generateResumeLayout } from "@/lib/text-layout/engine"
import { RESUME_A4_PX } from "@/lib/text-layout/constants"
import { TEXT_LAYOUT_CLIENT_OPTIONS } from "@/lib/text-layout/layout-stats"
import { resumeFormToResumeData, type ResumeFormLike } from "@/lib/text-layout/form-to-resume-data"
import type { ResumeData } from "@/lib/text-layout/types"
import { cn } from "@/lib/utils"

const DEFAULT_FONT = "Inter, ui-sans-serif, system-ui, sans-serif"

export type ResumeLayoutPreviewProps = {
  /** AI builder form fields → structured data internally */
  formValues?: ResumeFormLike
  /** Pre-built structured resume (e.g. template dummy data) */
  resumeData?: ResumeData
  className?: string
  /** Visual scale of the paper (default tuned for dashboard). */
  scale?: number
  emptyHint?: string
  /** Lighter chrome for dark modals */
  variant?: "card" | "minimal"
}

/**
 * Renders {@link generateResumeLayout} (prepare + layout) as scaled A4 pages.
 */
export function ResumeLayoutPreview({
  formValues,
  resumeData,
  className,
  scale = 0.42,
  emptyHint = "Nothing to lay out yet. Add content to see pages.",
  variant = "card",
}: ResumeLayoutPreviewProps) {
  const cacheKey = resumeData
    ? `r:${JSON.stringify(resumeData)}`
    : `f:${JSON.stringify(formValues ?? {})}`

  const layout = useMemo(() => {
    const data =
      resumeData ??
      resumeFormToResumeData(formValues ?? { fullName: "", email: "", phone: "" })
    return generateResumeLayout(data, TEXT_LAYOUT_CLIENT_OPTIONS)
  }, [cacheKey])

  const isEmpty = layout.pages.every((p) => p.elements.length === 0)

  const shell =
    variant === "minimal"
      ? "flex max-h-[min(75vh,800px)] justify-center overflow-auto p-2"
      : "flex max-h-[min(70vh,720px)] justify-center overflow-auto rounded-lg border border-border/60 bg-muted/20 p-4"

  if (isEmpty) {
    return (
      <div
        className={cn(
          "flex min-h-[240px] items-center justify-center rounded-lg border p-8 text-sm",
          variant === "minimal"
            ? "border-white/10 bg-white/5 text-zinc-400"
            : "border-border/60 bg-muted/20 text-muted-foreground",
          className,
        )}
      >
        <p className="max-w-sm text-center">{emptyHint}</p>
      </div>
    )
  }

  return (
    <div className={cn(shell, className)}>
      <div
        className="flex flex-col items-center gap-6 pb-4"
        style={{
          width: RESUME_A4_PX.width * scale + 32,
        }}
      >
        {layout.pages.map((page, pageIndex) => (
          <div
            key={pageIndex}
            className="shrink-0 rounded-md bg-white text-neutral-900 shadow-md ring-1 ring-black/5 dark:bg-neutral-100 dark:text-neutral-900"
            style={{
              width: RESUME_A4_PX.width * scale,
              height: RESUME_A4_PX.height * scale,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: RESUME_A4_PX.width,
                height: RESUME_A4_PX.height,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                position: "relative",
              }}
            >
              {page.elements.map((el, i) => (
                <div
                  key={i}
                  className="absolute overflow-hidden text-left leading-none"
                  style={{
                    left: el.x,
                    top: el.y,
                    width: el.width,
                    height: el.height,
                    fontSize: el.fontSize,
                    fontWeight: el.fontWeight,
                    lineHeight: `${el.height}px`,
                    whiteSpace: "pre",
                  }}
                >
                  {el.text}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
