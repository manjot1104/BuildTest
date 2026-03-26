// src/server/services/openRouter.service.ts
//
// All OpenRouter-powered AI features live here:
//   1. generateTestCases()          — per-page + global + gap-fill test generation
//   2. generateAISummary()          — executive summary for completed test runs
//   3. generateBugFixSuggestion()   — single failed-test fix suggestion
//   4. generateBugFixSuggestions()  — batch version, concurrency-capped at 5


import type { CrawledPage, TestBudgetAllocation } from "./tinyfish.service";
// [GITHUB] Import source context type for optional AI prompt enrichment
import type { GithubSourceContext } from "./github.service";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Fallback values for legacy callers / unit tests that bypass crawlSite.
const FALLBACK_TESTS_PER_PAGE = 3;
const FALLBACK_MIN_TESTS = 5;

const MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'arcee-ai/trinity-large-preview:free',
  'upstage/solar-pro-3:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'stepfun/step-3.5-flash:free',
  'google/gemma-3-12b-it:free',
  'qwen/qwen3-4b:free',
  'openrouter/free',
];

const RETRY_DELAY_MS = 2_000;

// ─── Shared types ─────────────────────────────────────────────────────────────

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
  testBudget?: TestBudgetAllocation;
  buildifyContext?: {
    routes?: string[];
    components?: string[];
    hasAuth?: boolean;
    dbSchema?: string;
    apiEndpoints?: {
      url: string;
      method: string;
      status: number | null;
      responseType: string | null;
      durationMs: number | null;
    }[];
  };
  // [GITHUB] Optional source code context fetched from GitHub.
  // When present, rawSummaryLines are appended to the AI prompt so test
  // cases reference real route paths, form field names, and validation rules
  // from the actual codebase rather than inferring them from crawl data alone.
  // undefined when no GitHub repo was provided or the fetch failed.
  githubSource?: GithubSourceContext;
   /**
   * Optional free-text hint provided by the user at run start.
   * Mirrors the crawlContext passed to crawlSite — injecting it here ensures
   * the test generation AI knows about authentication flows, interaction
   * barriers, and any other site-specific context the crawler used.
   *
   * Examples:
   *   "Login with email: test@example.com and password: demo1234"
   *   "Click 'Enter as guest' to bypass the login screen"
   *
   * Sanitised before reaching here (trimmed, max 500 chars).
   * undefined when the user did not provide a hint.
   */
  crawlContext?: string;
}

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
  categoryResults: Record<string, { passed: number; failed: number; total: number }>;
  performanceSummary?: {
    pageUrl: string;
    lcpMs: number | null;
    cls: number | null;
    ttfbMs: number | null;
  }[];
}

/**
 * Context about a single failed test, used to generate an AI fix suggestion.
 * Collected during execution in testing.controller.ts and passed here in batch.
 *
 * tinyfishRaw holds the full serialised TinyFish output (resultJson, rawText,
 * error) so the AI can reason about partial step failures, TinyFish-own errors,
 * and any other signal present — even when the structured fields are empty.
 * It is always passed through but the AI prompt degrades gracefully when null.
 */
