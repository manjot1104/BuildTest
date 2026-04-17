import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'

// Type declaration for require (needed for CommonJS modules)
declare const require: (id: string) => any

// Ensure Node.js runtime for pdf-parse
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds max

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

// Test endpoint to verify route is working
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Parse files endpoint is working',
    timestamp: new Date().toISOString(),
  })
}

/**
 * Extract text from PDF file using pdf-parse
 */
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    console.log('[parse-files] Starting PDF extraction for:', file.name, 'Size:', file.size, 'bytes')
    
    // Check file size (limit to 10MB to prevent memory issues)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('PDF file is too large (max 10MB). Please use a smaller file.')
    }
    
    // Load pdf-parse module v2 - uses PDFParse class
    let PDFParse: any
    try {
      console.log('[parse-files] Loading pdf-parse module (v2)...')
      
      // pdf-parse v2 exports PDFParse class
      const pdfModule = require('pdf-parse')
      
      // Extract PDFParse class from module
      if (pdfModule.PDFParse && typeof pdfModule.PDFParse === 'function') {
        PDFParse = pdfModule.PDFParse
      } else {
        throw new Error('PDFParse class not found in pdf-parse module')
      }
      
      console.log('[parse-files] ✅ pdf-parse module loaded successfully')
    } catch (importError) {
      console.error('[parse-files] ❌ Failed to load pdf-parse:', importError)
      const errorDetails = importError instanceof Error ? {
        message: importError.message,
        stack: importError.stack,
        name: importError.name,
      } : { message: String(importError) }
      console.error('[parse-files] Import error details:', errorDetails)
      throw new Error(`Failed to load PDF parser: ${importError instanceof Error ? importError.message : 'Unknown error'}`)
    }
    
    const arrayBuffer = await file.arrayBuffer()
    console.log('[parse-files] PDF buffer created, size:', arrayBuffer.byteLength, 'bytes')
    
    if (arrayBuffer.byteLength === 0) {
      throw new Error('PDF file is empty or could not be read')
    }
    
    const buffer = Buffer.from(arrayBuffer)
    console.log('[parse-files] Creating PDFParse instance with buffer size:', buffer.length)
    
    // Try to parse PDF with error handling using v2 API
    let data: any
    try {
      console.log('[parse-files] Creating PDFParse instance...')
      // pdf-parse v2: Create instance with buffer
      const parser = new PDFParse({ data: buffer })
      
      console.log('[parse-files] Calling getText()...')
      // Get text from PDF
      data = await parser.getText()
      
      console.log('[parse-files] ✅ PDF parsed successfully')
      console.log('[parse-files] PDF metadata:', {
        numpages: data?.numpages || 'unknown',
        textLength: data?.text?.length || 0,
      })
    } catch (parseError) {
      console.error('[parse-files] ❌ PDF parse error occurred')
      console.error('[parse-files] Error type:', parseError instanceof Error ? parseError.constructor.name : typeof parseError)
      console.error('[parse-files] Error message:', parseError instanceof Error ? parseError.message : String(parseError))
      console.error('[parse-files] Error stack:', parseError instanceof Error ? parseError.stack : 'No stack trace')
      
      const errorMsg = parseError instanceof Error ? parseError.message : 'Unknown error'
      
      // Provide helpful error messages based on common issues
      if (errorMsg.includes('password') || errorMsg.includes('encrypted')) {
        throw new Error('PDF is password-protected. Please remove the password and try again.')
      } else if (errorMsg.includes('corrupt') || errorMsg.includes('invalid')) {
        throw new Error('PDF appears to be corrupted or invalid. Please try a different file.')
      } else if (errorMsg.includes('image') || errorMsg.includes('scanned')) {
        throw new Error('PDF appears to be image-based (scanned document). pdf-parse cannot extract text from images. Please use a text-based PDF or provide the content manually.')
      } else {
        throw new Error(`PDF parsing failed: ${errorMsg}. The PDF might be corrupted, password-protected, image-based, or in an unsupported format.`)
      }
    }
    
    const text = data?.text || ''
    console.log('[parse-files] PDF extraction successful, text length:', text.length, 'characters')
    
    if (!text || text.trim().length === 0) {
      console.warn('[parse-files] Warning: PDF extracted but text is empty. PDF might be image-based or corrupted.')
      throw new Error('PDF appears to be image-based or contains no extractable text. Please use a text-based PDF or provide the content manually.')
    }
    
    return text
  } catch (error) {
    console.error('[parse-files] Error extracting text from PDF:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('[parse-files] Error stack:', errorStack)
    throw new Error(`Failed to extract text from PDF file: ${errorMessage}`)
  }
}

