import { env } from '@/env'

export interface ResumeData {
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
  additionalInstructions?: string
  model?: string
  templateId?: string
  templateStyleGuide?: string
}

export interface OpenRouterResult {
  raw: string
  cleaned: string
  model: string
  isFallback: boolean
}

const DEFAULT_MODEL = 'google/gemma-3-12b-it:free'

/** Follow-up “edit code” calls: try a second model if the first errors. */
const OPENROUTER_DEFAULT_SINGLE_TIMEOUT_MS = 55_000
const OPENROUTER_DEFAULT_MAX_MODELS = 2

/**
 * Initial Generate (HTML/LaTeX): **one** model attempt, shorter wait — then API uses local template fallback.
 * Avoids 2×55s sequential calls that made generation feel “stuck”.
 */
const OPENROUTER_GENERATE_SINGLE_TIMEOUT_MS = 42_000
const OPENROUTER_GENERATE_MAX_MODELS = 1

export type CallOpenRouterOptions = {
  maxModels?: number
  singleTimeoutMs?: number
}

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
function buildModelChain(requested: string, maxModels: number): string[] {
  return [requested, ...FALLBACK_CHAIN.filter((m) => m !== requested)].slice(0, maxModels)
}

/**
 * Calls OpenRouter chat completions API for a single model (no retry)
 */
async function callOpenRouterSingle(
  messages: { role: string; content: string }[],
  model: string,
  singleTimeoutMs: number,
): Promise<string> {
  const apiKey = env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured.')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), singleTimeoutMs)

  try {
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
      signal: controller.signal,
  })

    clearTimeout(timeoutId)

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
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `Request timeout after ${Math.round(singleTimeoutMs / 1000)} seconds for model: ${model}`,
      )
    }
    throw error
  }
}

/**
 * Calls OpenRouter with optional fallback chain — tries each model until one succeeds
 */
