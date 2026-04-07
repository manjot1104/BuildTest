import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { prompt, systemPrompt } = await req.json();

  const messages: { role: string; content: string }[] = []

  // Enhanced 3D/Spline logic for premium output
  const is3D = prompt.toLowerCase().includes('3d') || prompt.toLowerCase().includes('spline') || (systemPrompt && systemPrompt.toLowerCase().includes('3d'));
  
  let finalSystemPrompt = systemPrompt || "You are an expert web developer.";
  
  if (is3D) {
    finalSystemPrompt += " Focus on cinematic quality, premium aesthetics (draftly.space level), and perfect responsive layouts. Ensure all interactive elements are clearly separated from 3D background/centerpiece. Use high-end typography and generous whitespace. Never truncate code.";
  }

  messages.push({ role: "system", content: finalSystemPrompt })
  messages.push({ role: "user", content: prompt })

  const response = await fetch("https://api.blackbox.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.BLACKBOX_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "blackboxai/anthropic/claude-opus-4.6",
      max_tokens: 16000,   // ← key fix
      messages,
    }),
  });

  const data = await response.json();
  console.log("finish_reason:", data?.choices?.[0]?.finish_reason);

  if (data.error) {
    return NextResponse.json({ error: data.error }, { status: 400 });
  }

  return NextResponse.json(data);
}