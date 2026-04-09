import { NextResponse } from "next/server";
import { getSession } from '@/server/better-auth/server'
import { deductCredits } from '@/server/services/credits.service'
import { CREDIT_COSTS } from '@/config/credits.config'

// ─── Expert Three.js r128 System Prompt ───────────────────────────────────────
const THREEJS_EXPERT_SYSTEM_PROMPT = `
You are an elite 3D web designer using Three.js.

Output ONLY complete HTML (<!DOCTYPE html> to </html>).

Your scenes MUST feel cinematic and premium.

Focus on:
- strong depth (foreground, midground, background separation)
- cinematic lighting (key + rim light + soft shadows)
- smooth, subtle animations (floating, easing, no jerks)
- clean, minimal UI integrated with 3D

Always include:
- depth using fog or layered composition
- a clear central subject (not random geometry)
- smooth mouse-based parallax or camera movement

Avoid:
- flat scenes
- random basic shapes
- cluttered or flashy visuals

Keep performance smooth and realistic.
ALWAYS include working mouse and scroll interaction logic.

- Mouse move MUST rotate scene or camera smoothly using lerp
- Scroll MUST zoom camera or change depth
- Add window.addEventListener('mousemove', ...) and 'message' listener for scroll
The HTML MUST include:

window.addEventListener('message', (e) => {
  if (e.data.type === 'SCROLL') {
    camera.position.z = 5 - e.data.progress * 3
  }
})
Scenes without interaction are invalid.
Every output should feel like a high-end product website.
`;

// ─── Route Handler ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
let body: any = {}
try {
  body = await req.json()
} catch {
  return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
}
const { prompt, systemPrompt, isFollowUp = false } = body
if (!prompt) {
  return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
}

  const messages: { role: string; content: string }[] = [];

  // Detect if this is a 3D request
  const is3D = true 
  // Use the expert 3D system prompt for 3D requests, otherwise use provided or default
  let finalSystemPrompt: string;
  if (is3D) {
    finalSystemPrompt = THREEJS_EXPERT_SYSTEM_PROMPT;
  } else {
    finalSystemPrompt =
      systemPrompt ||
      "You are an expert web developer specializing in premium, production-ready websites. Output ONLY raw HTML. No markdown, no backticks, no explanation. ";
  }
messages.push({ role: "system", content: finalSystemPrompt });

const optimizedPrompt = `
Create a premium 3D website for: "${prompt}"

Cinematic, minimal, high-end.
Strong depth, smooth motion, realistic lighting.

No clutter.
`;
const session = await getSession();

let deducted = false
let cost = 0

if (session?.user?.id) {
  cost = isFollowUp
    ? CREDIT_COSTS.FOLLOW_UP_PROMPT * 3
    : CREDIT_COSTS.NEW_PROMPT * 3

  await deductCredits(
    session.user.id,
    cost,
    '3d_builder',
    undefined
  )

  deducted = true
}
messages.push({ role: "user", content: optimizedPrompt.trim() });
 
let data

try {
  const response = await fetch("https://api.blackbox.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.BLACKBOX_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "blackboxai/anthropic/claude-opus-4.6",
      max_tokens: 12000,
      messages,
    }),
  })

  data = await response.json()

if (data.error) {
  const errMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error)
  const isBudgetError = errMsg.includes('ExceededBudget') || errMsg.includes('budget_exceeded') || errMsg.includes('over budget')
  if (isBudgetError) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 })
  }
  throw new Error(errMsg)
}

} catch (err) {
  console.error("3D generation failed:", err)
  return NextResponse.json(
    { error: "3D generation failed. Please try again." },
    { status: 500 }
  )
}

return NextResponse.json(data);

}
