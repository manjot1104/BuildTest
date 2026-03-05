// src/app/api/tiny-fish/route.ts

import { type NextRequest } from "next/server";
import { env } from "@/env";
import { z } from "zod";

const schema = z.object({
  url: z.string().url("User type any website Url"),
  goal: z.string().min(1, "Please enter a goal"),
}); //creating a validation rule , the url should be a valid url and the goal should not be empty

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: parsed.error.flatten() }),
      { status: 400 }
    );
  }

  const { url, goal } = parsed.data;

  const tinyfishRes = await fetch(
    "https://agent.tinyfish.ai/v1/automation/run-sse",
    {
      method: "POST",
      headers: {
        "X-API-Key": env.TINYFISH_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, goal }),
    }
  );

  return new Response(tinyfishRes.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}