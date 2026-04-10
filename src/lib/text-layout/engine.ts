import type {
  LayoutElement,
  LayoutPage,
  ResumeData,
  ResumeLayoutOptions,
  ResumeLayoutResult,
  ResumeProjectEntry,
  TypographyStyle,
} from "./types"
import { mmToPx, RESUME_A4_MM, resumeLayoutInsetPx } from "./constants"
import { layoutParagraph, type TextLine } from "./layout"
import { clearPrepareCaches, prepareText } from "./prepare"
import {
  RESUME_LAYOUT_FONT_STACK,
  RESUME_LAYOUT_SPACE_PX as space,
  RESUME_LAYOUT_TYPOGRAPHY,
} from "./resume-layout-tokens"

type ResumeTextStyles = {
  name: TypographyStyle
  contact: TypographyStyle
  sectionTitle: TypographyStyle
  body: TypographyStyle
  bodyStrong: TypographyStyle
  meta: TypographyStyle
  bullet: TypographyStyle
}

function buildStyles(fontFamily: string): ResumeTextStyles {
  const t = RESUME_LAYOUT_TYPOGRAPHY
  return {
    name: { ...t.name, fontFamily },
    contact: { ...t.contact, fontFamily },
    sectionTitle: { ...t.sectionTitle, fontFamily },
    body: { ...t.body, fontFamily },
    bodyStrong: { ...t.bodyStrong, fontFamily },
    meta: { ...t.meta, fontFamily },
    bullet: { ...t.bullet, fontFamily },
  }
}

function hasText(s: string | undefined): boolean {
  return typeof s === "string" && s.trim().length > 0
}

function experienceHasContent(e: NonNullable<ResumeData["experience"]>[number]): boolean {
  return (
    hasText(e.title) ||
    hasText(e.company) ||
    hasText(e.location) ||
    hasText(e.dates) ||
    (e.bullets?.some(hasText) ?? false)
  )
}

function educationHasContent(e: NonNullable<ResumeData["education"]>[number]): boolean {
  return hasText(e.institution) || hasText(e.degree) || hasText(e.dates) || hasText(e.details)
}

function projectHasContent(p: ResumeProjectEntry): boolean {
  return hasText(p.name) || hasText(p.tech) || (p.bullets?.some(hasText) ?? false)
}

type FlowState = {
  pages: LayoutPage[]
  y: number
  marginPx: number
  contentBottom: number
  contentWidth: number
  forceApprox: boolean
  locale: string | undefined
}

function newFlowState(
  marginPx: number,
  pageHeightPx: number,
  contentWidth: number,
  forceApprox: boolean,
  locale: string | undefined,
): FlowState {
  return {
    pages: [{ elements: [] }],
    y: marginPx,
    marginPx,
    contentBottom: pageHeightPx - marginPx,
    contentWidth,
    forceApprox,
    locale,
  }
}

function ensureVerticalRoom(st: FlowState, height: number, pageHeightPx: number): void {
  if (st.y + height <= st.contentBottom + 1e-6) return
  st.pages.push({ elements: [] })
  st.y = st.marginPx
  st.contentBottom = pageHeightPx - st.marginPx
}

function pushGap(st: FlowState, gap: number, pageHeightPx: number): void {
  if (gap <= 0) return
  ensureVerticalRoom(st, gap, pageHeightPx)
  st.y += gap
}

function pushLine(st: FlowState, line: TextLine, pageHeightPx: number): void {
  ensureVerticalRoom(st, line.lineHeightPx, pageHeightPx)
  const el: LayoutElement = {
    text: line.text,
    x: st.marginPx,
    y: st.y,
    width: line.width,
    height: line.lineHeightPx,
    fontSize: line.fontSize,
    fontWeight: line.fontWeight,
  }
  const page = st.pages[st.pages.length - 1]!
  page.elements.push(el)
  st.y += line.lineHeightPx
}

function pushParagraph(st: FlowState, text: string, style: TypographyStyle, pageHeightPx: number): void {
  const prepared = prepareText(text, style, {
    forceApproximateMetrics: st.forceApprox,
    locale: st.locale,
  })
  const lines = layoutParagraph(prepared, st.contentWidth, st.forceApprox)
  for (const ln of lines) {
    pushLine(st, ln, pageHeightPx)
  }
}

