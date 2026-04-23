/**
 * Writes a Buildify Studio canvas draft (same shape + key the editor reads on /buildify-studio/new)
 * so AI Resume can open a matching template pre-filled from the resume form — without changing Studio code.
 */
import { TEMPLATES } from '@/components/buildify-studio/templates'
import {
  type CanvasBackground,
  type CanvasElement,
  type SocialLinkItem,
} from '@/components/buildify-studio/types'

/** Must match `LEGACY_DRAFT_KEY` in `components/buildify-studio/editor.tsx`. */
export const BUILDIFY_STUDIO_LEGACY_DRAFT_KEY = 'buildify_studio_draft_v2' as const

export type PortfolioStudioResumeInput = {
  fullName: string
  title?: string
  email?: string
  phone?: string
  location?: string
  linkedin?: string
  github?: string
  portfolio?: string
  summary?: string
  skills?: string
  experience?: string
  education?: string
  projects?: string
  certifications?: string
  achievements?: string
  languagesKnown?: string
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

function normalizeHref(raw: string | undefined): string {
  const s = raw?.trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  return `https://${s}`
}

function escapeJsString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ')
}

function skillChunks(skills: string, buckets: number): string[] {
  const parts = skills
    .split(/[,，\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
  if (parts.length === 0) return Array.from({ length: buckets }, () => '—')
  const per = Math.max(1, Math.ceil(parts.length / buckets))
  return Array.from({ length: buckets }, (_, i) => {
    const slice = parts.slice(i * per, (i + 1) * per)
    return slice.length ? slice.join(' · ') : '—'
  })
}

function clampText(input: string, maxChars: number): string {
  const clean = input.replace(/\s+/g, ' ').trim()
  if (clean.length <= maxChars) return clean
  return `${clean.slice(0, Math.max(0, maxChars - 3)).trim()}...`
}

function normalizeSkillCardText(raw: string): string {
  const parts = raw
    .split(/[,，\n·]/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 6)
  if (parts.length === 0) return '—'
  return clampText(parts.join(' · '), 220)
}

function compactSkillsInline(skills: string): string {
  const parts = skills
    .split(/[,，\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6)
  if (parts.length === 0) return 'TypeScript · React · Node.js · PostgreSQL'
  return clampText(parts.join(' · '), 220)
}

const SKILL_LABELS = ['Frontend & UI', 'Backend & APIs', 'Platform & DevOps', 'Tools & more'] as const

function projectTriple(projects: string): [string, string, string] {
  const blocks = projects
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .slice(0, 3)
  const defaults: [string, string, string] = [
    'Featured work\nAdd your first case study in Projects.',
    'More work\nDescribe outcomes and stack.',
    'Side projects\nOpen source, experiments, writing.',
  ]
  return [
    0, 1, 2,
  ].map((i) => {
    const b = blocks[i]
    if (!b) return defaults[i]!
    const lines = b.split('\n')
    const head = lines[0] ?? 'Project'
    const tail = lines.slice(1).join('\n').trim()
    return tail ? `${head}\n${tail}` : head
  }) as [string, string, string]
}

function normalizeProjectCardText(raw: string): string {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) {
    return 'Project\nAdd details and outcomes.'
  }

  const title = lines[0]!.slice(0, 42)
  const detailPool = lines
    .slice(1)
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/[•●▪]/g, '')
    .trim()

  if (!detailPool) return title

  const detail = detailPool.length > 1200 ? `${detailPool.slice(0, 1197)}...` : detailPool
  return `${title}\n${detail}`
}

function estimateProjectCardHeight(content: string): number {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean)
  const lineCount = lines.reduce((acc, line) => {
    // Approx chars-per-line for 360px card at 12px body text.
    const wrapped = Math.max(1, Math.ceil(line.length / 44))
    return acc + wrapped
  }, 0)

  // Grow card for long content, cap to keep layout sane.
  const estimated = 84 + lineCount * 16
  return Math.max(124, Math.min(520, estimated))
}

function normalizeWorkCardText(raw: string): string {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return 'Case study\nDetails coming soon.'

  const title = (lines[0] ?? 'Work').slice(0, 34)
  const detailPool = (lines.slice(1).join(' ') || '').replace(/\s+/g, ' ').trim()
  if (!detailPool) return title

  const detail = detailPool.length > 240 ? `${detailPool.slice(0, 237)}...` : detailPool
  return `${title}\n${detail}`
}

