import { env } from '@/env'

export interface ResumeData {
  fullName: string
  email: string
  phone: string
  skills: string
  experience: string
  education: string
  projects: string
  additionalInstructions?: string
  model?: string
}

const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free'

/**
 * Calls OpenRouter chat completions API
 */
async function callOpenRouter(
  messages: { role: string; content: string }[],
  model: string,
): Promise<string> {
  const apiKey = env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured.')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'HTTP-Referer': env.NEXT_PUBLIC_APP_URL,
    'X-Title': 'Buildify AI Resume Builder',
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 4000,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage = errorData.error?.message || errorData.message || response.statusText
    throw new Error(`OpenRouter API error: ${response.status} - ${errorMessage}`)
  }

  const result = await response.json()
  const content = result.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('No response returned from OpenRouter API')
  }

  return content
}

/**
 * Cleans AI response by removing markdown code blocks
 */
function cleanLatexResponse(raw: string): string {
  let cleaned = raw.trim()
  cleaned = cleaned.replace(/^```(?:latex)?\s*\n?/gm, '')
  cleaned = cleaned.replace(/\n?```\s*$/gm, '')
  return cleaned.trim()
}

/**
 * Generates professional LaTeX resume code using OpenRouter API
 */
export async function generateLaTeXResume(data: ResumeData): Promise<{ raw: string; cleaned: string }> {
  const model = data.model || DEFAULT_MODEL

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

  const rawResponse = await callOpenRouter(
    [
      {
        role: 'system',
        content: 'You are an expert LaTeX resume writer. Always return ONLY raw LaTeX code without any markdown formatting, explanations, or code blocks.',
      },
      { role: 'user', content: prompt },
    ],
    model,
  )

  return {
    raw: rawResponse,
    cleaned: cleanLatexResponse(rawResponse),
  }
}

/**
 * Processes a follow-up prompt to modify existing LaTeX code
 */
export async function followUpLaTeX(
  currentLatex: string,
  prompt: string,
  model?: string,
): Promise<{ raw: string; cleaned: string }> {
  const selectedModel = model || DEFAULT_MODEL

  const followUpPrompt = `You are an expert LaTeX resume writer. I have an existing LaTeX resume code, and I want you to modify it based on the following instruction.

EXISTING LATEX CODE:
\`\`\`latex
${currentLatex}
\`\`\`

USER'S REQUEST:
${prompt}

IMPORTANT REQUIREMENTS:
1. Return ONLY the complete modified LaTeX code - no markdown, no explanations, no code blocks
2. Keep the same structure and content, but apply the requested changes
3. Ensure the LaTeX code remains valid and compilable
4. Use MINIMAL LaTeX packages: \\documentclass{article}, \\usepackage[margin=0.75in]{geometry}, \\usepackage{enumitem}
5. DO NOT use complex packages like tikz, fancyhdr, or graphics that require external files
6. Keep the LaTeX code SIMPLE and FAST to compile

Return the complete modified LaTeX document code now. Return ONLY the LaTeX code, nothing else.`

  const rawResponse = await callOpenRouter(
    [
      {
        role: 'system',
        content: 'You are an expert LaTeX resume writer. Always return ONLY raw LaTeX code without any markdown formatting, explanations, or code blocks.',
      },
      { role: 'user', content: followUpPrompt },
    ],
    selectedModel,
  )

  const cleaned = cleanLatexResponse(rawResponse)
  if (!cleaned) {
    throw new Error('Failed to extract LaTeX code from AI response')
  }

  return { raw: rawResponse, cleaned }
}
