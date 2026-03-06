// src/server/services/openrouter.service.ts
//
// OpenRouter AI wrapper for:
//   1. generateTestCases(crawlData)  → TestCase[] covering all 9 categories
//   2. generateAISummary(results)    → plain-English executive summary
//
// Model priority: claude-sonnet-4-5 → gpt-4o → deepseek-chat
// Single call per test run (cost-optimised: ~$0.01 per site)

import type { CrawledPage } from "./tinyfish.service";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Model fallback chain
const MODELS = [
  "anthropic/claude-sonnet-4-5",
  "openai/gpt-4o",
  "deepseek/deepseek-chat",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TestCase {
  id: string;
  category:
    | "navigation"
    | "forms"
    | "auth"
    | "responsive"
    | "visual"
    | "performance"
    | "accessibility"
    | "error_handling"
    | "security";
  title: string;
  description: string;
  steps: string[];            // natural language steps for TinyFish
  expected_result: string;
  priority: "P0" | "P1" | "P2";
  tags: string[];
  estimated_duration: number; // ms
  target_url: string;         // which page this test runs against
}

export interface SiteContext {
  rootUrl: string;
  pages: CrawledPage[];
  allLinks: string[];
  // Optional Buildify app context (injected in Phase 2)
  buildifyContext?: {
    routes?: string[];
    components?: string[];
    hasAuth?: boolean;
    dbSchema?: string;
  };
}

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

// ---------------------------------------------------------------------------
// Core OpenRouter caller with model fallback
// ---------------------------------------------------------------------------

async function callOpenRouter(
  messages: OpenRouterMessage[],
  maxTokens = 4000,
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set in environment variables");
  }

  let lastError: Error | null = null;

  for (const model of MODELS) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://buildify.app",
          "X-Title": "Buildify Testing Engine",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature: 0.3, // Low temp = consistent structured output
          messages,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as OpenRouterResponse;
      const content = data.choices?.[0]?.message?.content;

      if (!content) throw new Error("Empty response from OpenRouter");

      return content;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(
        `[OpenRouter] Model ${model} failed: ${lastError.message}. Trying next...`,
      );
      continue;
    }
  }

  throw new Error(
    `All OpenRouter models failed. Last error: ${lastError?.message}`,
  );
}

// ---------------------------------------------------------------------------
// Helper: safely parse JSON from AI response
// Strips markdown fences if the model wraps output in ```json
// ---------------------------------------------------------------------------

