import { type NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'

// Node runtime: formData + OpenRouter + PDF text extraction.
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds max
const PARSE_FILES_VERSION = '2026-04-23-parser-v3'

type ParsedResumeData = {
  fullName: string
  title?: string
  email: string
  phone: string
  location?: string
  linkedin?: string
  github?: string
  portfolio?: string
  summary?: string
  skills: string
  experience: string
  education: string
  projects: string
  certifications?: string
  achievements?: string
  languagesKnown?: string
}

type PdfJsModule = {
  getDocument: (options: {
    data: Uint8Array
    isEvalSupported?: boolean
    useSystemFonts?: boolean
    disableFontFace?: boolean
    disableWorker?: boolean
  }) => { promise: Promise<{ numPages: number; getPage: (pageNo: number) => Promise<{ getTextContent: () => Promise<{ items: Array<{ str?: string; hasEOL?: boolean }> }> }> }> }
}

async function loadPdfJsModule(): Promise<PdfJsModule> {
  try {
    return (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfJsModule
  } catch (legacyError) {
    console.warn('[parse-files] legacy pdfjs import failed, falling back to main build', legacyError)
    return (await import('pdfjs-dist')) as unknown as PdfJsModule
  }
}

type PdfParseResult = { text?: string } | string

type PdfParseModuleShape = {
  default?: (input: Buffer | Uint8Array) => Promise<PdfParseResult>
  PDFParse?: (input: Buffer | Uint8Array) => Promise<PdfParseResult>
}

async function extractTextFromPdfParse(file: File): Promise<string> {
  console.log('[parse-files] Trying PDF fallback parser (pdf-parse) for:', file.name)
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const pdfParseModule = (await import('pdf-parse')) as unknown as PdfParseModuleShape
  const parseFn = pdfParseModule.default ?? pdfParseModule.PDFParse

  if (!parseFn) {
    throw new Error('pdf-parse module loaded but parser function was not found')
  }

  const parsed = await parseFn(buffer)
  const rawText =
    typeof parsed === 'string'
      ? parsed
      : typeof parsed?.text === 'string'
        ? parsed.text
        : ''
  const normalized = normalizeResumeText(rawText)

  if (!normalized) {
    throw new Error('pdf-parse returned empty text')
  }

  console.log('[parse-files] ✅ PDF parsed (pdf-parse fallback), text length:', normalized.length)
  return normalized
}

// Test endpoint to verify route is working
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Parse files endpoint is working',
    parserVersion: PARSE_FILES_VERSION,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Extract text from PDF using pdfjs-dist legacy build.
 * This avoids runtime-native canvas dependencies and works reliably in Node 20+.
 */
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    console.log('[parse-files] Starting PDF extraction (pdfjs-dist) for:', file.name, 'Size:', file.size, 'bytes')

    if (file.size > 10 * 1024 * 1024) {
      throw new Error('PDF file is too large (max 10MB). Please use a smaller file.')
    }

    const arrayBuffer = await file.arrayBuffer()
    console.log('[parse-files] PDF buffer created, size:', arrayBuffer.byteLength, 'bytes')

    if (arrayBuffer.byteLength === 0) {
      throw new Error('PDF file is empty or could not be read')
    }

    const uint8 = new Uint8Array(arrayBuffer)
    const pdfjs = await loadPdfJsModule()
    let pdf: Awaited<ReturnType<typeof pdfjs.getDocument>>['promise'] extends Promise<infer T> ? T : never
    try {
      const loadingTask = pdfjs.getDocument({
        data: uint8,
        isEvalSupported: false,
        useSystemFonts: true,
        disableFontFace: true,
        // Required for serverless/node runtimes where worker bundling is unreliable.
        disableWorker: true,
      })
      pdf = await loadingTask.promise
    } catch (loadError) {
      const errorMsg = loadError instanceof Error ? loadError.message : String(loadError)
      console.error('[parse-files] ❌ PDF load failed:', loadError)
      if (errorMsg.includes('password') || errorMsg.includes('encrypted')) {
        throw new Error('PDF is password-protected. Please remove the password and try again.')
      }
      if (errorMsg.includes('Invalid PDF')) {
        throw new Error('PDF appears to be corrupted or invalid. Please try a different file.')
      }
      throw new Error(`PDF parsing failed: ${errorMsg}`)
    }

    const pageTexts: string[] = []
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
      const page = await pdf.getPage(pageNo)
      const content = await page.getTextContent()
      let pageText = ''
      for (const item of content.items) {
        if (!('str' in item)) continue
        const token = item.str?.trim() || ''
        if (!token) {
          if ((item as { hasEOL?: boolean }).hasEOL) pageText += '\n'
          continue
        }
        pageText += token
        pageText += (item as { hasEOL?: boolean }).hasEOL ? '\n' : ' '
      }
      pageText = pageText.replace(/[ \t]+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim()
      pageTexts.push(pageText)
    }

    const merged = pageTexts.join('\n').replace(/[ \t]+\n/g, '\n')
    console.log('[parse-files] ✅ PDF parsed (pdfjs-dist), pages:', pdf.numPages, 'text length:', merged.length)

    const trimmed = merged.trim()
    if (!trimmed) {
      console.warn('[parse-files] Warning: PDF parsed but text is empty (likely image-only pages).')
      throw new Error(
        'PDF appears to be image-based or contains no extractable text. Please use a text-based PDF or provide the content manually.',
      )
    }

    return merged
  } catch (pdfJsError) {
    console.error('[parse-files] Error extracting text from PDF (pdfjs):', pdfJsError)
    const pdfJsMessage = pdfJsError instanceof Error ? pdfJsError.message : 'Unknown error'
    const pdfJsStack = pdfJsError instanceof Error ? pdfJsError.stack : undefined
    console.error('[parse-files] Error stack (pdfjs):', pdfJsStack)

    try {
      return await extractTextFromPdfParse(file)
    } catch (fallbackError) {
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
      const mergedMessage = `pdfjs failed: ${pdfJsMessage}; pdf-parse fallback failed: ${fallbackMessage}`
      console.error('[parse-files] PDF fallback parser failed:', fallbackError)
      throw new Error(`Failed to extract text from PDF file: ${mergedMessage}`)
    }
  }
}

