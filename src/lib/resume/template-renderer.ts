/**
 * Unified Template Renderer — Single Source of Truth
 *
 * This module powers BOTH the preview system AND the fallback generator
 * with the EXACT SAME code. Preview passes DUMMY_RESUME_DATA, generation
 * passes real user data. Same function, same output.
 *
 * Data flow:
 *   Preview:  renderTemplate(styleGuide, format, DUMMY_RESUME_DATA) → iframe
 *   Fallback: renderTemplate(styleGuide, format, userData)          → PDF
 *   AI path:  OpenRouter generates → section-pruner cleans          → PDF
 */

import { z } from 'zod'

// ── Canonical Structured Schema ──────────────────────────────────────────────

export const resumeDataSchema = z.object({
  fullName: z.string(),
  title: z.string().optional(),
  email: z.string(),
  phone: z.string(),
  location: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  portfolio: z.string().optional(),

  summary: z.string().optional(),

  skills: z
    .union([
      // Structured (preferred)
      z.object({
        languages: z.array(z.string()).optional(),
        frameworks: z.array(z.string()).optional(),
        tools: z.array(z.string()).optional(),
        other: z.array(z.string()).optional(),
      }),
      // Flat text (backward compat)
      z.string(),
    ])
    .optional(),

  experience: z
    .union([
      z.array(
        z.object({
          role: z.string(),
          company: z.string(),
          duration: z.string(),
          points: z.array(z.string()),
        })
      ),
      z.string(),
    ])
    .optional(),

  projects: z
    .union([
      z.array(
        z.object({
          name: z.string(),
          tech: z.string().optional(),
          points: z.array(z.string()),
        })
      ),
      z.string(),
    ])
    .optional(),

  education: z
    .union([
      z.array(
        z.object({
          degree: z.string(),
          college: z.string(),
          year: z.string(),
        })
      ),
      z.string(),
    ])
    .optional(),

  certifications: z.union([z.array(z.string()), z.string()]).optional(),
  achievements: z.union([z.array(z.string()), z.string()]).optional(),
  languagesKnown: z.union([z.array(z.string()), z.string()]).optional(),

  additionalInstructions: z.string().optional(),
})

export type ResumeRenderData = z.infer<typeof resumeDataSchema>

// ── Internal structured types (always arrays) ────────────────────────────────

interface ExperienceEntry {
  role: string
  company: string
  duration: string
  points: string[]
}

interface ProjectEntry {
  name: string
  tech?: string
  points: string[]
}

interface EducationEntry {
  degree: string
  college: string
  year: string
}

// ── DUMMY DATA — FAANG-level sample resume ───────────────────────────────────

