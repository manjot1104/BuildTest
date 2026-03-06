import { env } from '@/env'

interface ResumeData {
  fullName: string
  email: string
  phone: string
  skills: string
  experience: string
  education: string
  projects: string
  additionalInstructions?: string
}

/**
 * Generates professional LaTeX resume code using OpenAI API
 * @param data - User's resume information
 * @returns Object with raw AI response and cleaned LaTeX code
 */
export async function generateLaTeXResume(data: ResumeData): Promise<{ raw: string; cleaned: string }> {
  const prompt = `You are an expert LaTeX resume writer. Generate a professional, clean LaTeX resume based on the following information.

IMPORTANT REQUIREMENTS:
1. Return ONLY raw LaTeX code - no markdown, no explanations, no code blocks
2. Use a SIMPLE, modern, professional resume template (avoid complex packages)
3. Improve grammar and make content professional
4. Format sections clearly: Header (name, email, phone), Skills, Experience, Education, Projects
5. Use MINIMAL LaTeX packages: \\documentclass{article}, \\usepackage[margin=0.75in]{geometry}, \\usepackage{enumitem}
6. DO NOT use complex packages like tikz, fancyhdr, or graphics that require external files
7. Keep the LaTeX code SIMPLE and FAST to compile
8. Use proper LaTeX syntax for formatting (sections, subsections, itemize, etc.)
9. Ensure the resume is well-structured and ATS-friendly

User Information:
- Name: ${data.fullName}
- Email: ${data.email}
- Phone: ${data.phone}
- Skills: ${data.skills}
- Experience: ${data.experience}
- Education: ${data.education}
- Projects: ${data.projects}
${data.additionalInstructions ? `\nAdditional Instructions:\n${data.additionalInstructions}` : ''}

Generate the complete LaTeX document code now. Return ONLY the LaTeX code, nothing else.`

  try {
    // Use OPENAI_API_KEY if available, otherwise fall back to OPENROUTER_API_KEY or V0_API_KEY
    const apiKey = (env.OPENAI_API_KEY || env.OPENROUTER_API_KEY || env.V0_API_KEY)?.trim()
    const model = env.OPENAI_MODEL || 'gpt-4o-mini'
    
    if (!apiKey || apiKey.length === 0) {
      throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in your .env file.')
    }
    
    // Determine which API to use
    const useOpenAI = !!env.OPENAI_API_KEY
    
    if (useOpenAI) {
      console.log('Using OpenAI API with model:', model)
    } else {
      console.warn('Using fallback API key. Consider setting OPENAI_API_KEY for better results.')
    }
    
    // Debug logging
    console.log('API Key Info:', {
      hasOpenAIKey: !!env.OPENAI_API_KEY,
      hasOpenRouterKey: !!env.OPENROUTER_API_KEY,
      hasV0Key: !!env.V0_API_KEY,
      keyLength: apiKey.length,
      keyPrefix: apiKey.substring(0, 15) + '...',
      model: model,
    })
    
    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }
    
    // API endpoint and request body
    const apiUrl = useOpenAI 
      ? 'https://api.openai.com/v1/chat/completions'
      : 'https://openrouter.ai/api/v1/chat/completions'
    
    const requestBody: any = {
      model: useOpenAI ? model : 'anthropic/claude-3.5-sonnet',
      messages: [
        {
          role: 'system',
          content: 'You are an expert LaTeX resume writer. Always return ONLY raw LaTeX code without any markdown formatting, explanations, or code blocks.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }
    
    // Add OpenRouter specific headers if using OpenRouter
    if (!useOpenAI) {
      if (process.env.NEXT_PUBLIC_APP_URL) {
        headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_APP_URL
      }
      headers['X-Title'] = 'Buildify AI Resume Builder'
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || errorData.message || response.statusText
      console.error('API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        apiUsed: useOpenAI ? 'OpenAI' : 'OpenRouter',
      })
      throw new Error(
        `${useOpenAI ? 'OpenAI' : 'OpenRouter'} API error: ${response.status} - ${errorMessage}`
      )
    }

    const result = await response.json()
    const rawResponse = result.choices?.[0]?.message?.content

    if (!rawResponse) {
      throw new Error(`No response returned from ${useOpenAI ? 'OpenAI' : 'OpenRouter'} API`)
    }

    // Return both raw response and cleaned code
    // Clean up the response - remove markdown code blocks if present
    let cleanedCode = rawResponse.trim()

    // Remove markdown code blocks (```latex or ```)
    cleanedCode = cleanedCode.replace(/^```(?:latex)?\s*\n?/gm, '')
    cleanedCode = cleanedCode.replace(/\n?```\s*$/gm, '')

    // Remove any leading/trailing whitespace
    cleanedCode = cleanedCode.trim()

    return {
      raw: rawResponse,
      cleaned: cleanedCode,
    }
  } catch (error) {
    console.error('Error calling API:', error)
    throw error instanceof Error
      ? error
      : new Error('Failed to generate LaTeX resume from AI API')
  }
}
