/**
 * Enhances the first user prompt with additional system-level instructions
 * to improve the quality of AI-generated responses.
 *
 * Only applied to new chats (first message), not follow-up messages.
 */
export function enhanceFirstPrompt(userMessage: string): string {
  const systemPrefix = `You are an expert full-stack software engineer and UI builder.

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

  return `${systemPrefix}\n\nUSER REQUEST:\n${userMessage}`
}

const SYSTEM_PROMPT_MARKER = "User's Request:\n"

/**
 * Strips the system prompt prefix from an enhanced message,
 * returning only the original user message.
 */
export function stripSystemPrompt(message: string): string {
  const idx = message.indexOf(SYSTEM_PROMPT_MARKER)
  if (idx !== -1) {
    return message.slice(idx + SYSTEM_PROMPT_MARKER.length)
  }
  return message
}