export const DUMMY_RESUME_DATA: ResumeRenderData = {
  fullName: 'Alex Johnson',
  title: 'Senior Software Engineer',
  email: 'alex.johnson@email.com',
  phone: '+1 (555) 123-4567',
  location: 'San Francisco, CA',
  linkedin: 'linkedin.com/in/alexjohnson',
  portfolio: 'alexjohnson.dev',
  github: 'github.com/alexjohnson',

  summary:
    'Full-stack engineer with 6+ years of experience building scalable distributed systems at top-tier technology companies. Led the platform team serving 5M+ daily active users at Google, driving a 60% reduction in deployment time and 40% improvement in API latency. Expert in React, Node.js, and cloud-native architecture with a proven track record of mentoring engineers and delivering high-impact technical solutions.',

  skills: {
    languages: ['JavaScript', 'TypeScript', 'Python', 'Go', 'SQL'],
    frameworks: ['React', 'Next.js', 'Node.js', 'Express', 'FastAPI'],
    tools: ['AWS', 'Docker', 'Kubernetes', 'PostgreSQL', 'Redis', 'Git', 'CI/CD'],
  },

  experience: [
    {
      role: 'Senior Software Engineer',
      company: 'Google',
      duration: '2021 – Present',
      points: [
        'Architected and deployed a cloud-native microservices platform serving 12 engineering teams, implementing service mesh networking with Istio, automated canary deployments, and distributed tracing that reduced deployment time by 60% and improved incident response from 4 hours to 15 minutes',
        'Led the end-to-end migration of a monolithic Java application to an event-driven microservices architecture using Kafka and gRPC, successfully transitioning a platform serving 5M+ daily active users while maintaining 99.99% uptime and reducing infrastructure costs by 35%',
        'Established a structured mentorship program for 8 junior engineers, conducting weekly one-on-one sessions, technical design reviews, and pair programming workshops that resulted in 3 promotions to senior engineer within 18 months and a 25% improvement in team velocity',
        'Designed and implemented a multi-tier distributed caching architecture using Redis Cluster and CDN edge caching, reducing p99 API latency from 800ms to 120ms while decreasing database load by 70%, enabling the platform to handle 3x traffic spikes during peak events',
      ],
    },
    {
      role: 'Software Engineer',
      company: 'Stripe',
      duration: '2019 – 2021',
      points: [
        'Built and scaled a high-throughput payment processing pipeline handling $2B+ in annual transaction volume with 99.99% reliability, implementing idempotent retry mechanisms, distributed transaction coordination, and comprehensive audit logging for PCI DSS compliance',
        'Optimized critical API endpoints through systematic query analysis, implementing materialized views, connection pooling, and intelligent caching strategies that reduced average response latency by 45% and improved throughput capacity by 3x during peak traffic periods',
        'Designed and deployed a real-time fraud detection system using machine learning models and rule-based engines, processing 50K+ transactions per minute and preventing $10M+ in annual losses while maintaining a false positive rate below 0.1%',
      ],
    },
  ],

  projects: [
    {
      name: 'Real-Time Analytics Dashboard',
      tech: 'React, D3.js, WebSocket, PostgreSQL',
      points: [
        'Built a streaming analytics platform processing 50K+ events per second with sub-second visualization updates, using WebSocket-based data pipelines and custom D3.js chart components optimized for real-time rendering performance across desktop and mobile viewports',
        'Reduced decision-making time for product teams by 40% through intuitive drill-down dashboards with automated anomaly detection alerts, customizable KPI widgets, and exportable report generation supporting CSV, PDF, and Slack integrations',
      ],
    },
    {
      name: 'Open Source CLI Tool',
      tech: 'TypeScript, Node.js',
      points: [
        'Created a developer productivity CLI tool that automates project scaffolding and code generation, achieving 2K+ GitHub stars and 500+ weekly npm downloads through comprehensive documentation and an intuitive plugin architecture',
        'Established a robust open-source CI/CD pipeline with automated testing across Node.js 18/20/22, cross-platform compatibility validation, semantic versioning, and automated changelog generation ensuring reliable and predictable npm releases',
      ],
    },
  ],

  education: [
    {
      degree: 'B.S. Computer Science',
      college: 'Stanford University',
      year: '2015 – 2019',
    },
  ],

  certifications: ['AWS Solutions Architect Associate (2023)', 'Google Cloud Professional Developer (2022)'],
  achievements: ['Best Innovation Award — Google Hackathon 2023', 'Speaker — ReactConf 2022'],
  languagesKnown: ['English (Native)', 'Spanish (Conversational)'],
}

// ── Normalizers — coerce any input shape into arrays ─────────────────────────

function normalizeExperience(raw: ResumeRenderData['experience']): ExperienceEntry[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as ExperienceEntry[]

  // Parse flat text: "Role | Company | Duration\n• bullet\n\n..."
  const text = raw as string
  if (isPlaceholder(text)) return []
  const blocks = text.split(/\n\n+/)
  return blocks
    .map((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
      if (lines.length === 0) return null
      const firstLine = lines[0] ?? ''
      const parts = firstLine.split(/\s*\|\s*/)
      return {
        role: parts[0] || 'Software Engineer',
        company: parts[1] || 'Company',
        duration: parts[2] || '',
        points: lines.slice(1).map((l) => l.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean),
      }
    })
    .filter(Boolean) as ExperienceEntry[]
}

function normalizeProjects(raw: ResumeRenderData['projects']): ProjectEntry[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as ProjectEntry[]

  const text = raw as string
  if (isPlaceholder(text)) return []
  const blocks = text.split(/\n\n+/)
  return blocks
    .map((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
      if (lines.length === 0) return null
      const firstLine = lines[0] ?? ''
      const parts = firstLine.split(/\s*\|\s*/)
      return {
        name: parts[0] || 'Project',
        tech: parts.length > 2 ? parts[1] : undefined,
        points: lines.slice(1).map((l) => l.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean),
      }
    })
    .filter(Boolean) as ProjectEntry[]
}

function normalizeEducation(raw: ResumeRenderData['education']): EducationEntry[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as EducationEntry[]

  const text = raw as string
  if (isPlaceholder(text)) return []
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return []

  // Try to parse: "Degree\nCollege | Year\n• details"
  const degree = lines[0] ?? 'Degree'
  const instLine = lines[1] ?? ''
  const instParts = instLine.split(/\s*\|\s*/)
  return [
    {
      degree,
      college: instParts[0] || 'Institution',
      year: instParts[1] || '',
    },
  ]
}

