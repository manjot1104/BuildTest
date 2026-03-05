'use server'

import { getSession } from '@/server/better-auth/server'
import { db } from '@/server/db'
import { user_resumes, resume_templates } from '@/server/db/schema'
import { eq, desc } from 'drizzle-orm'
import { generatePDFFromLatexPuppeteer } from '@/server/services/pdf.service'
import { getV0Client } from '@/lib/v0-client'
import {
  hasEnoughCredits,
  deductCreditsForPrompt,
  hasActiveSubscription,
} from '@/server/services/credits.service'
import type { ApiErrorResponse } from '@/types/api.types'
import crypto from 'crypto'

interface ResumeData {
  personalInfo: {
    name: string
    email: string
    phone: string
    address?: string
    linkedin?: string
    github?: string
    website?: string
  }
  summary?: string
  experience: Array<{
    company: string
    position: string
    startDate: string
    endDate?: string
    description: string[]
    achievements?: string[]
  }>
  education: Array<{
    institution: string
    degree: string
    field?: string
    startDate: string
    endDate?: string
    gpa?: string
    honors?: string[]
  }>
  skills: Array<{
    category: string
    items: string[]
  }>
  projects?: Array<{
    name: string
    description: string
    technologies: string[]
    link?: string
  }>
  certifications?: Array<{
    name: string
    issuer: string
    date: string
    credentialId?: string
  }>
  languages?: Array<{
    language: string
    proficiency: string
  }>
}

/**
 * Generate LaTeX resume using AI (V0 SDK or OpenAI)
 */
export async function generateResumeLatexHandler({
  body,
}: {
  body: {
    resumeData: ResumeData
    templateId?: string
  }
}): Promise<
  | {
      latex: string
      resumeId: string
    }
  | ApiErrorResponse
> {
  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return { error: 'Unauthorized', status: 401 }
    }

    
    const { resumeData, templateId } = body

    // Get template if provided
    let template: typeof resume_templates.$inferSelect | undefined
    if (templateId) {
      template = await db.query.resume_templates.findFirst({
        where: eq(resume_templates.id, templateId),
      })
    }

    // If no template, get default
    if (!template) {
      template = await db.query.resume_templates.findFirst({
        where: eq(resume_templates.is_default, true),
      })
    }

    // Create prompt for AI
    const prompt = createResumePrompt(resumeData, template?.latex_template)

    // Generate LaTeX using V0 SDK or OpenAI
    const v0 = await getV0Client()
    
    // Use V0 chat to generate LaTeX
    const chatResult = await v0.chats.create({
      message: prompt,
      responseMode: 'sync',
    })

    // Extract LaTeX from response
    let latexContent = ''
    if (typeof chatResult === 'object' && 'messages' in chatResult) {
      const lastMessage = chatResult.messages?.[chatResult.messages.length - 1]
      if (lastMessage && typeof lastMessage.content === 'string') {
        latexContent = extractLatexFromResponse(lastMessage.content)
      }
    }

    if (!latexContent) {
      return {
        error: 'Failed to generate LaTeX',
        message: 'AI did not return valid LaTeX content',
        status: 500,
      }
    }

    // Save resume to database
    const resumeId = crypto.randomUUID()
    await db.insert(user_resumes).values({
      id: resumeId,
      user_id: session.user.id,
      template_id: template?.id ?? null,
      resume_data: JSON.stringify(resumeData),
      latex_content: latexContent,
      title: `${resumeData.personalInfo.name} - Resume`,
    })

    return {
      latex: latexContent,
      resumeId,
    }
  } catch (error) {
    console.error('Error generating resume LaTeX:', error)
    return {
      error: 'Failed to generate resume',
      message: error instanceof Error ? error.message : 'Unknown error',
      status: 500,
    }
  }
}

/**
 * Generate PDF from LaTeX resume
 */
export async function generateResumePDFHandler({
  body,
}: {
  body: {
    resumeId: string
    latex?: string
  }
}): Promise<
  | {
      pdfUrl: string
      pdfBuffer: string // Base64 encoded
    }
  | ApiErrorResponse