function isPdfFile(file: File): boolean {
  const mimeType = file.type?.toLowerCase() || ''
  const lowerName = file.name.toLowerCase()
  return mimeType === 'application/pdf' || lowerName.endsWith('.pdf')
}

function isDocxFile(file: File): boolean {
  const mimeType = file.type?.toLowerCase() || ''
  const lowerName = file.name.toLowerCase()
  return (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lowerName.endsWith('.docx')
  )
}

function isDocFile(file: File): boolean {
  const mimeType = file.type?.toLowerCase() || ''
  const lowerName = file.name.toLowerCase()
  return mimeType === 'application/msword' || lowerName.endsWith('.doc')
}

async function extractTextFromDocx(file: File): Promise<string> {
  console.log('[parse-files] Starting DOCX extraction for:', file.name, 'Size:', file.size, 'bytes')
  const arrayBuffer = await file.arrayBuffer()
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ arrayBuffer })
  const text = normalizeResumeText(result.value || '')
  console.log('[parse-files] ✅ DOCX extraction complete, text length:', text.length)
  return text
}

async function extractTextFromDoc(file: File): Promise<string> {
  // Legacy .doc is a binary format; use best-effort plain text extraction.
  console.log('[parse-files] Starting DOC extraction (best-effort) for:', file.name, 'Size:', file.size, 'bytes')
  const arrayBuffer = await file.arrayBuffer()
  const raw = Buffer.from(arrayBuffer).toString('utf8')
  const cleaned = normalizeResumeText(
    raw
      .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ')
      .replace(/\s{2,}/g, ' '),
  )
  console.log('[parse-files] ✅ DOC extraction complete (best-effort), text length:', cleaned.length)
  return cleaned
}

async function extractTextFromFile(file: File): Promise<string> {
  if (isPdfFile(file)) return extractTextFromPDF(file)
  if (isDocxFile(file)) return extractTextFromDocx(file)
  if (isDocFile(file)) return extractTextFromDoc(file)
  return normalizeResumeText(await file.text())
}