function normalizeSkillsToString(raw: ResumeRenderData['skills']): string {
  if (!raw) return ''
  if (typeof raw === 'string') return raw

  const parts: string[] = []
  const obj = raw as { languages?: string[]; frameworks?: string[]; tools?: string[]; other?: string[] }
  if (obj.languages?.length) parts.push(`Languages: ${obj.languages.join(', ')}`)
  if (obj.frameworks?.length) parts.push(`Frameworks: ${obj.frameworks.join(', ')}`)
  if (obj.tools?.length) parts.push(`Tools: ${obj.tools.join(', ')}`)
  if (obj.other?.length) parts.push(`Other: ${obj.other.join(', ')}`)

  // If no categories were labeled, join everything flat
  if (parts.length === 0) return ''
  return parts.join(' | ')
}

function normalizeSkillsFlat(raw: ResumeRenderData['skills']): string {
  if (!raw) return ''
  if (typeof raw === 'string') return raw

  const obj = raw as { languages?: string[]; frameworks?: string[]; tools?: string[]; other?: string[] }
  return [
    ...(obj.languages || []),
    ...(obj.frameworks || []),
    ...(obj.tools || []),
    ...(obj.other || []),
  ].join(', ')
}

function normalizeStringArray(raw: string[] | string | undefined): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (isPlaceholder(raw)) return []
  return raw.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean)
}

function isPlaceholder(val: string | undefined | null): boolean {
  if (!val) return true
  const cleaned = val.trim().toLowerCase()
  return (
    !cleaned ||
    ['not specified', 'not provided', 'n/a', 'na', 'none', '-', '--'].includes(cleaned)
  )
}

// ── Mandatory Structure Extractor ────────────────────────────────────────────

function extractMandatoryBlock(
  styleGuide: string | undefined,
  kind: 'HTML' | 'LaTeX'
): string | null {
  if (!styleGuide) return null
  const startToken = `MANDATORY STRUCTURE (${kind}):`
  const startIdx = styleGuide.indexOf(startToken)
  if (startIdx === -1) return null

  const afterStart = styleGuide.slice(startIdx + startToken.length).trim()
  const endCandidates = [
    afterStart.indexOf('CRITICAL FORMATTING RULES:'),
    afterStart.indexOf('REQUIRED DATA SCHEMA'),
    afterStart.indexOf('MANDATORY STRUCTURE (HTML):'),
    afterStart.indexOf('MANDATORY STRUCTURE (LaTeX):'),
  ].filter((n) => n > 0)

  const endIdx = endCandidates.length ? Math.min(...endCandidates) : afterStart.length
  const block = afterStart.slice(0, endIdx).trim()
  const cleaned = block.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim()
  return cleaned || null
}

// ── Safe text helpers ────────────────────────────────────────────────────────

function safeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function safeLatex(text: string): string {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
}

// ── Contact / Header replacement ─────────────────────────────────────────────

function replaceContactPlaceholders(block: string, data: ResumeRenderData): string {
  let out = block

  const name = data.fullName || 'Candidate Name'
  const loc = data.location || ''
  const linkedIn = data.linkedin || ''
  const portfolio = data.portfolio || ''
  const gitHub = data.github || ''

  // Name
  out = out.replace(/\bNAME\b/g, name)

  // Multi-part contact patterns (most specific first) — pipe separator
  out = out.replace(
    /email\s*\|\s*phone\s*\|\s*location\s*\|\s*linkedin/gi,
    [data.email, data.phone, loc, linkedIn].filter(Boolean).join(' | ')
  )
  out = out.replace(
    /email\s*\|\s*phone\s*\|\s*location\s*\|\s*portfolio/gi,
    [data.email, data.phone, loc, portfolio].filter(Boolean).join(' | ')
  )
  out = out.replace(
    /email\s*\|\s*phone\s*\|\s*github\.com\/username\s*\|\s*linkedin\.com\/in\/name/gi,
    [data.email, data.phone, gitHub, linkedIn].filter(Boolean).join(' | ')
  )
  out = out.replace(
    /email\s*\|\s*phone\s*\|\s*location/gi,
    [data.email, data.phone, loc].filter(Boolean).join(' | ')
  )
  out = out.replace(/email\s*\|\s*phone/gi, `${data.email} | ${data.phone}`)

  // Dash / em-dash / dot separators
  out = out.replace(/email\s*—\s*phone/gi, `${data.email} — ${data.phone}`)
  out = out.replace(/email\s*-\s*phone/gi, `${data.email} - ${data.phone}`)
  out = out.replace(
    /email\s*\$\\cdot\$\s*phone\s*\$\\cdot\$\s*location/gi,
    `${data.email} $\\cdot$ ${data.phone}${loc ? ` $\\cdot$ ${loc}` : ''}`
  )

  // \textbar separators (LaTeX)
  out = out.replace(
    /email\s*\\\\?\s*\\textbar\s*\\\\?\s*phone\s*\\\\?\s*\\textbar\s*\\\\?\s*location/gi,
    [data.email, data.phone, loc].filter(Boolean).join(' \\textbar\\ ')
  )
  out = out.replace(
    /email\s*\\textbar\s*\\?\s*phone/gi,
    `${data.email} \\textbar\\ ${data.phone}`
  )

  // Standalone link placeholders
  out = out.replace(/linkedin\.com\/in\/name/gi, linkedIn || 'linkedin.com/in/candidate')
  out = out.replace(/linkedin\.com\/in\/\w+/gi, linkedIn || 'linkedin.com/in/candidate')
  out = out.replace(/github\.com\/username/gi, gitHub || 'github.com/candidate')
  out = out.replace(/github\.com\/name/gi, gitHub || 'github.com/candidate')
  out = out.replace(/portfolio\.com\/?\w*/gi, portfolio || 'portfolio.dev')
  out = out.replace(
    /website\s*\|\s*orcid/gi,
    [portfolio || 'candidate.dev', 'orcid.org/0000-0001-2345-6789'].join(' | ')
  )
  out = out.replace(
    /scholar\.google\.com\/citations\?user=\w+/gi,
    'scholar.google.com/citations?user=candidate'
  )

  // Subtitle / Job Title placeholder
  out = out.replace(
    /<div class="subtitle">Job Title<\/div>/gi,
    `<div class="subtitle">${safeHtml(data.title || 'Software Engineer')}</div>`
  )

  return out
}

