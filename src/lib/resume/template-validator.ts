import { z } from 'zod'

const MAX_TEXT = 100000

/**
 * Incoming resume schema — accepts BOTH:
 *   • New structured format (arrays/objects)
 *   • Old flat-text format (strings) for backward compatibility
 *
 * The API normalizes everything into NormalizedResumeInput so downstream
 * code never needs to worry about which format arrived.
 */
const incomingResumeSchema = z.object({
  templateType: z.enum(['latex', 'html']).optional(),
  fullName: z.string().max(100).optional(),
  title: z.string().max(200).optional(),
  email: z.string().max(255).optional().or(z.literal('')),
  phone: z.string().max(40).optional(),
  location: z.string().max(200).optional(),
  linkedin: z.string().max(300).optional(),
  github: z.string().max(300).optional(),
  portfolio: z.string().max(300).optional(),

  summary: z.string().max(MAX_TEXT).optional(),

  // Skills — string or structured object
  skills: z
    .union([
      z.string().max(MAX_TEXT),
      z.object({
        languages: z.array(z.string()).optional(),
        frameworks: z.array(z.string()).optional(),
        tools: z.array(z.string()).optional(),
        other: z.array(z.string()).optional(),
      }),
    ])
    .optional(),

  // Experience — string or structured array
  experience: z
    .union([
      z.string().max(MAX_TEXT),
      z.array(
        z.object({
          role: z.string(),
          company: z.string(),
          duration: z.string(),
          points: z.array(z.string()),
        })
      ),
    ])
    .optional(),

  // Projects — string or structured array
  projects: z
    .union([
      z.string().max(MAX_TEXT),
      z.array(
        z.object({
          name: z.string(),
          tech: z.string().optional(),
          points: z.array(z.string()),
        })
      ),
    ])
    .optional(),

  // Education — string or structured array
  education: z
    .union([
      z.string().max(MAX_TEXT),
      z.array(
        z.object({
          degree: z.string(),
          college: z.string(),
          year: z.string(),
        })
      ),
    ])
    .optional(),

  certifications: z.union([z.array(z.string()), z.string().max(MAX_TEXT)]).optional(),
  achievements: z.union([z.array(z.string()), z.string().max(MAX_TEXT)]).optional(),
  languagesKnown: z.union([z.array(z.string()), z.string().max(MAX_TEXT)]).optional(),

  additionalInstructions: z.string().max(5000).optional(),
  model: z.string().max(100).optional(),
  templateId: z.string().max(100).optional(),
  templateStyleGuide: z.string().max(120000).optional(),
})

/**
 * Normalized output used by the rest of the pipeline.
 * Flat strings for the AI prompt; the renderer handles parsing internally.
 */
export type NormalizedResumeInput = {
  fullName: string
  title: string
  email: string
  phone: string
  location: string
  linkedin: string
  github: string
  portfolio: string
  summary: string
  skills: string
  experience: string
  education: string
  projects: string
  certifications: string
  achievements: string
  languagesKnown: string
  additionalInstructions?: string
  model?: string
  templateId?: string
  templateStyleGuide?: string
  missingSections: string[]
}

function cleanText(value: string | undefined): string {
  return (value ?? '').trim()
}

function flattenSkills(
  raw: string | { languages?: string[]; frameworks?: string[]; tools?: string[]; other?: string[] } | undefined
): string {
  if (!raw) return ''
  if (typeof raw === 'string') return raw.trim()

  const parts: string[] = []
  if (raw.languages?.length) parts.push(`Languages: ${raw.languages.join(', ')}`)
  if (raw.frameworks?.length) parts.push(`Frameworks: ${raw.frameworks.join(', ')}`)
  if (raw.tools?.length) parts.push(`Tools: ${raw.tools.join(', ')}`)
  if (raw.other?.length) parts.push(`Other: ${raw.other.join(', ')}`)
  return parts.join(' | ')
}

function flattenExperience(
  raw: string | Array<{ role: string; company: string; duration: string; points: string[] }> | undefined
): string {
  if (!raw) return ''
  if (typeof raw === 'string') return raw.trim()
  return raw
    .map((e) => `${e.role} | ${e.company} | ${e.duration}\n${e.points.map((p) => `• ${p}`).join('\n')}`)
    .join('\n\n')
}

function flattenProjects(
  raw: string | Array<{ name: string; tech?: string; points: string[] }> | undefined
): string {
  if (!raw) return ''
  if (typeof raw === 'string') return raw.trim()
  return raw
    .map((p) => `${p.name}${p.tech ? ` | ${p.tech}` : ''}\n${p.points.map((pt) => `• ${pt}`).join('\n')}`)
    .join('\n\n')
}

function flattenEducation(
  raw: string | Array<{ degree: string; college: string; year: string }> | undefined
): string {
  if (!raw) return ''
  if (typeof raw === 'string') return raw.trim()
  return raw.map((e) => `${e.degree}\n${e.college} | ${e.year}`).join('\n\n')
}

function flattenStringArray(raw: string | string[] | undefined): string {
  if (!raw) return ''
  if (typeof raw === 'string') return raw.trim()
  return raw.join(', ')
}

/**
 * Normalizes potentially partial resume payloads so template rendering never
 * breaks on missing keys. Accepts both structured and flat-text formats.
 */
export function normalizeResumeInput(payload: unknown): NormalizedResumeInput {
  const parsed = incomingResumeSchema.parse(payload)

  const fullName = cleanText(parsed.fullName) || 'Candidate Name'
  const title = cleanText(parsed.title) || ''
  const email = cleanText(parsed.email) || 'candidate@example.com'
  const phone = cleanText(parsed.phone) || '+1 000 000 0000'
  const location = cleanText(parsed.location) || ''
  const linkedin = cleanText(parsed.linkedin) || ''
  const github = cleanText(parsed.github) || ''
  const portfolio = cleanText(parsed.portfolio) || ''
  const summary = cleanText(parsed.summary) || ''
  const skills = flattenSkills(parsed.skills) || ''
  const experience = flattenExperience(parsed.experience) || ''
  const education = flattenEducation(parsed.education) || ''
  const projects = flattenProjects(parsed.projects) || ''
  const certifications = flattenStringArray(parsed.certifications) || ''
  const achievements = flattenStringArray(parsed.achievements) || ''
  const languagesKnown = flattenStringArray(parsed.languagesKnown) || ''

  const missingSections: string[] = []
  if (!skills) missingSections.push('skills')
  if (!experience) missingSections.push('experience')
  if (!education) missingSections.push('education')
  if (!projects) missingSections.push('projects')
  if (!summary) missingSections.push('summary')

  return {
    fullName,
    title,
    email,
    phone,
    location,
    linkedin,
    github,
    portfolio,
    summary,
    skills,
    experience,
    education,
    projects,
    certifications,
    achievements,
    languagesKnown,
    additionalInstructions: cleanText(parsed.additionalInstructions) || undefined,
    model: cleanText(parsed.model) || undefined,
    templateId: cleanText(parsed.templateId) || undefined,
    templateStyleGuide: cleanText(parsed.templateStyleGuide) || undefined,
    missingSections,
  }
}
