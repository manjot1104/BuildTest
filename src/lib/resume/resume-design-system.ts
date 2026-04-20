/**
 * Unified resume design system — one typography + spacing layer for every HTML template.
 * Injected as the last <style> in <head> so it harmonizes AI output and template previews.
 *
 * Numeric tokens mirror `src/lib/text-layout/resume-layout-tokens.ts` (Pretext page estimator).
 */

export const RESUME_DS_MARKER = 'data-buildify-resume-ds'

/**
 * CSS variables + overrides for `.resume`, `.page`, and common template class names.
 * Keep layout structure from templates; normalize rhythm, type scale, and flexible columns.
 */
export const RESUME_DESIGN_SYSTEM_CSS = `
/* ── Buildify resume design system (appended last) ─────────────────────── */
:root {
  --rs-name: 26px;
  --rs-section-heading: 15px;
  --rs-subhead: 13.5px;
  --rs-body: 11.5px;
  --rs-section-gap: 14px;
  --rs-heading-to-content: 7px;
  --rs-bullet-gap: 4px;
  --rs-page-pad-y: 20px;
  --rs-page-pad-x: 20px;
  --rs-line: 1.45;
  --rs-col-gap: 14px;
  --rs-ink: #1a1a1a;
  --rs-muted: #555;
}

html {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

body {
  margin: 0;
}

/*
 * Root shell: typography + padding only. Do NOT set display/flex on the .resume root — many
 * templates use CSS display: grid (sidebar + main). Forcing column flex broke two-column
 * layouts and could make sidebar + main stack or reflow oddly.
 */
.resume,
.page,
.rs-root {
  box-sizing: border-box;
  max-width: 794px;
  margin-left: auto;
  margin-right: auto;
  padding: var(--rs-page-pad-y) var(--rs-page-pad-x) !important;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
  font-size: var(--rs-body) !important;
  line-height: var(--rs-line) !important;
  color: var(--rs-ink) !important;
}

.resume *,
.page *,
.rs-root * {
  box-sizing: border-box;
}

/* Drop rigid full-page heights on screen; let PDF print rules on templates still apply */
@media screen {
  .page {
    min-height: 0 !important;
    height: auto !important;
  }
}

.resume,
.page {
  min-height: 0 !important;
}

/* Headers: drop rigid band height; keep template flex direction (row vs column) */
.resume .header,
.page .header,
header.resume-header {
  height: auto !important;
  min-height: 0 !important;
}

/* ── Typography: name ─────────────────────────────────────────────────── */
.resume h1,
.page .name,
.header-left h1,
.rs-name {
  font-size: var(--rs-name) !important;
  font-weight: 700 !important;
  line-height: 1.15 !important;
  margin: 0 0 4px 0 !important;
  color: inherit !important;
}

/* Job title / role under name */
.header-left .title,
.page .role,
.resume .subtitle,
.rs-subtitle {
  font-size: var(--rs-subhead) !important;
  font-weight: 400 !important;
  line-height: var(--rs-line) !important;
  color: var(--rs-muted) !important;
  margin: 0 !important;
}

/* ── Section headings ─────────────────────────────────────────────────── */
.resume h2,
.page .s-title,
.section-title,
.rs-section-title {
  font-size: var(--rs-section-heading) !important;
  font-weight: 700 !important;
  line-height: 1.25 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.08em !important;
  margin: var(--rs-section-gap) 0 var(--rs-heading-to-content) 0 !important;
  color: inherit !important;
}

.resume > h2:first-child,
.page .content > .section:first-child .s-title {
  margin-top: 0 !important;
}

/* ── Subheads: role / project / degree lines ──────────────────────────── */
.entry-title,
.e-role,
.job-title,
.project-title,
.rs-entry-title {
  font-size: var(--rs-subhead) !important;
  font-weight: 600 !important;
  line-height: var(--rs-line) !important;
}

.entry-date,
.e-date,
.rs-entry-date {
  font-size: var(--rs-body) !important;
  color: var(--rs-muted) !important;
}

.entry-sub,
.e-org,
.company-line,
.rs-entry-meta {
  font-size: var(--rs-body) !important;
  color: var(--rs-muted) !important;
  line-height: var(--rs-line) !important;
  margin-top: 2px !important;
}

/* ── Body & lists ───────────────────────────────────────────────────── */
.resume p,
.page p,
.resume li,
.page li,
.skills-text,
.c-item,
.ref-name,
.ref-role,
small,
.rs-body {
  font-size: var(--rs-body) !important;
  line-height: var(--rs-line) !important;
}

.resume ul,
.page ul,
.rs-list {
  margin: var(--rs-heading-to-content) 0 0 0 !important;
  padding-left: 1.15em !important;
  list-style-position: outside !important;
}

.resume li,
.page li,
.rs-list li {
  margin-bottom: var(--rs-bullet-gap) !important;
}

.resume li:last-child,
.page li:last-child,
.rs-list li:last-child {
  margin-bottom: 0 !important;
}

/* ── Entries / sections spacing ───────────────────────────────────────── */
.resume .entry,
.page .section,
.page .exp-item,
.rs-entry {
  margin-bottom: var(--rs-section-gap) !important;
}

.resume .entry:last-child,
.page .section:last-child,
.page .exp-item:last-child {
  margin-bottom: 0 !important;
}

.entry-header,
.e-head,
.rs-entry-head {
  display: flex !important;
  justify-content: space-between !important;
  align-items: baseline !important;
  gap: 8px !important;
  margin-bottom: 2px !important;
}

/* Contact strips */
.header-right,
.page .contact,
.rs-contact {
  font-size: var(--rs-body) !important;
  line-height: var(--rs-line) !important;
  color: var(--rs-muted) !important;
}

/*
 * Slate Split Header Sidebar uses .page > .content > .grid (flex + % widths).
 * ONLY scope flex overrides to .page .grid — many templates use .resume .grid with
 * CSS Grid (e.g. 1fr 1fr) or wrapped flex tiles; forcing flex/nowrap there merged columns.
 */
.page .grid {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  align-items: flex-start !important;
  gap: var(--rs-col-gap) !important;
}

/* Overflow only — template sets % widths on flex children */
.page .grid > * {
  min-width: 0 !important;
}

.page .grid > div:first-child {
  flex-shrink: 0 !important;
}

.page .grid > div:last-child {
  flex: 1 1 0% !important;
  min-width: 0 !important;
}

/* Grid-shell resumes (aside + main): prevent track blow-out / overlapping text */
.resume > aside,
.resume > main {
  min-width: 0 !important;
  overflow-wrap: break-word !important;
}

/* Reference / card grids → wrap, not rigid 50/50 */
.page .refs,
.resume .refs {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 10px !important;
}

.page .refs > *,
.resume .refs > * {
  flex: 1 1 200px !important;
  min-width: min(100%, 180px) !important;
}

.ref-card {
  margin: 0 !important;
}
`.trim()

/**
 * Appends the design-system stylesheet immediately before </head> so it wins the cascade.
 * Skips if already injected (e.g. defaultHtml embeds the same block with the marker).
 */
export function applyResumeDesignSystemToHtml(html: string): string {
  if (!html?.trim()) return html
  if (html.includes(RESUME_DS_MARKER)) return html

  const tag = `<style ${RESUME_DS_MARKER}="true">\n${RESUME_DESIGN_SYSTEM_CSS}\n</style>`

  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${tag}\n</head>`)
  }

  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body[^>]*>/i, (open) => `${open}\n${tag}`)
  }

  return `${tag}\n${html}`
}
