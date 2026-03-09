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

// The 6 categories that map to the 6 Category Ring Charts on the dashboard.
// "auth" and "error_handling" from old test generation are merged under
// "security" and "forms" respectively to match the dashboard spec.
export type TestCategory =
  | "navigation"
  | "forms"
  | "visual"
  | "performance"
  | "a11y"
  | "security";

export interface TestCase {
  id: string;
  category: TestCategory;
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

// Extended summary input — now includes per-category breakdowns for ring charts
// and per-page Core Web Vitals for the AI summary paragraph.
export interface TestRunSummaryInput {
  targetUrl: string;
  overallScore: number;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  bugs: { severity: "critical" | "high" | "medium" | "low"; title: string; pageUrl: string; category: string }[];
  // NEW: category-level pass/fail counts → drives the 6 donut chart data
  categoryResults: Record<string, { passed: number; failed: number; total: number }>;
  // NEW: worst Core Web Vitals per page → mentioned in AI summary when relevant
  performanceSummary?: { pageUrl: string; lcpMs: number | null; cls: number | null; ttfbMs: number | null }[];
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
// Updated category list to match the 6 dashboard ring charts:
//   navigation | forms | visual | performance | a11y | security
//
// "auth" → covered under "security"
// "error_handling" → covered under "forms"
// "responsive" → covered under "visual"
// "accessibility" → renamed to "a11y"
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
- forms (P0): Test form submission flows, validation, and error handling. Use exact field names and button labels.
- visual (P1): Test that key page elements are visible and images render after navigation. Test responsive breakpoints if relevant.
- performance (P1): Test that key pages load within acceptable time. Verify no obvious blocking resources.
- a11y (P1): Test keyboard navigation, focus management, ARIA labels on interactive elements, and image alt texts.
- security (P2): Test for obvious issues (XSS in inputs, access to protected routes without auth, CSRF).

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
- category MUST be one of: navigation, forms, visual, performance, a11y, security
- target_url must be a URL from the crawl data
- steps are concrete browser actions for an AI agent — be specific, reference exact element text
- Return ONLY the JSON array, starting with [ and ending with ]`;

  const raw = await callOpenRouter([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  console.log(`[OpenRouter] Raw response preview: ${raw.slice(0, 300)}`);

  const testCases = extractJsonArray<TestCase[]>(raw);

  const validCategories: TestCategory[] = ["navigation", "forms", "visual", "performance", "a11y", "security"];

  return testCases
    .filter((tc) => tc.title && tc.steps?.length > 0 && tc.category)
    .map((tc, i) => ({
      ...tc,
      id: tc.id ?? `tc_${String(i + 1).padStart(3, "0")}`,
      // Normalise legacy category names that the model might still emit
      category: ((): TestCategory => {
        const raw = tc.category as string;
        if (validCategories.includes(raw as TestCategory)) return raw as TestCategory;
        if (raw === "accessibility") return "a11y";
        if (raw === "auth") return "security";
        if (raw === "error_handling") return "forms";
        if (raw === "responsive") return "visual";
        return "navigation";
      })(),
      priority: (["P0", "P1", "P2"].includes(tc.priority) ? tc.priority : "P1") as "P0" | "P1" | "P2",
      tags: tc.tags ?? [],
      estimated_duration: tc.estimated_duration ?? 15000,
      target_url: tc.target_url ?? context.rootUrl,
      steps: tc.steps.map((s) => s.trim()).filter(Boolean),
    }));
}

// ---------------------------------------------------------------------------
// generateAISummary
//
// Updated to include:
//  - Category-level breakdown (for the AI to reference ring chart data)
//  - Performance summary (LCP/CLS/TTFB issues per page)
//  - The 3-sentence structure: score → critical issues → recommendation
// ---------------------------------------------------------------------------

export async function generateAISummary(input: TestRunSummaryInput): Promise<string> {
  // Build a compact category summary string for the prompt
  const categoryLines = Object.entries(input.categoryResults)
    .map(([cat, r]) => `  ${cat}: ${r.passed}/${r.total} passed`)
    .join("\n");

  // Build performance issues string (only pages with poor metrics)
  const perfIssues = (input.performanceSummary ?? [])
    .filter((p) => (p.lcpMs !== null && p.lcpMs > 4000) || (p.cls !== null && p.cls > 0.25) || (p.ttfbMs !== null && p.ttfbMs > 1800))
    .map((p) => `  ${p.pageUrl}: LCP=${p.lcpMs ?? "?"}ms, CLS=${p.cls ?? "?"}, TTFB=${p.ttfbMs ?? "?"}ms`)
    .join("\n");

  const systemPrompt = `You are a QA analyst. Write a 3-4 sentence plain-English executive summary of a test report. No markdown, no bullets, plain text only.`;

  const userPrompt = `Site: ${input.targetUrl}
Score: ${input.overallScore}/100
Results: ${input.passed} passed, ${input.failed} failed, ${input.skipped} skipped of ${input.totalTests} total

Category breakdown:
${categoryLines || "  (no category data)"}

${perfIssues ? `Performance issues:\n${perfIssues}` : ""}

Top bugs:
${input.bugs.slice(0, 5).map((b) => `- [${b.severity.toUpperCase()}] ${b.title} (${b.pageUrl})`).join("\n")}

Write 3-4 sentences. Start with overall score context, then highlight the most critical issues (include specific page names and bug titles), then give one concrete recommendation. Reference performance data if there are slow pages. Plain text only, no markdown.`;

  const summary = await callOpenRouter([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ], 600);

  return summary.trim();
}