// ── HTML Section Builders ────────────────────────────────────────────────────

function buildHtmlExperience(entries: ExperienceEntry[]): string {
  return entries
    .map(
      (e) => `  <div class="entry">
    <div class="entry-header"><span class="entry-title">${safeHtml(e.role)}</span><span class="entry-date">${safeHtml(e.duration)}</span></div>
    <div class="entry-sub">${safeHtml(e.company)}</div>
    <ul>
${e.points.map((b) => `      <li>${safeHtml(b)}</li>`).join('\n')}
    </ul>
  </div>`
    )
    .join('\n')
}

function buildHtmlProjects(entries: ProjectEntry[]): string {
  return entries
    .map((p) => {
      const techLine = p.tech ? `\n    <div class="entry-sub">${safeHtml(p.tech)}</div>` : ''
      return `  <div class="entry">
    <div class="entry-header"><span class="entry-title">${safeHtml(p.name)}</span></div>${techLine}
    <ul>
${p.points.map((b) => `      <li>${safeHtml(b)}</li>`).join('\n')}
    </ul>
  </div>`
    })
    .join('\n')
}

function buildHtmlEducation(entries: EducationEntry[]): string {
  return entries
    .map(
      (e) => `  <div class="entry">
    <div class="entry-header"><span class="entry-title">${safeHtml(e.degree)}</span><span class="entry-date">${safeHtml(e.year)}</span></div>
    <div class="entry-sub">${safeHtml(e.college)}</div>
  </div>`
    )
    .join('\n')
}

function buildHtmlSkills(skillsStr: string): string {
  return `  <div class="skills-text">${safeHtml(skillsStr)}</div>`
}

function buildHtmlSummary(summary: string): string {
  return `  <p style="font-size:10.5px;line-height:1.6;margin-bottom:4px">${safeHtml(summary)}</p>`
}

function buildHtmlList(items: string[]): string {
  if (items.length === 0) return ''
  return `  <ul>\n${items.map((i) => `    <li>${safeHtml(i)}</li>`).join('\n')}\n  </ul>`
}

// ── LaTeX Section Builders ───────────────────────────────────────────────────

function buildLatexExperience(entries: ExperienceEntry[]): string {
  return entries
    .map((e) => {
      const bulletsLatex = e.points.map((b) => `\\item ${safeLatex(b)}`).join('\n')
      return `\\textbf{${safeLatex(e.role)}} \\hfill \\textit{${safeLatex(e.duration)}}\\\\
\\textit{${safeLatex(e.company)}}
\\begin{itemize}[leftmargin=*]
${bulletsLatex}
\\end{itemize}

\\vspace{0.2cm}
`
    })
    .join('')
    .trimEnd()
}

