// src/app/api/tiny-fish/generate-tests/route.ts

import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import OpenAI from "openai";
import { z } from "zod";

// Validate user input
const schema = z.object({
  url: z.string().url("Please enter a valid URL"),
  count: z.number().int().min(1).max(20).default(5),
});

// OpenAI client using V0 API key and URL
const openai = new OpenAI({
  apiKey: env.V0_API_KEY, // V0 API key from environment variables
  baseURL: env.V0_API_URL, // V0 API URL from environment variables
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid URL" },
      { status: 400 }
    );
  }

  const { url, count } = parsed.data;

  try {
    // Ask V0 to generate test cases
    const completion = await openai.chat.completions.create({
      model: "v0-1.5-md",
      messages: [
        {
          role: "system",
          // Tell AI to return ONLY a JSON array
          content: `You are a QA engineer. Generate exactly ${count} test cases for testing a website.
          
          Return ONLY a JSON array, no explanation, no markdown, no thinking tags:
          [
            {
              "id": 1,
              "name": "Test case name",
              "goal": "Detailed instruction for the AI agent to test this"
            }
          ]`,
        },
        {
          role: "user",
          content: `Generate exactly ${count} test cases for this website: ${url}`,
        },
      ],
    });

    // Get raw response from V0
    const rawContent = completion.choices[0]?.message?.content ?? "[]";

    console.log("Raw content from V0:", rawContent);

    // V0 adds thinking process before the actual response
    const withoutThinking = rawContent
      .replace(/<Thinking>[\s\S]*?<\/Thinking>/g, "")
      .trim();

    // V0 sometimes wraps JSON in code blocks
    const withoutMarkdown = withoutThinking
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // Extract JSON ARRAY [...]
    // V0 returns an array not an object
    const jsonMatch = withoutMarkdown.match(/\[[\s\S]*\]/);
    const jsonString = jsonMatch ? jsonMatch[0] : "[]";

    console.log("Cleaned JSON:", jsonString);

    //  Parse the clean JSON array ──
    let tests: Array<{ id: number; name: string; goal: string }> = [];

    try {
      tests = JSON.parse(jsonString) as Array<{
        id: number;
        name: string;
        goal: string;
      }>;
    } catch (parseError) {
      console.error("Parse error:", parseError);
      console.error("Raw content:", rawContent);
      return NextResponse.json(
        { error: "AI returned invalid format. Please try again." },
        { status: 500 }
      );
    }

    // Return the test cases as array directly
    return NextResponse.json({
      success: true,
      tests: tests,   //  directly the array
      url,
      count,
    });

  } catch (error) {
    console.error("OpenAI error:", error);
    return NextResponse.json(
      { error: "Failed to generate test cases" },
      { status: 500 }
    );
  }
}
