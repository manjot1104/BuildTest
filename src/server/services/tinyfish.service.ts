// src/server/services/tinyfish.service.ts
//
// ═══════════════════════════════════════════════════════════════════════════
// CRAWLER ARCHITECTURE
// ═══════════════════════════════════════════════════════════════════════════
//
// Design principles:
//   1. No separate discovery stage. Discovery IS extraction.
//   2. Hard budget caps enforced up front.
//   3. Test budget allocated proportionally after crawl completes.
//   4. Free seeding before any TinyFish call.
//   5. Per-crawl context object, not module globals.
//
// Pipeline:
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ STAGE 0 │ Free URL seeding                                              │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ STAGE 1 │ BFS extraction (unified crawl + discovery)                    │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ STAGE 2 │ Test budget allocation                                        │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ STAGE 3 │ Background: screenshots + perf via Puppeteer (non-blocking)  │
// └─────────────────────────────────────────────────────────────────────────┘

import { uploadPageScreenshots, urlToSlug } from "./s3.service";
import { capturePageScreenshots, measurePagePerformanceWithPuppeteer } from "./puppeteer.service";

const TINYFISH_API_URL = "https://agent.tinyfish.ai/v1/automation/run-sse";
const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY;

// ─── Budget & limits ──────────────────────────────────────────────────────────

export interface CrawlBudget {
  maxPages: number;
  maxTests: number;
  concurrency: number;
}

export interface TestBudgetAllocation {
  testsPerPage: Map<string, number>;
  totalTests: number;
}

export const BUDGET_PRESETS = {
  free:     { maxPages: 3,  maxTests: 5,  concurrency: 2 } satisfies CrawlBudget,
  standard: { maxPages: 5,  maxTests: 10, concurrency: 3 } satisfies CrawlBudget,
  deep:     { maxPages: 10, maxTests: 15, concurrency: 4 } satisfies CrawlBudget,
} as const;

const HARD_CAPS = {
  MAX_PAGES: 10,
  MAX_TESTS: 15,
  MAX_TESTS_PER_PAGE: 5,
  MIN_TESTS_PER_PAGE: 1,
} as const;

const TIMEOUTS = {
  EXTRACTION_BASE_MS:          150_000,
  EXTRACTION_RETRY_BONUS_MS:    60_000,
  NAV_PROBE_MS:                 45_000,
  EXECUTE_TEST_BASE_MS:        180_000,
  EXECUTE_TEST_RETRY_BONUS_MS:  60_000,
  SCREENSHOT_FAIL_MS:           90_000,
} as const;

export const MAX_EXTRACTION_RETRIES = 2;
export const MAX_TEST_RETRIES = 1;

// ─── Per-crawl context ────────────────────────────────────────────────────────

interface CrawlContext {
  creditsExhausted: boolean;
}

function makeCrawlContext(): CrawlContext {
  return { creditsExhausted: false };
}

// ─── Public interfaces ────────────────────────────────────────────────────────

export interface CrawlOptions {
  budget?: Partial<CrawlBudget>;
  allowedDomain?: string;
  testRunId?: string;
  abortSignal?: AbortSignal;
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

export interface NavMenu {
  label: string;
  items: { text: string; href: string }[];
}

export interface CrawledPage {
  url: string;
  title: string;
  elements: {
    type: string;
    text: string;
    href?: string;
    selector?: string;
    isVisible: boolean;
  }[];
  internalLinks: string[];
  externalLinks: string[];
  forms: {
    action?: string;
    method?: string;
    fields: {
      name: string;
      type: string;
      required: boolean;
      pattern?: string;
    }[];
  }[];
  apiEndpoints: ApiEndpoint[];
  navStructure: {
    breadcrumbs: string[];
    menus: NavMenu[];
  };
  screenshots: {
    url375: string | null;
    url768: string | null;
    url1440: string | null;
  };
  complexityScore: number;
}

export interface ApiEndpoint {
  url: string;
  method: string;
  status: number | null;
  responseType: string | null;
  durationMs: number | null;
}

export interface TestExecutionResult {
  passed: boolean;
  actualResult: string;
  errorDetails: string | null;
  screenshotUrl: string | null;
  durationMs: number;
  consoleLogs: string[];
  networkLogs: NetworkLogEntry[];
  jobId: string | null;
}

export interface NetworkLogEntry {
  url: string;
  method: string;
  status: number | null;
  error: string | null;
  durationMs: number | null;
}

export interface PagePerformanceMetrics {
  pageUrl: string;
  lcpMs: number | null;
  fidMs: number | null;
  cls: number | null;
  ttfbMs: number | null;
  rawMetrics: Record<string, unknown>;
}

export type PipelineSSEEvent =
  | { type: "status"; status: string; percent: number }
  | {
      type: "test_update";
      testResultId: string;
      testCaseId: string;
      title: string;
      status: "pending" | "running" | "passed" | "failed" | "flaky" | "skipped";
      durationMs?: number;
    }
  | {
      type: "counter";
      passed: number;
      failed: number;
      running: number;
      skipped: number;
      total: number;
    }
  | {
      type: "bug_found";
      bug: {
        id: string;
        title: string;
        severity: string;
        category: string;
        pageUrl: string;
        screenshotUrl: string | null;
      };
    }
  | {
      type: "complete";
      overallScore: number;
      passed: number;
      failed: number;
      skipped: number;
      total: number;
      aiSummary: string;
      shareableSlug: string | null;
    }
  | { type: "error"; message: string }
  | {
      type: "tests_generated";
      testCases: {
        id: string;
        title: string;
        category: string;
        priority: string;
        steps: string[];
        expected_result: string;
        target_url: string;
      }[];
    };

export class TinyFishCreditsExhaustedError extends Error {
  constructor() {
    super("TinyFish credits exhausted. Top up at https://tinyfish.ai/dashboard");
    this.name = "TinyFishCreditsExhaustedError";
  }
}

// ─── URL utilities ────────────────────────────────────────────────────────────

function extractHostname(url: string): string {
  try { return new URL(url).hostname; } catch { return ""; }
}

function resolveAbsolute(raw: string, base: string): string | null {
  try {
    if (!raw) return null;
    const t = raw.trim();
    if (
      t === "#" ||
      t.startsWith("javascript:") ||
      t.startsWith("mailto:") ||
      t.startsWith("tel:") ||
      t.startsWith("data:")
    ) return null;
    const resolved = new URL(t, base);
    resolved.hash = "";
    return resolved.href;
  } catch { return null; }
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.pathname !== "/") u.pathname = u.pathname.replace(/\/$/, "");
    return u.href;
  } catch { return url; }
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

