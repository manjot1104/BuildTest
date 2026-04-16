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

  const detail = detailPool.length > 220 ? `${detailPool.slice(0, 217)}...` : detailPool
  return `${title}\n${detail}`
}

function estimateProjectCardHeight(content: string): number {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean)
  const lineCount = lines.reduce((acc, line) => {
    // Approx chars-per-line for 360px card at 12px body text.
    const wrapped = Math.max(1, Math.ceil(line.length / 44))
    return acc + wrapped
  }, 0)

  // 124 was template default. Grow card for long content, cap to keep layout sane.
  const estimated = 84 + lineCount * 16
  return Math.max(124, Math.min(220, estimated))
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

  const detail = detailPool.length > 72 ? `${detailPool.slice(0, 69)}...` : detailPool
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

  const detail = detailPool.length > 78 ? `${detailPool.slice(0, 75)}...` : detailPool
  return `${title}\n${detail}`
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
  const skillsLine =
    d.skills?.split('\n').map((l) => l.trim()).find(Boolean) ||
    d.skills
      ?.split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6)
      .join(' · ') ||
    'TypeScript · React · Node.js · PostgreSQL'
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
      content: `${SKILL_LABELS[i]}\n${chunks[i]}`,
    }))
  })
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
    const maxProjectBottom = Math.max(814 + h1, 814 + h2, 814 + h3)
    const minSectionBottom = maxProjectBottom + 24
    const nextHeight = Math.max(el.height, minSectionBottom - el.y)
    return { ...el, height: nextHeight }
  })
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
  const email = d.email?.trim() || 'you@example.com'
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
  const title = d.title?.trim() || 'Freelancer'
  const sub =
    d.summary?.trim() ||
    'Independent builder shipping web products end-to-end — from discovery to launch.'
  const loc = d.location?.trim()

  patchById(elements, 'fc-nav', (el) => ({
    ...el,
    content: `${name}|Services|Work|Process|Contact`,
  }))
  patchById(elements, 'fc-h1', (el) => ({
    ...el,
    content: `${name}\n${title}\n${loc || d.email?.trim() || 'Available for new projects'}`,
  }))
  patchById(elements, 'fc-img', (el) => ({
    ...el,
    content: `https://placehold.co/560x380/f5f5f4/1c1917?text=${encodeURIComponent(name)}`,
  }))
  patchById(elements, 'fc-sub', (el) => ({ ...el, content: sub }))
  const sk = skillChunks(d.skills ?? '', 3)
  patchById(elements, 'fc-svc1', (el) => ({
    ...el,
    content: normalizeServiceCardText(`Build & ship\n${sk[0]}`),
  }))
  patchById(elements, 'fc-svc2', (el) => ({
    ...el,
    content: normalizeServiceCardText(`Product & UX\n${sk[1]}`),
  }))
  patchById(elements, 'fc-svc3', (el) => ({
    ...el,
    content: normalizeServiceCardText(`Performance & quality\n${sk[2]}`),
  }))
  const testimonial =
    d.achievements?.trim() ||
    d.certifications?.trim() ||
    '"Great collaboration — clear communication and fast delivery."'
  patchById(elements, 'fc-t1', (el) => ({
    ...el,
    content: normalizeServiceCardText(`${testimonial}\n— Client reference`),
  }))
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
