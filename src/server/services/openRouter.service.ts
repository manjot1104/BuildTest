// src/server/services/openrouter.service.ts

import type { CrawledPage } from "./tinyfish.service";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "openrouter/auto",
];

export interface TestCase {
  id: string;
  category: "navigation" | "forms" | "auth" | "responsive" | "visual" | "performance" | "accessibility" | "error_handling" | "security";
  title: string;
  description: string;
  steps: string[];
  expected_result: string;
  priority: "P0" | "P1" | "P2";
  tags: string[];
  estimated_duration: number;
  target_url: string;
}

export interface SiteContext {
  rootUrl: string;
  pages: CrawledPage[];
  allLinks: string[];
  buildifyContext?: { routes?: string[]; components?: string[]; hasAuth?: boolean; dbSchema?: string };
}

export interface TestRunSummaryInput {
  targetUrl: string;
  overallScore: number;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  bugs: { severity: "critical" | "high" | "medium" | "low"; title: string; pageUrl: string; category: string }[];
}

interface OpenRouterMessage { role: "system" | "user" | "assistant"; content: string }
interface OpenRouterResponse { choices: { message: { content: string } }[] }

async function callOpenRouter(messages: OpenRouterMessage[], maxTokens = 4000): Promise<string> {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not set");
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
        body: JSON.stringify({ model, max_tokens: maxTokens, temperature: 0.1, messages }),
      });
      if (!response.ok) throw new Error(`OpenRouter ${response.status}: ${await response.text()}`);
      const data = (await response.json()) as OpenRouterResponse;
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty response from OpenRouter");
      console.log(`[OpenRouter] ✓ model: ${model}, chars: ${content.length}`);
      return content;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[OpenRouter] Model ${model} failed: ${lastError.message}. Trying next...`);
    }
  }
  throw new Error(`All OpenRouter models failed. Last error: ${lastError?.message}`);
}

// ---------------------------------------------------------------------------
// Robust JSON extraction
// ---------------------------------------------------------------------------

function extractJsonArray<T>(raw: string): T {
  let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

  try { return JSON.parse(cleaned) as T; } catch { /* continue */ }

  const arrayStart = cleaned.indexOf("[");
  const arrayEnd = cleaned.lastIndexOf("]");
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    try { return JSON.parse(cleaned.slice(arrayStart, arrayEnd + 1)) as T; } catch { /* continue */ }
  }

  const objStart = cleaned.indexOf("{");
  const objEnd = cleaned.lastIndexOf("}");
  if (objStart !== -1 && objEnd > objStart) {
    try { return JSON.parse(cleaned.slice(objStart, objEnd + 1)) as T; } catch { /* continue */ }
  }

  const match = cleaned.match(/(\[[\s\S]*\])/);
  if (match) { try { return JSON.parse(match[1]!) as T; } catch { /* continue */ } }

  throw new Error(`Could not extract JSON from AI response (${cleaned.length} chars). Preview: ${cleaned.slice(0, 300)}`);
}

// ---------------------------------------------------------------------------
// Build a rich but concise crawl summary for the AI
// ---------------------------------------------------------------------------

function buildCrawlSummary(context: SiteContext): string {
  const pageSummaries = context.pages.slice(0, 20).map((p) => ({
    url: p.url,
    title: p.title,
    hasForm: p.forms.length > 0,
    formFields: p.forms.flatMap((f) => f.fields.map((field) => `${field.name}(${field.type}${field.required ? ",required" : ""})`)),
    buttons: p.elements.filter((e) => e.type === "button").map((e) => e.text).filter(Boolean).slice(0, 10),
    links: p.elements.filter((e) => e.type === "link").map((e) => ({ text: e.text, href: e.href })).slice(0, 15),
    internalLinks: p.internalLinks.slice(0, 10),
  }));

  const hasAuth = context.pages.some((p) =>
    p.url.includes("login") || p.url.includes("signup") || p.url.includes("auth") ||
    p.elements.some((e) => {
      const t = e.text?.toLowerCase() ?? "";
      return t.includes("sign in") || t.includes("log in") || t.includes("register");
    }),
  );

  return JSON.stringify({
    rootUrl: context.rootUrl,
    totalPages: context.pages.length,
    hasAuthPages: hasAuth,
    pages: pageSummaries,
  }, null, 2);
}

// ---------------------------------------------------------------------------
// generateTestCases
//
// KEY CHANGE: Steps must be concrete browser actions, not vague descriptions.
// TinyFish is a browser automation agent — it needs instructions like:
//   "Click the element with text 'About'"
//   "Type 'test@example.com' into the email input field"
//   "Verify the URL contains '/about'"
//
// Vague steps like "Navigate to the about page" cause failures because the
// agent doesn't know HOW to navigate (click link? type URL?).
// ---------------------------------------------------------------------------

export async function generateTestCases(context: SiteContext): Promise<TestCase[]> {
  const crawlSummary = buildCrawlSummary(context);

  const systemPrompt = `You are an expert QA automation engineer generating browser test cases for an AI browser agent called TinyFish.