function buildLatexProjects(entries: ProjectEntry[]): string {
  return entries
    .map((p) => {
      const bulletsLatex = p.points.map((b) => `\\item ${safeLatex(b)}`).join('\n')
      const techLine = p.tech ? `\\\\\\textit{${safeLatex(p.tech)}}` : ''
      return `\\textbf{${safeLatex(p.name)}}${techLine}
\\begin{itemize}[leftmargin=*]
${bulletsLatex}
\\end{itemize}

\\vspace{0.2cm}
`
    })
    .join('')
    .trimEnd()
}

function buildLatexEducation(entries: EducationEntry[]): string {
  return entries
    .map(
      (e) => `\\textbf{${safeLatex(e.degree)}} \\hfill \\textit{${safeLatex(e.year)}}\\\\
\\textit{${safeLatex(e.college)}}
`
    )
    .join('\n')
    .trimEnd()
}

function buildLatexSkills(skillsStr: string): string {
  return safeLatex(skillsStr)
}

function buildLatexSummary(summary: string): string {
  return safeLatex(summary)
}

function buildLatexList(items: string[]): string {
  if (items.length === 0) return ''
  return `\\begin{itemize}[leftmargin=*]\n${items.map((i) => `\\item ${safeLatex(i)}`).join('\n')}\n\\end{itemize}`
}

// ── Section replacement engine ───────────────────────────────────────────────

const SECTION_HEADING_ALIASES = {
  summary: ['Summary', 'Professional Summary', 'Profile', 'Executive Summary', 'Objective', 'Career Objective'],
  skills: ['Skills', 'Technical Skills', 'Core Skills', 'TECHNICAL SKILLS', 'Skill Ribbon', 'SKILLS'],
  experience: ['Experience', 'Work Experience', 'Employment History', 'Experience Timeline', 'Leadership Experience', 'Research Experience', 'EXPERIENCE'],
  education: ['Education', 'Academic Background', 'EDUCATION'],
  projects: ['Projects', 'Selected Projects', 'Strategic Projects', 'PROJECTS'],
  certifications: ['Certifications', 'Certificates', 'CERTIFICATIONS'],
  achievements: ['Achievements', 'Accomplishments', 'Awards', 'Awards \\& Honors', 'Impact Highlights', 'AWARDS \\& HONORS'],
  languages: ['Languages', 'LANGUAGES'],
  publications: ['Publications', 'PUBLICATIONS'],
  volunteer: ['Volunteer Experience', 'Volunteering'],
  interests: ['Interests', 'Hobbies', 'INTERESTS'],
} as const satisfies Record<string, readonly string[]>

function replaceHtmlSection(html: string, headingTexts: readonly string[], newContent: string): string {
  let out = html
  for (const heading of headingTexts) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Lookahead stops at: next heading, </main>, </aside>, </article>, </section>, or </div></body>
    const pattern = new RegExp(
      `(<h[1-6][^>]*>\\s*${escaped}\\s*<\\/h[1-6]>)([\\s\\S]*?)(?=<h[1-6][^>]*>|<\\/main>|<\\/aside>|<\\/article>|<\\/section>|<\\/div>\\s*<\\/body>|<\\/body>)`,
      'i'
    )
    if (pattern.test(out)) {
      out = out.replace(pattern, `$1\n${newContent}\n`)
      break
    }
  }
  return out
}

function replaceLatexSection(latex: string, headingTexts: readonly string[], newContent: string): string {
  let out = latex
  for (const heading of headingTexts) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(
      `(\\\\section\\*\\{\\s*${escaped}\\s*\\})([\\s\\S]*?)(?=\\\\section\\*\\{|\\\\end\\{document\\}|\\\\end\\{minipage\\})`,
      'i'
    )
    if (pattern.test(out)) {
      out = out.replace(pattern, `$1\n${newContent}\n`)
      break
    }
  }
  return out
}

function removeHtmlSection(html: string, headingTexts: readonly string[]): string {
  let out = html
  for (const heading of headingTexts) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Lookahead stops at: next heading, </main>, </aside>, </article>, </section>, or </div></body>
    const pattern = new RegExp(
      `\\s*<h[1-6][^>]*>\\s*${escaped}\\s*<\\/h[1-6]>[\\s\\S]*?(?=<h[1-6][^>]*>|<\\/main>|<\\/aside>|<\\/article>|<\\/section>|<\\/div>\\s*<\\/body>|<\\/body>)`,
      'gi'
    )
    out = out.replace(pattern, '\n')
  }
  return out
}

function removeLatexSection(latex: string, headingTexts: readonly string[]): string {
  let out = latex
  for (const heading of headingTexts) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const p1 = new RegExp(
      `\\n\\\\section\\*\\{\\s*${escaped}\\s*\\}[\\s\\S]*?(?=\\n\\\\section\\*\\{|\\\\end\\{document\\}|\\\\end\\{minipage\\})`,
      'gi'
    )
    out = out.replace(p1, '\n')
  }
  return out
}

