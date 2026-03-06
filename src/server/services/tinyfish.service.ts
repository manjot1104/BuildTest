// src/server/services/tinyfish.service.ts

const TINYFISH_API_URL = "https://agent.tinyfish.ai/v1/automation/run-sse";
const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY;

const LIMITS = {
  MAX_PAGES_FREE: 1,
  MAX_PAGES_PRO: 5,
  CRAWL_PAGE_TIMEOUT_MS: 150_000,
  EXECUTE_TEST_TIMEOUT_MS: 150_000,
} as const;

export interface CrawlOptions {
  maxPages?: number;
  allowedDomain?: string;
}

export interface TinyFishRequest {
  url: string;
  goal: string;
  browser_profile?: "lite" | "stealth";
}

export interface TinyFishResult {
  success: boolean;
  resultJson: Record<string, unknown> | null;
  rawText: string | null;
  error: string | null;
  jobId: string | null;
}

export interface CrawledPage {
  url: string;
  title: string;
  elements: { type: string; text: string; href?: string; selector?: string; isVisible: boolean }[];
  internalLinks: string[];
  externalLinks: string[];
  forms: { action?: string; method?: string; fields: { name: string; type: string; required: boolean }[] }[];
  screenshot?: string;
}

export interface TestExecutionResult {
  passed: boolean;
  actualResult: string;
  errorDetails: string | null;
  screenshotUrl: string | null;
  durationMs: number;
  consoleLogs: string[];
}

function extractHostname(url: string): string {
  try { return new URL(url).hostname; } catch { return ""; }
}

function resolveUrl(raw: string, base: string): string | null {
  try {
    if (!raw || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:") || raw === "#") return null;
    const r = new URL(raw, base);
    r.hash = "";
    return r.href;
  } catch { return null; }
}

function isAllowedUrl(candidate: string, allowedHostname: string): boolean {
  try {
    const p = new URL(candidate);
    if (p.hostname !== allowedHostname) return false;
    if (/\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|tar|gz|mp4|mp3|wav|ico|woff|woff2|ttf|eot|css|js|map)$/i.test(p.pathname)) return false;
    if (/[?&](page|offset|cursor|after|before|from|start|p)=\d/i.test(p.search)) return false;
    if (/\/page\/\d+/i.test(p.pathname)) return false;
    if (/\/(logout|signout|delete|remove|destroy)/i.test(p.pathname)) return false;
    return true;
  } catch { return false; }
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T, label = "op"): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => { console.warn(`[TinyFish] Timeout ${ms}ms: ${label}`); resolve(fallback); }, ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(timer)), timeout]);
}

async function runTinyFish(request: TinyFishRequest): Promise<TinyFishResult> {
  if (!TINYFISH_API_KEY) throw new Error("TINYFISH_API_KEY is not set");
  console.log(`[TinyFish] → ${request.url}`);
  let rawText = "", jobId: string | null = null;
  try {
    const response = await fetch(TINYFISH_API_URL, {
      method: "POST",
      headers: { "X-API-Key": TINYFISH_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    console.log(`[TinyFish] ← HTTP ${response.status} ${request.url}`);
    if (!response.ok) {
      const err = await response.text();
      return { success: false, resultJson: null, rawText: null, error: `HTTP ${response.status}: ${err}`, jobId: null };
    }
    if (!response.body) return { success: false, resultJson: null, rawText: null, error: "No body", jobId: null };

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let eventCount = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value, { stream: true }).split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;
        eventCount++;
        try {
          const event = JSON.parse(jsonStr) as {
            type?: string;
            status?: string;
            resultJson?: Record<string, unknown>;
            text?: string;
            jobId?: string;
            error?: string;
          };
          if (event.jobId && !jobId) { jobId = event.jobId; console.log(`[TinyFish] Job: ${jobId}`); }
          if (event.text) rawText += event.text;
          if (event.type === "COMPLETE") {
            console.log(`[TinyFish] ✓ ${jobId} → ${event.status} (${eventCount} events)`);
            if (event.status === "COMPLETED") return { success: true, resultJson: event.resultJson ?? null, rawText: rawText || null, error: null, jobId };
            return { success: false, resultJson: null, rawText: rawText || null, error: event.error ?? `Status: ${event.status}`, jobId };
          }
        } catch { /* skip malformed */ }
      }
    }
    // If stream ends but we have rawText that looks like JSON, try to recover
    if (rawText) {
      try {
        const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");
        if (start !== -1 && end > start) {
          const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
          console.log(`[TinyFish] Recovered JSON from rawText for ${request.url}`);
          return { success: true, resultJson: parsed, rawText, error: null, jobId };
        }
      } catch { /* could not recover */ }
    }
    return { success: false, resultJson: null, rawText: rawText || null, error: "Stream ended without COMPLETE", jobId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[TinyFish] Fetch error: ${msg}`);
    return { success: false, resultJson: null, rawText: null, error: msg, jobId };
  }
}

// ---------------------------------------------------------------------------
// Crawl goal — SPA-hardened
//
// Strategy:
//   1. Hard-wait for JS hydration (React, Vue, Angular, Next.js, etc.)
//   2. Use JS to extract ALL anchors + router links from the live DOM
//   3. Explicitly enumerate nav/sidebar/menu/footer patterns used by SPAs
//   4. Return a minimal, well-typed JSON — no markdown, no prose
// ---------------------------------------------------------------------------

function buildCrawlGoal(url: string, allowedHostname: string): string {
  return `You are a web crawler. Navigate to this URL: ${url}

== WAIT INSTRUCTIONS ==
1. Wait for the page to fully load (network idle, no spinners).
2. If the page uses React, Next.js, Nuxt, Vue, Angular, or any JavaScript framework, wait an extra 3 seconds AFTER the initial load for client-side rendering to complete.
3. If you see a loading spinner or skeleton screen, wait until it disappears.

== EXTRACTION INSTRUCTIONS ==
After the page is fully rendered, extract the following using JavaScript by evaluating it in the browser console:

A) PAGE TITLE: document.title

B) ALL LINKS — run this mentally:
   - Select ALL <a> elements in the entire document (including inside shadow DOM if accessible, nav, header, footer, sidebar, hamburger menus, modals).
   - For each <a>, collect: href attribute (raw value), innerText (trimmed), and whether it is visible (offsetParent !== null or getBoundingClientRect().height > 0).
   - Also collect hrefs from elements with data-href, data-url, or [role="link"] attributes.
   - Include relative paths like /about, /dashboard, /settings.
   - Include absolute URLs like https://${allowedHostname}/contact.
   - DO NOT filter anything out — include all hrefs even if they look like query strings.

C) INTERACTIVE ELEMENTS — collect all <button>, <input>, <select>, <textarea>:
   - type (button/input/select/etc), text content or placeholder or label, isVisible

