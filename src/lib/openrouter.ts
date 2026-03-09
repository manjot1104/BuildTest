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

const DEFAULT_MODEL = 'google/gemma-3-12b-it:free'

/** Fallback chain — tried in order when the requested model fails */
const FALLBACK_CHAIN = [
  'google/gemma-3-12b-it:free',
  'arcee-ai/trinity-large-preview:free',
  'google/gemma-3-27b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-coder:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'openai/gpt-oss-120b:free',
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
 * Generates comprehensive design and formatting instructions for the resume
 * These instructions will be combined with user's custom instructions
 */
function getDesignInstructions(): string {
  return `
═══════════════════════════════════════════════════════════════════════════════
DESIGN & FORMATTING GUIDELINES (MUST FOLLOW):
═══════════════════════════════════════════════════════════════════════════════

 LAYOUT & STRUCTURE:
- Use clean, modern TWO-COLUMN layout (preferred) or single-column if content is minimal
- For two-column: Use \\usepackage{multicol} with \\begin{multicols}{2} and \\end{multicols}
- Left column (40-45% width): Name, Contact, Skills, Education
- Right column (55-60% width): Experience, Projects, Additional sections
- Page margins: 0.75 inches on all sides (use \\usepackage[margin=0.75in]{geometry})
- Section spacing: 12pt between major sections, 6pt between subsections
- Use clear visual hierarchy with section headers
- Left-align all content for ATS compatibility
- Keep consistent indentation throughout

 CONTENT WRITING STYLE:
- Write in third person or use action verbs (e.g., "Developed", "Managed", "Implemented")
- Use professional, concise language - avoid jargon unless industry-specific
- Start each bullet point with strong action verbs
- Quantify achievements with numbers, percentages, or metrics when possible
- Keep descriptions clear and impactful
- Avoid personal pronouns (I, me, my)

 PARAGRAPH & LINE LENGTH (MANDATORY):
- CRITICAL: Each bullet point/description MUST follow these line requirements:
  * MINIMUM: 2 lines per bullet point (never less than 2 lines)
  * MAXIMUM: 5 lines per bullet point (never more than 5 lines)
  * IDEAL: 3 lines per bullet point (aim for 3 lines when possible)
- Experience entries: Each bullet point must be 2-5 lines (ideally 3 lines)
- Education entries: Each bullet point must be 2-5 lines (ideally 3 lines)
- Project descriptions: Each bullet point must be 2-5 lines (ideally 3 lines)
- Skills section: Use concise comma-separated or bullet format (can be single line for skills)
- Summary/Objective (if included): Maximum 3-4 lines total
- Each job/education entry: 4-6 bullet points maximum
- Keep paragraphs short and scannable but detailed enough (2-5 lines, ideally 3)
- DO NOT write single-line bullet points for Experience, Education, or Projects
- DO NOT write bullet points longer than 5 lines
- Aim for 3 lines per bullet point for optimal readability and detail

 FONT SPECIFICATIONS:
- Main font: Use LaTeX default (Computer Modern) or \\usepackage{helvet} for Helvetica
- Font sizes:
  * Name/Header: 18-20pt (\\Large or \\LARGE)
  * Section headers: 12-14pt (\\large or \\normalsize with \\textbf)
  * Body text: 10-11pt (\\normalsize or \\small)
  * Contact info: 10pt (\\small)
  * Dates: 10pt (\\small)
- Use \\textbf{} for section headers and job titles
- Use \\textit{} sparingly for emphasis (company names, dates)
- Maintain consistent font sizes throughout

 COLOR SCHEME FOR HEADINGS (MANDATORY - ALL HEADINGS MUST USE DIFFERENT SHADES OF BLUE):
- CRITICAL: Create a clear visual hierarchy using DIFFERENT shades of blue for different heading levels
- Use DISTINCT shades of BLUE for different heading levels to create visual hierarchy:
  * Main Name/Header (LARGEST & DARKEST): Use \\textcolor{blue!90!black}{\\textbf{...}} or \\textcolor[RGB]{0,34,68}{...} (darkest blue, 24-28pt font size)
  * Section headers (Experience, Education, Skills, Projects) - Level 1: Use \\textcolor{blue!75!black}{...} or \\textcolor[RGB]{0,51,102}{...} (dark blue, 14-16pt)
  * Subsection headers - Level 2: Use \\textcolor{blue!65!black}{...} or \\textcolor[RGB]{0,68,136}{...} (medium-dark blue, 12-13pt)
  * Job titles - Level 3: Use \\textcolor{blue!60!black}{\\textbf{...}} (medium blue, 11-12pt)
  * Project names - Level 3: Use \\textcolor{blue!60!black}{\\textbf{...}} (medium blue, 11-12pt)
  * Degree names - Level 3: Use \\textcolor{blue!60!black}{\\textbf{...}} (medium blue, 11-12pt)
  * Company names - Level 4: Use \\textcolor{blue!50!black}{\\textit{...}} (lighter blue, 10-11pt)
  * Institution names - Level 4: Use \\textcolor{blue!50!black}{\\textit{...}} (lighter blue, 10-11pt)
- Ensure ALL headings are clearly visible with distinct blue shades creating clear hierarchy
- Use \\usepackage{xcolor} for color support
- Examples:
  * Name: \\textcolor{blue!90!black}{\\textbf{\\LARGE John Doe}} (largest, darkest)
  * Section: \\section*{\\textcolor{blue!75!black}{\\textbf{\\large Experience}}} (dark blue)
  * Job Title: \\textcolor{blue!60!black}{\\textbf{Software Engineer}} (medium blue)
  * Company: \\textcolor{blue!50!black}{\\textit{Company Name}} (lighter blue)

 COLOR SCHEME:
- PRIMARY COLORS:
  * Headings & Subheadings: Use shades of BLUE (see Font Specifications above)
  * Body text: Black text (#000000 or default LaTeX black)
  * Dates and secondary info: Use subtle gray (\\textcolor{gray}{...})
- Section dividers: Use subtle horizontal rules in blue (\\textcolor{blue!30!white}{\\rule{\\textwidth}{0.5pt}}) or gray
- Keep colors professional and print-friendly
- Ensure high contrast for readability
- Blue shades should be dark enough for professional appearance (blue!70!black or darker)

 SECTION FORMATTING (TWO-COLUMN LAYOUT):
- Header Section (Full Width):
  * Name: LARGEST and DARKEST blue - Use \\textcolor{blue!90!black}{\\textbf{\\LARGE Name}} or \\textcolor{blue!90!black}{\\textbf{\\Huge Name}} (24-28pt, darkest blue shade)
  * Name should be the MOST prominent element - use largest font size and darkest blue
  * Contact info: Single line with separators (| or •) between email, phone, use smaller font (10pt)
  * Use \\hfill or \\hspace for spacing
  * Add subtle spacing after name: \\vspace{8pt}

- LEFT COLUMN (40-45% width) - Use \\begin{multicols}{2}:
  * Name & Contact (if not in header)
  * Skills Section: 
    - Use blue heading: \\section*{\\textcolor{blue!70!black}{\\textbf{Skills}}}
    - Group related skills (e.g., "Programming: Python, JavaScript, TypeScript")
    - Use bold for category, regular for skills
    - Format: Category: Skill1, Skill2, Skill3
  * Education Section:
    - Use blue heading: \\section*{\\textcolor{blue!70!black}{\\textbf{Education}}}
    - Format: Degree | Institution | Location | Year
    - MANDATORY: Use \\textcolor{blue!75!black}{\\textbf{Degree Name}} for EVERY degree (must be blue)
    - Use \\textit{} or \\textcolor{blue!65!black}{\\textit{Institution}} for institution
    - Include GPA if 3.5+ (format: GPA: 3.8/4.0)
    - Example: \\textcolor{blue!75!black}{\\textbf{Bachelor of Science in Computer Science}} | \\textit{University Name} | Location | Year

- RIGHT COLUMN (55-60% width):
  * Experience Section:
    - Use blue heading: \\section*{\\textcolor{blue!70!black}{\\textbf{Experience}}}
    - Format: Job Title | Company Name | Location | Dates (right-aligned)
    - MANDATORY: Use \\textcolor{blue!75!black}{\\textbf{Job Title}} for EVERY job title (must be blue, not black)
    - Use \\textit{} or \\textcolor{blue!65!black}{\\textit{Company Name}} for company name
    - Bullet points: Use \\begin{itemize} with \\item
    - Indent bullet points with \\setlength{\\itemindent}{0.5cm}
    - Example format: \\textcolor{blue!75!black}{\\textbf{Senior Software Engineer}} | \\textit{Company Name} | Location | Dates
  * Projects Section:
    - Use blue heading: \\section*{\\textcolor{blue!70!black}{\\textbf{Projects}}}
    - Format: Project Name | Technologies Used | Date
    - MANDATORY: Use \\textcolor{blue!75!black}{\\textbf{Project Name}} for EVERY project name (must be blue, not black)
    - Use \\textit{} for technologies
    - Include 2-3 bullet points describing impact/results
    - Example format: \\textcolor{blue!75!black}{\\textbf{E-Commerce Platform}} | \\textit{React, Node.js} | 2024

- End columns with \\end{multicols}

 VISUAL HIERARCHY (CLEAR BLUE SHADE HIERARCHY):
- MANDATORY: Create clear visual hierarchy using DIFFERENT shades of blue:
  * Name: DARKEST blue (blue!90!black) + LARGEST font (\\LARGE or \\Huge) - MOST prominent
  * Section headers: Dark blue (blue!75!black) + Large font (\\large) - Level 1
  * Subsection headers: Medium-dark blue (blue!65!black) + Normal font (\\normalsize) - Level 2
  * Job/Project/Degree titles: Medium blue (blue!60!black) + Normal font (\\normalsize) - Level 3
  * Company/Institution names: Lighter blue (blue!50!black) + Italic (\\textit{}) - Level 4
- CRITICAL: Each heading level must use a DIFFERENT shade of blue to create clear hierarchy
- NO black headings allowed - ALL headings, subheadings, job titles, project names, and degree names must use blue shades
- Add \\vspace{8pt} before major section headers, \\vspace{4pt} before subsections
- Use \\rule{\\textwidth}{0.5pt} for subtle section dividers in blue (\\textcolor{blue!30!white}{\\rule{\\textwidth}{0.5pt}}) (optional)
- Ensure consistent spacing between all elements
- In two-column layout, maintain proper column balance
- Name should stand out as the largest and darkest element

 ATS OPTIMIZATION:
- Use standard section names: "Experience", "Education", "Skills", "Projects"
- Avoid graphics, images, or complex layouts
- Use standard fonts (no custom fonts that might not render)
- Keep formatting simple and linear
- Use standard date formats (MM/YYYY or Month YYYY)
- Include relevant keywords naturally in content

 REQUIRED LATEX PACKAGES:
- \\documentclass{article}
- \\usepackage[margin=0.75in]{geometry}
- \\usepackage{enumitem}
- \\usepackage{xcolor} (REQUIRED for blue headings)
- \\usepackage{multicol} (REQUIRED for two-column layout)
- Optional: \\usepackage{helvet} \\renewcommand{\\familydefault}{\\sfdefault} (for Helvetica)

 AVOID:
- Complex packages (tikz, fancyhdr, graphics, etc.)
- Tables for layout (use multicol package instead for two-column)
- Images or logos
- Custom fonts that require external files
- Overly decorative elements
- Color backgrounds or boxes
- Bright or neon colors (stick to professional blue shades)

═══════════════════════════════════════════════════════════════════════════════
`
}

/**
 * Generates professional LaTeX resume code using OpenRouter API with fallback
 */
export async function generateLaTeXResume(data: ResumeData): Promise<OpenRouterResult> {
  const model = data.model || DEFAULT_MODEL

  // Get comprehensive design instructions
  const designInstructions = getDesignInstructions()
  
  // Combine user's additional instructions with design guidelines
  const userInstructions = data.additionalInstructions 
    ? `\n\n═══════════════════════════════════════════════════════════════════════════════
USER'S CUSTOM INSTRUCTIONS:
═══════════════════════════════════════════════════════════════════════════════
${data.additionalInstructions}
═══════════════════════════════════════════════════════════════════════════════

IMPORTANT: Apply the user's custom instructions above while maintaining the design guidelines. If there's a conflict, prioritize the user's instructions but ensure the resume remains professional and ATS-friendly.
`
    : ''

  const prompt = `You are an expert LaTeX resume writer and professional designer. Generate a modern, visually appealing, and professional LaTeX resume based on the following information.

${designInstructions}

CREATIVE ENHANCEMENTS (Apply your professional judgment):
- Add subtle design elements that enhance readability and visual appeal
- Use appropriate spacing and typography to create breathing room
- Consider adding subtle visual separators or dividers between major sections
- Ensure the name is the MOST prominent element (largest font, darkest blue)
- Create visual flow by using consistent spacing and alignment
- Add professional touches like subtle underlines or spacing that improve readability
- Use smart formatting to highlight important information
- Consider adding a professional summary section if it enhances the resume
- Apply modern design principles while maintaining ATS compatibility

CRITICAL REQUIREMENTS:
1. Return ONLY raw LaTeX code - no markdown, no explanations, no code blocks
2. Follow ALL design guidelines above strictly
3. MANDATORY: Name must be LARGEST (24-28pt) and DARKEST blue (blue!90!black) - most prominent element
4. MANDATORY: Use DIFFERENT shades of blue for different heading levels to create clear hierarchy:
   - Section headers: blue!75!black (dark blue)
   - Subsection headers: blue!65!black (medium-dark blue)
   - Job/Project/Degree titles: blue!60!black (medium blue)
   - Company/Institution names: blue!50!black (lighter blue)
5. MANDATORY: Each bullet point in Experience, Education, and Projects MUST be:
   - MINIMUM: 2 lines (never less)
   - MAXIMUM: 5 lines (never more)
   - IDEAL: 3 lines (aim for this when possible)
   - DO NOT write single-line bullet points
   - DO NOT write bullet points longer than 5 lines
6. DO NOT use black headings - EVERY heading and subheading must be blue
7. Use MINIMAL LaTeX packages: \\documentclass{article}, \\usepackage[margin=0.75in]{geometry}, \\usepackage{enumitem}, \\usepackage{xcolor}, \\usepackage{multicol}
8. DO NOT use complex packages like tikz, fancyhdr, or graphics that require external files
9. Keep the LaTeX code SIMPLE and FAST to compile
10. Ensure the resume is well-structured and ATS-friendly
11. Improve grammar and make content professional
12. Format sections clearly: Header (name, email, phone), Skills, Experience, Education, Projects
13. Use two-column layout with \\begin{multicols}{2} and \\end{multicols}
14. Apply your own professional enhancements to make the resume stand out while maintaining professionalism
${userInstructions}

FINAL REMINDER: 
- Name: LARGEST (\\LARGE or \\Huge) and DARKEST blue (blue!90!black) - most prominent
- Section headings: Dark blue (blue!75!black) with \\large font
- Job titles: Medium blue (blue!60!black) with \\textbf{}
- Project names: Medium blue (blue!60!black) with \\textbf{}
- Degree names: Medium blue (blue!60!black) with \\textbf{}
- Company names: Lighter blue (blue!50!black) with \\textit{}
- Use DIFFERENT shades for DIFFERENT levels - create clear visual hierarchy
- Each bullet point: MIN 2 lines, MAX 5 lines, IDEAL 3 lines
- NO black headings allowed anywhere in the resume
- Apply creative enhancements to make the resume visually appealing and professional

USER INFORMATION:
- Name: ${data.fullName}
- Email: ${data.email}
- Phone: ${data.phone}
- Skills: ${data.skills}
- Experience: ${data.experience}
- Education: ${data.education}
- Projects: ${data.projects}

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

  // Get comprehensive design instructions for follow-up modifications
  const designInstructions = getDesignInstructions()

  const followUpPrompt = `You are an expert LaTeX resume writer. I have an existing LaTeX resume code, and I want you to modify it based on the following instruction.

${designInstructions}

EXISTING LATEX CODE:
\`\`\`latex
${currentLatex}
\`\`\`

═══════════════════════════════════════════════════════════════════════════════
USER'S MODIFICATION REQUEST:
═══════════════════════════════════════════════════════════════════════════════
${prompt}
═══════════════════════════════════════════════════════════════════════════════

CREATIVE ENHANCEMENTS (Apply your professional judgment):
- Add subtle design elements that enhance readability and visual appeal
- Use appropriate spacing and typography to create breathing room
- Consider adding subtle visual separators or dividers between major sections
- Ensure the name is the MOST prominent element (largest font, darkest blue)
- Create visual flow by using consistent spacing and alignment
- Apply modern design principles while maintaining ATS compatibility

CRITICAL REQUIREMENTS:
1. Return ONLY the complete modified LaTeX code - no markdown, no explanations, no code blocks
2. MANDATORY: Name must be LARGEST (24-28pt) and DARKEST blue (blue!90!black) - most prominent element
3. MANDATORY: Use DIFFERENT shades of blue for different heading levels:
   - Section headers: blue!75!black (dark blue)
   - Subsection headers: blue!65!black (medium-dark blue)
   - Job/Project/Degree titles: blue!60!black (medium blue)
   - Company/Institution names: blue!50!black (lighter blue)
4. MANDATORY: Each bullet point in Experience, Education, and Projects MUST be:
   - MINIMUM: 2 lines (never less)
   - MAXIMUM: 5 lines (never more)
   - IDEAL: 3 lines (aim for this when possible)
   - DO NOT write single-line bullet points
   - DO NOT write bullet points longer than 5 lines
5. DO NOT use black headings - EVERY heading and subheading must use appropriate blue shade
6. Apply the user's requested changes while maintaining professional design standards
7. Follow the design guidelines above to ensure consistency
8. Keep the same overall structure unless the user specifically requests structural changes
9. Ensure the LaTeX code remains valid and compilable
10. Use MINIMAL LaTeX packages: \\documentclass{article}, \\usepackage[margin=0.75in]{geometry}, \\usepackage{enumitem}, \\usepackage{xcolor}, \\usepackage{multicol}
11. DO NOT use complex packages like tikz, fancyhdr, or graphics that require external files
12. Keep the LaTeX code SIMPLE and FAST to compile
13. Maintain ATS-friendly formatting
14. Apply your own professional enhancements to improve the resume

FINAL REMINDER: 
- Name: LARGEST (\\LARGE or \\Huge) and DARKEST blue (blue!90!black) - most prominent
- Section headings: Dark blue (blue!75!black) with \\large font
- Job titles: Medium blue (blue!60!black) with \\textbf{}
- Project names: Medium blue (blue!60!black) with \\textbf{}
- Degree names: Medium blue (blue!60!black) with \\textbf{}
- Company names: Lighter blue (blue!50!black) with \\textit{}
- Use DIFFERENT shades for DIFFERENT levels - create clear visual hierarchy
- NO black headings allowed anywhere in the resume
- Apply creative enhancements to make the resume visually appealing

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