function normalizeResumeText(rawText: string): string {
  const base = rawText
    .replace(/\r/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // Match explicit ALL-CAPS section headings only (avoid sentence words like "experience")
  const headingPattern = /\b(PROFILE|SUMMARY|OBJECTIVE|TECHNICAL SKILLS|SKILLS|EXPERIENCE|WORK EXPERIENCE|EDUCATION|PROJECTS|CERTIFICATIONS|ACHIEVEMENTS|LANGUAGES)\b/g
  return base
    .replace(headingPattern, '\n$1\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function getResumeSection(lines: string[], headings: string[]): string {
  const normalizedHeadings = headings.map((h) => h.toLowerCase())
  const isHeadingLine = (line: string) => {
    const lower = line.toLowerCase().replace(/[:\-]/g, '').trim()
    return normalizedHeadings.some((h) => lower === h || lower.startsWith(`${h} `))
  }

  const allStopHeadings = [
    'summary',
    'professional summary',
    'professional profile',
    'professional',
    'objective',
    'profile',
    'skills',
    'technical skills',
    'expertise',
    'core expertise',
    'experience',
    'work experience',
    'employment',
    'education',
    'projects',
    'certifications',
    'achievements',
    'recognitions',
    'awards',
    'languages',
    'interests',
    'front end',
    'backend',
    'back end',
    'databases',
    'cloud & serverless',
    'leadership & communication',
    'software design & architecture',
  ]

  const startIdx = lines.findIndex((line) => isHeadingLine(line))
  if (startIdx === -1) return ''

  const collected: string[] = []
  for (let i = startIdx + 1; i < lines.length; i++) {
    const current = lines[i]!
    const currentLower = current.toLowerCase().replace(/[:\-]/g, '').trim()

    // Stop at next known heading once we already collected section content.
    if (collected.length > 0 && allStopHeadings.some((h) => currentLower === h || currentLower.startsWith(`${h} `))) {
      break
    }

    collected.push(current)
  }

  return collected.join('\n').trim()
}

function getSectionFromText(text: string, headings: string[]): string {
  const headingRegex = headings.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const stopRegex =
    'PROFILE|SUMMARY|PROFESSIONAL SUMMARY|PROFESSIONAL PROFILE|PROFESSIONAL|OBJECTIVE|TECHNICAL SKILLS|SKILLS|EXPERTISE|CORE EXPERTISE|EXPERIENCE|WORK EXPERIENCE|EMPLOYMENT|EDUCATION|PROJECTS|CERTIFICATIONS|ACHIEVEMENTS|RECOGNITIONS|AWARDS|LANGUAGES|FRONT END|BACK END|BACKEND|DATABASES|CLOUD & SERVERLESS|LEADERSHIP & COMMUNICATION|SOFTWARE DESIGN & ARCHITECTURE'
  const re = new RegExp(
    `(?:^|\\n)\\s*(?:${headingRegex})\\s*[:\\-]?\\s*\\n?([\\s\\S]*?)(?=\\n\\s*(?:${stopRegex})\\b|$)`,
    'i',
  )
  const match = text.match(re)
  return match?.[1]?.trim() || ''
}

function extractIntroSummary(lines: string[]): string {
  const blocked = [
    'summary', 'profile', 'professional', 'objective', 'experience', 'education', 'skills', 'projects',
    'certifications', 'recognitions', 'achievements', 'languages', 'front end', 'back end', 'backend',
  ]
  const candidates = lines
    .slice(0, 40)
    .filter((line) => {
      const lower = line.toLowerCase().trim()
      if (!lower) return false
      if (/@|https?:\/\/|\+?\d[\d\s\-()]{7,}/.test(lower)) return false
      if (blocked.some((b) => lower === b || lower.startsWith(`${b} `))) return false
      return line.length >= 40 && line.length <= 220
    })
    .slice(0, 2)
  return candidates.join(' ').trim()
}

function cleanupSingleLineField(value: string, maxLen: number): string {
  const cleaned = value.replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  const lower = cleaned.toLowerCase()
  const noisyTokens = ['experience', 'education', 'projects', 'skills', 'certifications', 'achievements', 'profile']
  if (cleaned.length > maxLen || noisyTokens.some((t) => lower.includes(t))) return ''
  return cleaned
}

function detectPortfolioUrl(text: string): string {
  const urlMatches = text.match(/https?:\/\/[^\s)]+/gi) || []
  const blockedHosts = ['linkedin.com', 'github.com', 'leetcode.com', 'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com']
  for (const rawUrl of urlMatches) {
    const url = rawUrl.replace(/[),.;]+$/, '')
    const lower = url.toLowerCase()
    if (!blockedHosts.some((h) => lower.includes(h))) return url
  }
  return ''
}