// ── Core render functions ────────────────────────────────────────────────────

function renderHtmlSections(block: string, data: ResumeRenderData): string {
  let out = block

  const expEntries = normalizeExperience(data.experience)
  const projEntries = normalizeProjects(data.projects)
  const eduEntries = normalizeEducation(data.education)
  const skillsStr = normalizeSkillsToString(data.skills)
  const certs = normalizeStringArray(data.certifications)
  const achievements = normalizeStringArray(data.achievements)
  const langs = normalizeStringArray(data.languagesKnown)

  const hasSummary = !isPlaceholder(data.summary)
  const hasSkills = !!skillsStr
  const hasExp = expEntries.length > 0
  const hasProjects = projEntries.length > 0
  const hasEdu = eduEntries.length > 0
  const hasCerts = certs.length > 0
  const hasAchievements = achievements.length > 0
  const hasLanguages = langs.length > 0

  // Replace or remove each section
  if (hasSummary) {
    out = replaceHtmlSection(out, SECTION_HEADING_ALIASES.summary, buildHtmlSummary(data.summary!))
  } else {
    out = removeHtmlSection(out, SECTION_HEADING_ALIASES.summary)
  }

  if (hasSkills) {
    out = replaceHtmlSection(out, SECTION_HEADING_ALIASES.skills, buildHtmlSkills(skillsStr))
  } else {
    out = removeHtmlSection(out, SECTION_HEADING_ALIASES.skills)
  }

  if (hasExp) {
    out = replaceHtmlSection(out, SECTION_HEADING_ALIASES.experience, buildHtmlExperience(expEntries))
  } else {
    out = removeHtmlSection(out, SECTION_HEADING_ALIASES.experience)
  }

  if (hasProjects) {
    out = replaceHtmlSection(out, SECTION_HEADING_ALIASES.projects, buildHtmlProjects(projEntries))
  } else {
    out = removeHtmlSection(out, SECTION_HEADING_ALIASES.projects)
  }

  if (hasEdu) {
    out = replaceHtmlSection(out, SECTION_HEADING_ALIASES.education, buildHtmlEducation(eduEntries))
  } else {
    out = removeHtmlSection(out, SECTION_HEADING_ALIASES.education)
  }

  if (hasCerts) {
    out = replaceHtmlSection(out, SECTION_HEADING_ALIASES.certifications, buildHtmlList(certs))
  } else {
    out = removeHtmlSection(out, SECTION_HEADING_ALIASES.certifications)
  }

  if (hasAchievements) {
    out = replaceHtmlSection(out, SECTION_HEADING_ALIASES.achievements, buildHtmlList(achievements))
  } else {
    out = removeHtmlSection(out, SECTION_HEADING_ALIASES.achievements)
  }

  if (hasLanguages) {
    out = replaceHtmlSection(
      out,
      SECTION_HEADING_ALIASES.languages,
      `  <p style="font-size:10.5px;line-height:1.6">${safeHtml(langs.join(', '))}</p>`
    )
  } else {
    out = removeHtmlSection(out, SECTION_HEADING_ALIASES.languages)
  }

  // Always remove unused standard sections
  out = removeHtmlSection(out, SECTION_HEADING_ALIASES.publications)
  out = removeHtmlSection(out, SECTION_HEADING_ALIASES.volunteer)
  out = removeHtmlSection(out, SECTION_HEADING_ALIASES.interests)

  return out.replace(/\n{3,}/g, '\n\n')
}

