import type { ResumeRenderData } from "@/lib/resume/template-renderer"
import type { ResumeData, ResumeEducationEntry, ResumeExperienceEntry, ResumeProjectEntry } from "./types"

function splitList(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function skillsFromRender(skills: ResumeRenderData["skills"]): string[] | undefined {
  if (skills == null) return undefined
  if (typeof skills === "string") return splitList(skills)
  const parts: string[] = []
  for (const key of ["languages", "frameworks", "tools", "other"] as const) {
    const arr = skills[key]
    if (arr?.length) parts.push(...arr)
  }
  return parts.length > 0 ? parts : undefined
}

function experienceFromRender(exp: ResumeRenderData["experience"]): ResumeExperienceEntry[] | undefined {
  if (exp == null || typeof exp === "string") return undefined
  return exp.map((e) => ({
    title: e.role,
    company: e.company,
    dates: e.duration,
    bullets: e.points?.length ? e.points : undefined,
  }))
}

function educationFromRender(ed: ResumeRenderData["education"]): ResumeEducationEntry[] | undefined {
  if (ed == null || typeof ed === "string") return undefined
  return ed.map((e) => ({
    institution: e.college,
    degree: e.degree,
    dates: e.year,
  }))
}

function projectsFromRender(p: ResumeRenderData["projects"]): ResumeProjectEntry[] | undefined {
  if (p == null || typeof p === "string") return undefined
  return p.map((proj) => ({
    name: proj.name,
    tech: proj.tech,
    bullets: proj.points?.length ? proj.points : undefined,
  }))
}

function stringOrArrayToList(
  raw: ResumeRenderData["certifications"] | ResumeRenderData["achievements"],
): string[] | undefined {
  if (raw == null) return undefined
  if (Array.isArray(raw)) return raw.map((s) => s.trim()).filter(Boolean)
  return splitList(raw)
}

function languagesLineFromRender(raw: ResumeRenderData["languagesKnown"]): string | undefined {
  if (raw == null) return undefined
  if (typeof raw === "string" && raw.trim()) return raw.trim()
  if (Array.isArray(raw) && raw.length > 0) return raw.join(", ")
  return undefined
}

/**
 * Converts canonical template/renderer resume data into {@link ResumeData} for the text-layout engine.
 * Used by the template preview modal (dummy sample) and anywhere else `ResumeRenderData` is the source.
 */
export function resumeRenderDataToResumeData(data: ResumeRenderData): ResumeData {
  const contactParts = [
    data.email,
    data.phone,
    data.location,
    data.title,
    data.linkedin,
    data.github,
    data.portfolio,
  ].filter((p): p is string => typeof p === "string" && p.trim().length > 0)

  const experience = experienceFromRender(data.experience)
  const education = educationFromRender(data.education)
  const skills = skillsFromRender(data.skills)
  const projects = projectsFromRender(data.projects)
  const certifications = stringOrArrayToList(data.certifications)
  const achievements = stringOrArrayToList(data.achievements)
  const languagesLine = languagesLineFromRender(data.languagesKnown)

  return {
    header: {
      name: data.fullName.trim(),
      contact: contactParts.length > 0 ? contactParts.join(" · ") : undefined,
    },
    ...(data.summary?.trim() ? { summary: data.summary.trim() } : {}),
    ...(experience?.length ? { experience } : {}),
    ...(education?.length ? { education } : {}),
    ...(skills?.length ? { skills } : {}),
    ...(projects?.length ? { projects } : {}),
    ...(certifications?.length ? { certifications } : {}),
    ...(achievements?.length ? { achievements } : {}),
    ...(languagesLine ? { languagesLine } : {}),
  }
}
