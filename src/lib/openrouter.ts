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

export interface OpenRouterResult {
  raw: string
  cleaned: string
  model: string
  isFallback: boolean
}

const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free'

/** Fallback chain — tried in order when the requested model fails */
const FALLBACK_CHAIN = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-coder:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'google/gemma-3-27b-it:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'openai/gpt-oss-120b:free',
  'arcee-ai/trinity-large-preview:free',
  'google/gemma-3-12b-it:free',
  'openai/gpt-oss-20b:free',
]

/**
 * Builds an ordered model chain: requested model first, then fallbacks
 */
function buildModelChain(requested: string): string[] {
  return [requested, ...FALLBACK_CHAIN.filter((m) => m !== requested)]
}

/**
 * Calls OpenRouter chat completions API for a single model (no retry)
 */
async function callOpenRouterSingle(
  messages: { role: string; content: string }[],
  model: string,
): Promise<string> {
  const apiKey = env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured.')
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': env.NEXT_PUBLIC_APP_URL,
      'X-Title': 'Buildify AI Resume Builder',
    },
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
    throw new Error(`OpenRouter API error (${model}): ${response.status} - ${errorMessage}`)
  }

  const result = await response.json()
  const content = result.choices?.[0]?.message?.content

  if (!content) {
    throw new Error(`No response returned from ${model}`)
  }

  return content
}

/**
 * Calls OpenRouter with fallback chain — tries each model until one succeeds
 */
async function callOpenRouter(
  messages: { role: string; content: string }[],
  requestedModel: string,
): Promise<{ content: string; model: string; isFallback: boolean }> {
  const chain = buildModelChain(requestedModel)

  for (let i = 0; i < chain.length; i++) {
    const model = chain[i]!
    try {
      const content = await callOpenRouterSingle(messages, model)
      return {
        content,
        model,
        isFallback: i > 0,
      }
    } catch (error) {
      console.warn(`Model ${model} failed:`, error instanceof Error ? error.message : error)
      if (i === chain.length - 1) {
        throw new Error(`All models failed. Last error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  throw new Error('All models in the fallback chain failed.')
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
 * Generates professional LaTeX resume code using OpenRouter API with fallback
 */
export async function generateLaTeXResume(data: ResumeData): Promise<OpenRouterResult> {
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

  const result = await callOpenRouter(
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
    raw: result.content,
    cleaned: cleanLatexResponse(result.content),
    model: result.model,
    isFallback: result.isFallback,
  }
}

/**
 * Processes a follow-up prompt to modify existing LaTeX code with fallback
 */
export async function followUpLaTeX(
  currentLatex: string,
  prompt: string,
  model?: string,
): Promise<OpenRouterResult> {
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

  const result = await callOpenRouter(
    [
      {
        role: 'system',
        content: 'You are an expert LaTeX resume writer. Always return ONLY raw LaTeX code without any markdown formatting, explanations, or code blocks.',
      },
      { role: 'user', content: followUpPrompt },
    ],
    selectedModel,
  )

  const cleaned = cleanLatexResponse(result.content)
  if (!cleaned) {
    throw new Error('Failed to extract LaTeX code from AI response')
  }

  return {
    raw: result.content,
    cleaned,
    model: result.model,
    isFallback: result.isFallback,
  }
}
