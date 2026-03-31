/**
 * Template Fallback Generator
 *
 * Uses the EXACT SAME renderTemplate() function as the preview system.
 * This guarantees that what users see in preview is what they get when
 * AI is unavailable and the fallback kicks in.
 */

import { renderTemplate, type ResumeRenderData } from './template-renderer'
import type { NormalizedResumeInput } from './template-validator'

/**
 * Accepts the NormalizedResumeInput (flat strings from the API validator)
 * and converts it to ResumeRenderData for the shared renderer.
 */
function toRenderData(data: NormalizedResumeInput): ResumeRenderData {
  return {
    fullName: data.fullName,
    title: data.title || undefined,
    email: data.email,
    phone: data.phone,
    location: data.location || undefined,
    linkedin: data.linkedin || undefined,
    github: data.github || undefined,
    portfolio: data.portfolio || undefined,
    summary: data.summary || undefined,
    skills: data.skills,
    experience: data.experience,
    education: data.education,
    projects: data.projects,
    certifications: data.certifications || undefined,
    achievements: data.achievements || undefined,
    languagesKnown: data.languagesKnown || undefined,
  }
}

export function generateHtmlTemplateFallback(data: NormalizedResumeInput): string {
  return renderTemplate(data.templateStyleGuide, 'html', toRenderData(data))
}

export function generateLatexTemplateFallback(data: NormalizedResumeInput): string {
  return renderTemplate(data.templateStyleGuide, 'latex', toRenderData(data))
}
