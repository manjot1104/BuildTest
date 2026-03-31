type ResumeSectionInput = {
  fullName?: string
  email?: string
  phone?: string
  summary?: string
  skills?: string
  experience?: string
  education?: string
  projects?: string
  certifications?: string
  achievements?: string
  languagesKnown?: string
  additionalInstructions?: string
}

function hasValue(value: string | undefined | null): boolean {
  if (!value) return false
  const cleaned = value.trim().toLowerCase()
  if (!cleaned) return false
  return !['not specified', 'not provided', 'n/a', 'na', 'none', '-', '--'].includes(cleaned)
}

function removeHtmlSectionByHeading(html: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(
    `\\s*<h[1-6][^>]*>\\s*${escaped}\\s*<\\/h[1-6]>[\\s\\S]*?(?=<h[1-6][^>]*>|<\\/main>|<\\/article>|<\\/body>)`,
    'gi'
  )
  return html.replace(pattern, '')
}

function removeLatexSectionByHeading(latex: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const p1 = new RegExp(
    `\\n\\\\section\\*\\{\\s*${escaped}\\s*\\}[\\s\\S]*?(?=\\n\\\\section\\*\\{|\\n\\\\textbf\\{|\\\\end\\{document\\}|\\\\end\\{minipage\\})`,
    'gi'
  )
  const p2 = new RegExp(
    `\\n\\\\textbf\\{\\s*${escaped}\\s*\\}[\\s\\S]*?(?=\\n\\\\section\\*\\{|\\n\\\\textbf\\{|\\\\end\\{document\\}|\\\\end\\{minipage\\})`,
    'gi'
  )
  return latex.replace(p1, '\n').replace(p2, '\n')
}

const SECTION_ALIASES: Record<string, string[]> = {
  summary: ['Summary', 'Professional Summary', 'Profile'],
  objective: ['Objective', 'Career Objective'],
  skills: ['Skills', 'Technical Skills', 'Core Skills'],
  experience: ['Experience', 'Work Experience', 'Employment History'],
  education: ['Education', 'Academic Background'],
  projects: ['Projects', 'Selected Projects'],
  certifications: ['Certifications', 'Certificates'],
  achievements: ['Achievements', 'Accomplishments'],
  languages: ['Languages'],
  publications: ['Publications'],
  volunteer: ['Volunteer Experience', 'Volunteering'],
  interests: ['Interests', 'Hobbies'],
}

function cleanupHtmlSpacing(html: string): string {
  return html
    .replace(/\n{3,}/g, '\n\n')
    .replace(/>\s+</g, '><')
    .replace(/<\/(section|article|main)>\s*<(h[1-6])/gi, '</$1><$2')
}

function cleanupLatexSpacing(latex: string): string {
  return latex
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
}

/**
 * Removes sections from HTML/LaTeX output when user did not provide corresponding data.
 */
export function pruneGeneratedSections(
  code: string,
  format: 'html' | 'latex',
  input: ResumeSectionInput
): string {
  const has = {
    summary: hasValue(input.summary),
    objective: false, // no explicit objective field currently
    skills: hasValue(input.skills),
    experience: hasValue(input.experience),
    education: hasValue(input.education),
    projects: hasValue(input.projects),
    certifications: hasValue(input.certifications),
    achievements: hasValue(input.achievements),
    languages: hasValue(input.languagesKnown),
    publications: false,
    volunteer: false,
    interests: false,
  }

  let out = code
  for (const [key, headings] of Object.entries(SECTION_ALIASES)) {
    if ((has as Record<string, boolean>)[key]) continue
    for (const h of headings) {
      out =
        format === 'html'
          ? removeHtmlSectionByHeading(out, h)
          : removeLatexSectionByHeading(out, h)
    }
  }

  return format === 'html' ? cleanupHtmlSpacing(out) : cleanupLatexSpacing(out)
}
