import type {
  ResumeData,
  ResumeEducationEntry,
  ResumeExperienceEntry,
  ResumeProjectEntry,
} from "./types"

/**
 * Subset of the AI resume builder form — keep in sync with `resumeSchema` on the page.
 */
/** Narrow any resume-builder form snapshot to fields used by the text-layout engine. */
export function pickAiResumeLayoutFields(data: Partial<ResumeFormLike>): ResumeFormLike {
  return {
    fullName: data.fullName ?? "",
    email: data.email ?? "",
    phone: data.phone ?? "",
    title: data.title,
    location: data.location,
    linkedin: data.linkedin,
    github: data.github,
    portfolio: data.portfolio,
    summary: data.summary,
    skills: data.skills,
    experience: data.experience,
    education: data.education,
    projects: data.projects,
    certifications: data.certifications,
    achievements: data.achievements,
    languagesKnown: data.languagesKnown,
  }
}

export type ResumeFormLike = {
  fullName: string
  title?: string
  email: string
  phone: string
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

function splitSkills(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseExperienceBlocks(raw: string | undefined): ResumeExperienceEntry[] {
  if (!raw?.trim()) return []
  const blocks = raw
    .split(/\n(?:\s*\n)+/)
    .map((b) => b.trim())
    .filter(Boolean)
  if (blocks.length === 0) return []

  return blocks.map((block) => {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
    const first = lines[0] ?? ""
    const rest = lines.slice(1)
    const m = first.match(/^(.+?)\s*[|·•—–-]\s*(.+)$/)
    if (m?.[1] && m?.[2]) {
      return {
        title: m[1]!.trim(),
        company: m[2]!.trim(),
        bullets: rest.length > 0 ? rest : undefined,
      }
    }
    return {
      title: first,
      company: "",
      bullets: rest.length > 0 ? rest : undefined,
    }
  })
}

function parseProjectBlocks(raw: string | undefined): ResumeProjectEntry[] {
  if (!raw?.trim()) return []
  const blocks = raw
    .split(/\n(?:\s*\n)+/)
    .map((b) => b.trim())
    .filter(Boolean)
  if (blocks.length === 0) return []

  return blocks.map((block) => {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
    const first = lines[0] ?? ""
    const rest = lines.slice(1)
    const m = first.match(/^(.+?)\s*[|·•—–-]\s*(.+)$/)
    if (m?.[1] && m?.[2]) {
      return {
        name: m[1]!.trim(),
        tech: m[2]!.trim(),
        bullets: rest.length > 0 ? rest : undefined,
      }
    }
    return {
      name: first,
      bullets: rest.length > 0 ? rest : undefined,
    }
  })
}

function parseEducationBlocks(raw: string | undefined): ResumeEducationEntry[] {
  if (!raw?.trim()) return []
  const blocks = raw
    .split(/\n(?:\s*\n)+/)
    .map((b) => b.trim())
    .filter(Boolean)
  if (blocks.length === 0) return []

  return blocks.map((block) => {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
    const first = lines[0] ?? ""
    const rest = lines.slice(1).join("\n")
    const m = first.match(/^(.+?)\s*[|·•—–-]\s*(.+)$/)
    if (m?.[1] && m?.[2]) {
      return {
        institution: m[1]!.trim(),
        degree: m[2]!.trim(),
        details: rest.length > 0 ? rest : undefined,
      }
    }
    return {
      institution: first,
      degree: undefined,
      details: rest.length > 0 ? rest : undefined,
    }
  })
}

function buildContactLine(form: ResumeFormLike): string | undefined {
  const parts = [
    form.email,
    form.phone,
    form.location,
    form.title,
    form.linkedin,
    form.github,
    form.portfolio,
  ].filter((p): p is string => typeof p === "string" && p.trim().length > 0)
  if (parts.length === 0) return undefined
  return parts.join(" · ")
}

/**
 * Maps free-form AI resume builder fields into structured {@link ResumeData} for `generateResumeLayout`.
 *
 * - **Experience / education**: paragraphs split on blank lines become separate entries; first line may use `Title | Company` style.
 * - **Skills / certifications / achievements**: comma, semicolon, or newline separated.
 * - **Projects**: same block rules as experience; first line `Name | Tech stack`.
 */
export function resumeFormToResumeData(form: ResumeFormLike): ResumeData {
  const header = {
    name: form.fullName.trim(),
    contact: buildContactLine(form),
  }

  const summary = form.summary?.trim() || undefined
  const experience = parseExperienceBlocks(form.experience)
  const education = parseEducationBlocks(form.education)
  const skills = splitSkills(form.skills)
  const projects = parseProjectBlocks(form.projects)
  const certifications = splitSkills(form.certifications)
  const achievements = splitSkills(form.achievements)
  const languagesLine = form.languagesKnown?.trim() || undefined

  return {
    header,
    ...(summary ? { summary } : {}),
    ...(experience.length > 0 ? { experience } : {}),
    ...(education.length > 0 ? { education } : {}),
    ...(skills.length > 0 ? { skills } : {}),
    ...(projects.length > 0 ? { projects } : {}),
    ...(certifications.length > 0 ? { certifications } : {}),
    ...(achievements.length > 0 ? { achievements } : {}),
    ...(languagesLine ? { languagesLine } : {}),
  }
}
