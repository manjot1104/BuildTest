/**
 * Reusable HTML fragments for resume templates.
 * Class names are styled by `RESUME_DESIGN_SYSTEM_CSS` in `./resume-design-system`.
 */

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escAttr(text: string): string {
  return esc(text).replace(/"/g, '&quot;')
}

/** Header row: name + optional subtitle + optional contact block (already HTML-safe if built by caller). */
export function htmlHeaderComponent(opts: {
  name: string
  subtitle?: string
  contactHtml?: string
  variant?: 'split' | 'stacked'
}): string {
  const sub = opts.subtitle?.trim()
    ? `<div class="title rs-subtitle">${esc(opts.subtitle)}</div>`
    : ''
  const contact = opts.contactHtml?.trim()
    ? `<div class="header-right rs-contact">${opts.contactHtml}</div>`
    : ''

  if (opts.variant === 'split') {
    return `<div class="header rs-header">
  <div class="header-left">
    <h1 class="rs-name">${esc(opts.name)}</h1>
    ${sub}
  </div>
  ${contact}
</div>`
  }

  return `<header class="header rs-header resume-header">
  <h1 class="rs-name">${esc(opts.name)}</h1>
  ${sub}
  ${contact}
</header>`
}

export function htmlSectionComponent(title: string, bodyHtml: string): string {
  return `<section class="rs-section" aria-label="${escAttr(title)}">
  <h2 class="rs-section-title">${esc(title)}</h2>
  <div class="rs-section-body">${bodyHtml}</div>
</section>`
}

export function htmlListComponent(items: string[]): string {
  if (items.length === 0) return ''
  const lis = items.map((i) => `    <li>${esc(i)}</li>`).join('\n')
  return `<ul class="rs-list">\n${lis}\n  </ul>`
}
