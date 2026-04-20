/**
 * SessionStorage handoff from AI Resume → Buildify Studio (`editor.tsx` reads this on /buildify-studio/new).
 */
import {
  buildPersonalizedStudioDraft,
  type PortfolioStudioResumeInput,
} from '@/lib/ai-resume/portfolio-studio-bridge'
import { type CanvasBackground, type CanvasElement } from './types'

export const RESUME_STUDIO_BOOTSTRAP_KEY = 'buildify_resume_studio_bootstrap_v1' as const

export type ResumeStudioBootstrapPayload = {
  templateId: string
  resume: PortfolioStudioResumeInput
}

export function writeResumeStudioBootstrap(payload: ResumeStudioBootstrapPayload): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(RESUME_STUDIO_BOOTSTRAP_KEY, JSON.stringify(payload))
  } catch {
    // ignore
  }
}

/** One-shot read: clears the key so refresh does not re-apply. */
export function takeResumeStudioBootstrap(): ResumeStudioBootstrapPayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(RESUME_STUDIO_BOOTSTRAP_KEY)
    if (!raw) return null
    sessionStorage.removeItem(RESUME_STUDIO_BOOTSTRAP_KEY)
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const { templateId, resume } = parsed as Partial<ResumeStudioBootstrapPayload>
    if (typeof templateId !== 'string' || !resume || typeof resume !== 'object') return null
    return { templateId, resume: resume as PortfolioStudioResumeInput }
  } catch {
    return null
  }
}

export function buildStudioLayoutFromResume(
  templateId: string,
  resume: PortfolioStudioResumeInput,
): { elements: CanvasElement[]; background: CanvasBackground } | null {
  try {
    return buildPersonalizedStudioDraft(templateId, resume)
  } catch {
    return null
  }
}

export type { PortfolioStudioResumeInput } from '@/lib/ai-resume/portfolio-studio-bridge'