async function callOpenRouter(
  messages: { role: string; content: string }[],
  requestedModel: string,
  options?: CallOpenRouterOptions,
): Promise<{ content: string; model: string; isFallback: boolean }> {
  const maxModels = options?.maxModels ?? OPENROUTER_DEFAULT_MAX_MODELS
  const singleTimeoutMs = options?.singleTimeoutMs ?? OPENROUTER_DEFAULT_SINGLE_TIMEOUT_MS
  const chain = buildModelChain(requestedModel, maxModels)

  for (let i = 0; i < chain.length; i++) {
    const model = chain[i]!
    try {
      const content = await callOpenRouterSingle(messages, model, singleTimeoutMs)
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
  
  // Template style guide (if template is selected)
  const templateGuide = data.templateStyleGuide
    ? `\n\n
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║         ⚠️⚠️⚠️  CRITICAL: TEMPLATE STYLE GUIDE  ⚠️⚠️⚠️                        ║
║                                                                               ║
║    YOU MUST FOLLOW THE TEMPLATE STRUCTURE BELOW EXACTLY                      ║
║    DO NOT DEVIATE FROM THE TEMPLATE LAYOUT AND STRUCTURE                     ║
║    THE TEMPLATE CODE EXAMPLES ARE YOUR PRIMARY REFERENCE                     ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

${data.templateStyleGuide}

╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                    🚨 ABSOLUTE MANDATORY REQUIREMENTS 🚨                      ║
║                                                                               ║
║  1. The template style guide above is THE ONLY DESIGN DIRECTIVE             ║
║  2. You MUST copy the EXACT structure from the MANDATORY STRUCTURE examples  ║
║  3. Use the EXACT LaTeX code structure shown in the template guide           ║
║  4. Replace only the placeholder text (NAME, email, etc.) with user data      ║
║  5. DO NOT change the layout, structure, or code organization                 ║
║  6. DO NOT use generic design - use ONLY the template structure              ║
║  7. The template structure OVERRIDES ALL other instructions                   ║
║  8. If template shows minipage, use minipage - DO NOT use multicol            ║
║  9. If template shows center, use center - DO NOT use left-align              ║
║  10. Follow the template code examples EXACTLY as written                    ║
║  11. If template shows multicol, use multicol - DO NOT use minipage           ║
║  12. If template shows two-column layout, you MUST use the exact same method  ║
║      (minipage OR multicol) as shown in the template structure                ║
║  13. For two-column templates: ALL sections must be inside the column        ║
║      environment (\\begin{multicols}{2}...\\end{multicols} OR                ║
║      \\begin{minipage}...\\end{minipage})                                     ║
║  14. Use \\columnbreak ONLY if template shows it - place it exactly where    ║
║      shown in the template structure                                          ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

IMPORTANT: Look at the "MANDATORY STRUCTURE" code examples in the template guide above.
Copy that EXACT structure and replace only the placeholder values with the user's actual data.
DO NOT modify the structure, layout, or code organization.

🚨 CRITICAL FOR TWO-COLUMN TEMPLATES:
- If the template uses \\begin{multicols}{2}, you MUST use multicols for ALL sections
- If the template uses \\begin{minipage}, you MUST use minipage for the columns
- DO NOT mix minipage and multicol - use ONLY what the template shows
- Place \\columnbreak exactly where shown in the template (usually after Education section)
- Ensure ALL content sections (Skills, Education, Experience, Projects) are inside the column environment
- Left column typically contains: Skills, Education
- Right column typically contains: Experience, Projects
- DO NOT put sections outside the column environment

`
    : ''
  
  // Combine user's additional instructions with design guidelines
  const userInstructions = data.additionalInstructions 
    ? `\n\n═══════════════════════════════════════════════════════════════════════════════
USER'S CUSTOM INSTRUCTIONS:
═══════════════════════════════════════════════════════════════════════════════
${data.additionalInstructions}
═══════════════════════════════════════════════════════════════════════════════

IMPORTANT: Apply the user's custom instructions above while maintaining the design guidelines and template style. If there's a conflict, prioritize the user's instructions but ensure the resume remains professional and ATS-friendly.
`
    : ''

  // If template is selected, use template-first approach
  const prompt = templateGuide
    ? `You are an expert LaTeX resume writer. Your ONLY task is to copy the template structure below and replace placeholders with user data.

${templateGuide}

🚨🚨🚨 YOUR TASK - FOLLOW THESE STEPS EXACTLY 🚨🚨🚨

STEP 1: Look at the "MANDATORY STRUCTURE (LaTeX)" code above
STEP 2: Copy that ENTIRE code block EXACTLY - including \\documentclass, \\usepackage, \\begin{document}, \\end{document}
STEP 3: Replace ONLY these placeholders:
   - "NAME" → ${data.fullName}
   - "email — phone" or "email | phone" → For Minimal Clean template: ${data.email} — ${data.phone} (CRITICAL: Use em dash — NOT pipe |). For other templates: ${data.email} | ${data.phone} (use pipe separator |)
   - Portfolio/Behance links: ONLY include if user provided them. Check if user data contains "portfolio.com", "behance.net", or similar portfolio links. If NOT provided, REMOVE the entire second contact line (the line with "behance.net/username — portfolio.com"). DO NOT add placeholder text or fake links.
   - Skills section: Parse ${data.skills} and create simple bullet points (\\item SkillName). DO NOT add categories like "Programming:" or "Frontend Development:". Just list skills as simple items.
   - For Creative Designer template ONLY: Design Skills MUST be comma-separated list (Skill1, Skill2, Skill3). DO NOT add categories like "Frontend Development:", "Backend Development:", etc. DO NOT use bold for categories. Just list all skills as comma-separated text in one paragraph.
   - For Minimal Clean template ONLY: CRITICAL - Header MUST include NAME: Replace "NAME" placeholder with ${data.fullName} (use \\Large\\textbf{} for LaTeX, or font-size: 20px; font-weight: bold for HTML). Skills MUST be comma-separated (can wrap across lines), NOT bullet points (\\item). DO NOT use categories. Format as plain text: React, TypeScript, Node.js, PostgreSQL, AWS. All text MUST be black - NO colors, NO \\textcolor commands. Header MUST be centered: Name (large, bold) on first line, then email — phone on second line (use em dash — NOT pipe |). MUST use two-column layout for ALL content: Left column (40% width: Skills, Education), Right column (60% width: Experience, Projects). For LaTeX: ALL sections MUST be inside \\begin{multicols}{2}...\\end{multicols} environment. Use \\columnbreak after Education section to separate left and right columns. For HTML: Use CSS Grid with grid-template-columns: 1fr 1.5fr and align-items: start for proper two-column layout. Experience format: Job Title (bold) on first line, then "Company — Location — Dates" on second line (use em dash — NOT pipe |), then bullet points. Education format: "Degree — Institution — Dates" (use em dash — NOT pipe |). Projects format: "Project Name — Technologies — Year" (use em dash — NOT pipe |). MUST include Projects section if user provided project data.
   - "Degree" → Extract degree from: ${data.education}
   - "Institution" → Extract institution from: ${data.education}
   - "Job Title" → Extract job titles from: ${data.experience}
   - "Company | Dates" → Extract from: ${data.experience}
   - "Description" → Use actual bullet points from: ${data.experience} and ${data.projects}
   - "Project Name" → Extract from: ${data.projects}
   - For Creative Designer template ONLY: Project format is "Project Name — Description" on first line (bold, purple), then "Technologies — Year" on second line (regular, black), then bullet points below

STEP 4: CONTENT ENHANCEMENT & FORMATTING (CRITICAL - APPLY TO ALL TEMPLATES):
   🚨 MANDATORY CONTENT REQUIREMENTS:
  
   0. DATA PRESERVATION (ABSOLUTE):
      - DO NOT shorten, summarize, or drop user-provided details.
      - Keep ALL significant experience, project, and education details from input.
      - If input has many lines, include them across multiple bullet points/entries instead of compressing.
   
   1. NAME FORMATTING (HIGHEST PRIORITY):
      - Name MUST be the LARGEST and MOST PROMINENT element in the entire resume
      - For LaTeX: Use \\Huge\\textbf{} or at minimum \\LARGE\\textbf{} for the name (24-28pt font size)
      - Name should stand out as the primary heading - make it visually dominant
      - Name should be the first thing that catches the eye when viewing the resume
   
   2. BULLET POINT LENGTH REQUIREMENTS (MANDATORY FOR ALL SECTIONS):
      - CRITICAL: Each bullet point in Experience, Projects, and Education sections MUST follow these line requirements:
        * MINIMUM: 2 lines per bullet point (NEVER less than 2 lines - expand short descriptions)
        * MAXIMUM: 5 lines per bullet point (NEVER more than 5 lines - condense if too long)
        * IDEAL: 3 lines per bullet point (AIM for 3 lines when possible for optimal readability)
      - DO NOT write single-line bullet points - they must be at least 2 lines
      - DO NOT write bullet points longer than 5 lines - break them into multiple points if needed
      - Expand brief descriptions: If user provided short descriptions, enhance them with relevant details, technologies used, impact, and outcomes
      - Add context: Include information about scale, technologies, methodologies, and results
      - Use action verbs: Start each bullet with strong action verbs (Developed, Implemented, Designed, Led, etc.)
      - Quantify achievements: Add numbers, percentages, metrics, or scale when possible
   
   3. CONTENT ENHANCEMENT GUIDELINES:
      - Add more descriptive content: Expand on user-provided information with professional details
      - Include technical specifics: Mention specific technologies, frameworks, tools, and methodologies used
      - Add impact and results: Describe the impact, outcomes, and value delivered
      - Include scope and scale: Mention team size, project scale, user base, or data volume when relevant
      - Professional language: Use professional, industry-standard terminology
      - Avoid redundancy: Each bullet should provide unique information
      - Make it compelling: Write descriptions that showcase skills, achievements, and value
   
   4. SECTION-SPECIFIC ENHANCEMENTS:
      - Experience Section:
        * Expand job descriptions with specific responsibilities and achievements
        * Include technologies, tools, and methodologies used
        * Mention collaboration, leadership, or problem-solving aspects
        * Add quantifiable results and impact
      - Projects Section:
        * Provide detailed project descriptions
        * Explain the problem solved or value delivered
        * Include technical stack and implementation details
        * Mention challenges overcome and solutions implemented
      - Education Section:
        * Add relevant coursework, honors, or achievements if space allows
        * Include GPA if 3.5+ (format: GPA: 3.8/4.0)
        * Mention relevant academic projects or research if applicable
   
   5. CONTENT QUALITY STANDARDS:
      - Professional tone: Maintain professional, confident language throughout
      - Clarity: Write clear, concise, and impactful descriptions
      - Specificity: Be specific about technologies, tools, and achievements
      - Relevance: Focus on information relevant to the role or industry
      - ATS-friendly: Use standard terminology and keywords naturally

STEP 5: DO NOT CHANGE ANYTHING ELSE:
   ❌ DO NOT change packages (\\usepackage commands)
   ❌ DO NOT change layout (minipage, center, multicol, etc.)
   ❌ DO NOT change colors or styling
   ❌ DO NOT change section order
   ❌ DO NOT add or remove sections
   ❌ DO NOT modify LaTeX structure
   ❌ DO NOT add skill categories - skills must be simple bullet points only
   ❌ DO NOT group or categorize skills - just list them as items
   ❌ DO NOT add skill categories - skills must be simple bullet points only
   ❌ DO NOT group or categorize skills - just list them as items

CRITICAL: The template code structure is FIXED. You can ONLY replace text placeholders. Everything else must stay EXACTLY as shown in the template.

USER DATA TO INSERT:
- Name: ${data.fullName}
${data.title ? `- Title: ${data.title}` : ''}
- Email: ${data.email}
- Phone: ${data.phone}
${data.location ? `- Location: ${data.location}` : ''}
${data.linkedin ? `- LinkedIn: ${data.linkedin}` : ''}
${data.github ? `- GitHub: ${data.github}` : ''}
${data.portfolio ? `- Portfolio: ${data.portfolio}` : ''}
${data.summary ? `- Summary: ${data.summary}` : ''}
- Skills: ${data.skills}
- Experience: ${data.experience}
- Education: ${data.education}
- Projects: ${data.projects}
${data.certifications ? `- Certifications: ${data.certifications}` : ''}
${data.achievements ? `- Achievements: ${data.achievements}` : ''}
${data.languagesKnown ? `- Languages Known: ${data.languagesKnown}` : ''}

Return ONLY the complete LaTeX code with placeholders replaced. No markdown, no explanations, no code blocks.`
    : `You are an expert LaTeX resume writer and professional designer. Generate a modern, visually appealing, and professional LaTeX resume based on the following information.

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
   - Name MUST be the BIGGEST and MOST PROMINENT heading in the entire resume
   - Use \\Huge\\textbf{} or at minimum \\LARGE\\textbf{} for the name
   - Name should be the first thing that catches the eye when viewing the resume
4. MANDATORY: Use DIFFERENT shades of blue for different heading levels to create clear hierarchy:
   - Section headers: blue!75!black (dark blue)
   - Subsection headers: blue!65!black (medium-dark blue)
   - Job/Project/Degree titles: blue!60!black (medium blue)
   - Company/Institution names: blue!50!black (lighter blue)
5. MANDATORY: Each bullet point in Experience, Education, and Projects MUST be:
   - MINIMUM: 2 lines (NEVER less - expand short descriptions with details, technologies, impact)
   - MAXIMUM: 5 lines (NEVER more - condense if too long)
   - IDEAL: 3 lines (AIM for 3 lines when possible for optimal readability)
   - DO NOT write single-line bullet points - they must be at least 2 lines
   - DO NOT write bullet points longer than 5 lines
   - Expand brief descriptions: Add relevant details, technologies used, impact, and outcomes
   - Add context: Include information about scale, technologies, methodologies, and results
   - Use action verbs: Start each bullet with strong action verbs (Developed, Implemented, Designed, Led, etc.)
   - Quantify achievements: Add numbers, percentages, metrics, or scale when possible
6. CONTENT ENHANCEMENT (MANDATORY):
   - Add more descriptive content: Expand on user-provided information with professional details
   - Include technical specifics: Mention specific technologies, frameworks, tools, and methodologies used
   - Add impact and results: Describe the impact, outcomes, and value delivered
   - Include scope and scale: Mention team size, project scale, user base, or data volume when relevant
   - Professional language: Use professional, industry-standard terminology
   - Make it compelling: Write descriptions that showcase skills, achievements, and value
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
${data.title ? `- Title: ${data.title}` : ''}
- Email: ${data.email}
- Phone: ${data.phone}
${data.location ? `- Location: ${data.location}` : ''}
${data.linkedin ? `- LinkedIn: ${data.linkedin}` : ''}
${data.github ? `- GitHub: ${data.github}` : ''}
${data.portfolio ? `- Portfolio: ${data.portfolio}` : ''}
${data.summary ? `- Summary: ${data.summary}` : ''}
- Skills: ${data.skills}
- Experience: ${data.experience}
- Education: ${data.education}
- Projects: ${data.projects}
${data.certifications ? `- Certifications: ${data.certifications}` : ''}
${data.achievements ? `- Achievements: ${data.achievements}` : ''}
${data.languagesKnown ? `- Languages Known: ${data.languagesKnown}` : ''}

Generate the complete LaTeX document code now. Return ONLY the LaTeX code, nothing else.`

  const systemPrompt = data.templateStyleGuide
    ? `You are a LaTeX code generator. Your ONLY job is to copy-paste the template code structure and replace text placeholders.

RULES:
1. Find the "MANDATORY STRUCTURE (LaTeX)" code in the user's message
2. Copy that code EXACTLY as written
3. Replace text placeholders (NAME, email, phone, etc.) with actual values
4. DO NOT modify ANYTHING else - no structure changes, no layout changes, no styling changes
5. Return ONLY the LaTeX code - no markdown, no explanations

You are NOT a designer. You are a code copier. Copy the template structure exactly.`
    : 'You are an expert LaTeX resume writer. Always return ONLY raw LaTeX code without any markdown formatting, explanations, or code blocks.'

  const result = await callOpenRouter(
    [
      {
        role: 'system',
        content: systemPrompt,
      },
      { role: 'user', content: prompt },
    ],
    model,
    {
      maxModels: OPENROUTER_GENERATE_MAX_MODELS,
      singleTimeoutMs: OPENROUTER_GENERATE_SINGLE_TIMEOUT_MS,
    },
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

/**
 * Cleans AI response by removing markdown code blocks (for HTML)
 * Also handles cases where AI returns instructions instead of code
 */
function cleanHtmlResponse(raw: string): string {
  let cleaned = raw.trim()
  
  // Remove markdown code blocks
  cleaned = cleaned.replace(/^```(?:html)?\s*\n?/gm, '')
  cleaned = cleaned.replace(/\n?```\s*$/gm, '')
  
  // If the response contains instructions/prompt text instead of HTML, try to extract HTML
  if (cleaned.includes('MANDATORY STRUCTURE') || cleaned.includes('CRITICAL FORMATTING RULES') || cleaned.includes('STEP 1:') || cleaned.includes('STEP 2:') || cleaned.includes('CRITICAL:') || cleaned.includes('🚨')) {
    // Try to extract HTML code block if it exists
    const htmlMatch = cleaned.match(/<!DOCTYPE html>[\s\S]*?<\/html>/i)
    if (htmlMatch) {
      cleaned = htmlMatch[0]
    } else {
      // If no HTML found, this is likely instructions - throw error
      throw new Error('AI returned instructions instead of HTML code. Please try again with a different model.')
    }
  }
  
  // Ensure response starts with <!DOCTYPE html> or <html>
  if (!cleaned.match(/^<(!DOCTYPE html|html)/i)) {
    // Try to find HTML in the response
    const htmlMatch = cleaned.match(/<(!DOCTYPE html|html)[\s\S]*/i)
    if (htmlMatch) {
      cleaned = htmlMatch[0]
    } else {
      throw new Error('No valid HTML code found in AI response. The model may have returned instructions instead of code.')
    }
  }
  
  // Remove any instruction text that might have leaked into the HTML body
  // Remove text like "CRITICAL:", "MANDATORY STRUCTURE", "STEP 1:", etc. from within HTML
  cleaned = cleaned.replace(/CRITICAL:\s*Use EXACTLY[^<]*/gi, '')
  cleaned = cleaned.replace(/MANDATORY STRUCTURE[^<]*/gi, '')
  cleaned = cleaned.replace(/STEP \d+:[^<]*/gi, '')
  cleaned = cleaned.replace(/🚨[^<]*/g, '')
  cleaned = cleaned.replace(/⚠️[^<]*/g, '')
  cleaned = cleaned.replace(/CRITICAL FORMATTING RULES[^<]*/gi, '')
  
  // Remove any instruction text that appears after </html> or before <!DOCTYPE
  cleaned = cleaned.replace(/^[^<]*<!DOCTYPE html>/i, '<!DOCTYPE html>')
  cleaned = cleaned.replace(/<\/html>[^<]*$/i, '</html>')
  
  return cleaned.trim()
}

/**
 * Generates comprehensive HTML resume design instructions
 */
function getHtmlDesignInstructions(): string {
  return `
═══════════════════════════════════════════════════════════════════════════════
HTML RESUME DESIGN & FORMATTING GUIDELINES (MUST FOLLOW):
═══════════════════════════════════════════════════════════════════════════════

LAYOUT & STRUCTURE:
- Use clean, modern TWO-COLUMN layout (preferred) or single-column if content is minimal
- For two-column: Use CSS Grid or Flexbox with proper responsive design
- Left column (40-45% width): Name, Contact, Skills, Education
- Right column (55-60% width): Experience, Projects, Additional sections
- Page margins: 20mm on all sides
- Section spacing: 12pt between major sections, 6pt between subsections
- Use clear visual hierarchy with section headers
- Left-align all content for ATS compatibility
- Keep consistent spacing throughout
- Use semantic HTML5 elements (header, section, article, etc.)

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
- Main font: Use modern sans-serif (Arial, Helvetica, 'Segoe UI', system-ui) or serif (Georgia, 'Times New Roman')
- Font sizes:
  * Name/Header: 24-28px (largest, most prominent)
  * Section headers: 16-18px (bold)
  * Body text: 11-12px
  * Contact info: 10px
  * Dates: 10px
- Use font-weight: bold for section headers and job titles
- Use font-style: italic sparingly for company names, dates
- Maintain consistent font sizes throughout
- Use line-height: 1.4-1.6 for readability

COLOR SCHEME FOR HEADINGS (MANDATORY - ALL HEADINGS MUST USE DIFFERENT SHADES OF BLUE):
- CRITICAL: Create a clear visual hierarchy using DIFFERENT shades of blue for different heading levels
- Use DISTINCT shades of BLUE for different heading levels to create visual hierarchy:
  * Main Name/Header (LARGEST & DARKEST): Use #002244 or rgb(0, 34, 68) (darkest blue, 24-28px font size)
  * Section headers (Experience, Education, Skills, Projects) - Level 1: Use #003366 or rgb(0, 51, 102) (dark blue, 16-18px)
  * Subsection headers - Level 2: Use #004488 or rgb(0, 68, 136) (medium-dark blue, 14-16px)
  * Job titles - Level 3: Use #0066AA or rgb(0, 102, 170) (medium blue, 12-14px)
  * Project names - Level 3: Use #0066AA or rgb(0, 102, 170) (medium blue, 12-14px)
  * Degree names - Level 3: Use #0066AA or rgb(0, 102, 170) (medium blue, 12-14px)
  * Company names - Level 4: Use #3388CC or rgb(51, 136, 204) (lighter blue, 11-12px)
  * Institution names - Level 4: Use #3388CC or rgb(51, 136, 204) (lighter blue, 11-12px)
- Ensure ALL headings are clearly visible with distinct blue shades creating clear hierarchy
- Use CSS color property for all headings

COLOR SCHEME:
- PRIMARY COLORS:
  * Headings & Subheadings: Use shades of BLUE (see Font Specifications above)
  * Body text: Black (#000000 or #1a1a1a)
  * Dates and secondary info: Use subtle gray (#666666 or #888888)
- Section dividers: Use subtle horizontal rules in blue (border-top: 1px solid rgba(0, 51, 102, 0.3)) or gray
- Keep colors professional and print-friendly
- Ensure high contrast for readability
- Blue shades should be dark enough for professional appearance

SECTION FORMATTING (TWO-COLUMN LAYOUT):
- Header Section (Full Width):
  * Name: LARGEST and DARKEST blue - Use color: #002244; font-size: 24-28px; font-weight: bold (most prominent)
  * Name should be the MOST prominent element - use largest font size and darkest blue
  * Contact info: Single line with separators (| or •) between email, phone, use smaller font (10px)
  * Use flexbox or grid for spacing
  * Add subtle spacing after name: margin-bottom: 8px

- LEFT COLUMN (40-45% width) - Use CSS Grid or Flexbox:
  * Name & Contact (if not in header)
  * Skills Section: 
    - Use blue heading: color: #003366; font-size: 16-18px; font-weight: bold
    - Group related skills (e.g., "Programming: Python, JavaScript, TypeScript")
    - Use bold for category, regular for skills
    - Format: Category: Skill1, Skill2, Skill3
  * Education Section:
    - Use blue heading: color: #003366; font-size: 16-18px; font-weight: bold
    - Format: Degree | Institution | Location | Year
    - MANDATORY: Use color: #003366; font-weight: bold for EVERY degree (must be blue)
    - Use italic or color: #004488; font-style: italic for institution
    - Include GPA if 3.5+ (format: GPA: 3.8/4.0)

- RIGHT COLUMN (55-60% width):
  * Experience Section:
    - Use blue heading: color: #003366; font-size: 16-18px; font-weight: bold
    - Format: Job Title | Company Name | Location | Dates (right-aligned)
    - MANDATORY: Use color: #003366; font-weight: bold for EVERY job title (must be blue, not black)
    - Use italic or color: #004488; font-style: italic for company name
    - Bullet points: Use <ul> with <li>
    - Indent bullet points with padding-left: 20px
  * Projects Section:
    - Use blue heading: color: #003366; font-size: 16-18px; font-weight: bold
    - Format: Project Name | Technologies Used | Date
    - MANDATORY: Use color: #003366; font-weight: bold for EVERY project name (must be blue, not black)
    - Use italic for technologies
    - Include 2-3 bullet points describing impact/results

VISUAL HIERARCHY (CLEAR BLUE SHADE HIERARCHY):
- MANDATORY: Create clear visual hierarchy using DIFFERENT shades of blue:
  * Name: DARKEST blue (#002244) + LARGEST font (24-28px) - MOST prominent
  * Section headers: Dark blue (#003366) + Large font (16-18px) - Level 1
  * Subsection headers: Medium-dark blue (#004488) + Normal font (14-16px) - Level 2
  * Job/Project/Degree titles: Medium blue (#0066AA) + Normal font (12-14px) - Level 3
  * Company/Institution names: Lighter blue (#3388CC) + Italic - Level 4
- CRITICAL: Each heading level must use a DIFFERENT shade of blue to create clear hierarchy
- NO black headings allowed - ALL headings, subheadings, job titles, project names, and degree names must use blue shades
- Add margin-top: 12px before major section headers, margin-top: 6px before subsections
- Use border-top: 1px solid rgba(0, 51, 102, 0.3) for subtle section dividers (optional)
- Ensure consistent spacing between all elements
- In two-column layout, maintain proper column balance
- Name should stand out as the largest and darkest element

ATS OPTIMIZATION:
- Use standard section names: "Experience", "Education", "Skills", "Projects"
- Avoid complex CSS that might not render in PDF
- Use standard fonts (web-safe fonts)
- Keep formatting simple and linear
- Use standard date formats (MM/YYYY or Month YYYY)
- Include relevant keywords naturally in content
- Use semantic HTML5 elements

REQUIRED HTML STRUCTURE:
- <!DOCTYPE html>
- <html lang="en">
- <head> with <meta charset="utf-8"> and <title>
- <style> tag with all CSS (embedded, not external)
- <body> with proper semantic structure
- Use CSS Grid or Flexbox for layout
- Responsive design with @media queries for print

CSS REQUIREMENTS:
- Use embedded <style> tag (no external CSS files)
- Use CSS Grid or Flexbox for two-column layout
- Use print-friendly colors and fonts
- Ensure proper spacing with margin and padding
- Use border and border-radius for subtle design elements
- Include @media print styles for PDF generation

AVOID:
- External CSS files or CDN links
- JavaScript (no interactivity needed)
- Complex animations or transitions
- Images or logos (unless absolutely necessary)
- Custom fonts that require external files
- Overly decorative elements
- Color backgrounds or boxes
- Bright or neon colors (stick to professional blue shades)
- Complex CSS that might not render in PDF

═══════════════════════════════════════════════════════════════════════════════
`
}

/**
 * Generates professional HTML resume code using OpenRouter API with fallback
 */
export async function generateHtmlResume(data: ResumeData): Promise<OpenRouterResult> {
  const model = data.model || DEFAULT_MODEL

  // Get comprehensive design instructions (only if no template)
  const designInstructions = data.templateStyleGuide ? '' : getHtmlDesignInstructions()
  
  // Template style guide (if template is selected)
  const templateGuide = data.templateStyleGuide
    ? `\n\n
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║         ⚠️⚠️⚠️  CRITICAL: TEMPLATE STYLE GUIDE  ⚠️⚠️⚠️                        ║
║                                                                               ║
║    YOU MUST FOLLOW THE TEMPLATE STRUCTURE BELOW EXACTLY                      ║
║    DO NOT DEVIATE FROM THE TEMPLATE LAYOUT AND STRUCTURE                     ║
║    THE TEMPLATE CODE EXAMPLES ARE YOUR PRIMARY REFERENCE                     ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

${data.templateStyleGuide}

╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                    🚨 ABSOLUTE MANDATORY REQUIREMENTS 🚨                      ║
║                                                                               ║
║  1. The template style guide above is THE ONLY DESIGN DIRECTIVE             ║
║  2. You MUST copy the EXACT structure from the MANDATORY STRUCTURE examples  ║
║  3. Use the EXACT HTML/CSS code structure shown in the template guide         ║
║  4. Replace only the placeholder text (NAME, email, etc.) with user data      ║
║  5. DO NOT change the structure, layout, or code organization                 ║
║  6. DO NOT use generic design - use ONLY the template structure              ║
║  7. The template structure OVERRIDES ALL other instructions                   ║
║  8. If template shows flex layout, use flex - DO NOT use grid                 ║
║  9. If template shows center, use center - DO NOT use left-align              ║
║  10. Follow the template code examples EXACTLY as written                    ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

IMPORTANT: Look at the "MANDATORY STRUCTURE" code examples in the template guide above.
Copy that EXACT structure and replace only the placeholder values with the user's actual data.
DO NOT modify the structure, layout, or code organization.

`
    : ''
  
  // Combine user's additional instructions with design guidelines
  const userInstructions = data.additionalInstructions 
    ? `\n\n═══════════════════════════════════════════════════════════════════════════════
USER'S CUSTOM INSTRUCTIONS:
═══════════════════════════════════════════════════════════════════════════════
${data.additionalInstructions}
═══════════════════════════════════════════════════════════════════════════════

IMPORTANT: Apply the user's custom instructions above while maintaining the design guidelines and template style. If there's a conflict, prioritize the user's instructions but ensure the resume remains professional and ATS-friendly.
`
    : ''

  // If template is selected, use template-first approach
  const prompt = templateGuide
    ? `You are an expert HTML/CSS resume designer. Your ONLY task is to copy the template structure below and replace placeholders with user data.

${templateGuide}

🚨🚨🚨 YOUR TASK - FOLLOW THESE STEPS EXACTLY 🚨🚨🚨

STEP 1: Look at the "MANDATORY STRUCTURE (HTML)" code above
STEP 2: Copy that ENTIRE code block EXACTLY - including <!DOCTYPE>, <html>, <head>, <style>, <body>, all CSS
STEP 3: Replace ONLY these placeholders:
   - "NAME" → ${data.fullName}
   - "email — phone" or "email | phone" → For Minimal Clean template: ${data.email} — ${data.phone} (CRITICAL: Use em dash — NOT pipe |). For other templates: ${data.email} | ${data.phone} (use pipe separator |)
   - Portfolio/Behance links: ONLY include if user provided them. Check if user data contains "portfolio.com", "behance.net", or similar portfolio links. If NOT provided, REMOVE the entire second contact line (the line with "behance.net/username — portfolio.com"). DO NOT add placeholder text or fake links.
   - Skills section: MANDATORY - MUST include Skills section. Parse ${data.skills} and create simple bullet points (<li>SkillName</li>) or comma-separated list in a single <li> tag (for templates like Modern Card). DO NOT add categories like "Programming:" or "Frontend Development:". Just list skills as simple items. If template shows "Skill1, Skill2, Skill3, Skill4, Skill5", replace with actual skills from user data.
   - Projects section: MANDATORY - MUST include Projects section if user provided project data. Parse ${data.projects} and create project entries with project name, year, and bullet points.
   - For Creative Designer template ONLY: Design Skills MUST be comma-separated list (Skill1, Skill2, Skill3). DO NOT add categories like "Frontend Development:", "Backend Development:", etc. DO NOT use bold for categories. Just list all skills as comma-separated text in one paragraph.
   - For Minimal Clean template ONLY: CRITICAL - Header MUST include NAME: Replace "NAME" placeholder with ${data.fullName} (use font-size: 20px; font-weight: bold in inline style). Skills MUST be comma-separated (can wrap across lines), NOT bullet points (<li>). DO NOT use categories. Format as: <p>React, TypeScript, Node.js, PostgreSQL, AWS</p>. All text MUST be black (#000) - NO colors, NO blue headings. Header MUST be centered: Name (large, bold) on first line, then email — phone on second line (use em dash — NOT pipe |). MUST use two-column layout for ALL content: Left column (40% width: Skills, Education), Right column (60% width: Experience, Projects). Use CSS Grid with grid-template-columns: 1fr 1.5fr and align-items: start for proper two-column layout. Ensure columns are properly balanced with gap: 40px between them. Experience format: Job Title (bold) on first line, then "Company — Location — Dates" on second line (use em dash — NOT pipe |), then bullet points. Education format: "Degree — Institution — Dates" (use em dash — NOT pipe |). Projects format: "Project Name — Technologies — Year" (use em dash — NOT pipe |). MUST include Projects section if user provided project data.
   - "Degree" → Extract degree from: ${data.education}
   - "Institution" → Extract institution from: ${data.education}
   - "Job Title" → Extract job titles from: ${data.experience}
   - "Company | Dates" → Extract from: ${data.experience}
   - "Description" → Use actual bullet points from: ${data.experience} and ${data.projects}
   - "Project Name" → Extract from: ${data.projects}
   - For Creative Designer template ONLY: Project format is "Project Name — Description" on first line (bold, purple), then "Technologies — Year" on second line (regular, black), then bullet points below

STEP 4: CONTENT ENHANCEMENT & FORMATTING (CRITICAL - APPLY TO ALL TEMPLATES):
   🚨 MANDATORY CONTENT REQUIREMENTS:
  
   0. DATA PRESERVATION (ABSOLUTE):
      - DO NOT shorten, summarize, or drop user-provided details.
      - Keep ALL significant experience, project, and education details from input.
      - If input has many lines, include them across multiple bullet points/entries instead of compressing.
   
   1. NAME FORMATTING (HIGHEST PRIORITY):
      - Name MUST be the LARGEST and MOST PROMINENT element in the entire resume
      - For HTML: Use font-size: 28-32px; font-weight: bold; for the name (largest font in the document)
      - Name should stand out as the primary heading - make it visually dominant
      - Name should be the first thing that catches the eye when viewing the resume
   
   2. BULLET POINT LENGTH REQUIREMENTS (MANDATORY FOR ALL SECTIONS):
      - CRITICAL: Each bullet point in Experience, Projects, and Education sections MUST follow these line requirements:
        * MINIMUM: 2 lines per bullet point (NEVER less than 2 lines - expand short descriptions)
        * MAXIMUM: 5 lines per bullet point (NEVER more than 5 lines - condense if too long)
        * IDEAL: 3 lines per bullet point (AIM for 3 lines when possible for optimal readability)
      - DO NOT write single-line bullet points - they must be at least 2 lines
      - DO NOT write bullet points longer than 5 lines - break them into multiple points if needed
      - Expand brief descriptions: If user provided short descriptions, enhance them with relevant details, technologies used, impact, and outcomes
      - Add context: Include information about scale, technologies, methodologies, and results
      - Use action verbs: Start each bullet with strong action verbs (Developed, Implemented, Designed, Led, etc.)
      - Quantify achievements: Add numbers, percentages, metrics, or scale when possible
   
   3. CONTENT ENHANCEMENT GUIDELINES:
      - Add more descriptive content: Expand on user-provided information with professional details
      - Include technical specifics: Mention specific technologies, frameworks, tools, and methodologies used
      - Add impact and results: Describe the impact, outcomes, and value delivered
      - Include scope and scale: Mention team size, project scale, user base, or data volume when relevant
      - Professional language: Use professional, industry-standard terminology
      - Avoid redundancy: Each bullet should provide unique information
      - Make it compelling: Write descriptions that showcase skills, achievements, and value
   
   4. SECTION-SPECIFIC ENHANCEMENTS:
      - Experience Section:
        * Expand job descriptions with specific responsibilities and achievements
        * Include technologies, tools, and methodologies used
        * Mention collaboration, leadership, or problem-solving aspects
        * Add quantifiable results and impact
      - Projects Section:
        * Provide detailed project descriptions
        * Explain the problem solved or value delivered
        * Include technical stack and implementation details
        * Mention challenges overcome and solutions implemented
      - Education Section:
        * Add relevant coursework, honors, or achievements if space allows
        * Include GPA if 3.5+ (format: GPA: 3.8/4.0)
        * Mention relevant academic projects or research if applicable
   
   5. CONTENT QUALITY STANDARDS:
      - Professional tone: Maintain professional, confident language throughout
      - Clarity: Write clear, concise, and impactful descriptions
      - Specificity: Be specific about technologies, tools, and achievements
      - Relevance: Focus on information relevant to the role or industry
      - ATS-friendly: Use standard terminology and keywords naturally

STEP 5: DO NOT CHANGE ANYTHING ELSE:
   ❌ DO NOT change CSS styles or classes
   ❌ DO NOT change layout (flex, grid, center, etc.)
   ❌ DO NOT change colors or styling values
   ❌ DO NOT change section order
   ❌ DO NOT add or remove sections
   ❌ DO NOT modify HTML structure or CSS
   ❌ DO NOT add skill categories - skills must be simple bullet points only
   ❌ DO NOT group or categorize skills - just list them as items
   ✅ MANDATORY: Skills section MUST be included in the final output
   ✅ MANDATORY: Education section MUST be included in the final output
   ✅ MANDATORY: Projects section MUST be included if user provided project data
   ✅ MANDATORY: If template shows Education and Projects sections, they MUST be included in the output
   ❌ DO NOT create duplicate sections - each section should appear only once

CRITICAL: The template code structure is FIXED. You can ONLY replace text placeholders. Everything else must stay EXACTLY as shown in the template.

USER DATA TO INSERT:
- Name: ${data.fullName}
${data.title ? `- Title: ${data.title}` : ''}
- Email: ${data.email}
- Phone: ${data.phone}
${data.location ? `- Location: ${data.location}` : ''}
${data.linkedin ? `- LinkedIn: ${data.linkedin}` : ''}
${data.github ? `- GitHub: ${data.github}` : ''}
${data.portfolio ? `- Portfolio: ${data.portfolio}` : ''}
${data.summary ? `- Summary: ${data.summary}` : ''}
- Skills: ${data.skills}
- Experience: ${data.experience}
- Education: ${data.education}
- Projects: ${data.projects}
${data.certifications ? `- Certifications: ${data.certifications}` : ''}
${data.achievements ? `- Achievements: ${data.achievements}` : ''}
${data.languagesKnown ? `- Languages Known: ${data.languagesKnown}` : ''}

Return ONLY the complete HTML code with placeholders replaced. No markdown, no explanations, no code blocks.`
    : `You are an expert HTML/CSS resume designer. Generate a modern, visually appealing, and professional HTML resume based on the following information.

${designInstructions}

CREATIVE ENHANCEMENTS (Apply your professional judgment):
- Add subtle design elements that enhance readability and visual appeal
- Use appropriate spacing and typography to create breathing room
- Consider adding subtle visual separators or dividers between major sections
- Ensure the name is the MOST prominent element (largest font, darkest blue)
- Create visual flow by using consistent spacing and alignment
- Add professional touches like subtle borders or spacing that improve readability
- Use smart formatting to highlight important information
- Consider adding a professional summary section if it enhances the resume
- Apply modern design principles while maintaining ATS compatibility

CRITICAL REQUIREMENTS:
1. Return ONLY raw HTML code - no markdown, no explanations, no code blocks
2. Follow ALL design guidelines above strictly
3. MANDATORY: Name must be LARGEST (28-32px) and DARKEST blue (#002244) - most prominent element
   - Name MUST be the BIGGEST and MOST PROMINENT heading in the entire resume
   - Use font-size: 28-32px; font-weight: bold; for the name (largest font in the document)
   - Name should be the first thing that catches the eye when viewing the resume
4. MANDATORY: Use DIFFERENT shades of blue for different heading levels to create clear hierarchy:
   - Section headers: #003366 (dark blue)
   - Subsection headers: #004488 (medium-dark blue)
   - Job/Project/Degree titles: #0066AA (medium blue)
   - Company/Institution names: #3388CC (lighter blue)
5. MANDATORY: Each bullet point in Experience, Education, and Projects MUST be:
   - MINIMUM: 2 lines (NEVER less - expand short descriptions with details, technologies, impact)
   - MAXIMUM: 5 lines (NEVER more - condense if too long)
   - IDEAL: 3 lines (AIM for 3 lines when possible for optimal readability)
   - DO NOT write single-line bullet points - they must be at least 2 lines
   - DO NOT write bullet points longer than 5 lines
   - Expand brief descriptions: Add relevant details, technologies used, impact, and outcomes
   - Add context: Include information about scale, technologies, methodologies, and results
   - Use action verbs: Start each bullet with strong action verbs (Developed, Implemented, Designed, Led, etc.)
   - Quantify achievements: Add numbers, percentages, metrics, or scale when possible
6. CONTENT ENHANCEMENT (MANDATORY):
   - Add more descriptive content: Expand on user-provided information with professional details
   - Include technical specifics: Mention specific technologies, frameworks, tools, and methodologies used
   - Add impact and results: Describe the impact, outcomes, and value delivered
   - Include scope and scale: Mention team size, project scale, user base, or data volume when relevant
   - Professional language: Use professional, industry-standard terminology
   - Make it compelling: Write descriptions that showcase skills, achievements, and value
7. DO NOT use black headings - EVERY heading and subheading must be blue
7. Use embedded <style> tag with all CSS (no external files)
8. Use CSS Grid or Flexbox for two-column layout
9. Keep the HTML code SIMPLE and CLEAN
10. Ensure the resume is well-structured and ATS-friendly
11. Improve grammar and make content professional
12. Format sections clearly: Header (name, email, phone), Skills, Experience, Education, Projects
13. Use two-column layout with CSS Grid or Flexbox
14. Apply your own professional enhancements to make the resume stand out while maintaining professionalism
${userInstructions}

FINAL REMINDER: 
- Name: LARGEST (24-28px) and DARKEST blue (#002244) - most prominent
- Section headings: Dark blue (#003366) with 16-18px font
- Job titles: Medium blue (#0066AA) with bold
- Project names: Medium blue (#0066AA) with bold
- Degree names: Medium blue (#0066AA) with bold
- Company names: Lighter blue (#3388CC) with italic
- Use DIFFERENT shades for DIFFERENT levels - create clear visual hierarchy
- Each bullet point: MIN 2 lines, MAX 5 lines, IDEAL 3 lines
- NO black headings allowed anywhere in the resume
- Apply creative enhancements to make the resume visually appealing and professional

USER INFORMATION:
- Name: ${data.fullName}
${data.title ? `- Title: ${data.title}` : ''}
- Email: ${data.email}
- Phone: ${data.phone}
${data.location ? `- Location: ${data.location}` : ''}
${data.linkedin ? `- LinkedIn: ${data.linkedin}` : ''}
${data.github ? `- GitHub: ${data.github}` : ''}
${data.portfolio ? `- Portfolio: ${data.portfolio}` : ''}
${data.summary ? `- Summary: ${data.summary}` : ''}
- Skills: ${data.skills}
- Experience: ${data.experience}
- Education: ${data.education}
- Projects: ${data.projects}
${data.certifications ? `- Certifications: ${data.certifications}` : ''}
${data.achievements ? `- Achievements: ${data.achievements}` : ''}
${data.languagesKnown ? `- Languages Known: ${data.languagesKnown}` : ''}

Generate the complete HTML document code now. Return ONLY the HTML code, nothing else.`

  const systemPrompt = data.templateStyleGuide
    ? `You are an HTML code generator. Your ONLY job is to copy-paste the template code structure and replace text placeholders.

🚨 CRITICAL RULES - FOLLOW EXACTLY 🚨:
1. Find the "MANDATORY STRUCTURE (HTML)" code block in the user's message
2. Copy that ENTIRE HTML code block EXACTLY as written (including <!DOCTYPE>, <html>, <head>, <style>, <body>, ALL CSS, ALL HTML structure)
3. Replace ONLY text placeholders (NAME, email, phone, etc.) with actual user values
4. DO NOT modify ANYTHING else - no structure changes, no layout changes, no CSS changes, no additions, no deletions
5. Return ONLY the complete HTML code - NO markdown code blocks, NO explanations, NO instructions, NO comments, NO text before or after the HTML
6. DO NOT return the instructions or prompt - ONLY return the HTML code
7. DO NOT add any text like "Here is the HTML:" or "Here's the code:" - just return the raw HTML
8. Start your response with <!DOCTYPE html> and end with </html>
9. If you see instructions or formatting rules in the user message, IGNORE THEM - only copy the HTML code from "MANDATORY STRUCTURE (HTML)" section

You are NOT a designer. You are NOT an instructor. You are a code copier. Copy the template HTML structure exactly and replace placeholders. Return ONLY HTML code, nothing else.`
    : 'You are an expert HTML/CSS resume designer. Always return ONLY raw HTML code without any markdown formatting, explanations, or code blocks. Start with <!DOCTYPE html> and end with </html>. Return ONLY the HTML code, nothing else.'

  const result = await callOpenRouter(
    [
      {
        role: 'system',
        content: systemPrompt,
      },
      { role: 'user', content: prompt },
    ],
    model,
    {
      maxModels: OPENROUTER_GENERATE_MAX_MODELS,
      singleTimeoutMs: OPENROUTER_GENERATE_SINGLE_TIMEOUT_MS,
    },
  )

  return {
    raw: result.content,
    cleaned: cleanHtmlResponse(result.content),
    model: result.model,
    isFallback: result.isFallback,
  }
}

/**
 * Processes a follow-up prompt to modify existing HTML code with fallback
 */
export async function followUpHtml(
  currentHtml: string,
  prompt: string,
  model?: string,
): Promise<OpenRouterResult> {
  const selectedModel = model || DEFAULT_MODEL

  // Get comprehensive design instructions for follow-up modifications
  const designInstructions = getHtmlDesignInstructions()

  const followUpPrompt = `You are an expert HTML/CSS resume designer. I have an existing HTML resume code, and I want you to modify it based on the following instruction.

${designInstructions}

EXISTING HTML CODE:
\`\`\`html
${currentHtml}
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
1. Return ONLY the complete modified HTML code - no markdown, no explanations, no code blocks
2. MANDATORY: Name must be LARGEST (24-28px) and DARKEST blue (#002244) - most prominent element
3. MANDATORY: Use DIFFERENT shades of blue for different heading levels:
   - Section headers: #003366 (dark blue)
   - Subsection headers: #004488 (medium-dark blue)
   - Job/Project/Degree titles: #0066AA (medium blue)
   - Company/Institution names: #3388CC (lighter blue)
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
9. Ensure the HTML code remains valid and well-formed
10. Use embedded <style> tag with all CSS (no external files)
11. Use CSS Grid or Flexbox for layout
12. Keep the HTML code SIMPLE and CLEAN
13. Maintain ATS-friendly formatting
14. Apply your own professional enhancements to improve the resume

FINAL REMINDER: 
- Name: LARGEST (24-28px) and DARKEST blue (#002244) - most prominent
- Section headings: Dark blue (#003366) with 16-18px font
- Job titles: Medium blue (#0066AA) with bold
- Project names: Medium blue (#0066AA) with bold
- Degree names: Medium blue (#0066AA) with bold
- Company names: Lighter blue (#3388CC) with italic
- Use DIFFERENT shades for DIFFERENT levels - create clear visual hierarchy
- NO black headings allowed anywhere in the resume
- Apply creative enhancements to make the resume visually appealing

Return the complete modified HTML document code now. Return ONLY the HTML code, nothing else.`

  const result = await callOpenRouter(
    [
      {
        role: 'system',
        content: 'You are an expert HTML/CSS resume designer. Always return ONLY raw HTML code without any markdown formatting, explanations, or code blocks.',
      },
      { role: 'user', content: followUpPrompt },
    ],
    selectedModel,
  )

  const cleaned = cleanHtmlResponse(result.content)
  if (!cleaned) {
    throw new Error('Failed to extract HTML code from AI response')
  }

  return {
    raw: result.content,
    cleaned,
    model: result.model,
    isFallback: result.isFallback,
  }
}