CRITICAL RULES FOR STEPS:
1. Steps must be EXPLICIT BROWSER ACTIONS — the agent cannot infer intent.
2. Every action must reference a SPECIFIC element: use exact button text, link text, input placeholder, or label.
3. Navigation steps must say: Navigate to URL "https://..." directly in the browser address bar.
4. Click steps must say: Click the element with text "<exact text>" or Click the "<label>" button/link.
5. Type steps must say: Type "<value>" into the "<field name>" input field.
6. Verify steps must say: Verify that "<specific observable condition>" — e.g., "Verify that the URL contains '/about'", "Verify that a success message appears".
7. Never say "go to the about page" — say "Click the link with text 'About'" or "Navigate to URL '<specific url>'".
8. Keep steps short (1 action per step). 3–6 steps per test is ideal.

You MUST return ONLY a valid JSON array. No explanation, no markdown, no text before or after. Start with [ and end with ].`;

  const userPrompt = `Generate browser automation test cases for this website.

CRAWL DATA:
${crawlSummary}

CATEGORIES TO COVER (generate tests only for categories that have relevant content in the crawl data):
- navigation (P0): Test that clicking nav links loads the correct page. Use exact link text from crawl data.
- forms (P0): Test form submission flows. Use exact field names and button labels from crawl data.
- visual (P1): Test that key page elements are visible after navigation.
- error_handling (P2): Test form validation (empty submission, invalid email format, etc.)
- security (P2): Test for obvious issues (e.g. XSS in inputs, access to protected routes).

For each test, use ONLY URLs that appear in the crawl data. Do not invent URLs.

JSON format for each test case — every field is required:
{
  "id": "tc_001",
  "category": "navigation",
  "title": "Verify About page loads via nav link",
  "description": "Clicks the About nav link from the homepage and confirms the About page loads.",
  "steps": [
    "Navigate to URL \\"${context.rootUrl}\\" in the browser address bar",
    "Wait for the page to fully load",
    "Click the link with text \\"About\\"",
    "Wait for the page to load",
    "Verify that the page title or heading contains \\"About\\""
  ],
  "expected_result": "The About page loads successfully and displays content related to About.",
  "priority": "P0",
  "tags": ["navigation", "smoke"],
  "estimated_duration": 15000,
  "target_url": "${context.rootUrl}"
}

Rules:
- target_url must be a URL from the crawl data
- steps are concrete browser actions for an AI agent — be specific, reference exact element text
- Return ONLY the JSON array, starting with [ and ending with ]`;

  const raw = await callOpenRouter([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  console.log(`[OpenRouter] Raw response preview: ${raw.slice(0, 300)}`);

  const testCases = extractJsonArray<TestCase[]>(raw);

  return testCases
    .filter((tc) => tc.title && tc.steps?.length > 0 && tc.category)
    .map((tc, i) => ({
      ...tc,
      id: tc.id ?? `tc_${String(i + 1).padStart(3, "0")}`,
      priority: (["P0", "P1", "P2"].includes(tc.priority) ? tc.priority : "P1") as "P0" | "P1" | "P2",
      tags: tc.tags ?? [],
      estimated_duration: tc.estimated_duration ?? 15000,
      target_url: tc.target_url ?? context.rootUrl,
      // Post-process: ensure each step starts with a verb
      steps: tc.steps.map((s) => s.trim()).filter(Boolean),
    }));
}

export async function generateAISummary(input: TestRunSummaryInput): Promise<string> {
  const systemPrompt = `You are a QA analyst. Write a 3-4 sentence plain-English executive summary of a test report. No markdown, no bullets, plain text only.`;
  const userPrompt = `Site: ${input.targetUrl}
Score: ${input.overallScore}/100
Results: ${input.passed} passed, ${input.failed} failed, ${input.skipped} skipped of ${input.totalTests} total

Top bugs:
${input.bugs.slice(0, 5).map((b) => `- [${b.severity.toUpperCase()}] ${b.title} (${b.pageUrl})`).join("\n")}

Write 3-4 sentences. Start with score context, then critical issues, then recommendation. Plain text only.`;

  const summary = await callOpenRouter([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ], 500);

  return summary.trim();
}