function normalizeServiceCardText(raw: string): string {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return 'Service\nDetails coming soon.'

  const title = (lines[0] ?? 'Service').slice(0, 30)
  const detailPool = lines
    .slice(1)
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/[•●▪]/g, '')
    .trim()
  if (!detailPool) return title

  const detail = detailPool.length > 260 ? `${detailPool.slice(0, 257)}...` : detailPool
  return `${title}\n${detail}`
}

function estimateTextBlockHeight(
  content: string,
  width: number,
  fontSize = 14,
  lineHeight = 1.6,
  padding = 0,
): number {
  const charsPerLine = Math.max(14, Math.floor((width - padding * 2) / Math.max(6, fontSize * 0.55)))
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce((acc, line) => acc + Math.max(1, Math.ceil(line.length / charsPerLine)), 0)
  return Math.ceil(lines * fontSize * lineHeight + padding * 2 + 8)
}

function getById(elements: CanvasElement[], id: string): CanvasElement | undefined {
  return elements.find((e) => e.id === id)
}

function shiftElementsFromY(elements: CanvasElement[], startY: number, delta: number): void {
  if (delta <= 0) return
  for (const el of elements) {
    if (el.y >= startY) el.y += delta
  }
}

function workQuads(projects: string): [string, string, string, string] {
  const blocks = projects
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .slice(0, 4)
  const defaults: [string, string, string, string] = [
    'Case study\nOutcome-first work\n\nYear · Type',
    'Campaign\nChannel growth\n\nYear · Campaign',
    'Product\nUX & UI\n\nYear · UX',
    'Motion\nBrand & story\n\nYear · Motion',
  ]
  return [
    0, 1, 2, 3,
  ].map((i) => {
    const b = blocks[i]
    if (!b) return defaults[i]!
    const lines = b.split('\n')
    const title = lines[0] ?? 'Work'
    const rest = lines.slice(1).join('\n').trim()
    return rest ? `${title}\n${rest}` : `${title}\nDetails coming soon.`
  }) as [string, string, string, string]
}

function patchById(elements: CanvasElement[], id: string, fn: (el: CanvasElement) => CanvasElement) {
  const idx = elements.findIndex((e) => e.id === id)
  if (idx === -1) return
  elements[idx] = fn(elements[idx]!)
}

function setSocialUrls(links: SocialLinkItem[] | undefined, map: Partial<Record<SocialLinkItem['platform'], string>>): SocialLinkItem[] {
  const base = links ?? []
  return base.map((item) => ({
    ...item,
    url: map[item.platform] ?? item.url,
  }))
}