function sanitizeParsedResumeData(data: ParsedResumeData): ParsedResumeData {
  const cap = (value: string | undefined, maxLen: number) => (value || '').trim().slice(0, maxLen)
  const cleanBlock = (value: string | undefined, maxLen: number) =>
    cap(value, maxLen)
      .replace(/^[|:\-\s]+/g, '')
      .replace(/^[A-Za-z]\s*\n+/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  return {
    fullName: cleanupSingleLineField(data.fullName || '', 80),
    title: cleanupSingleLineField(data.title || '', 120),
    email: cap(data.email, 120),
    phone: cap(data.phone, 40),
    location: cleanupSingleLineField(data.location || '', 120),
    linkedin: cap(data.linkedin, 180),
    github: cap(data.github, 180),
    portfolio: cap(data.portfolio, 180),
    summary: cleanBlock(data.summary, 1800),
    skills: cleanBlock(data.skills, 1400),
    experience: cleanBlock(data.experience, 4000),
    education: cleanBlock(data.education, 2500),
    projects: cleanBlock(data.projects, 3000),
    certifications: cleanBlock(data.certifications, 1200),
    achievements: cleanBlock(data.achievements, 1200),
    languagesKnown: cleanBlock(data.languagesKnown, 600),
  }
}

function applyFieldLevelRules(data: ParsedResumeData, rawText: string): ParsedResumeData {
  const text = normalizeResumeText(rawText)
  const sectionExperience = getSectionFromText(text, ['experience', 'work experience', 'employment', 'professional experience'])
  const sectionEducation = getSectionFromText(text, ['education', 'academic'])
  const sectionProjects = getSectionFromText(text, ['projects', 'project'])
  const sectionSkills = getSectionFromText(text, ['technical skills', 'skills', 'core skills'])
  const sectionSummary = getSectionFromText(text, ['summary', 'objective', 'profile'])
  const sectionCerts = getSectionFromText(text, ['certification', 'certifications', 'certificate', 'licenses'])
  const sectionAchievements = getSectionFromText(text, ['achievement', 'achievements', 'award', 'awards'])
  const sectionLanguages = getSectionFromText(text, ['language', 'languages'])

  const out = { ...data }
  const isProbablyDump = (value?: string) =>
    !!value &&
    value.length > 900 &&
    /(education|experience|projects|certifications|skills|profile)/i.test(value)

  // Enforce single-line fields.
  out.fullName = cleanupSingleLineField(out.fullName || '', 80)
  out.title = cleanupSingleLineField(out.title || '', 120)
  out.location = cleanupSingleLineField(out.location || '', 120)
  if (out.location && /(https?:\/\/|@|github|linkedin)/i.test(out.location)) out.location = ''

  // Reseed section fields from canonical section extraction if suspicious.
  if (!out.experience || isProbablyDump(out.experience)) out.experience = sectionExperience || out.experience
  if (!out.education || isProbablyDump(out.education)) out.education = sectionEducation || out.education
  if (!out.projects || isProbablyDump(out.projects)) out.projects = sectionProjects || out.projects
  if (!out.skills || isProbablyDump(out.skills)) out.skills = sectionSkills || out.skills
  if (!out.summary || isProbablyDump(out.summary)) out.summary = sectionSummary || out.summary
  if (!out.certifications || isProbablyDump(out.certifications)) out.certifications = sectionCerts || out.certifications
  if (!out.achievements || isProbablyDump(out.achievements)) out.achievements = sectionAchievements || out.achievements
  if (!out.languagesKnown || isProbablyDump(out.languagesKnown)) out.languagesKnown = sectionLanguages || out.languagesKnown

  // Field-specific validity checks.
  if (out.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)) out.email = ''
  if (out.portfolio && /(linkedin\.com|github\.com|leetcode\.com|gmail\.com|yahoo\.com|hotmail\.com|outlook\.com)/i.test(out.portfolio)) {
    out.portfolio = detectPortfolioUrl(text)
  }
  if (out.linkedin && !/linkedin\.com\/in\//i.test(out.linkedin)) out.linkedin = ''
  if (out.github && !/github\.com\//i.test(out.github)) out.github = ''

  return sanitizeParsedResumeData(out)
}

function mergeResumeData(primary: ParsedResumeData | null, fallback: ParsedResumeData): ParsedResumeData {
  if (!primary) return fallback

  const shouldUseFallback = (value?: string) =>
    !value || value.trim() === '' || value.trim().toLowerCase() === 'not specified'

  return {
    fullName: shouldUseFallback(primary.fullName) ? fallback.fullName : primary.fullName,
    title: shouldUseFallback(primary.title) ? fallback.title : primary.title,
    email: shouldUseFallback(primary.email) ? fallback.email : primary.email,
    phone: shouldUseFallback(primary.phone) ? fallback.phone : primary.phone,
    location: shouldUseFallback(primary.location) ? fallback.location : primary.location,
    linkedin: shouldUseFallback(primary.linkedin) ? fallback.linkedin : primary.linkedin,
    github: shouldUseFallback(primary.github) ? fallback.github : primary.github,
    portfolio: shouldUseFallback(primary.portfolio) ? fallback.portfolio : primary.portfolio,
    summary: shouldUseFallback(primary.summary) ? fallback.summary : primary.summary,
    skills: shouldUseFallback(primary.skills) ? fallback.skills : primary.skills,
    experience: shouldUseFallback(primary.experience) ? fallback.experience : primary.experience,
    education: shouldUseFallback(primary.education) ? fallback.education : primary.education,
    projects: shouldUseFallback(primary.projects) ? fallback.projects : primary.projects,
    certifications: shouldUseFallback(primary.certifications) ? fallback.certifications : primary.certifications,
    achievements: shouldUseFallback(primary.achievements) ? fallback.achievements : primary.achievements,
    languagesKnown: shouldUseFallback(primary.languagesKnown) ? fallback.languagesKnown : primary.languagesKnown,
  }
}

function buildFallbackResumeData(rawText: string): ParsedResumeData {
  const text = normalizeResumeText(rawText)
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  const phoneMatch = text.match(/(\+?\d[\d\s\-()]{7,}\d)/)
  const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/i)
  const githubMatch = text.match(/github\.com\/[\w-]+/i)
  const portfolio = detectPortfolioUrl(text)

  let fullName = ''
  let title = ''
  const blockedNameTokens = ['resume', 'curriculum vitae', 'profile', 'contact', 'email', 'phone', 'linkedin', 'github']
  const blockedTitleTokens = [
    'summary',
    'profile',
    'professional',
    'objective',
    'skills',
    'technical skills',
    'experience',
    'education',
    'projects',
    'certifications',
    'achievements',
    'recognitions',
    'expertise',
  ]
  for (let idx = 0; idx < Math.min(lines.length, 16); idx++) {
    const line = lines[idx]!
    const lower = line.toLowerCase()
    if (
      line.length > 2 &&
      line.length < 60 &&
      /^[A-Za-z][A-Za-z\s.'-]+$/.test(line) &&
      !blockedNameTokens.some((token) => lower.includes(token))
    ) {
      const words = line.split(/\s+/).filter(Boolean)
      if (words.length >= 2 && words.length <= 4) {
        fullName = line
        const nextLine = lines[idx + 1]
        if (
          nextLine &&
          nextLine.length > 3 &&
          nextLine.length < 90 &&
          !/@|linkedin|github|phone|\+?\d/.test(nextLine.toLowerCase()) &&
          !blockedTitleTokens.some((token) => nextLine.toLowerCase() === token || nextLine.toLowerCase().startsWith(`${token} `))
        ) {
          title = nextLine
        }
        break
      }
    }
  }

  if (
    fullName &&
    /(developer|engineer|profile|software|intern|experience|skills|education)/i.test(fullName)
  ) {
    fullName = ''
  }

  const skillKeywords = [
    'react', 'next.js', 'node.js', 'typescript', 'javascript', 'python', 'java', 'sql',
    'mongodb', 'postgresql', 'aws', 'docker', 'kubernetes', 'html', 'css', 'tailwind',
    'communication', 'leadership', 'problem solving', 'go', 'rust', 'c++', 'flutter',
  ]
  const lowerText = text.toLowerCase()
  const foundSkills = skillKeywords.filter((s) => lowerText.includes(s)).slice(0, 15)

  const experience =
    getSectionFromText(text, ['experience', 'work experience', 'employment', 'professional experience']) ||
    getResumeSection(lines, ['experience', 'work experience', 'employment', 'professional experience'])
  const education =
    getSectionFromText(text, ['education', 'academic']) || getResumeSection(lines, ['education', 'academic'])
  const projects =
    getSectionFromText(text, ['projects', 'project']) || getResumeSection(lines, ['projects', 'project'])
  const summary =
    getSectionFromText(text, ['summary', 'objective', 'profile']) ||
    getResumeSection(lines, ['summary', 'objective', 'profile'])
  const summaryFromIntro = extractIntroSummary(lines)
  const certifications =
    getSectionFromText(text, ['certification', 'certifications', 'certificate', 'licenses']) ||
    getResumeSection(lines, ['certification', 'certifications', 'certificate', 'licenses'])
  const achievements =
    getSectionFromText(text, ['achievement', 'achievements', 'award', 'awards', 'accomplishments']) ||
    getResumeSection(lines, ['achievement', 'achievements', 'award', 'awards', 'accomplishments'])
  const languagesKnown =
    getSectionFromText(text, ['language', 'languages']) || getResumeSection(lines, ['language', 'languages'])

  const skillsSection = getResumeSection(lines, ['skills', 'technical skills', 'core skills'])
  const skills = skillsSection
    ? skillsSection.replace(/\n/g, ', ').replace(/\s{2,}/g, ' ').trim()
    : foundSkills.length > 0
      ? foundSkills.join(', ')
      : ''

  const locationRaw = lines
    .slice(0, 14)
    .find((line) =>
      /(india|usa|united states|canada|punjab|haryana|delhi|mumbai|bangalore|chandigarh|hyderabad|noida|gurgaon)/i.test(
        line,
      ),
    ) || ''
  const location = cleanupSingleLineField(locationRaw, 120)

  const educationFromKeywords =
    education ||
    lines
      .filter((line) =>
        /(b\.?tech|bachelor|master|m\.?tech|bca|mca|mba|university|college|school|cgpa|gpa|graduat)/i.test(line),
      )
      .slice(0, 5)
      .join('\n')

  const experienceFromKeywords =
    experience ||
    lines
      .filter((line) =>
        /(\b\d{4}\b|\bpresent\b|intern|engineer|developer|months?|years?)/i.test(line) &&
        !/(front end|back end|backend|databases|cloud|skills|expertise|recognitions)/i.test(line),
      )
      .slice(0, 10)
      .join('\n')

  const projectsFromKeywords =
    projects ||
    lines
      .filter((line) => /(project|github\.com|built|developed|implemented)/i.test(line))
      .slice(0, 8)
      .join('\n')

  return sanitizeParsedResumeData({
    fullName,
    title,
    email: emailMatch?.[0] || '',
    phone: phoneMatch?.[0] || '',
    location,
    linkedin: linkedinMatch?.[0] || '',
    github: githubMatch?.[0] || '',
    portfolio,
    summary: summary.length >= 30 ? summary : summaryFromIntro,
    skills,
    experience: experienceFromKeywords,
    education: educationFromKeywords,
    projects: projectsFromKeywords,
    certifications,
    achievements,
    languagesKnown,
  })
}

/**
 * When OpenRouter returns 429 / errors, we still have plain JD text from the PDF.
 * Shape matches AI JSON so the client can append to additionalInstructions the same way.
 */
function buildJdRequirementsFromRawText(jdText: string): Record<string, string | string[] | undefined> {
  const excerpt = jdText.trim().substring(0, 12_000)
  return {
    requiredSkills: [],
    /** Keep short — full JD is only under keyRequirements (avoids reading the same text twice). */
    qualifications:
      'AI summary unavailable (rate limit / quota). Use Key Requirements below for the full job description.',
    responsibilities: '',
    keyRequirements: excerpt,
  }
}

/**
 * Parse uploaded resume and JD files to extract text content
 * POST /api/resume/parse-files
 */
export async function POST(request: NextRequest) {
  console.log('[parse-files] Request received')
  
  try {
    console.log('[parse-files] Parsing form data...')
    const formData = await request.formData()
    const resumeFile = formData.get('resume') as File | null
    const jdFile = formData.get('jd') as File | null

    console.log('[parse-files] Files received:', {
      resume: resumeFile ? `${resumeFile.name} (${resumeFile.type}, ${resumeFile.size} bytes)` : 'none',
      jd: jdFile ? `${jdFile.name} (${jdFile.type}, ${jdFile.size} bytes)` : 'none',
    })

    if (!resumeFile && !jdFile) {
      return NextResponse.json(
        { error: 'At least one file (resume or JD) is required' },
        { status: 400 }
      )
    }

    const extractionDiagnostics = {
      runtime: process.version,
      resume: '',
      jd: '',
    }

    // Extract text from files in parallel for faster processing
    let resumeText = ''
    let jdText = ''

    console.log('[parse-files] Starting text extraction...')
    try {
      const extractionPromises = []
      
      // Extract resume text
      if (resumeFile) {
        extractionPromises.push(
          extractTextFromFile(resumeFile).catch((error) => {
            console.error('[parse-files] Resume file extraction failed:', error)
            extractionDiagnostics.resume = error instanceof Error ? error.message : String(error)
            throw new Error(`Resume extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
          })
        )
      } else {
        extractionPromises.push(Promise.resolve(''))
      }
      
      // Extract JD text
      if (jdFile) {
        extractionPromises.push(
          extractTextFromFile(jdFile).catch((error) => {
            console.error('[parse-files] JD extraction failed:', error)
            extractionDiagnostics.jd = error instanceof Error ? error.message : String(error)
            // JD extraction failure is not critical
            console.log('[parse-files] Continuing without JD text')
            return ''
          })
        )
      } else {
        extractionPromises.push(Promise.resolve(''))
      }
      
      const settled = await Promise.allSettled(extractionPromises)
      const resumeTextResult = settled[0]!
      const jdTextResult = settled[1]!

      if (resumeTextResult.status === 'fulfilled') {
        resumeText = resumeTextResult.value || ''
        console.log('[parse-files] ✅ Resume text extracted successfully, length:', resumeText.length)
        
        if (resumeText.length === 0 && resumeFile) {
          console.warn('[parse-files] ⚠️ Resume text is empty after extraction')
          if (isPdfFile(resumeFile)) {
            console.warn('[parse-files] PDF might be image-based or contain no extractable text')
          }
        }
      } else {
        const errorReason = resumeTextResult.reason
        console.error('[parse-files] ❌ Error extracting resume text:', errorReason)
        
        // Log detailed error information
        if (errorReason instanceof Error) {
          console.error('[parse-files] Error name:', errorReason.name)
          console.error('[parse-files] Error message:', errorReason.message)
          console.error('[parse-files] Error stack:', errorReason.stack)
        }
        
        // If it's a PDF and extraction failed, provide helpful error but don't fail completely
        if (resumeFile && isPdfFile(resumeFile)) {
          const errorMsg = errorReason instanceof Error ? errorReason.message : String(errorReason)
          extractionDiagnostics.resume = errorMsg
          console.warn('[parse-files] PDF extraction failed, but continuing with empty text')
          resumeText = '' // Set to empty instead of throwing
          
          // Log the error for debugging but don't fail the request
          console.error('[parse-files] PDF extraction error details:', {
            fileName: resumeFile.name,
            fileSize: resumeFile.size,
            fileType: resumeFile.type,
            error: errorMsg,
            errorType: errorReason instanceof Error ? errorReason.name : typeof errorReason,
          })
        } else {
          // For non-PDF files, also set to empty instead of throwing
          console.warn('[parse-files] Text extraction failed, but continuing with empty text')
          extractionDiagnostics.resume =
            errorReason instanceof Error ? errorReason.message : String(errorReason)
          resumeText = ''
        }
      }

      if (jdTextResult.status === 'fulfilled') {
        jdText = jdTextResult.value
        console.log('[parse-files] JD text extracted successfully, length:', jdText.length)
      } else {
        console.error('[parse-files] Error extracting JD text:', jdTextResult.reason)
        // JD extraction failure is not critical, continue without it
        extractionDiagnostics.jd =
          jdTextResult.reason instanceof Error
            ? jdTextResult.reason.message
            : String(jdTextResult.reason)
        jdText = ''
        console.log('[parse-files] Continuing without JD text')
      }
    } catch (error) {
      console.error('[parse-files] Error in file text extraction:', error)
      const errorDetails = error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : { message: String(error) }
      
      console.error('[parse-files] Error details:', errorDetails)
      
      // Always continue even if extraction failed - we'll return empty text
      // The frontend can handle empty extractedResumeData gracefully
      console.log('[parse-files] Continuing despite extraction errors - will return empty data')
      extractionDiagnostics.resume = extractionDiagnostics.resume || errorDetails.message
      resumeText = resumeText || ''
      jdText = jdText || ''
    }

    console.log('[parse-files] Text extraction complete:', {
      resumeLength: resumeText.length,
      jdLength: jdText.length,
    })

    // If no text was extracted, return success with null data (not an error)
    if (!resumeText && !jdText) {
      console.warn('[parse-files] ⚠️ No text extracted from either file')
      console.warn('[parse-files] File details:', {
        resumeFile: resumeFile ? {
          name: resumeFile.name,
          type: resumeFile.type,
          size: resumeFile.size,
        } : 'none',
        jdFile: jdFile ? {
          name: jdFile.name,
          type: jdFile.type,
          size: jdFile.size,
        } : 'none',
      })
      
      // Return success with null data - this is not an error, just means extraction wasn't possible
      // Frontend will show a friendly message and let user fill manually
      return NextResponse.json({
        success: true,
        extractedResumeData: null,
        jdRequirements: null,
        resumeText: '',
        jdText: '',
        parserVersion: PARSE_FILES_VERSION,
        extractionMeta: {
          resumeTextLength: 0,
          jdTextLength: 0,
          hadResumeFile: !!resumeFile,
          hadJdFile: !!jdFile,
          resumeFile: resumeFile
            ? { name: resumeFile.name, type: resumeFile.type, size: resumeFile.size }
            : null,
          jdFile: jdFile ? { name: jdFile.name, type: jdFile.type, size: jdFile.size } : null,
          diagnostics: extractionDiagnostics,
        },
        // Don't include error field - this is not an error, just info
      })
    }

    // Use AI to extract structured data - process in parallel for faster results
    // Only process if we have text
    console.log('[parse-files] Starting AI parsing...')
    const [aiExtractedResumeData, jdRequirements] = await Promise.all([
      resumeText && resumeText.trim().length > 0
        ? (async () => {
            try {
              const controller = new AbortController()
              const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

              const parseResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
                  'HTTP-Referer': env.NEXT_PUBLIC_APP_URL,
                  'X-Title': 'Buildify AI Resume Builder',
                },
                body: JSON.stringify({
                  model: 'google/gemma-3-12b-it:free', // Fast and reliable model
                  messages: [
                    {
                      role: 'user',
                      content: `Extract structured data from this resume text. Return ONLY valid JSON with these exact fields:
- fullName: string (full name)
- title: string (current job title / professional headline, e.g. "Senior Software Engineer")
- email: string
- phone: string
- location: string (city, state/country)
- linkedin: string (LinkedIn URL or username if found)
- github: string (GitHub URL or username if found)
- portfolio: string (personal website/portfolio URL if found)
- summary: string (professional summary / objective if present)
- skills: comma-separated string (e.g. "React, Node.js, Python")
- experience: formatted string with all work experience (use "Role | Company | Dates" format, then bullet points)
- education: formatted string with all degrees, institutions, and graduation dates
- projects: formatted string with all projects, technologies used, and key features
- certifications: comma-separated string of certifications
- achievements: comma-separated string of awards / achievements
- languagesKnown: comma-separated string of spoken languages

IMPORTANT: Include ALL fields. If a field is not found, use empty string "".

Return ONLY valid JSON, no markdown, no explanations, no code blocks.

Resume text:\n${resumeText.substring(0, 12000)}`,
                    },
                  ],
                  max_tokens: 2000,
                  temperature: 0.1,
                }),
                signal: controller.signal,
              })

              clearTimeout(timeoutId)

              if (parseResponse.ok) {
                const parseResult = await parseResponse.json()
                const parsedContent = parseResult.choices?.[0]?.message?.content || ''
                console.log('[parse-files] Raw AI response:', parsedContent.substring(0, 500))
                try {
                  // Try to extract JSON from response (handle markdown code blocks)
                  let jsonStr = parsedContent
                  
                  // Remove markdown code blocks if present
                  jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '')
                  
                  // Extract JSON object
                  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
                  if (jsonMatch) {
                    const extractedData = JSON.parse(jsonMatch[0])
                    console.log('[parse-files] Parsed extracted data:', extractedData)
                    
                    // Ensure education and projects are always present
                    if (!extractedData.education || extractedData.education.trim() === '') {
                      extractedData.education = 'Not specified'
                      console.log('[parse-files] ⚠️ Education field missing, setting to "Not specified"')
                    }
                    if (!extractedData.projects || extractedData.projects.trim() === '') {
                      extractedData.projects = 'Not specified'
                      console.log('[parse-files] ⚠️ Projects field missing, setting to "Not specified"')
                    }
                    
                    console.log('[parse-files] ✅ Final extracted data with all fields:', {
                      hasEducation: !!extractedData.education,
                      hasProjects: !!extractedData.projects,
                      educationLength: extractedData.education?.length || 0,
                      projectsLength: extractedData.projects?.length || 0,
                    })
                    
                    return extractedData
                  } else {
                    console.error('[parse-files] No JSON found in AI response')
                  }
                } catch (error) {
                  console.error('[parse-files] Error parsing extracted JSON:', error)
                  console.error('[parse-files] Response content:', parsedContent.substring(0, 1000))
                }
              } else {
                const errorText = await parseResponse.text().catch(() => 'Unknown error')
                console.error('Resume parsing API error:', parseResponse.status, errorText)
              }
            } catch (error) {
              if (error instanceof Error && error.name === 'AbortError') {
                console.error('Resume parsing timeout')
              } else {
                console.error('Error parsing resume:', error)
              }
            }
            return null
          })()
        : Promise.resolve(null),
      jdText && jdText.trim().length > 0
        ? (async () => {
            try {
              const controller = new AbortController()
              const timeoutId = setTimeout(() => controller.abort(), 25000) // 25s timeout

              const jdParseResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
                  'HTTP-Referer': env.NEXT_PUBLIC_APP_URL,
                  'X-Title': 'Buildify AI Resume Builder',
                },
                body: JSON.stringify({
                  model: 'google/gemma-3-12b-it:free', // Fast and reliable model
                  messages: [
                    {
                      role: 'user',
                      content: `Extract key requirements from this job description. Return ONLY valid JSON with fields: requiredSkills (array), qualifications (string), responsibilities (string), keyRequirements (string). No markdown, no explanations.\n\nJob description:\n${jdText.substring(0, 4000)}`,
                    },
                  ],
                  max_tokens: 1500,
                  temperature: 0.1,
                }),
                signal: controller.signal,
              })

              clearTimeout(timeoutId)

              if (jdParseResponse.ok) {
                const jdParseResult = await jdParseResponse.json()
                const jdParsedContent = jdParseResult.choices?.[0]?.message?.content || ''
                try {
                  const jsonMatch = jdParsedContent.match(/\{[\s\S]*\}/)
                  if (jsonMatch) {
                    return JSON.parse(jsonMatch[0])
                  }
                } catch (error) {
                  console.error('Error parsing JD JSON:', error)
                }
              } else {
                const errorText = await jdParseResponse.text().catch(() => 'Unknown error')
                console.error('JD parsing API error:', jdParseResponse.status, errorText)
              }
            } catch (error) {
              if (error instanceof Error && error.name === 'AbortError') {
                console.error('JD parsing timeout')
              } else {
                console.error('Error parsing JD:', error)
              }
            }
            return null
          })()
        : Promise.resolve(null),
    ])

    console.log('[parse-files] AI parsing complete')
    const extractedResumeDataRaw =
      resumeText && resumeText.trim().length > 0
        ? mergeResumeData(
            aiExtractedResumeData as ParsedResumeData | null,
            buildFallbackResumeData(resumeText),
          )
        : null
    const extractedResumeData =
      extractedResumeDataRaw && resumeText
        ? applyFieldLevelRules(sanitizeParsedResumeData(extractedResumeDataRaw), resumeText)
        : null
    console.log('[parse-files] Extracted resume data:', extractedResumeData)
    console.log('[parse-files] JD requirements (AI):', jdRequirements)

    let jdRequirementsOut = jdRequirements
    let jdUsedRawFallback = false
    if (!jdRequirementsOut && jdText.trim().length > 0) {
      jdRequirementsOut = buildJdRequirementsFromRawText(jdText)
      jdUsedRawFallback = true
      console.log('[parse-files] JD: using raw-text fallback (AI parse failed or rate limited)')
    }

    // Ensure we return the data even if AI parsing failed
    const response = {
      success: true,
      resumeText: resumeText.substring(0, 5000), // Limit response size
      jdText: jdText.substring(0, 3000),
      extractedResumeData: extractedResumeData || null,
      jdRequirements: jdRequirementsOut || null,
      /** True when structured AI JD parse failed but raw JD text was folded into jdRequirements */
      jdUsedRawFallback,
      parserVersion: PARSE_FILES_VERSION,
      extractionMeta: {
        resumeTextLength: resumeText.length,
        jdTextLength: jdText.length,
        hadResumeFile: !!resumeFile,
        hadJdFile: !!jdFile,
        resumeFile: resumeFile
          ? { name: resumeFile.name, type: resumeFile.type, size: resumeFile.size }
          : null,
        jdFile: jdFile ? { name: jdFile.name, type: jdFile.type, size: jdFile.size } : null,
        diagnostics: extractionDiagnostics,
      },
    }

    console.log('[parse-files] Final response:', {
      hasResumeData: !!response.extractedResumeData,
      hasJdRequirements: !!response.jdRequirements,
      jdUsedRawFallback: response.jdUsedRawFallback,
      resumeDataKeys: response.extractedResumeData ? Object.keys(response.extractedResumeData) : [],
    })
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('[parse-files] Fatal error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to parse files'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('[parse-files] Error stack:', errorStack)
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 }
    )
  }
}