D) FORMS — collect all <form> elements:
   - action attribute, method attribute
   - All child inputs: name, type, required attribute

== INTERNAL LINKS RULE ==
For the "internalLinks" array: include every href from step B that:
- belongs to the domain "${allowedHostname}" (either relative path OR absolute URL with that hostname)
- Do NOT deduplicate — include all occurrences

== OUTPUT FORMAT ==
Return ONLY a single valid JSON object. No markdown fences. No explanation. No text before or after. Start your response with { and end with }.

{
  "title": "<document.title value>",
  "elements": [
    {"type": "link", "text": "<anchor text>", "href": "<href>", "isVisible": true},
    {"type": "button", "text": "<button label>", "isVisible": true},
    {"type": "input", "text": "<placeholder or label>", "isVisible": true}
  ],
  "internalLinks": ["/about", "/dashboard", "https://${allowedHostname}/contact"],
  "forms": [
    {"action": "/submit", "method": "post", "fields": [{"name": "email", "type": "email", "required": true}]}
  ]
}`;
}

// ---------------------------------------------------------------------------
// Fallback: try to parse JSON from rawText when resultJson is null
// ---------------------------------------------------------------------------

function tryParseRawText(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    // Try full parse
    try { return JSON.parse(cleaned) as Record<string, unknown>; } catch { /* continue */ }
    // Extract first {...}
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
    }
  } catch { /* could not recover */ }
  return null;
}

export async function crawlPage(url: string, allowedHostname: string): Promise<CrawledPage> {
  const emptyPage: CrawledPage = { url, title: "", elements: [], internalLinks: [], externalLinks: [], forms: [] };

  const result = await withTimeout(
    runTinyFish({ url, goal: buildCrawlGoal(url, allowedHostname), browser_profile: "stealth" }),
    LIMITS.CRAWL_PAGE_TIMEOUT_MS,
    { success: false, resultJson: null, rawText: null, error: "timeout", jobId: null },
    `crawlPage(${url})`,
  );

  // Try resultJson first, fall back to rawText parsing
  const rawData = result.resultJson ?? tryParseRawText(result.rawText);

  if (!rawData) {
    console.error(`[TinyFish] crawlPage failed for ${url}: ${result.error}`);
    return emptyPage;
  }

  const data = rawData as {
    title?: string;
    elements?: CrawledPage["elements"];
    internalLinks?: (string | null | undefined)[];
    forms?: CrawledPage["forms"];
  };

  // Resolve relative → absolute, filter noise, deduplicate
  const seen = new Set<string>();
  const internalLinks: string[] = [];
  for (const raw of (data.internalLinks ?? [])) {
    if (!raw) continue;
    const resolved = resolveUrl(raw, url);
    if (!resolved) continue;
    if (!isAllowedUrl(resolved, allowedHostname)) continue;
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    internalLinks.push(resolved);
  }

  // Also scrape any hrefs from elements array that we might have missed
  for (const el of (data.elements ?? [])) {
    if (el.type === "link" && el.href) {
      const resolved = resolveUrl(el.href, url);
      if (resolved && isAllowedUrl(resolved, allowedHostname) && !seen.has(resolved)) {
        seen.add(resolved);
        internalLinks.push(resolved);
      }
    }
  }

  console.log(`[TinyFish] crawlPage "${data.title}" | ${internalLinks.length} internal links | ${(data.elements ?? []).length} elements | ${(data.forms ?? []).length} forms`);
  if (internalLinks.length > 0) console.log(`[TinyFish] Links found:`, internalLinks);

  return {
    url,
    title: data.title ?? "",
    elements: data.elements ?? [],
    internalLinks,
    externalLinks: [],
    forms: data.forms ?? [],
  };
}

// ---------------------------------------------------------------------------
// executeTest — structured, explicit, foolproof
//
// Problems with the old approach:
//   - "Expected: X" at the end was ambiguous
//   - No explicit PASS/FAIL criteria
//   - No instruction to verify the result before returning
//
// New approach:
//   - Each step is a concrete action
//   - Verification step is explicit
//   - The agent is told what "passed" and "failed" mean
//   - JSON schema is strict and minimal
// ---------------------------------------------------------------------------

export async function executeTest(url: string, goal: string, stealth = false): Promise<TestExecutionResult> {
  const startTime = Date.now();

  const fullGoal = `You are a QA test automation agent. Execute the following test steps in order on a real browser.

