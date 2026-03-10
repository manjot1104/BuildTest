// src/server/services/openrouter.service.ts
import type { CrawledPage, SiteProfile } from "./tinyfish.service";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY  = process.env.OPENROUTER_API_KEY;

const DEFAULT_MIN_TESTS           = 30;
const DEFAULT_TARGET_TESTS_PER_PAGE = 15;

const MODELS = [
  "openrouter/auto",
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "google/gemma-3-12b-it:free",
];

const RETRY_DELAY_MS = 2_000;

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
  siteProfile?: SiteProfile;
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
}

export interface TestRunSummaryInput {
  targetUrl: string;
  overallScore: number;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  bugs: { severity: "critical" | "high" | "medium" | "low"; title: string; pageUrl: string; category: string }[];
  categoryResults: Record<string, { passed: number; failed: number; total: number }>;
  performanceSummary?: { pageUrl: string; lcpMs: number | null; cls: number | null; ttfbMs: number | null }[];
}

interface OpenRouterMessage  { role: "system" | "user" | "assistant"; content: string }
interface OpenRouterResponse { choices: { message: { content: string } }[] }

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const VALID_CATEGORIES: TestCategory[] = ["navigation", "forms", "visual", "performance", "a11y", "security"];

function normaliseCategory(raw: string): TestCategory {
  if (VALID_CATEGORIES.includes(raw as TestCategory)) return raw as TestCategory;
  const map: Record<string, TestCategory> = {
    accessibility:   "a11y",
    acc:             "a11y",
    auth:            "security",
    authentication:  "security",
    error_handling:  "forms",
    error:           "forms",
    responsive:      "visual",
    ui:              "visual",
    api:             "security",
    seo:             "visual",
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
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type":  "application/json",
          "HTTP-Referer":  "https://buildify.app",
          "X-Title":       "Buildify Testing Engine",
        },
        body: JSON.stringify({
          model,
          max_tokens:  maxTokens,
          temperature: 0.1,
          messages,
        }),
      });

      if (response.status === 429) {
        const errText = await response.text();
        console.warn(`[OpenRouter] ${model} rate-limited (429) — waiting ${RETRY_DELAY_MS}ms`);
        lastError = new Error(`Rate limited: ${errText}`);
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      if (response.status === 402) {
        const errText = await response.text();
        console.error(`[OpenRouter] ${model} spend limit (402): ${errText}`);
        lastError = new Error(`Spend limit: ${errText}`);
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      if (!response.ok) {
        throw new Error(`OpenRouter HTTP ${response.status}: ${await response.text()}`);
      }

      const data    = (await response.json()) as OpenRouterResponse;
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

function extractJsonArray<T>(raw: string): T[] {
  let cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  try { return JSON.parse(cleaned) as T[]; } catch { /* continue */ }

  const arrStart = cleaned.indexOf("[");
  const arrEnd   = cleaned.lastIndexOf("]");
  if (arrStart !== -1 && arrEnd > arrStart) {
    try { return JSON.parse(cleaned.slice(arrStart, arrEnd + 1)) as T[]; } catch { /* continue */ }
  }

  const objStart = cleaned.indexOf("{");
  const objEnd   = cleaned.lastIndexOf("}");
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

  const internalLinksList = page.internalLinks
    .map((u) => `  ${u}`)
    .slice(0, 25);

  return [
    `URL: ${page.url}`,
    `Title: ${page.title || "(no title)"}`,
    "",
    links.length > 0      ? `Navigation Links (${links.length}):\n${links.join("\n")}`   : "Navigation Links: none",
    buttons.length > 0    ? `Buttons (${buttons.length}):\n${buttons.join("\n")}`         : "Buttons: none",
    inputs.length > 0     ? `Inputs (${inputs.length}):\n${inputs.join("\n")}`            : "Inputs: none",
    formSummaries.length > 0 ? `Forms (${formSummaries.length}):\n${formSummaries.join("\n")}` : "Forms: none",
    apiList.length > 0    ? `API Endpoints:\n${apiList.join("\n")}`                       : "API Endpoints: none",
    navMenus.length > 0   ? `Nav Menus:\n${navMenus.join("\n")}`                          : "",
    internalLinksList.length > 0 ? `Internal Links:\n${internalLinksList.join("\n")}`    : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const SYSTEM_PROMPT = `You are a senior QA automation engineer. You write browser test cases for an AI agent called TinyFish that executes steps in a real Chromium browser.

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

async function generateTestsForPage(
  page: CrawledPage,
  rootUrl: string,
  pageIndex: number,
  totalPages: number,
  targetTestsPerPage: number,
): Promise<TestCase[]> {
  const pageCtx = buildPageContext(page);

  const hasLinks   = page.elements.filter((e) => e.type === "link").length > 0;
  const hasForms   = page.forms.length > 0;
  const hasButtons = page.elements.filter((e) => e.type === "button").length > 0;
  const hasInputs  = page.elements.filter((e) => e.type === "input").length > 0;

  const relevantCategories = [
    hasLinks                 ? "navigation" : null,
    (hasForms || hasInputs)  ? "forms"      : null,
    "visual",
    hasLinks || hasForms     ? "a11y"        : null,
    pageIndex === 0          ? "performance" : null,
    hasForms                 ? "security"    : null,
  ].filter(Boolean);

  const userPrompt =
`Generate ${targetTestsPerPage} browser test cases for this page.

PAGE DATA:
${pageCtx}

Root URL of the site: ${rootUrl}
This is page ${pageIndex + 1} of ${totalPages}.

Categories to cover for this page (only include categories where you have real elements to test):
${relevantCategories.map((c) => `- ${c}`).join("\n")}

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
- Use ONLY element text, link text, button text, input names that appear in the PAGE DATA above
- Do NOT invent URLs, element names, or text that are not in the PAGE DATA
- If a category has no relevant elements on this page, skip it entirely
- Return ONLY the JSON array. No explanation. Start with [ end with ].`;

  try {
    const raw   = await callOpenRouter([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: userPrompt },
    ], 8_000);

    console.log(`[OpenRouter] Page ${pageIndex + 1} (${page.url}): raw preview: ${raw.slice(0, 200)}`);

    const cases = extractJsonArray<TestCase>(raw);
    return normaliseAndFilter(cases, pageIndex, page.url);
  } catch (err) {
    console.warn(`[OpenRouter] Page ${pageIndex + 1} generation failed: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

async function generateGlobalTests(context: SiteContext): Promise<TestCase[]> {
  // I-07: Skip global tests when fewer than 3 pages were crawled.
  // With 1-2 pages there are no meaningful cross-page flows to test,
  // and the AI fabricates URLs that don't exist — causing false failures.
  if (context.pages.length < 3) {
    console.log(`[OpenRouter] Skipping global tests (pages=${context.pages.length} < 3)`);
    return [];
  }

  const allPageUrls = context.pages.map((p) => p.url);
  const allNavLinks = context.pages
    .flatMap((p) => p.elements.filter((e) => e.type === "link"))
    .filter((e) => e.text?.trim())
    .reduce<{ text: string; href: string; url: string }[]>((acc, e, _, arr) => {
      if (!acc.find((x) => x.href === e.href)) {
        acc.push({ text: e.text, href: e.href ?? "", url: context.rootUrl });
      }
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
    `API endpoints: ${(context.buildifyContext?.apiEndpoints ?? []).map((e) => `${e.method} ${e.url}`).slice(0, 5).join(", ") || "none"}`,
  ].join("\n");

  const userPrompt =
`Generate 10 cross-page site-wide browser test cases.

SITE DATA:
${siteSummary}

Focus on:
- navigation: clicking links between pages and verifying correct page loads
- visual: key elements present on multiple pages
- a11y: site-wide keyboard navigation and focus management
- performance: page load times

Use exact link text from the "All navigation links found" section.
Use exact URLs from "All discovered URLs".

Return ONLY the JSON array. Start with [ end with ].`;

  try {
    const raw   = await callOpenRouter([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: userPrompt },
    ], 6_000);

    console.log(`[OpenRouter] Global tests: raw preview: ${raw.slice(0, 200)}`);

    const cases = extractJsonArray<TestCase>(raw);
    return normaliseAndFilter(cases, 999, context.rootUrl);
  } catch (err) {
    console.warn(`[OpenRouter] Global test generation failed: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

async function generateGapFillTests(
  context: SiteContext,
  existingCount: number,
  minTests: number,
  targetPerPage: number,
): Promise<TestCase[]> {
  const needed = minTests - existingCount;
  if (needed <= 0) return [];

  console.log(`[OpenRouter] Gap-fill: need ${needed} more tests to reach ${minTests}`);

  const allPagesCtx = context.pages
    .slice(0, 5)
    .map((p, i) => `--- Page ${i + 1}: ${p.url} ---\n${buildPageContext(p)}`)
    .join("\n\n");

  const userPrompt =
`We have already generated ${existingCount} test cases for this website. We need ${needed} MORE that are different.

SITE DATA (${context.pages.length} pages crawled):
${allPagesCtx}

Site URL: ${context.rootUrl}

Generate exactly ${needed} ADDITIONAL test cases that cover gaps. Prioritise:
1. a11y: keyboard navigation Tab order, focus indicators, ARIA labels on buttons/inputs, image alt text
2. performance: page load time checks, no render-blocking, image loading
3. security: SQL injection in form inputs, XSS attempts, accessing protected routes without auth
4. visual: responsiveness, correct images, correct text on each unique page

Use ONLY URLs and element text from the SITE DATA above. Do NOT repeat tests we already have.
Return ONLY the JSON array. Start with [ end with ].`;

  try {
    const raw   = await callOpenRouter([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: userPrompt },
    ], 5_000);

    const cases = extractJsonArray<TestCase>(raw);
    return normaliseAndFilter(cases, 9999, context.rootUrl);
  } catch (err) {
    console.warn(`[OpenRouter] Gap-fill failed: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

function normaliseAndFilter(
  raw: TestCase[],
  pageIndex: number,
  fallbackUrl: string,
): TestCase[] {
  return raw
    .filter((tc) => tc.title?.trim() && Array.isArray(tc.steps) && tc.steps.length >= 1)
    .map((tc, i) => ({
      ...tc,
      id:                 tc.id ?? `tc_p${pageIndex}_${String(i + 1).padStart(3, "0")}`,
      category:           normaliseCategory(tc.category as string ?? "navigation"),
      priority:           (["P0", "P1", "P2"].includes(tc.priority) ? tc.priority : "P1") as "P0" | "P1" | "P2",
      tags:               Array.isArray(tc.tags) ? tc.tags : [],
      estimated_duration: typeof tc.estimated_duration === "number" ? tc.estimated_duration : 15_000,
      target_url:         tc.target_url ?? fallbackUrl,
      // I-03: Flatten step objects — gap-fill AI returns {step_number, action} objects
      // instead of strings. Old code: String(obj) → "[object Object]", filtered as empty → 0 steps.
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
      description:        tc.description ?? tc.title,
      expected_result:    tc.expected_result ?? "The action completes successfully without errors.",
    }));
}

export async function generateTestCases(context: SiteContext): Promise<TestCase[]> {
  const profile           = context.siteProfile;
  const targetPerPage     = profile?.targetTestsPerPage ?? DEFAULT_TARGET_TESTS_PER_PAGE;
  const minTests          = profile?.minTests           ?? DEFAULT_MIN_TESTS;

  console.log(
    `[OpenRouter] Generating tests | size=${profile?.size ?? "unknown"} | ` +
    `pages=${context.pages.length} | targetPerPage=${targetPerPage} | minTests=${minTests}`,
  );

  const [perPageResults, globalTests] = await Promise.all([
    Promise.all(
      context.pages.map((page, i) =>
        generateTestsForPage(page, context.rootUrl, i, context.pages.length, targetPerPage),
      ),
    ),
    generateGlobalTests(context),
  ]);

  const perPageTests = perPageResults.flat();

  console.log(`[OpenRouter] Per-page: ${perPageTests.length} | Global: ${globalTests.length}`);

  const merged = dedupeTestCases([...perPageTests, ...globalTests]);

  console.log(`[OpenRouter] After dedup: ${merged.length} | Target minimum: ${minTests}`);

  let final = merged;
  let gapAttempts = 0;
  while (final.length < minTests && gapAttempts < 3) {
    gapAttempts++;
    console.log(`[OpenRouter] Gap-fill attempt ${gapAttempts}: have ${final.length}, need ${minTests}`);
    const gapFill = await generateGapFillTests(context, final.length, minTests, targetPerPage);
    final = dedupeTestCases([...final, ...gapFill]);
    if (gapFill.length === 0) break;
  }

  const numbered = final.map((tc, i) => ({
    ...tc,
    id: `tc_${String(i + 1).padStart(3, "0")}`,
  }));

  console.log(`[OpenRouter] ✓ Final test count: ${numbered.length} (target was ${minTests})`);
  return numbered;
}

export async function generateAISummary(input: TestRunSummaryInput): Promise<string> {
  const categoryLines = Object.entries(input.categoryResults)
    .map(([cat, r]) => `  ${cat}: ${r.passed}/${r.total} passed`)
    .join("\n");

  const perfIssues = (input.performanceSummary ?? [])
    .filter(
      (p) =>
        (p.lcpMs !== null && p.lcpMs > 4000) ||
        (p.cls   !== null && p.cls   > 0.25) ||
        (p.ttfbMs !== null && p.ttfbMs > 1800),
    )
    .map((p) => `  ${p.pageUrl}: LCP=${p.lcpMs ?? "?"}ms, CLS=${p.cls ?? "?"}, TTFB=${p.ttfbMs ?? "?"}ms`)
    .join("\n");

  const systemPrompt =
    `You are a QA analyst. Write a 3–4 sentence plain-English executive summary of a test report. ` +
    `No markdown, no bullet points, plain text only.`;

  const userPrompt =
`Site: ${input.targetUrl}
Score: ${input.overallScore}/100
Results: ${input.passed} passed, ${input.failed} failed, ${input.skipped} skipped of ${input.totalTests} total

Category breakdown:
${categoryLines || "  (no category data)"}

${perfIssues ? `Performance issues:\n${perfIssues}` : ""}

Top bugs:
${input.bugs.slice(0, 5).map((b) => `- [${b.severity.toUpperCase()}] ${b.title} (${b.pageUrl})`).join("\n") || "  None"}

Write 3–4 sentences. Lead with the score, highlight the most critical bugs with specific names and pages, end with one concrete recommendation. Reference performance data if relevant. Plain text only.`;

  const summary = await callOpenRouter(
    [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userPrompt },
    ],
    600,
  );

  return summary.trim();
}