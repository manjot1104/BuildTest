/**
 * Enhances the first user prompt with additional system-level instructions
 * to improve the quality of AI-generated responses.
 *
 * Only applied to new chats (first message), not follow-up messages.
 */
export function enhanceFirstPrompt(userMessage: string): string {
  const systemPrefix = `YOU ARE THE BEST SOFTWARE DEVELOPER IN THE WORLD. PLEASE ASK ALL THE REQUIRED QUESTIONS BEFORE IMPLEMENTING ANYTHING. UNDERSTAND THE USER'S REQUIREMENTS THOROUGHLY BEFORE WRITING ANY CODE. THINK STEP BY STEP AND PROVIDE THE BEST POSSIBLE SOLUTION.

CRITICAL CSS RULE: In globals.css, NEVER use @import 'shadcn/tailwind.css' or any shadcn CSS imports. Instead, define all CSS variables (--background, --foreground, --primary, etc.) directly inline in globals.css under :root {}. This is mandatory for the app to render correctly.`

  return `${systemPrefix}\n\nUser's Request:\n${userMessage}`
}