== TEST URL ==
${url}

== TEST STEPS ==
${goal}

== EXECUTION RULES ==
1. Navigate to the URL first if not already there.
2. Wait for the page to fully load before interacting.
3. Execute each step in order.
4. After all steps, verify whether the expected result was achieved.
5. "passed" = true ONLY if the expected result was confirmed in the browser.
6. "passed" = false if any step failed, an error appeared, or the expected result was NOT confirmed.
7. Be conservative: if you are unsure, set passed = false.

== RESPONSE FORMAT ==
Return ONLY this JSON. No markdown. No explanation. Start with { and end with }.

If test PASSED:
{"passed":true,"actualResult":"<one sentence: what you observed>","errorDetails":null,"consoleLogs":[]}

If test FAILED:
{"passed":false,"actualResult":"<one sentence: what you observed>","errorDetails":"<specific error or mismatch>","consoleLogs":[]}`;

  const result = await withTimeout(
    runTinyFish({ url, goal: fullGoal, browser_profile: stealth ? "stealth" : "lite" }),
    LIMITS.EXECUTE_TEST_TIMEOUT_MS,
    { success: false, resultJson: null, rawText: null, error: "timeout", jobId: null },
    `executeTest(${url})`,
  );

  const durationMs = Date.now() - startTime;

  // Try resultJson first, then rawText fallback
  const rawData = result.resultJson ?? tryParseRawText(result.rawText);

  if (!rawData) {
    return {
      passed: false,
      actualResult: "TinyFish execution failed or timed out",
      errorDetails: result.error,
      screenshotUrl: null,
      durationMs,
      consoleLogs: [],
    };
  }

  const r = rawData as { passed?: boolean; actualResult?: string; errorDetails?: string | null; consoleLogs?: string[] };
  return {
    passed: r.passed === true, // strict — must be exactly true
    actualResult: r.actualResult ?? "No result returned",
    errorDetails: r.errorDetails ?? null,
    screenshotUrl: null,
    durationMs,
    consoleLogs: r.consoleLogs ?? [],
  };
}

export async function crawlSite(
  rootUrl: string,
  options: CrawlOptions = {},
): Promise<{ pages: CrawledPage[]; allLinks: string[]; crawlTimeMs: number }> {
  const startTime = Date.now();
  const maxPages = Math.min(options.maxPages ?? LIMITS.MAX_PAGES_PRO, LIMITS.MAX_PAGES_PRO);
  const allowedHostname = options.allowedDomain ?? extractHostname(rootUrl);

  console.log(`[TinyFish] ═══ Crawl start: ${rootUrl} | domain: ${allowedHostname} | maxPages: ${maxPages}`);

  // Step 1: Crawl root page
  console.log(`[TinyFish] Step 1: Crawling root page...`);
  const rootPage = await crawlPage(rootUrl, allowedHostname);
  console.log(`[TinyFish] Root: "${rootPage.title}" | ${rootPage.internalLinks.length} internal links found`);

  // Step 2: Deduplicate, exclude root, cap at maxPages-1
  const remaining = [...new Set(rootPage.internalLinks)]
    .filter((u) => u !== rootUrl && u !== rootUrl + "/")
    .slice(0, maxPages - 1);

  console.log(`[TinyFish] Step 2: Crawling ${remaining.length} additional pages in parallel:`, remaining);

  // Step 3: Parallel crawl of all remaining pages
  const additionalPages = remaining.length > 0
    ? await Promise.all(remaining.map((url) => crawlPage(url, allowedHostname)))
    : [];

  const pages = [rootPage, ...additionalPages];
  const allLinks = [...new Set(pages.flatMap((p) => p.internalLinks))];
  const crawlTimeMs = Date.now() - startTime;

  console.log(`[TinyFish] ═══ Done: ${pages.length} pages | ${allLinks.length} links | ${(crawlTimeMs / 1000).toFixed(1)}s`);
  return { pages, allLinks, crawlTimeMs };
}