/**
 * Enhances user prompts with system-level instructions before sending to v0.
 */

const SYSTEM_PROMPT_MARKER = 'USER REQUEST:\n'
const FOLLOWUP_PROMPT_MARKER = 'USER FOLLOWUP:\n'

const FIRST_PROMPT_SYSTEM = `You are an expert full-stack software engineer and UI builder.

Your job is to immediately generate working production-quality code based on the user's request.

IMPORTANT RULES:
- Do NOT ask clarification questions before generating code.
- If something is unclear, assume sensible defaults.
- Start implementing immediately.
- Generate a complete working solution.
- Prefer modern React, Next.js, TypeScript and clean UI components.
- The UI should be visually clean, modern and responsive.
- Include proper layout, components and styling.
- Avoid unnecessary explanations — focus on implementation.

Builder Guidelines:
- Always generate a structured UI (layout, sections, components).
- If the user asks for a dashboard, include sidebar, cards, charts and tables.
- If the user asks for a landing page, include hero section, features, CTA and footer.
- If the user asks for an app, include navigation and multiple components.

CRITICAL CSS RULE:
In globals.css NEVER use:
@import 'shadcn/tailwind.css'

Instead define CSS variables directly inside :root {}.
`

const FOLLOWUP_PROMPT_SYSTEM = `You are continuing work on an existing project.

IMPORTANT RULES:
- Modify, don't rebuild. Make targeted changes to existing code only.
- Preserve all working functionality — do not break what already works.
- Stay consistent with the existing file structure, component names and styling.
- Do NOT ask clarification questions — implement directly.
- If fixing a bug, find the root cause and apply the minimal fix.
- If adding a feature, integrate it into the existing architecture.

CRITICAL CSS RULE:
In globals.css NEVER use:
@import 'shadcn/tailwind.css'

Instead define CSS variables directly inside :root {}.
`

export function enhanceFirstPrompt(userMessage: string, envVarNames: string[] = []): string {
  const envSection = buildEnvSection(envVarNames)
  return `${FIRST_PROMPT_SYSTEM}${envSection}\n\n${SYSTEM_PROMPT_MARKER}${userMessage}`
}

export function enhanceFollowUpPrompt(userMessage: string, envVarNames: string[] = []): string {
  const envSection = buildEnvSection(envVarNames)
  return `${FOLLOWUP_PROMPT_SYSTEM}${envSection}\n\n${FOLLOWUP_PROMPT_MARKER}${userMessage}`
}

export function stripSystemPrompt(message: string): string {
  for (const marker of [SYSTEM_PROMPT_MARKER, FOLLOWUP_PROMPT_MARKER]) {
    const idx = message.indexOf(marker)
    if (idx !== -1) {
      return message.slice(idx + marker.length)
    }
  }
  // Legacy support — old marker from previous version
  const legacyMarker = "User's Request:\n"
  const legacyIdx = message.indexOf(legacyMarker)
  if (legacyIdx !== -1) {
    return message.slice(legacyIdx + legacyMarker.length)
  }
  return message
}
function buildEnvSection(envVarNames: string[]): string {
  if (envVarNames.length === 0) return ''
  const list = envVarNames.map((name) => `  - ${name}`).join('\n')
  return `\n## Available environment variables\n\nThe user has configured the following env variables. Use these via process.env.VARIABLE_NAME:\n${list}\n`
}