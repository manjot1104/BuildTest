import { NextResponse } from "next/server";

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
  const { prompt, systemPrompt } = await req.json();

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

messages.push({ role: "user", content: optimizedPrompt.trim() });

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
  });

  const data = await response.json();
  console.log("finish_reason:", data?.choices?.[0]?.finish_reason);
  console.log("is3D:", is3D);

  if (data.error) {
    return NextResponse.json({ error: data.error }, { status: 400 });
  }

  return NextResponse.json(data);
}