function buildFallbackResumeData(rawText: string): ParsedResumeData {
  const text = rawText.replace(/\r/g, '')
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  const phoneMatch = text.match(/(\+?\d[\d\s\-()]{7,}\d)/)
  const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/i)
  const githubMatch = text.match(/github\.com\/[\w-]+/i)
  const portfolioMatch = text.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+\.(?:dev|io|com|me|xyz|tech))\b/i)

  let fullName = ''
  for (const line of lines.slice(0, 12)) {
    if (line.length > 2 && line.length < 60 && /^[A-Za-z][A-Za-z\s.'-]+$/.test(line)) {
      const words = line.split(/\s+/).filter(Boolean)
      if (words.length >= 2 && words.length <= 4) {
        fullName = line
        break
      }
    }
  }

  const skillKeywords = [
    'react', 'next.js', 'node.js', 'typescript', 'javascript', 'python', 'java', 'sql',
    'mongodb', 'postgresql', 'aws', 'docker', 'kubernetes', 'html', 'css', 'tailwind',
    'communication', 'leadership', 'problem solving', 'go', 'rust', 'c++', 'flutter',
  ]
  const lowerText = text.toLowerCase()
  const foundSkills = skillKeywords.filter((s) => lowerText.includes(s)).slice(0, 15)
  const skills = foundSkills.length > 0 ? foundSkills.join(', ') : ''

  const sectionText = (markers: string[]): string => {
    const lowerLines = lines.map((l) => l.toLowerCase())
    const startIdx = lowerLines.findIndex((l) => markers.some((m) => l.includes(m)))
    if (startIdx === -1) return ''
    const out: string[] = []
    for (let i = startIdx + 1; i < lines.length; i++) {
      const cur = lowerLines[i]!
      if (
        ['experience', 'education', 'project', 'skills', 'summary', 'certification', 'achievement', 'language', 'award'].some(
          (h) => cur.startsWith(h)
        ) && out.length > 0
      ) {
        break
      }
      out.push(lines[i]!)
      if (out.join('\n').length > 1200) break
    }
    return out.length > 0 ? out.join('\n') : ''
  }

  const experience = sectionText(['experience', 'work history', 'employment'])
  const education = sectionText(['education', 'academic'])
  const projects = sectionText(['projects', 'project'])
  const summary = sectionText(['summary', 'objective', 'profile'])
  const certifications = sectionText(['certification', 'certificate'])
  const achievements = sectionText(['achievement', 'award', 'accomplishment', 'honor'])
  const languagesKnown = sectionText(['language'])

  return {
    fullName,
    email: emailMatch?.[0] || '',
    phone: phoneMatch?.[0] || '',
    linkedin: linkedinMatch?.[0] || '',
    github: githubMatch?.[0] || '',
    portfolio: portfolioMatch?.[0] || '',
    summary,
    skills,
    experience,
    education,
    projects,
    certifications,
    achievements,
    languagesKnown,
  }
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

    // Extract text from files in parallel for faster processing
    let resumeText = ''
    let jdText = ''

    console.log('[parse-files] Starting text extraction...')
    try {
      const extractionPromises = []
      
      // Extract resume text
      if (resumeFile) {
        if (resumeFile.type === 'application/pdf') {
          extractionPromises.push(
            extractTextFromPDF(resumeFile).catch((error) => {
              console.error('[parse-files] Resume PDF extraction failed:', error)
              throw new Error(`Resume PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
            })
          )
        } else {
          extractionPromises.push(
            resumeFile.text().catch((error) => {
              console.error('[parse-files] Resume text extraction failed:', error)
              throw new Error(`Resume text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
            })
          )
        }
      } else {
        extractionPromises.push(Promise.resolve(''))
      }
      
      // Extract JD text
      if (jdFile) {
        if (jdFile.type === 'application/pdf') {
          extractionPromises.push(
            extractTextFromPDF(jdFile).catch((error) => {
              console.error('[parse-files] JD PDF extraction failed:', error)
              // JD extraction failure is not critical
              console.log('[parse-files] Continuing without JD text')
              return ''
            })
          )
        } else {
          extractionPromises.push(
            jdFile.text().catch((error) => {
              console.error('[parse-files] JD text extraction failed:', error)
              // JD extraction failure is not critical
              console.log('[parse-files] Continuing without JD text')
              return ''
            })
          )
        }
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
          if (resumeFile.type === 'application/pdf') {
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
        if (resumeFile?.type === 'application/pdf') {
          const errorMsg = errorReason instanceof Error ? errorReason.message : String(errorReason)
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
          resumeText = ''
        }
      }

      if (jdTextResult.status === 'fulfilled') {
        jdText = jdTextResult.value
        console.log('[parse-files] JD text extracted successfully, length:', jdText.length)
      } else {
        console.error('[parse-files] Error extracting JD text:', jdTextResult.reason)
        // JD extraction failure is not critical, continue without it
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

Resume text:\n${resumeText.substring(0, 6000)}`,
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
    const extractedResumeData =
      aiExtractedResumeData || (resumeText && resumeText.trim().length > 0 ? buildFallbackResumeData(resumeText) : null)
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