function renderLatexSections(block: string, data: ResumeRenderData): string {
  let out = block

  const expEntries = normalizeExperience(data.experience)
  const projEntries = normalizeProjects(data.projects)
  const eduEntries = normalizeEducation(data.education)
  const skillsStr = normalizeSkillsToString(data.skills)
  const certs = normalizeStringArray(data.certifications)
  const achievements = normalizeStringArray(data.achievements)
  const langs = normalizeStringArray(data.languagesKnown)

  const hasSummary = !isPlaceholder(data.summary)
  const hasSkills = !!skillsStr
  const hasExp = expEntries.length > 0
  const hasProjects = projEntries.length > 0
  const hasEdu = eduEntries.length > 0
  const hasCerts = certs.length > 0
  const hasAchievements = achievements.length > 0
  const hasLanguages = langs.length > 0

  if (hasSummary) {
    out = replaceLatexSection(out, SECTION_HEADING_ALIASES.summary, buildLatexSummary(data.summary!))
  } else {
    out = removeLatexSection(out, SECTION_HEADING_ALIASES.summary)
  }

  if (hasSkills) {
    out = replaceLatexSection(out, SECTION_HEADING_ALIASES.skills, buildLatexSkills(skillsStr))
  } else {
    out = removeLatexSection(out, SECTION_HEADING_ALIASES.skills)
  }

  if (hasExp) {
    out = replaceLatexSection(out, SECTION_HEADING_ALIASES.experience, buildLatexExperience(expEntries))
  } else {
    out = removeLatexSection(out, SECTION_HEADING_ALIASES.experience)
  }

  if (hasProjects) {
    out = replaceLatexSection(out, SECTION_HEADING_ALIASES.projects, buildLatexProjects(projEntries))
  } else {
    out = removeLatexSection(out, SECTION_HEADING_ALIASES.projects)
  }

  if (hasEdu) {
    out = replaceLatexSection(out, SECTION_HEADING_ALIASES.education, buildLatexEducation(eduEntries))
  } else {
    out = removeLatexSection(out, SECTION_HEADING_ALIASES.education)
  }

  if (hasCerts) {
    out = replaceLatexSection(out, SECTION_HEADING_ALIASES.certifications, buildLatexList(certs))
  } else {
    out = removeLatexSection(out, SECTION_HEADING_ALIASES.certifications)
  }

  if (hasAchievements) {
    out = replaceLatexSection(out, SECTION_HEADING_ALIASES.achievements, buildLatexList(achievements))
  } else {
    out = removeLatexSection(out, SECTION_HEADING_ALIASES.achievements)
  }

  if (hasLanguages) {
    out = replaceLatexSection(
      out,
      SECTION_HEADING_ALIASES.languages,
      safeLatex(langs.join(', '))
    )
  } else {
    out = removeLatexSection(out, SECTION_HEADING_ALIASES.languages)
  }

  out = removeLatexSection(out, SECTION_HEADING_ALIASES.publications)
  out = removeLatexSection(out, SECTION_HEADING_ALIASES.volunteer)
  out = removeLatexSection(out, SECTION_HEADING_ALIASES.interests)

  return out.replace(/\n{3,}/g, '\n\n')
}

// ── Default fallback templates ───────────────────────────────────────────────

function defaultHtml(data: ResumeRenderData): string {
  const expEntries = normalizeExperience(data.experience)
  const projEntries = normalizeProjects(data.projects)
  const eduEntries = normalizeEducation(data.education)
  const skillsStr = normalizeSkillsFlat(data.skills)
  const certs = normalizeStringArray(data.certifications)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; padding: 20px; }