function parseJsonFromAI<T>(raw: string): T {
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to extract a JSON array or object from within the response
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) return JSON.parse(arrayMatch[0]) as T;

    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objectMatch) return JSON.parse(objectMatch[0]) as T;

    throw new Error(
      `Could not parse JSON from AI response: ${cleaned.slice(0, 200)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Build a compact crawl summary for the prompt (keeps token count low)
// ---------------------------------------------------------------------------

function buildCrawlSummary(context: SiteContext): string {
  const { rootUrl, pages } = context;

  const pageSummaries = pages.slice(0, 20).map((p) => ({
    url: p.url,
    title: p.title,
    hasForm: p.forms.length > 0,
    formFields: p.forms.flatMap((f) => f.fields.map((field) => field.name)),
    buttonCount: p.elements.filter((e) => e.type === "button").length,
    linkCount: p.elements.filter((e) => e.type === "link").length,
    internalLinks: p.internalLinks.slice(0, 10),
  }));

  const hasAuth = pages.some(
    (p) =>
      p.url.includes("login") ||
      p.url.includes("signup") ||
      p.url.includes("auth") ||
      p.elements.some(
        (e) =>
          e.text?.toLowerCase().includes("sign in") ||
          e.text?.toLowerCase().includes("log in"),
      ),
  );

  return JSON.stringify(
    {
      rootUrl,
      totalPages: pages.length,
      hasAuthPages: hasAuth,
      pages: pageSummaries,
      buildifyContext: context.buildifyContext ?? null,
    },
    null,
    2,
  );
}

// ---------------------------------------------------------------------------
// Public: Generate all test cases from crawl data (single AI call)
// ---------------------------------------------------------------------------

export async function generateTestCases(
  context: SiteContext,
): Promise<TestCase[]> {
  const crawlSummary = buildCrawlSummary(context);

  const systemPrompt = `You are an expert QA engineer. Your job is to generate comprehensive browser test cases for a website.
You MUST return ONLY a valid JSON array of test case objects. No explanation, no markdown, no preamble.
Each test case will be executed by an AI browser agent (TinyFish) that accepts natural language goals.
So steps must be written as clear, actionable natural language instructions a browser agent can follow.`;

  const userPrompt = `Generate test cases for this website based on the crawl data below.

CRAWL DATA:
${crawlSummary}

Generate test cases across ALL 9 categories with these priorities:
- P0 Critical: navigation, forms, auth         → 5-8 tests each
- P1 High:     responsive, visual, performance, accessibility → 3-5 tests each
- P2 Medium:   error_handling, security        → 2-3 tests each

RULES:
- Each step must be a single clear instruction an AI browser agent can execute
- target_url must be a real URL from the crawl data above
- estimated_duration is in milliseconds (range: 5000–30000)
- tags are short lowercase keywords like ["form", "email", "validation"]
- If no auth pages are detected, skip the auth category

Return a JSON array where every object matches this exact shape:
{
  "id": "tc_001",
  "category": "navigation",
  "title": "Verify homepage links resolve without 404",
  "description": "Check that all links on the homepage lead to valid pages",
  "steps": [
    "Navigate to ${context.rootUrl}",
    "Click each navigation link one by one",
    "Verify each page loads without a 404 or error message"
  ],
  "expected_result": "All navigation links resolve to valid pages",
  "priority": "P0",
  "tags": ["navigation", "links", "404"],
  "estimated_duration": 15000,
  "target_url": "${context.rootUrl}"
}

Return ONLY the JSON array. No other text.`;

  const raw = await callOpenRouter([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  const testCases = parseJsonFromAI<TestCase[]>(raw);

  // Validate and fill in any missing fields
  return testCases
    .filter((tc) => tc.title && tc.steps?.length > 0 && tc.category)
    .map((tc, i) => ({
      ...tc,
      id: tc.id ?? `tc_${String(i + 1).padStart(3, "0")}`,
      priority: (
        ["P0", "P1", "P2"].includes(tc.priority) ? tc.priority : "P1"
      ) as "P0" | "P1" | "P2",
      tags: tc.tags ?? [],
      estimated_duration: tc.estimated_duration ?? 10000,
      target_url: tc.target_url ?? context.rootUrl,
    }));
}

// ---------------------------------------------------------------------------
// Public: Generate plain-English executive summary for the report top card
// ---------------------------------------------------------------------------

export interface TestRunSummaryInput {
  targetUrl: string;
  overallScore: number;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  bugs: {
    severity: "critical" | "high" | "medium" | "low";
    title: string;
    pageUrl: string;
    category: string;
  }[];
}

export async function generateAISummary(
  input: TestRunSummaryInput,
): Promise<string> {
  const systemPrompt = `You are a QA analyst writing an executive summary of a website test report.
Write in plain English that a non-technical founder or PM can understand.
Be direct and specific. Lead with the most critical issues.
Keep it to 3-4 sentences max.`;

  const userPrompt = `Write a summary for this test run:

Site: ${input.targetUrl}
Score: ${input.overallScore}/100
Results: ${input.passed} passed, ${input.failed} failed, ${input.skipped} skipped out of ${input.totalTests} total tests

Top bugs found:
${input.bugs
  .slice(0, 5)
  .map((b) => `- [${b.severity.toUpperCase()}] ${b.title} (${b.pageUrl})`)
  .join("\n")}

Write 3-4 sentences. Start with score context, then the most important issues, then a closing recommendation.
Return plain text only — no JSON, no markdown, no bullet points.`;

  const summary = await callOpenRouter(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    500, // Summary is short — cap tokens to save cost
  );

  return summary.trim();
}