const LOCALE_PATH_RE = /^\/(?:[a-z]{2}(?:[_-][a-zA-Z]{2})?)(?:\/|$)/;

function isAllowedUrl(candidate: string, allowedHostname: string): boolean {
  if (candidate.includes("&amp;")) return false;
  try {
    const p = new URL(candidate);
    if (p.hostname !== allowedHostname) return false;
    if (/\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|tar|gz|mp4|mp3|wav|ico|woff|woff2|ttf|eot|css|js|map|xml)$/i.test(p.pathname)) return false;
    if (/[?&](page|offset|cursor|after|before|from|start|p)=\d/i.test(p.search)) return false;
    if (/\/page\/\d+/i.test(p.pathname)) return false;
    if (/\/(logout|signout|sign-out|log-out|delete|remove|destroy)/i.test(p.pathname)) return false;
    if (/[?&](id|how|goto|site|whence|hmac|auth)=/i.test(p.search)) return false;
    if (/\/(vote|hide|flag|reply|fave|upvote|downvote|react)\b/i.test(p.pathname)) return false;
    if (LOCALE_PATH_RE.test(p.pathname)) return false;
    return true;
  } catch { return false; }
}

const DEFAULT_MAX_PER_PATTERN = 2;

function filterByPathPattern(urls: string[], maxPerPattern = DEFAULT_MAX_PER_PATTERN): string[] {
  const counts = new Map<string, number>();
  const result: string[] = [];
  for (const url of urls) {
    try {
      const segs = new URL(url).pathname.split("/").filter(Boolean);
      const key = segs.slice(0, 2).join("/") || "root";
      const n = counts.get(key) ?? 0;
      if (n < maxPerPattern) { counts.set(key, n + 1); result.push(url); }
    } catch { result.push(url); }
  }
  return result;
}

// ─── Async utilities ──────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T, label = "op"): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const race = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`[TinyFish] Timeout ${ms}ms: ${label}`);
      resolve(fallback);
    }, ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(timer)), race]);
}

function makeAbortSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

// ─── TinyFish API client ──────────────────────────────────────────────────────

