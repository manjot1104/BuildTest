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
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a Three.js expert. Return only HTML.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  const data = await response.json();
  console.log(data);

  return NextResponse.json(data);
}