.resume { max-width: 794px; margin: 0 auto; padding: 30px; }
h1 { font-size: 22px; margin-bottom: 4px; }
h2 { font-size: 12px; margin: 16px 0 8px; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 3px; }
.contact { font-size: 10.5px; color: #444; margin-bottom: 12px; }
.entry { margin-bottom: 14px; }
.entry-header { display: flex; justify-content: space-between; align-items: baseline; }
.entry-title { font-weight: 600; font-size: 11px; }
.entry-date { font-size: 10px; color: #666; }
.entry-sub { font-size: 10px; color: #666; margin-top: 1px; }
.skills-text { font-size: 10.5px; line-height: 1.5; }
ul { margin: 4px 0 0 18px; }
li { font-size: 10.5px; line-height: 1.6; margin-bottom: 2px; }
p { font-size: 10.5px; line-height: 1.6; }
</style>
</head>
<body>
<div class="resume">
  <h1>${safeHtml(data.fullName)}</h1>
  <div class="contact">${safeHtml(data.email)} | ${safeHtml(data.phone)}${data.location ? ` | ${safeHtml(data.location)}` : ''}</div>
${!isPlaceholder(data.summary) ? `  <h2>Summary</h2>\n  <p>${safeHtml(data.summary!)}</p>` : ''}
${skillsStr ? `  <h2>Skills</h2>\n  <div class="skills-text">${safeHtml(skillsStr)}</div>` : ''}
${expEntries.length > 0 ? `  <h2>Experience</h2>\n${buildHtmlExperience(expEntries)}` : ''}
${projEntries.length > 0 ? `  <h2>Projects</h2>\n${buildHtmlProjects(projEntries)}` : ''}
${eduEntries.length > 0 ? `  <h2>Education</h2>\n${buildHtmlEducation(eduEntries)}` : ''}
${certs.length > 0 ? `  <h2>Certifications</h2>\n${buildHtmlList(certs)}` : ''}
</div>
</body>
</html>`
}

function defaultLatex(data: ResumeRenderData): string {
  const expEntries = normalizeExperience(data.experience)
  const projEntries = normalizeProjects(data.projects)
  const eduEntries = normalizeEducation(data.education)
  const skillsStr = normalizeSkillsFlat(data.skills)
  const certs = normalizeStringArray(data.certifications)

  return `\\documentclass[10pt]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}

\\titlespacing*{\\section}{0pt}{10pt}{5pt}
\\titleformat{\\section}{\\normalsize\\bfseries\\uppercase}{}{0em}{}[\\titlerule]

\\setlength{\\parskip}{0.35em}
\\setlist[itemize]{leftmargin=*,topsep=0.15em,itemsep=0.08em}

\\begin{document}

\\begin{center}
{\\Large\\textbf{${safeLatex(data.fullName)}}}\\\\[0.2cm]
{\\small ${safeLatex(data.email)} | ${safeLatex(data.phone)}${data.location ? ` | ${safeLatex(data.location)}` : ''}}
\\end{center}

\\vspace{0.3cm}

${!isPlaceholder(data.summary) ? `\\section*{Summary}\n${buildLatexSummary(data.summary!)}\n` : ''}
${skillsStr ? `\\section*{Skills}\n${buildLatexSkills(skillsStr)}\n` : ''}
${expEntries.length > 0 ? `\\section*{Experience}\n${buildLatexExperience(expEntries)}\n` : ''}
${projEntries.length > 0 ? `\\section*{Projects}\n${buildLatexProjects(projEntries)}\n` : ''}
${eduEntries.length > 0 ? `\\section*{Education}\n${buildLatexEducation(eduEntries)}\n` : ''}
${certs.length > 0 ? `\\section*{Certifications}\n${buildLatexList(certs)}\n` : ''}
\\end{document}`
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Renders a template with the given data. Used for BOTH preview and fallback.
 * This is the SINGLE SOURCE OF TRUTH for template rendering.
 *
 * @param styleGuide  The template's styleGuide string
 * @param format      'html' or 'latex'
 * @param data        ResumeRenderData (DUMMY_RESUME_DATA for preview, user data for generation)
 */
export function renderTemplate(
  styleGuide: string | undefined,
  format: 'html' | 'latex',
  data: ResumeRenderData
): string {
  const kind = format === 'html' ? 'HTML' : 'LaTeX'
  const block = extractMandatoryBlock(styleGuide, kind)

  if (!block) {
    return format === 'html' ? defaultHtml(data) : defaultLatex(data)
  }

  // Step 1: Replace header/contact placeholders
  let out = replaceContactPlaceholders(block, data)

  // Step 2: Replace section content with formatted data
  out = format === 'html' ? renderHtmlSections(out, data) : renderLatexSections(out, data)

  // Step 3: Ensure full document wrapper
  if (format === 'html') {
    if (!out.toLowerCase().includes('<!doctype html')) {
      out = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n</head>\n<body>\n${out}\n</body>\n</html>`
    }
  } else {
    if (!out.includes('\\begin{document}')) {
      out = `\\documentclass[10pt]{article}\n\\usepackage[margin=0.75in]{geometry}\n\\usepackage{enumitem}\n\\usepackage{titlesec}\n\n\\begin{document}\n${out}\n\\end{document}`
    }
  }

  return out
}

/**
 * Converts structured ResumeRenderData to flat key-value strings
 * for backward compatibility with the AI generation pipeline.
 */
export function flattenResumeData(data: ResumeRenderData): {
  fullName: string
  email: string
  phone: string
  skills: string
  experience: string
  education: string
  projects: string
  additionalInstructions?: string
  templateStyleGuide?: string
} {
  const expEntries = normalizeExperience(data.experience)
  const projEntries = normalizeProjects(data.projects)
  const eduEntries = normalizeEducation(data.education)

  const experienceText = expEntries
    .map(
      (e) =>
        `${e.role} | ${e.company} | ${e.duration}\n${e.points.map((p) => `• ${p}`).join('\n')}`
    )
    .join('\n\n')

  const projectsText = projEntries
    .map(
      (p) =>
        `${p.name}${p.tech ? ` | ${p.tech}` : ''}\n${p.points.map((pt) => `• ${pt}`).join('\n')}`
    )
    .join('\n\n')

  const educationText = eduEntries
    .map((e) => `${e.degree}\n${e.college} | ${e.year}`)
    .join('\n\n')

  return {
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    skills: normalizeSkillsFlat(data.skills),
    experience: experienceText || 'Not provided',
    education: educationText || 'Not provided',
    projects: projectsText || 'Not provided',
    additionalInstructions: data.additionalInstructions,
  }
}
