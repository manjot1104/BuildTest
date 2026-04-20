import type { NormalizedResumeInput } from "@/lib/resume/template-validator"
import { resumeFormToResumeData, type ResumeFormLike } from "./form-to-resume-data"
import type { ResumeData } from "./types"

/**
 * Maps API-normalized resume fields (flat strings) into {@link ResumeData} for the text-layout engine.
 * Used on the server so layout metrics match the same parsing rules as the AI resume form.
 */
export function normalizedResumeInputToResumeData(input: NormalizedResumeInput): ResumeData {
  const like: ResumeFormLike = {
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    title: input.title || undefined,
    location: input.location || undefined,
    linkedin: input.linkedin || undefined,
    github: input.github || undefined,
    portfolio: input.portfolio || undefined,
    summary: input.summary || undefined,
    skills: input.skills || undefined,
    experience: input.experience || undefined,
    education: input.education || undefined,
    projects: input.projects || undefined,
    certifications: input.certifications || undefined,
    achievements: input.achievements || undefined,
    languagesKnown: input.languagesKnown || undefined,
  }
  return resumeFormToResumeData(like)
}
