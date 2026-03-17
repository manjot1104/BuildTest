import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'

/**
 * Parse uploaded resume and JD files to extract text content
 * POST /api/resume/parse-files
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const resumeFile = formData.get('resume') as File | null
    const jdFile = formData.get('jd') as File | null

    if (!resumeFile && !jdFile) {
      return NextResponse.json(
        { error: 'At least one file (resume or JD) is required' },
        { status: 400 }
      )
    }

    let resumeText = ''
    let jdText = ''

    // Parse resume file
    if (resumeFile) {
      const resumeContent = await resumeFile.text()
      // For PDF files, we'll need to use a PDF parser library
      // For now, handle text files and basic PDF text extraction
      if (resumeFile.type === 'application/pdf') {
        // Use OpenRouter API to extract text from PDF
        // Convert PDF to base64 and send to AI for extraction
        const arrayBuffer = await resumeFile.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        
        try {
          const extractResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
              'HTTP-Referer': env.NEXT_PUBLIC_APP_URL,
              'X-Title': 'Buildify AI Resume Builder',
            },
            body: JSON.stringify({
              model: 'google/gemma-3-12b-it:free',
              messages: [
                {
                  role: 'system',
                  content: 'You are a resume parser. Extract all text content from the provided file and return it in a structured format with sections: Personal Information, Skills, Experience, Education, Projects. Return only the extracted text, no explanations.',
                },
                {
                  role: 'user',
                  content: `Extract text from this file. File type: ${resumeFile.type}, Size: ${resumeFile.size} bytes. If this is a PDF, I'll need to extract text differently. For now, return a message asking for text file or provide instructions.`,
                },
              ],
              max_tokens: 2000,
            }),
          })

          if (extractResponse.ok) {
            const extractResult = await extractResponse.json()
            resumeText = extractResult.choices?.[0]?.message?.content || ''
          }
        } catch (error) {
          console.error('Error extracting text from PDF:', error)
        }
      } else {
        // For text files, use directly
        resumeText = resumeContent
      }
    }

    // Parse JD file
    if (jdFile) {
      const jdContent = await jdFile.text()
      if (jdFile.type === 'application/pdf') {
        // Similar PDF handling for JD
        // For now, try to extract text
        try {
          const extractResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
              'HTTP-Referer': env.NEXT_PUBLIC_APP_URL,
              'X-Title': 'Buildify AI Resume Builder',
            },
            body: JSON.stringify({
              model: 'google/gemma-3-12b-it:free',
              messages: [
                {
                  role: 'system',
                  content: 'You are a job description parser. Extract key requirements, skills, qualifications, and responsibilities from the job description. Return a structured summary.',
                },
                {
                  role: 'user',
                  content: `Extract key information from this job description file. File type: ${jdFile.type}, Size: ${jdFile.size} bytes.`,
                },
              ],
              max_tokens: 1500,
            }),
          })

          if (extractResponse.ok) {
            const extractResult = await extractResponse.json()
            jdText = extractResult.choices?.[0]?.message?.content || ''
          }
        } catch (error) {
          console.error('Error extracting text from JD PDF:', error)
        }
      } else {
        jdText = jdContent
      }
    }

    // Use AI to extract structured data from resume text
    let extractedResumeData = null
    if (resumeText) {
      try {
        const parseResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': env.NEXT_PUBLIC_APP_URL,
            'X-Title': 'Buildify AI Resume Builder',
          },
          body: JSON.stringify({
            model: 'google/gemma-3-12b-it:free',
            messages: [
              {
                role: 'system',
                content: 'You are a resume parser. Extract structured data from resume text and return it as JSON with fields: fullName, email, phone, skills (comma-separated string), experience (formatted string), education (formatted string), projects (formatted string). Return ONLY valid JSON, no markdown, no explanations.',
              },
              {
                role: 'user',
                content: `Extract structured data from this resume:\n\n${resumeText.substring(0, 4000)}`,
              },
            ],
            max_tokens: 2000,
            temperature: 0.1,
          }),
        })

        if (parseResponse.ok) {
          const parseResult = await parseResponse.json()
          const parsedContent = parseResult.choices?.[0]?.message?.content || ''
          try {
            // Try to extract JSON from response
            const jsonMatch = parsedContent.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              extractedResumeData = JSON.parse(jsonMatch[0])
            }
          } catch (error) {
            console.error('Error parsing extracted JSON:', error)
          }
        }
      } catch (error) {
        console.error('Error parsing resume:', error)
      }
    }

    // Extract JD requirements
    let jdRequirements = null
    if (jdText) {
      try {
        const jdParseResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': env.NEXT_PUBLIC_APP_URL,
            'X-Title': 'Buildify AI Resume Builder',
          },
          body: JSON.stringify({
            model: 'google/gemma-3-12b-it:free',
            messages: [
              {
                role: 'system',
                content: 'You are a job description analyzer. Extract key requirements, required skills, qualifications, and responsibilities. Return as JSON with fields: requiredSkills (array), qualifications (string), responsibilities (string), keyRequirements (string). Return ONLY valid JSON, no markdown, no explanations.',
              },
              {
                role: 'user',
                content: `Analyze this job description and extract requirements:\n\n${jdText.substring(0, 3000)}`,
              },
            ],
            max_tokens: 1500,
            temperature: 0.1,
          }),
        })

        if (jdParseResponse.ok) {
          const jdParseResult = await jdParseResponse.json()
          const jdParsedContent = jdParseResult.choices?.[0]?.message?.content || ''
          try {
            const jsonMatch = jdParsedContent.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              jdRequirements = JSON.parse(jsonMatch[0])
            }
          } catch (error) {
            console.error('Error parsing JD JSON:', error)
          }
        }
      } catch (error) {
        console.error('Error parsing JD:', error)
      }
    }

    return NextResponse.json({
      success: true,
      resumeText: resumeText.substring(0, 5000), // Limit response size
      jdText: jdText.substring(0, 3000),
      extractedResumeData,
      jdRequirements,
    })
  } catch (error) {
    console.error('Error parsing files:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse files' },
      { status: 500 }
    )
  }
}