/**
 * Builds paginated, positioned elements from resume content using the two-phase text pipeline.
 */
function shouldLogLayout(options?: ResumeLayoutOptions): boolean {
  if (options?.debugLayout === true) return true
  if (typeof process !== "undefined" && process.env?.DEBUG_RESUME_LAYOUT === "1") {
    return true
  }
  return false
}

export function generateResumeLayout(
  resumeData: ResumeData,
  options?: ResumeLayoutOptions,
): ResumeLayoutResult {
  const fontFamily = options?.fontFamily ?? RESUME_LAYOUT_FONT_STACK
  const forceApprox = options?.forceApproximateMetrics === true
  const locale = options?.locale

  const insetPx = resumeLayoutInsetPx(options?.marginMm)
  const pageWidthPx = mmToPx(RESUME_A4_MM.width)
  const pageHeightPx = mmToPx(RESUME_A4_MM.height)
  const contentWidth = pageWidthPx - 2 * insetPx
  const contentHeightPx = pageHeightPx - 2 * insetPx

  const styles = buildStyles(fontFamily)
  const st = newFlowState(insetPx, pageHeightPx, contentWidth, forceApprox, locale)

  if (hasText(resumeData.header.name)) {
    pushParagraph(st, resumeData.header.name, styles.name, pageHeightPx)
  }
  if (hasText(resumeData.header.contact)) {
    pushGap(st, space.xs, pageHeightPx)
    pushParagraph(st, resumeData.header.contact!, styles.contact, pageHeightPx)
  }

  pushGap(st, space.lg, pageHeightPx)

  const summaryText = resumeData.summary?.trim()
  if (summaryText) {
    pushParagraph(st, "SUMMARY", styles.sectionTitle, pageHeightPx)
    pushGap(st, space.sm, pageHeightPx)
    pushParagraph(st, summaryText, styles.body, pageHeightPx)
    pushGap(st, space.md, pageHeightPx)
  }

  const jobs = resumeData.experience?.filter(experienceHasContent) ?? []
  if (jobs.length > 0) {
    pushParagraph(st, "EXPERIENCE", styles.sectionTitle, pageHeightPx)
    pushGap(st, space.sm, pageHeightPx)
    for (let j = 0; j < jobs.length; j++) {
      const job = jobs[j]!
      const titleCompany = [job.title, job.company].filter(hasText).join(" — ")
      if (titleCompany) {
        pushParagraph(st, titleCompany, styles.bodyStrong, pageHeightPx)
      }
      const metaParts = [job.dates, job.location].filter(hasText)
      if (metaParts.length > 0) {
        pushGap(st, space.xs, pageHeightPx)
        pushParagraph(st, metaParts.join(" · "), styles.meta, pageHeightPx)
      }
      const bullets = job.bullets?.filter(hasText) ?? []
      for (const b of bullets) {
        pushGap(st, space.xs, pageHeightPx)
        pushParagraph(st, `• ${b}`, styles.bullet, pageHeightPx)
      }
      if (j < jobs.length - 1) {
        pushGap(st, space.md, pageHeightPx)
      }
    }
    pushGap(st, space.md, pageHeightPx)
  }

  const schools = resumeData.education?.filter(educationHasContent) ?? []
  if (schools.length > 0) {
    pushParagraph(st, "EDUCATION", styles.sectionTitle, pageHeightPx)
    pushGap(st, space.sm, pageHeightPx)
    for (let s = 0; s < schools.length; s++) {
      const ed = schools[s]!
      if (hasText(ed.institution)) {
        pushParagraph(st, ed.institution, styles.bodyStrong, pageHeightPx)
      }
      const line2 = [ed.degree, ed.dates].filter(hasText).join(" · ")
      if (line2) {
        pushGap(st, space.xs, pageHeightPx)
        pushParagraph(st, line2, styles.meta, pageHeightPx)
      }
      if (hasText(ed.details)) {
        pushGap(st, space.xs, pageHeightPx)
        pushParagraph(st, ed.details!, styles.body, pageHeightPx)
      }
      if (s < schools.length - 1) {
        pushGap(st, space.sm, pageHeightPx)
      }
    }
    pushGap(st, space.md, pageHeightPx)
  }

  const skillItems = resumeData.skills?.map((s) => s.trim()).filter((s) => s.length > 0) ?? []
  if (skillItems.length > 0) {
    pushParagraph(st, "SKILLS", styles.sectionTitle, pageHeightPx)
    pushGap(st, space.sm, pageHeightPx)
    pushParagraph(st, skillItems.join(", "), styles.body, pageHeightPx)
    pushGap(st, space.md, pageHeightPx)
  }

  const projectList = resumeData.projects?.filter(projectHasContent) ?? []
  if (projectList.length > 0) {
    pushParagraph(st, "PROJECTS", styles.sectionTitle, pageHeightPx)
    pushGap(st, space.sm, pageHeightPx)
    for (let pi = 0; pi < projectList.length; pi++) {
      const proj = projectList[pi]!
      const titleLine = [proj.name, proj.tech].filter(hasText).join(" — ")
      if (titleLine) {
        pushParagraph(st, titleLine, styles.bodyStrong, pageHeightPx)
      }
      const projBullets = proj.bullets?.filter(hasText) ?? []
      for (const b of projBullets) {
        pushGap(st, space.xs, pageHeightPx)
        pushParagraph(st, `• ${b}`, styles.bullet, pageHeightPx)
      }
      if (pi < projectList.length - 1) {
        pushGap(st, space.md, pageHeightPx)
      }
    }
    pushGap(st, space.md, pageHeightPx)
  }

  const certs = resumeData.certifications?.map((c) => c.trim()).filter((c) => c.length > 0) ?? []
  if (certs.length > 0) {
    pushParagraph(st, "CERTIFICATIONS", styles.sectionTitle, pageHeightPx)
    pushGap(st, space.sm, pageHeightPx)
    for (const c of certs) {
      pushParagraph(st, `• ${c}`, styles.bullet, pageHeightPx)
      pushGap(st, space.xs, pageHeightPx)
    }
    pushGap(st, space.md, pageHeightPx)
  }

  const ach = resumeData.achievements?.map((a) => a.trim()).filter((a) => a.length > 0) ?? []
  if (ach.length > 0) {
    pushParagraph(st, "ACHIEVEMENTS", styles.sectionTitle, pageHeightPx)
    pushGap(st, space.sm, pageHeightPx)
    for (const a of ach) {
      pushParagraph(st, `• ${a}`, styles.bullet, pageHeightPx)
      pushGap(st, space.xs, pageHeightPx)
    }
    pushGap(st, space.md, pageHeightPx)
  }

  if (hasText(resumeData.languagesLine)) {
    pushParagraph(st, "LANGUAGES", styles.sectionTitle, pageHeightPx)
    pushGap(st, space.sm, pageHeightPx)
    pushParagraph(st, resumeData.languagesLine!, styles.body, pageHeightPx)
  }

  if (shouldLogLayout(options)) {
    const lineCount = st.pages.reduce((n, p) => n + p.elements.length, 0)
    const lastPage = st.pages[st.pages.length - 1]
    const lastEl = lastPage?.elements[lastPage.elements.length - 1]
    const bottomExtent = lastEl ? lastEl.y + lastEl.height : st.y
    console.info(
      "[resume-layout]",
      JSON.stringify({
        pageCount: st.pages.length,
        lineCount,
        contentWidthPx: Math.round(contentWidth),
        contentHeightPx: Math.round(contentHeightPx),
        usedHeightPx: Math.round(bottomExtent),
        insetPx: Math.round(insetPx),
        forceApproximateMetrics: forceApprox,
        fontFamily,
      }),
    )
  }

  return { pages: st.pages }
}

/** Clears segment and prepared-block caches (e.g. after font/theme changes in long-lived sessions). */
export function clearResumeTextLayoutCaches(): void {
  clearPrepareCaches()
}
