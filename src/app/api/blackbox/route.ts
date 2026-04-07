import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const response = await fetch("https://api.blackbox.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.BLACKBOX_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "blackboxai/anthropic/claude-opus-4.6",
      max_tokens: 8192,
      messages: [
        {
          role: "system",
          content: `You are an elite creative developer who builds cinematic Three.js experiences. 
You ALWAYS output ONLY raw HTML — no markdown fences, no backticks, no prose. 
The HTML must be complete and self-contained, starting with <!DOCTYPE html> and ending with </html>.
Never truncate. Never stop early. Always close every tag and every script block fully.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  const data = await response.json();
  console.log("finish_reason:", data?.choices?.[0]?.finish_reason);

  if (data.error) {
    return NextResponse.json({ error: data.error }, { status: 400 });
  }

  return NextResponse.json(data);
}