export interface BugContext {
  pageUrl: string;
  testTitle: string;
  category: string;
  steps: string[];
  expectedResult: string;
  // tinyfishRaw replaces the previous actualResult / errorDetails / consoleLogs
  // / networkErrors fields. The AI suggestion prompt now receives the full raw
  // TinyFish output and the original steps, and derives the failure reason
  // itself — this is more robust than pre-parsing non-deterministic output.
  tinyfishRaw: string | null;
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
interface OpenRouterResponse {
  choices: { message: { content: string } }[];
}

// ─── Shared OpenRouter client ─────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * callOpenRouter
 * Tries each model in MODELS in order, retrying on 429/402 with a short delay.
 * Throws if every model fails.
 */
async function callOpenRouter(
  messages: OpenRouterMessage[],
  maxTokens = 8_000,
): Promise<string> {
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

      if (response.status === 429) {
        console.warn(`[OpenRouter] ${model} rate-limited (429) — waiting ${RETRY_DELAY_MS}ms`);
        lastError = new Error(`Rate limited: ${await response.text()}`);
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      if (response.status === 402) {
        console.error(`[OpenRouter] ${model} spend limit (402)`);
        lastError = new Error(`Spend limit: ${await response.text()}`);
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      if (!response.ok) {
        throw new Error(`OpenRouter HTTP ${response.status}: ${await response.text()}`);
      }

      const data = (await response.json()) as OpenRouterResponse;
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty response from OpenRouter");

      console.log(`[OpenRouter] ✓ model: ${model}, chars: ${content.length}`);
      return content;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[OpenRouter] ${model} failed: ${lastError.message}`);
      await sleep(RETRY_DELAY_MS);
    }
  }

  throw new Error(`All OpenRouter models failed. Last: ${lastError?.message}`);
}

// ─── JSON parsing helpers ─────────────────────────────────────────────────────

function extractJsonArray<T>(raw: string): T[] {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

  try { return JSON.parse(cleaned) as T[]; } catch { /* continue */ }

  const arrStart = cleaned.indexOf("[");
  const arrEnd = cleaned.lastIndexOf("]");
  if (arrStart !== -1 && arrEnd > arrStart) {
    try { return JSON.parse(cleaned.slice(arrStart, arrEnd + 1)) as T[]; } catch { /* continue */ }
  }

  const objStart = cleaned.indexOf("{");
  const objEnd = cleaned.lastIndexOf("}");
  if (objStart !== -1 && objEnd > objStart) {
    try {
      const obj = JSON.parse(cleaned.slice(objStart, objEnd + 1)) as Record<string, unknown>;
      for (const val of Object.values(obj)) {
        if (Array.isArray(val)) return val as T[];
      }
    } catch { /* continue */ }
  }

  const match = cleaned.match(/(\[[\s\S]*\])/);
  if (match) {
    try { return JSON.parse(match[1]!) as T[]; } catch { /* continue */ }
  }

  throw new Error(
    `Could not extract JSON array (${cleaned.length} chars). Preview: ${cleaned.slice(0, 400)}`,
  );
}

// ─── Test generation ──────────────────────────────────────────────────────────

const VALID_CATEGORIES: TestCategory[] = [
  "navigation", "forms", "visual", "performance", "a11y", "security",
];

function normaliseCategory(raw: string): TestCategory {
  if (VALID_CATEGORIES.includes(raw as TestCategory)) return raw as TestCategory;
  const map: Record<string, TestCategory> = {
    accessibility: "a11y",    acc: "a11y",
    auth: "security",         authentication: "security",
    error_handling: "forms",  error: "forms",
    responsive: "visual",     ui: "visual",
    api: "security",          seo: "visual",
  };
  return map[raw.toLowerCase()] ?? "navigation";
}

function dedupeTestCases(cases: TestCase[]): TestCase[] {
  const seen = new Set<string>();
  return cases.filter((tc) => {
    const key = tc.title.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildPageContext(page: CrawledPage): string {
  const links = page.elements
    .filter((e) => e.type === "link" && e.text?.trim())
    .map((e) => `  - "${e.text}" → ${e.href ?? "?"}`);
  const buttons = page.elements
    .filter((e) => e.type === "button" && e.text?.trim())
    .map((e) => `  - "${e.text}"`);
  const inputs = page.elements
    .filter((e) => e.type === "input" && e.text?.trim())
    .map((e) => `  - "${e.text}"`);
  const formSummaries = page.forms.map((f, i) => {
    const fields = f.fields
      .map((field) => `${field.name}(${field.type}${field.required ? ",required" : ""})`)
      .join(", ");
    return `  Form ${i + 1}: action=${f.action ?? "none"} method=${f.method ?? "get"} fields=[${fields}]`;
  });
  const apiList = page.apiEndpoints
    .map((e) => `  ${e.method} ${e.url} → ${e.status ?? "?"}`)
    .slice(0, 10);
  const navMenus = page.navStructure.menus
    .map((m) => `  ${m.label}: ${m.items.map((i) => `"${i.text}"`).join(", ")}`);
  const internalLinksList = page.internalLinks.map((u) => `  ${u}`).slice(0, 25);

  return [
    `URL: ${page.url}`,
    `Title: ${page.title || "(no title)"}`,
    `Complexity score: ${page.complexityScore.toFixed(1)}`,
    "",
    links.length > 0
      ? `Navigation Links (${links.length}):\n${links.join("\n")}`
      : "Navigation Links: none",
    buttons.length > 0
      ? `Buttons (${buttons.length}):\n${buttons.join("\n")}`
      : "Buttons: none",
    inputs.length > 0
      ? `Inputs (${inputs.length}):\n${inputs.join("\n")}`
      : "Inputs: none",
    formSummaries.length > 0
      ? `Forms (${formSummaries.length}):\n${formSummaries.join("\n")}`
      : "Forms: none",
    apiList.length > 0       ? `API Endpoints:\n${apiList.join("\n")}`           : "API Endpoints: none",
    navMenus.length > 0      ? `Nav Menus:\n${navMenus.join("\n")}`              : "",
    internalLinksList.length > 0 ? `Internal Links:\n${internalLinksList.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// [GITHUB] Builds the source code section appended to AI prompts when a
// GitHub repo was provided. Uses rawSummaryLines from GithubSourceContext
// which were already formatted for prompt injection by fetchGithubSourceContext.
// Returns an empty string when githubSource is undefined — no effect on prompt.
function buildGithubSourceSection(githubSource: GithubSourceContext): string {
  if (!githubSource.rawSummaryLines.length) return "";
  return `

## Source Code Analysis
The following was extracted directly from the repository source code.
Use this to write more precise test steps — reference real field names, route paths,
and component names rather than inferring them from crawl data alone.

${githubSource.rawSummaryLines.join("\n")}`;
}

// Builds the crawl context section injected into AI prompts when the
// user supplied an auth/interaction hint at run start. Mirrors the pattern of
// buildGithubSourceSection — returns empty string when crawlContext is absent
// so prompts are identical to before when no hint was given.
function buildCrawlContextSection(crawlContext: string | undefined): string {
  if (!crawlContext?.trim()) return "";
  return `
 
## User-Provided Site Context
The user gave the following instructions to help navigate this site.
Factor these into your test cases — the site likely requires authentication
or specific interaction steps before content is reachable.
 
${crawlContext.trim()}
 
When generating tests that require accessing protected pages or post-login UI,
include the relevant login/interaction steps at the start of the test steps array.`;
}

const TEST_GENERATION_SYSTEM_PROMPT = `You are a senior QA automation engineer. You write browser test cases for an AI agent called TinyFish that executes steps in a real Chromium browser.

CRITICAL RULES FOR WRITING STEPS:
1. Every step is a SINGLE browser action. Never combine two actions in one step.
2. Reference EXACT element text from the crawl data. If the button says "Learn Alphabets", write "Click the button with text \\"Learn Alphabets\\"".
3. Navigation steps MUST say: Navigate to URL "<full absolute url>" in the browser address bar
4. Click steps MUST say: Click the <element type> with text "<exact text>"  OR  Click the link "<exact text>"
5. Type steps MUST say: Type "<value>" into the "<field name or placeholder>" input field
6. Wait steps MUST say: Wait for the page to fully load  OR  Wait 2 seconds
7. Verify steps MUST say: Verify that <specific observable condition in the browser>
8. NEVER say vague things like "go to the about page" — say "Click the link with text \\"About\\""
9. Keep tests to 3–6 steps maximum. Shorter is better.
10. target_url must be an exact URL from the crawl data.

CATEGORIES:
- navigation (P0): clicking nav links, verifying correct page loads, breadcrumbs, back/forward
- forms (P0): form submission, validation errors, required field enforcement, success states
- visual (P1): key elements are visible, images render, responsive layout elements present
- performance (P1): page loads within 3 seconds, no obvious blocking
- a11y (P1): keyboard navigation, focus indicators, ARIA labels, alt text on images
- security (P2): protected routes without auth, XSS inputs, CSRF basics

Return ONLY a valid JSON array. Start with [ end with ]. No text before or after.`;

function normaliseAndFilter(raw: TestCase[], pageIndex: number, fallbackUrl: string): TestCase[] {
  return raw
    .filter((tc) => tc.title?.trim() && Array.isArray(tc.steps) && tc.steps.length >= 1)
    .map((tc, i) => ({
      ...tc,
      id: tc.id ?? `tc_p${pageIndex}_${String(i + 1).padStart(3, "0")}`,
      category: normaliseCategory((tc.category as string) ?? "navigation"),
      priority: (["P0", "P1", "P2"].includes(tc.priority) ? tc.priority : "P1") as "P0" | "P1" | "P2",
      tags: Array.isArray(tc.tags) ? tc.tags : [],
      estimated_duration: typeof tc.estimated_duration === "number" ? tc.estimated_duration : 15_000,
      target_url: tc.target_url ?? fallbackUrl,
      // Flatten step objects — gap-fill AI sometimes returns {step_number, action} objects
      steps: tc.steps
        .map((s) => {
          if (typeof s === "string") return s.trim();
          if (typeof s === "object" && s !== null) {
            const obj = s as Record<string, unknown>;
            const text = obj.action ?? obj.step ?? obj.text ?? obj.description;
            if (typeof text === "string" && text.trim()) return text.trim();
            return JSON.stringify(obj);
          }
          return String(s).trim();
        })
        .filter(Boolean),
      description: tc.description ?? tc.title,
      expected_result: tc.expected_result ?? "The action completes successfully without errors.",
    }));
}

async function generateTestsForPage(
  page: CrawledPage,
  rootUrl: string,
  pageIndex: number,
  totalPages: number,
  targetTestCount: number,
  githubSource?: GithubSourceContext, // [GITHUB]
  crawlContext?: string,    
): Promise<TestCase[]> {
  const pageCtx = buildPageContext(page);
  const hasLinks  = page.elements.filter((e) => e.type === "link").length > 0;
  const hasForms  = page.forms.length > 0;
  const hasInputs = page.elements.filter((e) => e.type === "input").length > 0;

  const relevantCategories = [
    hasLinks                ? "navigation" : null,
    (hasForms || hasInputs) ? "forms"      : null,
    "visual",
    hasLinks || hasForms    ? "a11y"        : null,
    pageIndex === 0         ? "performance" : null,
    hasForms                ? "security"    : null,
  ].filter(Boolean);

  // [GITHUB] Append source section to the per-page prompt when available.
  // This lets the AI reference real form field names (e.g. "email", "password")
  // and validation rules (e.g. "password: min length") instead of guessing.
  const githubSection = githubSource ? buildGithubSourceSection(githubSource) : "";

   // Append crawl context section so the AI knows about auth flows
  // or interaction barriers and generates tests that account for them.
  const crawlContextSection = buildCrawlContextSection(crawlContext);

  const userPrompt =
`Generate exactly ${targetTestCount} browser test cases for this page.

PAGE DATA:
${pageCtx}

Root URL of the site: ${rootUrl}
This is page ${pageIndex + 1} of ${totalPages}.

Categories to cover (only include categories where you have real elements to test):
${relevantCategories.map((c) => `- ${c}`).join("\n")}${githubSection}${crawlContextSection}

Each test case JSON object:
{
  "id": "tc_p${pageIndex}_001",
  "category": "<one of: navigation|forms|visual|performance|a11y|security>",
  "title": "<concise, specific title referencing real element text>",
  "description": "<one sentence describing what is being verified>",
  "steps": [
    "Navigate to URL \\"${page.url}\\" in the browser address bar",
    "Wait for the page to fully load",
    "Click the link with text \\"<exact link text from crawl data>\\"",
    "Wait for the page to load",
    "Verify that <specific observable condition>"
  ],
  "expected_result": "<one sentence: what success looks like>",
  "priority": "P0",
  "tags": ["navigation", "smoke"],
  "estimated_duration": 15000,
  "target_url": "${page.url}"
}

IMPORTANT:
- Use ONLY element text that appears in the PAGE DATA above
- Do NOT invent URLs, element names, or text not in the PAGE DATA
- If a category has no relevant elements, skip it entirely
- Generate AT LEAST 1 test and AT MOST ${targetTestCount} tests
- Return ONLY the JSON array. No explanation. Start with [ end with ].`;

  try {
    const raw = await callOpenRouter(
      [{ role: "system", content: TEST_GENERATION_SYSTEM_PROMPT }, { role: "user", content: userPrompt }],
      8_000,
    );
    console.log(`[OpenRouter] Page ${pageIndex + 1} (${page.url}): raw preview: ${raw.slice(0, 200)}`);
    return normaliseAndFilter(extractJsonArray<TestCase>(raw), pageIndex, page.url);
  } catch (err) {
    console.warn(`[OpenRouter] Page ${pageIndex + 1} generation failed: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

async function generateGlobalTests(
  context: SiteContext,
  globalBudget: number,
): Promise<TestCase[]> {
  if (context.pages.length < 3 || globalBudget <= 0) {
    console.log(`[OpenRouter] Skipping global tests (pages=${context.pages.length} budget=${globalBudget})`);
    return [];
  }

  const globalCount = Math.min(globalBudget, 8);
  const allPageUrls = context.pages.map((p) => p.url);
  const allNavLinks = context.pages
    .flatMap((p) => p.elements.filter((e) => e.type === "link"))
    .filter((e) => e.text?.trim())
    .reduce<{ text: string; href: string }[]>((acc, e) => {
      if (!acc.find((x) => x.href === e.href)) acc.push({ text: e.text, href: e.href ?? "" });
      return acc;
    }, [])
    .slice(0, 20);

  const siteSummary = [
    `Root URL: ${context.rootUrl}`,
    `Total pages crawled: ${context.pages.length}`,
    `All discovered URLs:\n${allPageUrls.map((u) => `  ${u}`).join("\n")}`,
    "",
    `All navigation links found across all pages:`,
    ...allNavLinks.map((l) => `  "${l.text}" → ${l.href}`),
    "",
    `Has auth: ${context.buildifyContext?.hasAuth ?? false}`,
    `API endpoints: ${
      (context.buildifyContext?.apiEndpoints ?? [])
        .map((e) => `${e.method} ${e.url}`)
        .slice(0, 5)
        .join(", ") || "none"
    }`,
  ].join("\n");

  // [GITHUB] Append source section to global tests prompt when available.
  // Particularly useful here for cross-page nav tests which benefit from
  // knowing the real route structure.
  const githubSection = context.githubSource
    ? buildGithubSourceSection(context.githubSource)
    : "";
    // Append crawl context section to global tests prompt.
  const crawlContextSection = buildCrawlContextSection(context.crawlContext);

  const userPrompt =
`Generate ${globalCount} cross-page site-wide browser test cases.

SITE DATA:
${siteSummary}${githubSection}${crawlContextSection}

Focus on navigation between pages, visual consistency, a11y, and performance.
Use exact link text from "All navigation links found" and exact URLs from "All discovered URLs".
Return ONLY the JSON array. Start with [ end with ].`;

  try {
    const raw = await callOpenRouter(
      [{ role: "system", content: TEST_GENERATION_SYSTEM_PROMPT }, { role: "user", content: userPrompt }],
      6_000,
    );
    console.log(`[OpenRouter] Global tests: raw preview: ${raw.slice(0, 200)}`);
    return normaliseAndFilter(extractJsonArray<TestCase>(raw), 999, context.rootUrl);
  } catch (err) {
    console.warn(`[OpenRouter] Global test generation failed: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

async function generateGapFillTests(
  context: SiteContext,
  existingCount: number,
  needed: number,
): Promise<TestCase[]> {
  if (needed <= 0) return [];
  console.log(`[OpenRouter] Gap-fill: need ${needed} more tests (have ${existingCount})`);

  const allPagesCtx = context.pages
    .slice(0, 5)
    .map((p, i) => `--- Page ${i + 1}: ${p.url} ---\n${buildPageContext(p)}`)
    .join("\n\n");

  // [GITHUB] Append source section to gap-fill prompt when available.
  const githubSection = context.githubSource
    ? buildGithubSourceSection(context.githubSource)
    : "";
  // Append crawl context section to gap-fill prompt.
  const crawlContextSection = buildCrawlContextSection(context.crawlContext); 
  const userPrompt =
`We have ${existingCount} test cases. We need ${needed} MORE that are different.

SITE DATA (${context.pages.length} pages):
${allPagesCtx}${githubSection}${crawlContextSection}

Site URL: ${context.rootUrl}

Generate exactly ${needed} ADDITIONAL test cases covering gaps — prioritise a11y, performance, security, visual.
Use ONLY URLs and element text from the SITE DATA. Do NOT repeat existing tests.
Return ONLY the JSON array. Start with [ end with ].`;

  try {
    const raw = await callOpenRouter(
      [{ role: "system", content: TEST_GENERATION_SYSTEM_PROMPT }, { role: "user", content: userPrompt }],
      5_000,
    );
    return normaliseAndFilter(extractJsonArray<TestCase>(raw), 9999, context.rootUrl);
  } catch (err) {
    console.warn(`[OpenRouter] Gap-fill failed: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

export async function generateTestCases(context: SiteContext): Promise<TestCase[]> {
  const budget = context.testBudget;
  const getPageCount = (url: string): number => budget?.testsPerPage.get(url) ?? FALLBACK_TESTS_PER_PAGE;
  const totalTarget = budget?.totalTests ?? (context.pages.length * FALLBACK_TESTS_PER_PAGE + FALLBACK_MIN_TESTS);
  const perPageSum = context.pages.reduce((sum, p) => sum + getPageCount(p.url), 0);
  const globalBudget = Math.max(0, totalTarget - perPageSum);

  console.log(
    `[OpenRouter] Generating tests | pages=${context.pages.length} | totalTarget=${totalTarget} | globalBudget=${globalBudget} | ` +
    `githubSource=${context.githubSource ? "yes" : "no"} | ` +
    `crawlContext=${context.crawlContext ? `yes (${context.crawlContext.length} chars)` : "no"} | ` +
    `perPage: ${context.pages.map((p) => `${new URL(p.url).pathname}×${getPageCount(p.url)}`).join(", ")}`,
  );

  const [perPageResults, globalTests] = await Promise.all([
    Promise.all(
      context.pages.map((page, i) =>
        generateTestsForPage(
          page,
          context.rootUrl,
          i,
          context.pages.length,
          getPageCount(page.url),
          context.githubSource, // [GITHUB] passed through to each per-page call
          context.crawlContext,  // passed through so auth context reaches per-page prompts
        ),
      ),
    ),
    generateGlobalTests(context, globalBudget),
  ]);

  const perPageTests = perPageResults.flat();
  console.log(`[OpenRouter] Per-page: ${perPageTests.length} | Global: ${globalTests.length}`);

  const merged = dedupeTestCases([...perPageTests, ...globalTests]);
  console.log(`[OpenRouter] After dedup: ${merged.length} (target: ${totalTarget})`);

  let final = merged;
  if (final.length < totalTarget * 0.8) {
    console.log(`[OpenRouter] Under target (${final.length}/${totalTarget}) — gap-fill`);
    final = dedupeTestCases([
      ...final,
      ...(await generateGapFillTests(context, final.length, totalTarget - final.length)),
    ]);
  }

  const numbered = final.map((tc, i) => ({ ...tc, id: `tc_${String(i + 1).padStart(3, "0")}` }));
  console.log(`[OpenRouter] ✓ Final test count: ${numbered.length} (target was ${totalTarget})`);
  return numbered;
}

// ─── AI summary ───────────────────────────────────────────────────────────────

export async function generateAISummary(input: TestRunSummaryInput): Promise<string> {
  const categoryLines = Object.entries(input.categoryResults)
    .map(([cat, r]) => `  ${cat}: ${r.passed}/${r.total} passed`)
    .join("\n");

  const perfIssues = (input.performanceSummary ?? [])
    .filter(
      (p) =>
        (p.lcpMs !== null && p.lcpMs > 4000) ||
        (p.cls !== null && p.cls > 0.25) ||
        (p.ttfbMs !== null && p.ttfbMs > 1800),
    )
    .map((p) => `  ${p.pageUrl}: LCP=${p.lcpMs ?? "?"}ms, CLS=${p.cls ?? "?"}, TTFB=${p.ttfbMs ?? "?"}ms`)
    .join("\n");

  const summary = await callOpenRouter(
    [
      {
        role: "system",
        content:
          "You are a QA analyst. Write a 3–4 sentence plain-English executive summary of a test report. " +
          "No markdown, no bullet points, plain text only.",
      },
      {
        role: "user",
        content:
`Site: ${input.targetUrl}
Score: ${input.overallScore}/100
Results: ${input.passed} passed, ${input.failed} failed, ${input.skipped} skipped of ${input.totalTests} total

Category breakdown:
${categoryLines || "  (no category data)"}

${perfIssues ? `Performance issues:\n${perfIssues}` : ""}

Top bugs:
${
  input.bugs.slice(0, 5)
    .map((b) => `- [${b.severity.toUpperCase()}] ${b.title} (${b.pageUrl})`)
    .join("\n") || "  None"
}

Write 3–4 sentences. Lead with the score, highlight critical bugs with specific names and pages, end with one concrete recommendation. Plain text only.`,
      },
    ],
    600,
  );

  return summary.trim();
}

// ─── AI bug fix suggestions ───────────────────────────────────────────────────

/**
 * generateBugFixSuggestion
 *
 * Given the context of a single failed test, returns a plain-text fix suggestion.
 * The suggestion is derived from the original test steps and whatever TinyFish
 * returned (tinyfishRaw), which may be structured step logs, a TinyFish-own error
 * event, or nothing at all. The AI is asked to reason about what went wrong from
 * all available signal rather than relying on pre-parsed fields.
 * Returns null if the OpenRouter call fails — bugs are still saved without it.
 */
export async function generateBugFixSuggestion(ctx: BugContext): Promise<string | null> {
  // Parse tinyfishRaw to extract whatever signal is available.
  // We pass it to the AI as a readable summary rather than raw JSON to keep
  // the prompt concise and model-agnostic.
  let tinyfishSection = "";
  if (ctx.tinyfishRaw) {
    try {
      const parsed = JSON.parse(ctx.tinyfishRaw) as {
        success?: boolean;
        error?: string | null;
        resultJson?: unknown;
        rawText?: string | null;
      };

      const lines: string[] = [];

      // Surface the top-level error string if present (covers timeouts,
      // TinyFish-own FAILED events, network errors, etc.).
      if (typeof parsed.error === "string" && parsed.error) {
        lines.push(`TinyFish error: ${parsed.error}`);
      }

      // Surface step log results if resultJson contains them.
      if (parsed.resultJson && typeof parsed.resultJson === "object") {
        const rj = parsed.resultJson as Record<string, unknown>;

        // TinyFish-own error event shape: {type, run_id, status, error, ...}
        if (typeof rj["error"] === "string" && typeof rj["status"] === "string") {
          lines.push(`TinyFish status: ${rj["status"]}`);
          lines.push(`TinyFish error detail: ${rj["error"]}`);
          if (typeof rj["help_message"] === "string") {
            lines.push(`Help: ${rj["help_message"]}`);
          }
        }

        // Step log array shape: [{id, status, data}, ...]
        const logArray: unknown[] = Array.isArray(rj)
          ? rj
          : Array.isArray(rj["logs"])
            ? (rj["logs"] as unknown[])
            : Array.isArray(rj["steps"])
              ? (rj["steps"] as unknown[])
              : Array.isArray(rj["results"])
                ? (rj["results"] as unknown[])
                : [];

        if (logArray.length > 0) {
          lines.push("Step execution log:");
          for (const entry of logArray) {
            if (typeof entry === "object" && entry !== null && "status" in (entry as object)) {
              const e = entry as { id?: unknown; status?: unknown; data?: unknown };
              lines.push(`  Step ${e.id ?? "?"}: ${e.status ?? "?"} — ${e.data ?? "no detail"}`);
            }
          }
        }
      }

      // Include a snippet of rawText as last-resort signal.
      if (typeof parsed.rawText === "string" && parsed.rawText && lines.length === 0) {
        lines.push(`Raw output snippet: ${parsed.rawText.slice(0, 300)}`);
      }

      if (lines.length > 0) {
        tinyfishSection = `\nBrowser agent output:\n${lines.join("\n")}`;
      }
    } catch {
      // tinyfishRaw was not valid JSON — include it raw (truncated).
      tinyfishSection = `\nBrowser agent output (unparsed): ${ctx.tinyfishRaw.slice(0, 400)}`;
    }
  }

  const stepsSection = ctx.steps.length > 0
    ? `\nTest steps:\n${ctx.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
    : "";

  try {
    return await callOpenRouter(
      [
        {
          role: "system",
          content:
            "You are a senior software engineer reviewing a QA test failure. " +
            "Write a concise, actionable fix suggestion in plain text (no markdown headers, no bullet points). " +
            "3–5 sentences max. Focus on the most likely root cause and the exact code/config change needed. " +
            "Be specific — name the element, route, or API endpoint involved. " +
            "If the browser agent output shows which step failed, use that to pinpoint the issue. " +
            "If the output is missing or unclear, reason from the test steps and expected result alone.",
        },
        {
          role: "user",
          content:
`A QA test failed. Here are the details:

Page URL: ${ctx.pageUrl}
Test: ${ctx.testTitle}
Category: ${ctx.category}
Expected result: ${ctx.expectedResult}${stepsSection}${tinyfishSection}

What is the most likely root cause and how should a developer fix it?`,
        },
      ],
      400,
    );
  } catch (err) {
    console.error(`[OpenRouter] Bug fix suggestion failed for "${ctx.testTitle}":`, err);
    return null;
  }
}

/**
 * generateBugFixSuggestions
 *
 * Batch version — generates suggestions for multiple failures concurrently.
 * Returns a Map from testResultId → suggestion string (or null on failure).
 * Concurrency capped at 5 to avoid OpenRouter rate limits.
 */
export async function generateBugFixSuggestions(
  bugs: { testResultId: string; ctx: BugContext }[],
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  const CONCURRENCY = 5;

  for (let i = 0; i < bugs.length; i += CONCURRENCY) {
    const batch = bugs.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map(async ({ testResultId, ctx }) => ({
        testResultId,
        suggestion: await generateBugFixSuggestion(ctx),
      })),
    );
    for (const outcome of settled) {
      if (outcome.status === "fulfilled") {
        results.set(outcome.value.testResultId, outcome.value.suggestion);
      }
    }
  }

  return results;
}