function personalizeDeveloperDark(elements: CanvasElement[], d: PortfolioStudioResumeInput) {
  const name = d.fullName.trim() || 'Your Name'
  const title = d.title?.trim() || 'Full Stack Developer'
  const summary =
    d.summary?.trim() ||
    'Building reliable products with a focus on clarity, performance, and maintainability.'
  const skillsLine = compactSkillsInline(d.skills ?? '')
  const chunks = skillChunks(d.skills ?? '', 4)
  const [p1, p2, p3] = projectTriple(d.projects ?? '')

  const skillParts = (d.skills ?? '')
    .split(/[,，\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8)
  const skillsJsLines =
    skillParts.length > 0
      ? skillParts.map((s) => `    "${escapeJsString(s)}",`).join('\n')
      : `    "TypeScript",\n    "React",\n    "Node.js",`

  const code = `// ${escapeJsString(name)} — portfolio snippet\nconst profile = {\n  name: "${escapeJsString(name)}",\n  role: "${escapeJsString(title)}",\n  skills: [\n${skillsJsLines}\n  ],\n  available: true,\n};\n\nconsole.log("Open to opportunities");`

  patchById(elements, 'd-h1', (el) => ({ ...el, content: `Hi, I'm ${name}` }))
  patchById(elements, 'd-role', (el) => ({ ...el, content: title }))
  patchById(elements, 'd-bio', (el) => ({
    ...el,
    content: `${summary}\n${skillsLine}`,
  }))
  patchById(elements, 'd-code', (el) => ({ ...el, content: code }))
  ;[0, 1, 2, 3].forEach((i) => {
    patchById(elements, `d-card${i + 1}`, (el) => ({
      ...el,
      content: `${SKILL_LABELS[i]}\n${normalizeSkillCardText(chunks[i] ?? '')}`,
    }))
  })

  const bioEl = getById(elements, 'd-bio')
  if (bioEl) {
    const nextBioHeight = Math.max(76, estimateTextBlockHeight(String(bioEl.content || ''), bioEl.width, 15, 1.7, 0))
    patchById(elements, 'd-bio', (el) => ({ ...el, height: nextBioHeight }))
    patchById(elements, 'd-btn1', (el) => ({ ...el, y: bioEl.y + nextBioHeight + 20 }))
    patchById(elements, 'd-btn2', (el) => ({ ...el, y: bioEl.y + nextBioHeight + 20 }))
    patchById(elements, 'd-social', (el) => ({ ...el, y: bioEl.y + nextBioHeight + 86 }))
  }

  // Grow skill cards by content and reflow projects below.
  const skillHeights = [1, 2, 3, 4].map((i) => {
    const card = getById(elements, `d-card${i}`)
    if (!card) return 88
    return Math.max(88, estimateTextBlockHeight(String(card.content || ''), card.width, 12, 1.6, 16))
  })
  const maxSkillH = Math.max(...skillHeights, 88)
  ;[1, 2, 3, 4].forEach((i) => {
    patchById(elements, `d-card${i}`, (el) => ({ ...el, height: maxSkillH }))
  })
  const skillCardsBottom = 642 + maxSkillH
  const projHeaderY = skillCardsBottom + 28
  const projCardsY = projHeaderY + 56
  patchById(elements, 'd-proj-h', (el) => ({ ...el, y: projHeaderY }))
  patchById(elements, 'd-proj1', (el) => ({ ...el, y: projCardsY }))
  patchById(elements, 'd-proj2', (el) => ({ ...el, y: projCardsY }))
  patchById(elements, 'd-proj3', (el) => ({ ...el, y: projCardsY }))
  const proj1 = normalizeProjectCardText(p1)
  const proj2 = normalizeProjectCardText(p2)
  const proj3 = normalizeProjectCardText(p3)
  const h1 = estimateProjectCardHeight(proj1)
  const h2 = estimateProjectCardHeight(proj2)
  const h3 = estimateProjectCardHeight(proj3)

  patchById(elements, 'd-proj1', (el) => ({ ...el, content: proj1, height: h1 }))
  patchById(elements, 'd-proj2', (el) => ({ ...el, content: proj2, height: h2 }))
  patchById(elements, 'd-proj3', (el) => ({ ...el, content: proj3, height: h3 }))
  patchById(elements, 'd-skillbg', (el) => {
    const maxProjectBottom = Math.max(projCardsY + h1, projCardsY + h2, projCardsY + h3)
    const minSectionBottom = maxProjectBottom + 24
    const nextHeight = Math.max(el.height, minSectionBottom - el.y)
    return { ...el, height: nextHeight }
  })

  const social = getById(elements, 'd-social')
  if (social) {
    const nextSkillsStart = Math.max(556, social.y + social.height + 42)
    const delta = nextSkillsStart - 556
    shiftElementsFromY(elements, 556, delta)
  }
  patchById(elements, 'd-social', (el) => ({
    ...el,
    socialLinks: setSocialUrls(el.socialLinks, {
      github: normalizeHref(d.github),
      linkedin: normalizeHref(d.linkedin),
      twitter: '',
      discord: '',
    }),
  }))
}

function personalizeDesignerClean(elements: CanvasElement[], d: PortfolioStudioResumeInput) {
  const name = d.fullName.trim() || 'Your Name'
  const title = d.title?.trim() || 'Designer'
  const about = d.summary?.trim() || 'Creative professional focused on clear storytelling and craft.'
  const email = clampText(d.email?.trim() || 'you@example.com', 52)
  const [w1, w2, w3, w4] = workQuads(d.projects ?? '')

  patchById(elements, 'dc-h1', (el) => ({ ...el, content: name }))
  patchById(elements, 'dc-role', (el) => ({ ...el, content: title }))
  patchById(elements, 'dc-img', (el) => ({
    ...el,
    content: `https://placehold.co/420x552/e8e0ff/7c3aed?text=${encodeURIComponent(name)}`,
  }))
  patchById(elements, 'dc-about', (el) => ({ ...el, content: about }))
  patchById(elements, 'dc-email', (el) => ({ ...el, content: email }))
  patchById(elements, 'dc-w1', (el) => ({ ...el, content: normalizeWorkCardText(w1) }))
  patchById(elements, 'dc-w2', (el) => ({ ...el, content: normalizeWorkCardText(w2) }))
  patchById(elements, 'dc-w3', (el) => ({ ...el, content: normalizeWorkCardText(w3) }))
  patchById(elements, 'dc-w4', (el) => ({ ...el, content: normalizeWorkCardText(w4) }))

  const aboutEl = getById(elements, 'dc-about')
  if (aboutEl) {
    const aboutH = Math.max(112, estimateTextBlockHeight(String(aboutEl.content || ''), aboutEl.width, 15, 1.8, 0))
    patchById(elements, 'dc-about', (el) => ({ ...el, height: aboutH }))
    const workHeaderY = aboutEl.y + aboutH + 22
    const row1Y = workHeaderY + 52
    patchById(elements, 'dc-work-h', (el) => ({ ...el, y: workHeaderY }))
    patchById(elements, 'dc-w1', (el) => ({ ...el, y: row1Y }))
    patchById(elements, 'dc-w2', (el) => ({ ...el, y: row1Y }))

    const w1El = getById(elements, 'dc-w1')
    const w2El = getById(elements, 'dc-w2')
    const h1 = w1El ? Math.max(144, estimateTextBlockHeight(String(w1El.content || ''), w1El.width, 12, 1.6, 20)) : 144
    const h2 = w2El ? Math.max(144, estimateTextBlockHeight(String(w2El.content || ''), w2El.width, 12, 1.6, 20)) : 144
    const row1H = Math.max(h1, h2)
    patchById(elements, 'dc-w1', (el) => ({ ...el, height: h1 }))
    patchById(elements, 'dc-w2', (el) => ({ ...el, height: h2 }))

    const row2Y = row1Y + row1H + 16
    patchById(elements, 'dc-w3', (el) => ({ ...el, y: row2Y }))
    patchById(elements, 'dc-w4', (el) => ({ ...el, y: row2Y }))
    const w3El = getById(elements, 'dc-w3')
    const w4El = getById(elements, 'dc-w4')
    const h3 = w3El ? Math.max(144, estimateTextBlockHeight(String(w3El.content || ''), w3El.width, 12, 1.6, 20)) : 144
    const h4 = w4El ? Math.max(144, estimateTextBlockHeight(String(w4El.content || ''), w4El.width, 12, 1.6, 20)) : 144
    const row2H = Math.max(h3, h4)
    patchById(elements, 'dc-w3', (el) => ({ ...el, height: h3 }))
    patchById(elements, 'dc-w4', (el) => ({ ...el, height: h4 }))
    patchById(elements, 'dc-btn', (el) => ({ ...el, y: row2Y + row2H + 20 }))
  }
  patchById(elements, 'dc-social', (el) => ({
    ...el,
    socialLinks: setSocialUrls(el.socialLinks, {
      linkedin: normalizeHref(d.linkedin),
      instagram: normalizeHref(d.portfolio),
      twitter: '',
    }),
  }))
}

function personalizeFreelancerClean(elements: CanvasElement[], d: PortfolioStudioResumeInput) {
  const name = d.fullName.trim() || 'Your Name'
  const title = clampText(d.title?.trim() || 'Freelancer', 48)
  const sub = (
    d.summary?.trim() ||
      'Independent builder shipping web products end-to-end — from discovery to launch.'
  )
  const loc = d.location?.trim()
  const contactLine = clampText(loc || d.email?.trim() || 'Available for new projects', 80)

  patchById(elements, 'fc-nav', (el) => ({
    ...el,
    content: `${clampText(name, 28)}|Services|Work|Process|Contact`,
  }))
  patchById(elements, 'fc-h1', (el) => ({
    ...el,
    content: `${clampText(name, 32)}\n${title}\n${contactLine}`,
  }))
  patchById(elements, 'fc-img', (el) => ({
    ...el,
    content: `https://placehold.co/560x380/f5f5f4/1c1917?text=${encodeURIComponent(name)}`,
  }))
  patchById(elements, 'fc-sub', (el) => ({ ...el, content: sub }))
  const sk = skillChunks(d.skills ?? '', 3)
  patchById(elements, 'fc-svc1', (el) => ({
    ...el,
    content: normalizeServiceCardText(`Build & ship\n${normalizeSkillCardText(sk[0] ?? '')}`),
  }))
  patchById(elements, 'fc-svc2', (el) => ({
    ...el,
    content: normalizeServiceCardText(`Product & UX\n${normalizeSkillCardText(sk[1] ?? '')}`),
  }))
  patchById(elements, 'fc-svc3', (el) => ({
    ...el,
    content: normalizeServiceCardText(`Performance & quality\n${normalizeSkillCardText(sk[2] ?? '')}`),
  }))
  const testimonial =
    d.achievements?.trim() ||
    d.certifications?.trim() ||
    '"Great collaboration — clear communication and fast delivery."'
  patchById(elements, 'fc-t1', (el) => ({
    ...el,
    content: normalizeServiceCardText(`${clampText(testimonial, 220)}\n— Client reference`),
  }))

  const h1El = getById(elements, 'fc-h1')
  const subEl = getById(elements, 'fc-sub')
  if (h1El && subEl) {
    const h1Height = Math.max(180, estimateTextBlockHeight(String(h1El.content || ''), h1El.width, 64, 1.12, 0))
    const subY = h1El.y + h1Height + 16
    const subH = Math.max(48, estimateTextBlockHeight(String(subEl.content || ''), subEl.width, 14, 1.6, 0))
    const btnY = subY + subH + 16
    patchById(elements, 'fc-h1', (el) => ({ ...el, height: h1Height }))
    patchById(elements, 'fc-sub', (el) => ({ ...el, y: subY, height: subH }))
    patchById(elements, 'fc-btn1', (el) => ({ ...el, y: btnY }))
    patchById(elements, 'fc-btn2', (el) => ({ ...el, y: btnY }))
    patchById(elements, 'fc-social', (el) => ({ ...el, y: btnY + 58 }))
    patchById(elements, 'fc-div', (el) => ({ ...el, y: btnY + 102 }))
    patchById(elements, 'fc-svc-h', (el) => ({ ...el, y: btnY + 122 }))
  }

  const svcHeader = getById(elements, 'fc-svc-h')
  if (svcHeader) {
    const row1Y = svcHeader.y + 48
    patchById(elements, 'fc-svc1', (el) => ({ ...el, y: row1Y }))
    patchById(elements, 'fc-svc2', (el) => ({ ...el, y: row1Y }))
    const s1 = getById(elements, 'fc-svc1')
    const s2 = getById(elements, 'fc-svc2')
    const h1 = s1 ? Math.max(88, estimateTextBlockHeight(String(s1.content || ''), s1.width, 12, 1.6, 16)) : 88
    const h2 = s2 ? Math.max(88, estimateTextBlockHeight(String(s2.content || ''), s2.width, 12, 1.6, 16)) : 88
    const row1H = Math.max(h1, h2)
    patchById(elements, 'fc-svc1', (el) => ({ ...el, height: h1 }))
    patchById(elements, 'fc-svc2', (el) => ({ ...el, height: h2 }))

    const row2Y = row1Y + row1H + 16
    patchById(elements, 'fc-svc3', (el) => ({ ...el, y: row2Y }))
    patchById(elements, 'fc-t1', (el) => ({ ...el, y: row2Y }))
    const s3 = getById(elements, 'fc-svc3')
    const t1 = getById(elements, 'fc-t1')
    const h3 = s3 ? Math.max(88, estimateTextBlockHeight(String(s3.content || ''), s3.width, 12, 1.6, 16)) : 88
    const h4 = t1 ? Math.max(88, estimateTextBlockHeight(String(t1.content || ''), t1.width, 12, 1.6, 16)) : 88
    patchById(elements, 'fc-svc3', (el) => ({ ...el, height: h3 }))
    patchById(elements, 'fc-t1', (el) => ({ ...el, height: h4 }))

    patchById(elements, 'fc-form', (el) => ({ ...el, y: svcHeader.y, height: Math.max(el.height, row2Y + Math.max(h3, h4) - svcHeader.y + 56) }))
  }
  patchById(elements, 'fc-social', (el) => ({
    ...el,
    socialLinks: setSocialUrls(el.socialLinks, {
      github: normalizeHref(d.github),
      linkedin: normalizeHref(d.linkedin),
      twitter: normalizeHref(d.portfolio),
    }),
  }))
}

export function buildPersonalizedStudioDraft(
  studioTemplateId: string,
  data: PortfolioStudioResumeInput,
): { elements: CanvasElement[]; background: CanvasBackground } {
  const template = TEMPLATES.find((t) => t.id === studioTemplateId)
  if (!template) {
    throw new Error(`Unknown studio template: ${studioTemplateId}`)
  }
  const elements = deepClone(template.elements)
  const background = deepClone(template.background)

  switch (studioTemplateId) {
    case 'developer-dark':
      personalizeDeveloperDark(elements, data)
      break
    case 'designer-clean':
      personalizeDesignerClean(elements, data)
      break
    case 'freelancer-clean':
      personalizeFreelancerClean(elements, data)
      break
    default:
      break
  }

  return { elements, background }
}

/** Persists draft for `BuildifyStudioEditor` initial load on `/buildify-studio/new`. */
export function writeBuildifyStudioLegacyDraft(elements: CanvasElement[], background: CanvasBackground): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      BUILDIFY_STUDIO_LEGACY_DRAFT_KEY,
      JSON.stringify({ elements, background }),
    )
  } catch {
    // Quota or private mode — caller may toast
  }
}