async function runTinyFish(request: TinyFishRequest, ctx: CrawlContext): Promise<TinyFishResult> {
  if (!TINYFISH_API_KEY) throw new Error("TINYFISH_API_KEY is not set");
  console.log(`[TinyFish] → ${request.url}`);

  let rawText = "";
  let jobId: string | null = null;

  try {
    const { signal, clear } = makeAbortSignal(30_000);
    let response: Response;
    try {
      response = await fetch(TINYFISH_API_URL, {
        method: "POST",
        headers: { "X-API-Key": TINYFISH_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal,
      });
    } finally { clear(); }

    console.log(`[TinyFish] ← HTTP ${response.status} ${request.url}`);

    if (!response.ok) {
      const err = await response.text();
      if (response.status === 403 && err.includes("Insufficient credits")) {
        ctx.creditsExhausted = true;
        throw new TinyFishCreditsExhaustedError();
      }
      return { success: false, resultJson: null, rawText: null, error: `HTTP ${response.status}: ${err}`, jobId: null };
    }

    if (!response.body) return { success: false, resultJson: null, rawText: null, error: "No body", jobId: null };

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let eventCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;
        eventCount++;
        try {
          const event = JSON.parse(jsonStr) as {
            type?: string; status?: string; resultJson?: Record<string, unknown>;
            text?: string; jobId?: string; error?: string;
          };
          if (event.jobId && !jobId) jobId = event.jobId;
          if (event.text) rawText += event.text;
          if (event.type === "COMPLETE") {
            console.log(`[TinyFish] ✓ ${jobId} → ${event.status} (${eventCount} events)`);
            if (event.status === "COMPLETED") {
              return { success: true, resultJson: event.resultJson ?? null, rawText: rawText || null, error: null, jobId };
            }
            return {
              success: false, resultJson: null, rawText: rawText || null,
              error: event.error ?? `Status: ${event.status}`, jobId,
            };
          }
        } catch { /* skip malformed SSE event */ }
      }
    }

    if (rawText) {
      const recovered = tryParseRawText(rawText);
      if (recovered) {
        console.log(`[TinyFish] Recovered JSON from rawText (${rawText.length} chars)`);
        return { success: true, resultJson: recovered, rawText, error: null, jobId };
      }
    }

    return {
      success: false, resultJson: null, rawText: rawText || null,
      error: "Stream ended without COMPLETE event", jobId,
    };
  } catch (err) {
    if (err instanceof TinyFishCreditsExhaustedError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "terminated" || msg.includes("terminated")) {
      console.warn(`[TinyFish] Connection reset (Vercel terminated): ${request.url}`);
    } else {
      console.error(`[TinyFish] Fetch error: ${msg}`);
    }
    return { success: false, resultJson: null, rawText: null, error: msg, jobId };
  }
}

function tryParseRawText(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    try { return JSON.parse(cleaned) as Record<string, unknown>; } catch { /* continue */ }
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try { return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>; } catch { /* continue */ }
    }
  } catch { /* give up */ }
  return null;
}

// ─── Stage 0: Free URL seeding ────────────────────────────────────────────────

async function fetchSitemapUrls(rootUrl: string, allowedHostname: string): Promise<string[]> {
  const candidates = [
    `${rootUrl.replace(/\/$/, "")}/sitemap.xml`,
    `${rootUrl.replace(/\/$/, "")}/sitemap_index.xml`,
    `${rootUrl.replace(/\/$/, "")}/robots.txt`,
  ];

  for (const candidateUrl of candidates) {
    try {
      const { signal, clear } = makeAbortSignal(8_000);
      let res: Response;
      try {
        res = await fetch(candidateUrl, { headers: { "User-Agent": "Buildify/1.0 (automated testing)" }, signal });
      } finally { clear(); }
      if (!res.ok) continue;
      const text = await res.text();
      if (candidateUrl.endsWith("robots.txt")) {
        const sitemapUrls = [...text.matchAll(/^Sitemap:\s*(.+)$/gim)].map((m) => m[1]!.trim());
        for (const su of sitemapUrls) {
          const locs = await fetchSitemapUrls(su, allowedHostname);
          if (locs.length > 0) return locs;
        }
        continue;
      }
      const locs = [...text.matchAll(/<loc>\s*(https?:\/\/[^\s<]+)\s*<\/loc>/gi)]
        .map((m) => m[1]!.trim())
        .filter((u) => isAllowedUrl(u, allowedHostname))
        .slice(0, 50);
      if (locs.length > 0) {
        console.log(`[Stage0] Sitemap: ${locs.length} URLs`);
        return locs;
      }
    } catch { /* sitemap is always optional */ }
  }
  return [];
}