> {
  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return { error: 'Unauthorized', status: 401 }
    }

    const { resumeId, latex } = body

    // Get resume from database
    const resume = await db.query.user_resumes.findFirst({
      where: eq(user_resumes.id, resumeId),
    })

    if (!resume) {
      return { error: 'Resume not found', status: 404 }
    }

    // Check ownership
    if (resume.user_id !== session.user.id) {
      return { error: 'Forbidden', status: 403 }
    }

    // Use provided LaTeX or from database
    const latexContent = latex || resume.latex_content
    if (!latexContent) {
      return { error: 'LaTeX content not found', status: 404 }
    }

    // Generate PDF
    const pdfBuffer = await generatePDFFromLatexPuppeteer({
      latexContent,
      filename: `resume_${resumeId}`,
    })

    // Convert to base64 for response
    const pdfBase64 = pdfBuffer.toString('base64')

    // Update resume with PDF URL (if you want to store it)
    // For now, we'll return it directly

    return {
      pdfUrl: `data:application/pdf;base64,${pdfBase64}`,
      pdfBuffer: pdfBase64,
    }
  } catch (error) {
    console.error('Error generating PDF:', error)
    return {
      error: 'Failed to generate PDF',
      message: error instanceof Error ? error.message : 'Unknown error',
      status: 500,
    }
  }
}

/**
 * Get user's resumes
 */
export async function getUserResumesHandler(): Promise<
  | {
      resumes: Array<{
        id: string
        title: string | null
        created_at: Date
        updated_at: Date
        pdf_url: string | null
      }>
    }
  | ApiErrorResponse
> {
  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return { error: 'Unauthorized', status: 401 }
    }

    const resumes = await db.query.user_resumes.findMany({
      where: eq(user_resumes.user_id, session.user.id),
      orderBy: [desc(user_resumes.created_at)],
      columns: {
        id: true,
        title: true,
        created_at: true,
        updated_at: true,
        pdf_url: true,
      },
    })

    return { resumes }
  } catch (error) {
    console.error('Error fetching resumes:', error)
    return {
      error: 'Failed to fetch resumes',
      message: error instanceof Error ? error.message : 'Unknown error',
      status: 500,
    }
  }
}

/**
 * Get resume by ID
 */
export async function getResumeByIdHandler({
  params,
}: {
  params: { id: string }
}): Promise<
  | {
      resume: {
        id: string
        title: string | null
        resume_data: ResumeData
        latex_content: string | null
        pdf_url: string | null
        created_at: Date
        updated_at: Date
      }
    }
  | ApiErrorResponse
> {
  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return { error: 'Unauthorized', status: 401 }
    }

    const resume = await db.query.user_resumes.findFirst({
      where: eq(user_resumes.id, params.id),
    })

    if (!resume) {
      return { error: 'Resume not found', status: 404 }
    }

    if (resume.user_id !== session.user.id) {
      return { error: 'Forbidden', status: 403 }
    }

    return {
      resume: {
        id: resume.id,
        title: resume.title,
        resume_data: JSON.parse(resume.resume_data) as ResumeData,
        latex_content: resume.latex_content,
        pdf_url: resume.pdf_url,
        created_at: resume.created_at,
        updated_at: resume.updated_at,
      },
    }
  } catch (error) {
    console.error('Error fetching resume:', error)
    return {
      error: 'Failed to fetch resume',
      message: error instanceof Error ? error.message : 'Unknown error',
      status: 500,
    }
  }
}

// Helper functions

function createResumePrompt(
  resumeData: ResumeData,
  template?: string | null
): string {
  const prompt = `Generate a professional LaTeX resume document based on the following information. 

${template ? `Use this LaTeX template as a base:\n\n${template}\n\n` : ''}

Resume Data:
${JSON.stringify(resumeData, null, 2)}

Requirements:
1. Use proper LaTeX formatting with appropriate packages (moderncv, article, or similar)
2. Include all sections: Personal Information, Summary, Experience, Education, Skills, Projects, Certifications, Languages
3. Use professional typography and spacing
4. Ensure proper section headers and formatting
5. Include only the LaTeX code, no explanations or markdown

Generate the complete LaTeX document:`

  return prompt
}

function extractLatexFromResponse(response: string): string {
    // Try to extract LaTeX code blocks
    const codeBlockRegex = /```(?:latex|tex)?\n([\s\S]*?)```/i
    const matches = codeBlockRegex.exec(response)
  
    if (matches?.[1]) {
      return matches[1].trim()
    }
  
    // If no fenced code block, check if full response contains LaTeX document
    if (
      response.includes('\\documentclass') ||
      response.includes('\\begin{document}')
    ) {
      return response.trim()
    }
  
    return ''
  }