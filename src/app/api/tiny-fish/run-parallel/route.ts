// src/app/api/run-parallel/route.ts

import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { z } from "zod";

// Each test case has an id, name and goal
const schema = z.object({
  url: z.string().url(),
  tests: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      goal: z.string(),
    })
  ),
});

// This function runs ONE test case using TinyFish
// It is called for each test case simultaneously
async function runSingleTest(
  url: string,
  test: { id: number; name: string; goal: string }
) {
  try {
    // Send this single test to TinyFish API
    const res = await fetch(
      "https://agent.tinyfish.ai/v1/automation/run-sse",
      {
        method: "POST",
        headers: {
          "X-API-Key": env.TINYFISH_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          // Tell agent exactly what to test
          goal: `${test.goal}. Return a JSON with:
          {
            "passed": true or false,
            "summary": "what you found",
            "details": "step by step what you did"
          }`,
        }),
      }
    );

    if (!res.ok) {
      // If TinyFish failed for this test
      return {
        id: test.id,
        name: test.name,
        status: "failed" as const,
        passed: false,
        summary: "Agent failed to run",
        details: "",
      };
    }

    // Read the streaming response from TinyFish
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let finalResult = null;

    if (!reader) {
      return {
        id: test.id,
        name: test.name,
        status: "failed" as const,
        passed: false,
        summary: "No response from agent",
        details: "",
      };
    }

    // Keep reading until stream ends
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk
        .split("\n")
        .filter((l) => l.startsWith("data: "));

      for (const line of lines) {
        try {
          const data = JSON.parse(line.replace("data: ", "")) as {
            type: string;
            resultJson?: Record<string, unknown>;
          };

          // When agent completes --> save the result
          if (data.type === "COMPLETE") {
            finalResult = data.resultJson;
          }
        } catch {
          // If this line isn't valid JSON, ignore it and keep reading
        }
      }
    }

    // Return the result for this test
    return {
      id: test.id,
      name: test.name,
      status: "completed" as const,
      passed: (finalResult as { passed?: boolean })?.passed ?? false,
      summary: (finalResult as { summary?: string })?.summary ?? "No summary",
      details: (finalResult as { details?: string })?.details ?? "",
    };

  } catch (error) {
    // Something went wrong with this test
    return {
      id: test.id,
      name: test.name,
      status: "error" as const,
      passed: false,
      summary: "Error running test",
      details: String(error),
    };
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input" },
      { status: 400 }
    );
  }

  const { url, tests } = parsed.data;

  try {
    // Promise.all runs ALL tests at the SAME TIME
    // Not one by one — ALL TOGETHER in parallel!
    const results = await Promise.all(
      tests.map((test) => runSingleTest(url, test))
    );

    // Count how many passed and failed
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    // Return the complete report
    return NextResponse.json({
      success: true,
      url,
      summary: {
        total: tests.length,
        passed,        // how many tests passed ✅
        failed,        // how many tests failed ❌
        passRate: `${Math.round((passed / tests.length) * 100)}%`,
      },
      results,         // detailed results for each test
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Parallel run error:", error);
    return NextResponse.json(
      { error: "Failed to run tests" },
      { status: 500 }
    );
  }
}