async function fetchStaticHtmlLinks(rootUrl: string, allowedHostname: string): Promise<string[]> {
  try {
    const { signal, clear } = makeAbortSignal(10_000);
    let res: Response;
    try {
      res = await fetch(rootUrl, {
        headers: { "User-Agent": "Buildify/1.0 (automated testing)", Accept: "text/html" },
        signal,
      });
    } finally { clear(); }
    if (!res.ok) return [];
    const html = await res.text();
    const links = [...html.matchAll(/href=["']([^"']+)["']/gi)]
      .map((m) => decodeHtmlEntities(m[1]!))
      .map((href) => resolveAbsolute(href, rootUrl))
      .filter((u): u is string => u !== null)
      .filter((u) => isAllowedUrl(u, allowedHostname))
      .map(normalizeUrl);
    const unique = [...new Set(links)];
    if (unique.length > 0) console.log(`[Stage0] Static HTML: ${unique.length} links`);
    return unique;
  } catch { return []; }
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

const WAIT_PREAMBLE = `
WAIT FOR FULL RENDER:
1. Wait for the page to fully load (network idle).
2. If you see <div id="root">, <div id="app">, __NEXT_DATA__, window.React, or window.__nuxt — JavaScript-rendered app. Wait an EXTRA 4 seconds for JS rendering to complete.
3. Wait for loading spinners and skeleton screens to disappear.
4. Dismiss or ignore login modals and cookie banners — do NOT interact with them.
`.trim();

function buildExtractionGoal(url: string, allowedHostname: string): string {
  return `Navigate to this URL: ${url}

${WAIT_PREAMBLE}

INTERCEPT NETWORK REQUESTS during page load:
Record fetch/XHR calls where URL contains /api/, /v1/, /v2/, /graphql, or Content-Type is application/json.
Fields: url, method, status (HTTP code), responseType, durationMs. Cap at 15.

EXTRACT:

1. PAGE TITLE: document.title

2. INTERACTIVE ELEMENTS — capture ALL elements a user can click, type into, or select.
   Include standard HTML elements AND framework-rendered equivalents:

   a) <a href="...">             type "link",       text = visible label, href = resolved absolute URL
   b) <button>                   type "button",     text = visible label or aria-label
   c) <input>                    type "input",      text = placeholder or aria-label or name
   d) <select>                   type "select",     text = aria-label or name
   e) <textarea>                 type "textarea",   text = placeholder or aria-label
   f) Any <div>, <span>, <li>, <img> or other element where ANY of these is true:
        - has an onclick / onClick attribute or attached event listener
        - has role="button" or role="link"
        - has a data-href, data-url, data-to, or data-link attribute
        - has cursor:pointer computed style AND contains visible text or an icon
      type "interactive", text = visible inner text or aria-label,
      href = data-href / data-url / data-to value if present, otherwise omit href

   For each element record: type, text (trimmed, max 80 chars), href (if it navigates), isVisible.
   Skip hidden elements (display:none, visibility:hidden, opacity:0, off-screen by >2 viewports).
   Cap at 60 elements total.

3. FORMS — for each <form> or element with role="form":
   action (resolved absolute URL or null), method (default "get"),
   fields: [{name, type, required, pattern}]

4. NAVIGABLE LINKS — collect ALL URLs this page can navigate to.

   STEP A — passive collection (no clicks):
   - href on every <a> tag (resolve relative to absolute)
   - data-href / data-url / data-to / data-link attributes on any element
   - window.__NEXT_DATA__ or window.__NUXT__ route manifests if accessible
   - <link rel="alternate|canonical"> href values

   STEP B — active SPA discovery (click-and-record):
   React/Vue/Angular SPAs frequently render ALL navigation as plain <div> or <li>
   elements with onClick handlers and NO href.

   HOW TO FIND CANDIDATES:
   Look for any of the following patterns on the page:
     1. Elements inside <nav>, <header>, or elements with role="navigation" that
        have no href but appear to be links (cursor:pointer, or text that looks like a page name)
     2. Repeating groups of similar containers where each item has similar
        structure and appears clickable. Click UP TO 3 items to sample the URL pattern.
     3. Any other visible element with cursor:pointer that has no href and
        does not look like a form control or action button.

   FOR EACH CANDIDATE:
     1. Click it
     2. Wait up to 3 seconds for navigation to settle
     3. If window.location.href changed AND hostname is still "${allowedHostname}": record the new absolute URL
     4. Press browser Back, wait for the original page to finish loading
     5. Stop after collecting 20 URLs this way or clicking 30 candidates total.

   Rules for ALL URLs from Step A and Step B:
   - Include ONLY URLs whose hostname is exactly "${allowedHostname}"
   - Strip URL fragments (#section)
   - Deduplicate
   - Cap total at 60 entries

5. NAVIGATION STRUCTURE: breadcrumbs array, menus [{label:"top-nav"|"sidebar"|"footer", items:[{text,href}]}]

Return ONLY valid JSON. No markdown. No explanation. Start with { and end with }.
{
  "title": "string",
  "elements": [
    {"type":"link","text":"About","href":"https://${allowedHostname}/about","isVisible":true},
    {"type":"button","text":"Submit","isVisible":true},
    {"type":"input","text":"Search","isVisible":true},
    {"type":"interactive","text":"Dashboard","href":"https://${allowedHostname}/dashboard","isVisible":true}
  ],
  "internalLinks": ["https://${allowedHostname}/about","https://${allowedHostname}/dashboard"],
  "forms": [{"action":"/search","method":"get","fields":[{"name":"q","type":"text","required":false,"pattern":null}]}],
  "apiEndpoints": [{"url":"https://api.example.com/v1/data","method":"GET","status":200,"responseType":"json","durationMs":120}],
  "navStructure": {
    "breadcrumbs": ["Home","Products"],
    "menus": [{"label":"top-nav","items":[{"text":"About","href":"/about"}]}]
  }
}`;
}

// ─── Page data extraction ─────────────────────────────────────────────────────

function scorePageComplexity(page: Omit<CrawledPage, "complexityScore" | "screenshots">): number {
  const interactive = page.elements.filter(
    (e) =>
      e.type === "button" ||
      e.type === "input" ||
      e.type === "select" ||
      e.type === "textarea" ||
      e.type === "interactive",
  ).length;
  return (
    page.forms.length * 2 +
    interactive * 1 +
    page.internalLinks.length * 0.5 +
    (page.apiEndpoints.length > 0 ? 3 : 0)
  );
}

function extractPageData(
  url: string,
  rawData: Record<string, unknown>,
  allowedHostname: string,
): Omit<CrawledPage, "screenshots"> {
  const d = rawData as {
    title?: string;
    elements?: { type: string; text: string; href?: string; selector?: string; isVisible: boolean }[];
    internalLinks?: unknown[];
    forms?: CrawledPage["forms"];
    apiEndpoints?: unknown[];
    navStructure?: { breadcrumbs?: string[]; menus?: NavMenu[] };
  };

  const seen = new Set<string>();
  const internalLinks: string[] = [];

  const addLink = (raw: unknown) => {
    if (typeof raw !== "string" || !raw) return;
    const decoded = decodeHtmlEntities(raw);
    const resolved = resolveAbsolute(decoded, url);
    if (!resolved) return;
    const normalized = normalizeUrl(resolved);
    if (!isAllowedUrl(normalized, allowedHostname) || seen.has(normalized)) return;
    seen.add(normalized);
    internalLinks.push(normalized);
  };

  for (const raw of d.internalLinks ?? []) addLink(raw);
  for (const el of d.elements ?? []) {
    if ((el.type === "link" || el.type === "interactive") && el.href) addLink(el.href);
  }

  const apiEndpoints: ApiEndpoint[] = (
    (d.apiEndpoints ?? []) as unknown[]
  )
    .filter(
      (e): e is { url: string; method?: string; status?: number; responseType?: string; durationMs?: number } =>
        typeof e === "object" && e !== null && typeof (e as { url?: unknown }).url === "string",
    )
    .map((e) => ({
      url: e.url,
      method: e.method ?? "GET",
      status: typeof e.status === "number" ? e.status : null,
      responseType: e.responseType ?? null,
      durationMs: typeof e.durationMs === "number" ? e.durationMs : null,
    }))
    .slice(0, 15);

  const partial: Omit<CrawledPage, "complexityScore" | "screenshots"> = {
    url,
    title: typeof d.title === "string" ? d.title : "",
    elements: d.elements ?? [],
    internalLinks,
    externalLinks: [],
    forms: d.forms ?? [],
    apiEndpoints,
    navStructure: {
      breadcrumbs: d.navStructure?.breadcrumbs ?? [],
      menus: d.navStructure?.menus ?? [],
    },
  };

  return { ...partial, complexityScore: scorePageComplexity(partial) };
}

// ─── Stage 2: Test budget allocation ─────────────────────────────────────────

export function allocateTestBudget(pages: CrawledPage[], maxTests: number): TestBudgetAllocation {
  const cap = Math.min(maxTests, HARD_CAPS.MAX_TESTS);
  const floor = HARD_CAPS.MIN_TESTS_PER_PAGE;
  const ceiling = HARD_CAPS.MAX_TESTS_PER_PAGE;

  const allocation = new Map<string, number>(pages.map((p) => [p.url, floor]));
  let remaining = cap - pages.length * floor;

  if (remaining > 0) {
    const ranked = [...pages].sort((a, b) => b.complexityScore - a.complexityScore);
    for (const page of ranked) {
      if (remaining <= 0) break;
      const current = allocation.get(page.url) ?? floor;
      const canAdd = Math.min(ceiling - current, remaining);
      if (canAdd > 0) { allocation.set(page.url, current + canAdd); remaining -= canAdd; }
    }
  }

  const totalTests = [...allocation.values()].reduce((sum, n) => sum + n, 0);
  console.log(
    `[Budget] ${pages.length} pages | cap=${cap} | allocated=${totalTests} | ` +
    [...allocation.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([u, n]) => `${new URL(u).pathname}×${n}`)
      .join(", "),
  );

  return { testsPerPage: allocation, totalTests };
}

// ─── Main crawl ───────────────────────────────────────────────────────────────

export async function crawlSite(
  rootUrl: string,
  options: CrawlOptions = {},
): Promise<{
  pages: CrawledPage[];
  allLinks: string[];
  crawlTimeMs: number;
  performanceMetrics: PagePerformanceMetrics[];
  testBudget: TestBudgetAllocation;
  hasLogin: boolean;
  hasSignup: boolean;
  hasSearch: boolean;
  hasProtectedRoutes: boolean;
  stage3Promise: Promise<void>;
}> {
  const startTime = Date.now();
  const allowedHostname = options.allowedDomain ?? extractHostname(rootUrl);
  const testRunId = options.testRunId;
  const abortSignal = options.abortSignal;
  const ctx = makeCrawlContext();

  const budget: CrawlBudget = {
    maxPages: Math.min(
      options.budget?.maxPages ?? BUDGET_PRESETS.standard.maxPages,
      HARD_CAPS.MAX_PAGES,
    ),
    maxTests: Math.min(
      options.budget?.maxTests ?? BUDGET_PRESETS.standard.maxTests,
      HARD_CAPS.MAX_TESTS,
    ),
    concurrency: options.budget?.concurrency ?? BUDGET_PRESETS.standard.concurrency,
  };

  console.log(
    `[Crawler] ══ START: ${rootUrl} | maxPages=${budget.maxPages} maxTests=${budget.maxTests} concurrency=${budget.concurrency}`,
  );

  // ── Stage 0: Free seeding ──────────────────────────────────────────────────
  const [sitemapUrls, staticHtmlLinks] = await Promise.all([
    fetchSitemapUrls(rootUrl, allowedHostname),
    fetchStaticHtmlLinks(rootUrl, allowedHostname),
  ]);

  const rootNorm = normalizeUrl(rootUrl);
  const visited = new Set<string>([rootNorm]);
  const queue: string[] = [rootNorm];
  const seedLinks = filterByPathPattern([
    ...new Set(
      [...sitemapUrls, ...staticHtmlLinks]
        .map(normalizeUrl)
        .filter((u) => !visited.has(u) && isAllowedUrl(u, allowedHostname)),
    ),
  ]);
  for (const u of seedLinks) { visited.add(u); queue.push(u); }

  console.log(
    `[Stage0] Queue seeded with ${queue.length} URLs (sitemap:${sitemapUrls.length} html:${staticHtmlLinks.length})`,
  );

  // ── Stage 1: BFS extraction ────────────────────────────────────────────────
  const pages: CrawledPage[] = [];

  async function extractionWorker(): Promise<void> {
    while (true) {
      if (abortSignal?.aborted) { console.log(`[Stage1] Worker stopped — abort signal received`); break; }
      if (pages.length >= budget.maxPages || ctx.creditsExhausted) break;
      const pageUrl = queue.shift();
      if (!pageUrl) break;

      let extracted: Omit<CrawledPage, "screenshots"> | null = null;

      for (let attempt = 0; attempt <= MAX_EXTRACTION_RETRIES; attempt++) {
        if (abortSignal?.aborted || ctx.creditsExhausted) break;
        if (attempt > 0) console.log(`[Stage1] Retry ${attempt}: ${pageUrl}`);

        const extractTimeoutMs =
          TIMEOUTS.EXTRACTION_BASE_MS + attempt * TIMEOUTS.EXTRACTION_RETRY_BONUS_MS;
        const result = await withTimeout(
          runTinyFish(
            { url: pageUrl, goal: buildExtractionGoal(pageUrl, allowedHostname), browser_profile: "stealth" },
            ctx,
          ),
          extractTimeoutMs,
          { success: false, resultJson: null, rawText: null, error: "timeout", jobId: null },
          `extract(${pageUrl}) attempt=${attempt + 1} timeout=${extractTimeoutMs / 1000}s`,
        );

        if (abortSignal?.aborted) break;
        const raw = result.resultJson ?? tryParseRawText(result.rawText);
        if (!raw) {
          console.warn(`[Stage1] ✗ attempt ${attempt + 1} ${pageUrl}: ${result.error ?? "no data"}`);
          continue;
        }

        extracted = extractPageData(pageUrl, raw, allowedHostname);
        console.log(
          `[Stage1] ✓ [${pages.length + 1}/${budget.maxPages}] "${extracted.title}" ${pageUrl} | ` +
          `elements:${extracted.elements.length} forms:${extracted.forms.length} ` +
          `links:${extracted.internalLinks.length} complexity:${extracted.complexityScore.toFixed(1)}`,
        );
        break;
      }

      if (!extracted) continue;

      pages.push({ ...extracted, screenshots: { url375: null, url768: null, url1440: null } });

      if (pages.length < budget.maxPages) {
        const newLinks = filterByPathPattern(
          extracted.internalLinks.filter((u) => {
            if (visited.has(u)) return false;
            visited.add(u);
            return true;
          }),
        );
        let enqueued = 0;
        for (const u of newLinks) {
          if (pages.length + queue.length >= budget.maxPages) break;
          queue.push(u);
          enqueued++;
        }
        if (enqueued > 0) {
          console.log(`[Stage1] +${enqueued} URLs enqueued from ${pageUrl} | queue: ${queue.length}`);
        }
      }
    }
  }

  await Promise.all(Array.from({ length: budget.concurrency }, extractionWorker));

  if (abortSignal?.aborted) throw new Error("AbortError: crawl cancelled");

  if (pages.length === 0) {
    console.warn(`[Stage1] All extractions failed — inserting empty root page`);
    pages.push({
      url: rootUrl,
      title: "",
      elements: [],
      internalLinks: [],
      externalLinks: [],
      forms: [],
      apiEndpoints: [],
      navStructure: { breadcrumbs: [], menus: [] },
      screenshots: { url375: null, url768: null, url1440: null },
      complexityScore: 0,
    });
  }

  // ── Stage 2: Test budget allocation ───────────────────────────────────────
  const testBudget = allocateTestBudget(pages, budget.maxTests);
  const allLinks = [...new Set(pages.flatMap((p) => p.internalLinks))];
  const crawlTimeMs = Date.now() - startTime;

  console.log(
    `[Stage1] ══ DONE: ${pages.length} pages | ${allLinks.length} discovered links | ${(crawlTimeMs / 1000).toFixed(1)}s`,
  );

  // ── Stage 3: Background screenshots + perf via Puppeteer ──────────────────
  // Returns a Promise<void> the caller MUST await before writing to DB.
  // Mutates pages[i].screenshots with real S3 URLs in-place.
  // Populates performanceMetrics with real CWV numbers.
  const performanceMetrics: PagePerformanceMetrics[] = pages.map((p) => ({
    pageUrl: p.url,
    lcpMs: null,
    fidMs: null,
    cls: null,
    ttfbMs: null,
    rawMetrics: {},
  }));

  const stage3Promise = (async () => {
    await Promise.allSettled(
      pages.flatMap((page, i) => [
        // Screenshot capture via Puppeteer
        (async () => {
          if (!testRunId) return;
          try {
            console.log(`[Stage3] 📸 Capturing screenshots for ${page.url}`);
            const screenshots = await capturePageScreenshots(page.url);
            const uploaded = await uploadPageScreenshots({
              screenshots: {
                viewport375: screenshots.viewport375,
                viewport768: screenshots.viewport768,
                viewport1440: screenshots.viewport1440,
              },
              testRunId,
              pageSlug: urlToSlug(page.url),
            });
            // Mutate in-place so the crawl_results DB insert picks up real URLs
            pages[i]!.screenshots = uploaded;
            console.log(`[Stage3] ✓ Screenshots uploaded for ${page.url}`);
          } catch (err) {
            console.warn(`[Stage3] Screenshot failed for ${page.url}:`, err);
          }
        })(),
        // Performance metrics via Puppeteer
        (async () => {
          try {
            console.log(`[Stage3] ⚡ Measuring performance for ${page.url}`);
            const pm = await measurePagePerformanceWithPuppeteer(page.url);
            performanceMetrics[i] = pm;
            console.log(`[Stage3] ✓ Perf ${page.url} LCP=${pm.lcpMs}ms TTFB=${pm.ttfbMs}ms`);
          } catch (err) {
            console.warn(`[Stage3] Perf failed for ${page.url}:`, err);
          }
        })(),
      ]),
    );
    console.log(`[Stage3] Background tasks complete`);
  })();

  // ── Site feature detection ─────────────────────────────────────────────────
  const allElements = pages.flatMap((p) => p.elements);

  const hasLogin = pages.some(
    (p) =>
      /login|signin|auth|oauth|sso/.test(p.url) ||
      p.elements.some((e) => {
        const t = e.text?.toLowerCase() ?? "";
        return (
          t.includes("sign in") || t.includes("log in") || t.includes("login") ||
          t.includes("continue with google") || t.includes("sign in with google") ||
          t.includes("continue with github") || t.includes("login with")
        );
      }),
  );

  const hasSignup = pages.some(
    (p) =>
      /signup|register/.test(p.url) ||
      p.elements.some((e) => {
        const t = e.text?.toLowerCase() ?? "";
        return t.includes("sign up") || t.includes("register") || t.includes("create account");
      }),
  );

  const protectedRouteRE = /\/(dashboard|account|profile|settings|admin|portal|members?|private|secure|my-)/i;
  const hasProtectedRoutes = pages.some(
    (p) =>
      protectedRouteRE.test(p.url) ||
      p.internalLinks.some((l) => protectedRouteRE.test(l)),
  );

  const hasSearch = allElements.some(
    (e) =>
      (e.type === "input" && (e.text?.toLowerCase().includes("search") ?? false)) ||
      e.text?.toLowerCase() === "search",
  );

  console.log(
    `[Crawler] ══ FINAL: ${pages.length} pages | tests:${testBudget.totalTests} | ` +
    `login:${hasLogin} signup:${hasSignup} search:${hasSearch} protected:${hasProtectedRoutes} | ` +
    `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
  );

  return {
    pages,
    allLinks,
    crawlTimeMs,
    performanceMetrics,
    testBudget,
    hasLogin,
    hasSignup,
    hasSearch,
    hasProtectedRoutes,
    stage3Promise,
  };
}

// ─── Single-page crawl ────────────────────────────────────────────────────────

export async function crawlPage(url: string, allowedHostname: string): Promise<CrawledPage> {
  const ctx = makeCrawlContext();
  const empty: CrawledPage = {
    url, title: "", elements: [], internalLinks: [], externalLinks: [],
    forms: [], apiEndpoints: [], navStructure: { breadcrumbs: [], menus: [] },
    screenshots: { url375: null, url768: null, url1440: null }, complexityScore: 0,
  };
  const result = await withTimeout(
    runTinyFish(
      { url, goal: buildExtractionGoal(url, allowedHostname), browser_profile: "stealth" },
      ctx,
    ),
    TIMEOUTS.EXTRACTION_BASE_MS,
    { success: false, resultJson: null, rawText: null, error: "timeout", jobId: null },
    `crawlPage(${url})`,
  );
  const raw = result.resultJson ?? tryParseRawText(result.rawText);
  if (!raw) return empty;
  return { ...extractPageData(url, raw, allowedHostname), screenshots: { url375: null, url768: null, url1440: null } };
}

// ─── Performance measurement (via Puppeteer) ──────────────────────────────────

export async function measurePagePerformance(url: string): Promise<PagePerformanceMetrics> {
  try {
    return await measurePagePerformanceWithPuppeteer(url);
  } catch {
    return { pageUrl: url, lcpMs: null, fidMs: null, cls: null, ttfbMs: null, rawMetrics: {} };
  }
}

// ─── Test execution ───────────────────────────────────────────────────────────

export async function executeTest(
  url: string,
  goal: string,
  stealth = false,
  attempt = 0,
): Promise<TestExecutionResult> {
  const ctx = makeCrawlContext();
  const startTime = Date.now();

  const fullGoal = `You are a QA test automation agent. Execute these test steps in a real browser.

TEST URL: ${url}

STEPS:
${goal}

EXECUTION RULES:
1. Navigate to the URL first.
2. If SPA (React/Vue/Next.js — check for <div id="root">), wait 3 extra seconds after load for hydration.
3. Execute each step in strict order.
4. "passed" = true ONLY if you EXPLICITLY confirmed the expected result in the browser.
5. "passed" = false if any step failed, threw an error, or the expected result was NOT observed.
6. If uncertain, set passed = false.
7. Record 4xx/5xx errors in networkLogs. Record JS console errors in consoleLogs.

Return ONLY this JSON, no markdown, start with { end with }:
If PASSED: {"passed":true,"actualResult":"<what you observed>","errorDetails":null,"consoleLogs":[],"networkLogs":[]}
If FAILED: {"passed":false,"actualResult":"<what you observed>","errorDetails":"<specific error>","consoleLogs":[],"networkLogs":[]}`;

  const result = await withTimeout(
    runTinyFish(
      { url, goal: fullGoal, browser_profile: stealth ? "stealth" : "lite" },
      ctx,
    ),
    TIMEOUTS.EXECUTE_TEST_BASE_MS + attempt * TIMEOUTS.EXECUTE_TEST_RETRY_BONUS_MS,
    { success: false, resultJson: null, rawText: null, error: "timeout", jobId: null },
    `executeTest(${url}) attempt=${attempt + 1}`,
  );

  const durationMs = Date.now() - startTime;
  const raw = result.resultJson ?? tryParseRawText(result.rawText);

  if (!raw) {
    return {
      passed: false,
      actualResult: "TinyFish execution failed or timed out",
      errorDetails: result.error,
      screenshotUrl: null,
      durationMs,
      consoleLogs: [],
      networkLogs: [],
      jobId: result.jobId,
    };
  }

  const r = raw as {
    passed?: boolean;
    actualResult?: string;
    errorDetails?: string | null;
    consoleLogs?: string[];
    networkLogs?: NetworkLogEntry[];
  };

  return {
    passed: r.passed === true,
    actualResult: r.actualResult ?? "No result returned",
    errorDetails: r.errorDetails ?? null,
    screenshotUrl: null,
    durationMs,
    consoleLogs: r.consoleLogs ?? [],
    networkLogs: r.networkLogs ?? [],
    jobId: result.jobId,
  };
}

// ─── Failure screenshot (via Puppeteer) ───────────────────────────────────────

export async function runTinyFishScreenshot(url: string): Promise<string | null> {
  try {
    const { captureFullPageScreenshot } = await import("./puppeteer.service");
    return await captureFullPageScreenshot(url, 1440);
  } catch (err) {
    console.warn(`[Screenshot] Puppeteer capture failed for ${url}:`, err);
    return null;
  }
}