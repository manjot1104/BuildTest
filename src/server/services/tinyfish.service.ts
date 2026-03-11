// src/server/services/tinyfish.service.ts
//
// ═══════════════════════════════════════════════════════════════════════════
// CRAWLER ARCHITECTURE (v3 — Discovery-first)
// ═══════════════════════════════════════════════════════════════════════════
//
// OLD (BFS): root → extract → find links → extract each → serial-ish, slow
//
// NEW (Discovery-first):
//   STAGE 0 │ Free URL seeding (sitemap + static HTML, no TinyFish)
//   STAGE 1 │ ONE TinyFish "discoverer" call on the root URL
//            │   Goal: navigate the site, click nav items, collect all URLs
//            │   Returns: flat list of discovered page URLs
//   STAGE 2 │ Parallel TinyFish extraction on all discovered URLs
//            │   Each page gets its own call, all fire simultaneously
//   STAGE 3 │ Test budget allocation
//   STAGE 4 │ Background: screenshots + perf (non-blocking)
//
// Why this is faster:
//   - Discovery call clicks nav once, gets all URLs in ~30-60s
//   - All page extractions run in parallel (Promise.allSettled)
//   - No page waits for another page to finish
//   - Total time ≈ max(discovery, extraction) instead of sum(all pages)
//
// ═══════════════════════════════════════════════════════════════════════════

import { measurePagePerformanceWithPuppeteer } from "./puppeteer.service";

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
  free: { maxPages: 3, maxTests: 5, concurrency: 3 } satisfies CrawlBudget,
  standard: { maxPages: 5, maxTests: 10, concurrency: 5 } satisfies CrawlBudget,
  deep: { maxPages: 10, maxTests: 15, concurrency: 10 } satisfies CrawlBudget,
} as const;

const HARD_CAPS = {
  MAX_PAGES: 10,
  MAX_TESTS: 15,
  MAX_TESTS_PER_PAGE: 5,
  MIN_TESTS_PER_PAGE: 1,
} as const;

const TIMEOUTS = {
  // Discovery: needs time to click nav + wait for URL changes
  DISCOVERY_MS: 300_000,
  EXTRACTION_MS: 300_000,
  EXTRACTION_RETRY_MS: 60_000,
  // Test execution
  EXECUTE_TEST_BASE_MS: 300_000,
  EXECUTE_TEST_RETRY_BONUS_MS: 60_000,
} as const;

export const MAX_EXTRACTION_RETRIES = 1;
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
    super(
      "TinyFish credits exhausted. Top up at https://tinyfish.ai/dashboard",
    );
    this.name = "TinyFishCreditsExhaustedError";
  }
}

// ─── URL utilities ────────────────────────────────────────────────────────────

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
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
    )
      return null;
    const resolved = new URL(t, base);
    resolved.hash = "";
    return resolved.href;
  } catch {
    return null;
  }
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.pathname !== "/") u.pathname = u.pathname.replace(/\/$/, "");
    return u.href;
  } catch {
    return url;
  }
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

const LOCALE_PATH_RE = /^\/(?:[a-z]{2}(?:[_-][a-zA-Z]{2})?)(?:\/|$)/;

function isAllowedUrl(candidate: string, allowedHostname: string): boolean {
  if (candidate.includes("&amp;")) return false;
  try {
    const p = new URL(candidate);
    if (p.hostname !== allowedHostname) return false;
    if (
      /\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|tar|gz|mp4|mp3|wav|ico|woff|woff2|ttf|eot|css|js|map|xml)$/i.test(
        p.pathname,
      )
    )
      return false;
    if (/[?&](page|offset|cursor|after|before|from|start|p)=\d/i.test(p.search))
      return false;
    if (/\/page\/\d+/i.test(p.pathname)) return false;
    if (
      /\/(logout|signout|sign-out|log-out|delete|remove|destroy)/i.test(
        p.pathname,
      )
    )
      return false;
    if (/[?&](id|how|goto|site|whence|hmac|auth)=/i.test(p.search))
      return false;
    if (
      /\/(vote|hide|flag|reply|fave|upvote|downvote|react)\b/i.test(p.pathname)
    )
      return false;
    if (LOCALE_PATH_RE.test(p.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

function dedupeUrls(
  urls: string[],
  allowedHostname: string,
  max: number,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of urls) {
    const normalized = normalizeUrl(raw);
    if (!isAllowedUrl(normalized, allowedHostname)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
    if (result.length >= max) break;
  }
  return result;
}

// ─── Async utilities ──────────────────────────────────────────────────────────

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
  label = "op",
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const race = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`[TinyFish] Timeout ${ms}ms: ${label}`);
      resolve(fallback);
    }, ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(timer)), race]);
}

function makeAbortSignal(ms: number): {
  signal: AbortSignal;
  clear: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

// ─── TinyFish API client ──────────────────────────────────────────────────────

async function runTinyFish(
  request: TinyFishRequest,
  ctx: CrawlContext,
): Promise<TinyFishResult> {
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
        headers: {
          "X-API-Key": TINYFISH_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        signal,
      });
    } finally {
      clear();
    }

    console.log(`[TinyFish] ← HTTP ${response.status} ${request.url}`);

    if (!response.ok) {
      const err = await response.text();
      if (response.status === 403 && err.includes("Insufficient credits")) {
        ctx.creditsExhausted = true;
        throw new TinyFishCreditsExhaustedError();
      }
      return {
        success: false,
        resultJson: null,
        rawText: null,
        error: `HTTP ${response.status}: ${err}`,
        jobId: null,
      };
    }

    if (!response.body)
      return {
        success: false,
        resultJson: null,
        rawText: null,
        error: "No body",
        jobId: null,
      };

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
            type?: string;
            status?: string;
            resultJson?: Record<string, unknown>;
            text?: string;
            jobId?: string;
            error?: string;
          };
          if (event.jobId && !jobId) jobId = event.jobId;
          if (event.text) rawText += event.text;
          if (event.type === "COMPLETE") {
            console.log(
              `[TinyFish] ✓ ${jobId} → ${event.status} (${eventCount} events)`,
            );
            if (!event.resultJson) {
              console.warn(
                `[TinyFish] ⚠ No resultJson in COMPLETE. rawText preview: ${rawText.slice(0, 300)}`,
              );
            }
            if (event.status === "COMPLETED") {
              return {
                success: true,
                resultJson: event.resultJson ?? null,
                rawText: rawText || null,
                error: null,
                jobId,
              };
            }
            return {
              success: false,
              resultJson: null,
              rawText: rawText || null,
              error: event.error ?? `Status: ${event.status}`,
              jobId,
            };
          }
        } catch {
          /* skip malformed SSE event */
        }
      }
    }

    if (rawText) {
      const recovered = tryParseRawText(rawText);
      if (recovered) {
        console.log(
          `[TinyFish] Recovered JSON from rawText (${rawText.length} chars)`,
        );
        return {
          success: true,
          resultJson: recovered,
          rawText,
          error: null,
          jobId,
        };
      }
      console.warn(
        `[TinyFish] rawText unparseable (${rawText.length} chars): ${rawText.slice(0, 300)}`,
      );
    }

    return {
      success: false,
      resultJson: null,
      rawText: rawText || null,
      error: "Stream ended without COMPLETE event",
      jobId,
    };
  } catch (err) {
    if (err instanceof TinyFishCreditsExhaustedError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "terminated" || msg.includes("terminated")) {
      console.warn(
        `[TinyFish] Connection reset (Vercel terminated): ${request.url}`,
      );
    } else {
      console.error(`[TinyFish] Fetch error: ${msg}`);
    }
    return {
      success: false,
      resultJson: null,
      rawText: null,
      error: msg,
      jobId,
    };
  }
}

function tryParseRawText(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const cleaned = raw
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();
    try {
      return JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      /* continue */
    }
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as Record<
          string,
          unknown
        >;
      } catch {
        /* continue */
      }
    }
    // Also try array recovery for discovery results
    const arrStart = cleaned.indexOf("[");
    const arrEnd = cleaned.lastIndexOf("]");
    if (arrStart !== -1 && arrEnd > arrStart) {
      try {
        const arr = JSON.parse(
          cleaned.slice(arrStart, arrEnd + 1),
        ) as unknown[];
        return { urls: arr };
      } catch {
        /* continue */
      }
    }
  } catch {
    /* give up */
  }
  return null;
}

// ─── Stage 0: Free URL seeding (no TinyFish) ──────────────────────────────────

async function fetchSitemapUrls(
  rootUrl: string,
  allowedHostname: string,
): Promise<string[]> {
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
        res = await fetch(candidateUrl, {
          headers: { "User-Agent": "Buildify/1.0 (automated testing)" },
          signal,
        });
      } finally {
        clear();
      }
      if (!res.ok) continue;
      const text = await res.text();
      if (candidateUrl.endsWith("robots.txt")) {
        const sitemapUrls = [...text.matchAll(/^Sitemap:\s*(.+)$/gim)].map(
          (m) => m[1]!.trim(),
        );
        for (const su of sitemapUrls) {
          const locs = await fetchSitemapUrls(su, allowedHostname);
          if (locs.length > 0) return locs;
        }
        continue;
      }
      const locs = [
        ...text.matchAll(/<loc>\s*(https?:\/\/[^\s<]+)\s*<\/loc>/gi),
      ]
        .map((m) => m[1]!.trim())
        .filter((u) => isAllowedUrl(u, allowedHostname))
        .slice(0, 50);
      if (locs.length > 0) {
        console.log(`[Stage0] Sitemap: ${locs.length} URLs`);
        return locs;
      }
    } catch {
      /* optional */
    }
  }
  return [];
}

async function fetchStaticHtmlLinks(
  rootUrl: string,
  allowedHostname: string,
): Promise<string[]> {
  try {
    const { signal, clear } = makeAbortSignal(10_000);
    let res: Response;
    try {
      res = await fetch(rootUrl, {
        headers: {
          "User-Agent": "Buildify/1.0 (automated testing)",
          Accept: "text/html",
        },
        signal,
      });
    } finally {
      clear();
    }
    if (!res.ok) return [];
    const html = await res.text();
    const links = [...html.matchAll(/href=["']([^"']+)["']/gi)]
      .map((m) => decodeHtmlEntities(m[1]!))
      .map((href) => resolveAbsolute(href, rootUrl))
      .filter((u): u is string => u !== null)
      .filter((u) => isAllowedUrl(u, allowedHostname))
      .map(normalizeUrl);
    const unique = [...new Set(links)];
    if (unique.length > 0)
      console.log(`[Stage0] Static HTML: ${unique.length} links`);
    return unique;
  } catch {
    return [];
  }
}

// ─── Stage 1: Discovery prompt ────────────────────────────────────────────────
//
// This is a SINGLE TinyFish call on the root URL.
// Its only job: navigate the site (including clicking SPA nav items) and
// return a flat JSON array of all page URLs it found.
// It does NOT extract page content — that happens in parallel in Stage 2.

function buildDiscoveryGoal(
  rootUrl: string,
  allowedHostname: string,
  maxPages: number,
): string {
  return `You are a website URL discoverer. Your ONLY job is to find all unique page URLs on this website.

START URL: ${rootUrl}

STEP 1 — Navigate and wait:
Go to the start URL. Wait for full page load.
If you see <div id="root">, <div id="app">, or window.React exists — this is a JavaScript SPA. Wait an EXTRA 4 seconds for JS rendering.

STEP 2 — Collect passive links (no clicking):
- Every <a href="..."> tag — resolve relative URLs to absolute
- data-href, data-to, data-url attributes on any element
- Any route paths in window.__NEXT_DATA__ (Next.js) if it exists
- Any route paths in window.__NUXT__ (Nuxt.js) if it exists

STEP 3 — Click navigation items to discover SPA routes:
Look for navigation elements in <nav>, <header>, role="navigation", or sidebar menus.
For EACH clickable nav item (links, buttons, divs with cursor:pointer in nav areas):
  a) Click it
  b) Wait up to 3 seconds
  c) Check window.location.href — if it changed AND hostname is still "${allowedHostname}", record the new URL
  d) Click browser Back button, wait for page to reload
  e) Continue to next nav item
Stop when you have collected ${maxPages} URLs OR clicked 25 nav items, whichever comes first.

STEP 4 — Return results:
Return ONLY valid JSON as a single object. No markdown. No explanation. Start with { end with }.
The "urls" field must be an array of absolute URL strings.

{"urls":["https://${allowedHostname}/","https://${allowedHostname}/about","https://${allowedHostname}/games"]}`;
}

// ─── Stage 2: Extraction prompt ───────────────────────────────────────────────
//
// Called in parallel for each discovered URL.
// Passive only — no clicking. Just reads what's on the page.

function buildExtractionGoal(url: string, allowedHostname: string): string {
  return `Navigate to this URL: ${url}

Wait for the page to fully load. If SPA (has <div id="root"> or <div id="app">), wait 3 extra seconds.
Dismiss cookie banners — do NOT interact with them.

EXTRACT the following WITHOUT clicking anything:

1. PAGE TITLE: document.title

2. INTERACTIVE ELEMENTS visible to the user (cap at 40):
   - <a href>     → type "link",        text = label, href = absolute URL
   - <button>     → type "button",      text = label or aria-label
   - <input>      → type "input",       text = placeholder or name
   - <select>     → type "select",      text = aria-label or name
   - <textarea>   → type "textarea",    text = placeholder
   - role=button/link → type "interactive", text = inner text
   Skip hidden elements. text max 60 chars.

3. FORMS (cap at 5):
   action (absolute URL or null), method, fields: [{name, type, required, pattern}]

4. INTERNAL LINKS — all <a href> pointing to ${allowedHostname} (cap at 30):
   Resolve relative to absolute, strip fragments, deduplicate.

5. API CALLS intercepted during load (cap at 10):
   url, method, status, responseType, durationMs
   Only record /api/, /v1/, /v2/, /graphql calls.

6. NAVIGATION STRUCTURE:
   breadcrumbs: [], menus: [{label, items:[{text,href}]}]

Return ONLY valid JSON. No markdown. Start with { end with }.
{
  "title": "string",
  "elements": [{"type":"link","text":"About","href":"https://${allowedHostname}/about","isVisible":true}],
  "internalLinks": ["https://${allowedHostname}/about"],
  "forms": [],
  "apiEndpoints": [],
  "navStructure": {"breadcrumbs":[],"menus":[]}
}`;
}

// ─── Page data helpers ────────────────────────────────────────────────────────

function scorePageComplexity(
  page: Omit<CrawledPage, "complexityScore" | "screenshots">,
): number {
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
    interactive +
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
    elements?: {
      type: string;
      text: string;
      href?: string;
      selector?: string;
      isVisible: boolean;
    }[];
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
    if (!isAllowedUrl(normalized, allowedHostname) || seen.has(normalized))
      return;
    seen.add(normalized);
    internalLinks.push(normalized);
  };

  for (const raw of d.internalLinks ?? []) addLink(raw);
  for (const el of d.elements ?? []) {
    if ((el.type === "link" || el.type === "interactive") && el.href)
      addLink(el.href);
  }

  const apiEndpoints: ApiEndpoint[] = ((d.apiEndpoints ?? []) as unknown[])
    .filter(
      (
        e,
      ): e is {
        url: string;
        method?: string;
        status?: number;
        responseType?: string;
        durationMs?: number;
      } =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as { url?: unknown }).url === "string",
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

// ─── Stage 3: Test budget allocation ──────────────────────────────────────────

export function allocateTestBudget(
  pages: CrawledPage[],
  maxTests: number,
): TestBudgetAllocation {
  const cap = Math.min(maxTests, HARD_CAPS.MAX_TESTS);
  const floor = HARD_CAPS.MIN_TESTS_PER_PAGE;
  const ceiling = HARD_CAPS.MAX_TESTS_PER_PAGE;

  const allocation = new Map<string, number>(pages.map((p) => [p.url, floor]));
  let remaining = cap - pages.length * floor;

  if (remaining > 0) {
    const ranked = [...pages].sort(
      (a, b) => b.complexityScore - a.complexityScore,
    );
    for (const page of ranked) {
      if (remaining <= 0) break;
      const current = allocation.get(page.url) ?? floor;
      const canAdd = Math.min(ceiling - current, remaining);
      if (canAdd > 0) {
        allocation.set(page.url, current + canAdd);
        remaining -= canAdd;
      }
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
    concurrency:
      options.budget?.concurrency ?? BUDGET_PRESETS.standard.concurrency,
  };

  console.log(
    `[Crawler] ══ START: ${rootUrl} | maxPages=${budget.maxPages} maxTests=${budget.maxTests}`,
  );

  // ── Stage 0: Free URL seeding (no TinyFish credits) ───────────────────────
  const [sitemapUrls, staticHtmlLinks] = await Promise.all([
    fetchSitemapUrls(rootUrl, allowedHostname),
    fetchStaticHtmlLinks(rootUrl, allowedHostname),
  ]);

  const freeUrls = dedupeUrls(
    [normalizeUrl(rootUrl), ...sitemapUrls, ...staticHtmlLinks],
    allowedHostname,
    budget.maxPages * 3, // gather more than needed, will trim after discovery
  );

  console.log(
    `[Stage0] Free seed: ${freeUrls.length} URLs (sitemap:${sitemapUrls.length} html:${staticHtmlLinks.length})`,
  );

  // ── Stage 1: Discovery via TinyFish ──────────────────────────────────────
  // One call on the root URL — clicks nav items to find all SPA pages.
  // Falls back gracefully to Stage 0 free URLs if discovery fails.
  let discoveredUrls: string[] = [];

  if (abortSignal?.aborted) throw new Error("AbortError: crawl cancelled");

  console.log(`[Stage1] 🔍 Discovering pages via TinyFish: ${rootUrl}`);

  const discoveryResult = await withTimeout(
    runTinyFish(
      {
        url: rootUrl,
        goal: buildDiscoveryGoal(rootUrl, allowedHostname, budget.maxPages),
        browser_profile: "stealth", // stealth for nav clicking to avoid bot detection
      },
      ctx,
    ),
    TIMEOUTS.DISCOVERY_MS,
    {
      success: false,
      resultJson: null,
      rawText: null,
      error: "timeout",
      jobId: null,
    },
    `discovery(${rootUrl})`,
  );

  // Extract URLs from discovery result — try every possible shape TinyFish might return
  function extractUrlsFromDiscovery(result: TinyFishResult): string[] {
    const candidates: string[] = [];

    // Strategy 1: resultJson is present — try all known key names
    if (result.resultJson) {
      const raw = result.resultJson;
      const urlList = Array.isArray(raw)
        ? raw
        : Array.isArray(raw.urls)
          ? raw.urls
          : Array.isArray(raw.pages)
            ? raw.pages
            : Array.isArray(raw.links)
              ? raw.links
              : Array.isArray(raw.discovered)
                ? raw.discovered
                : Array.isArray(raw.results)
                  ? raw.results
                  : [];
      candidates.push(
        ...(urlList as unknown[]).filter(
          (u): u is string => typeof u === "string",
        ),
      );
    }

    // Strategy 2: rawText JSON parse
    if (result.rawText && candidates.length === 0) {
      const parsed = tryParseRawText(result.rawText);
      if (parsed) {
        const urlList = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.urls)
            ? parsed.urls
            : Array.isArray(parsed.pages)
              ? parsed.pages
              : Array.isArray(parsed.links)
                ? parsed.links
                : [];
        candidates.push(
          ...(urlList as unknown[]).filter(
            (u): u is string => typeof u === "string",
          ),
        );
      }
    }

    // Strategy 3: regex scan rawText for any URL matching allowedHostname
    // This is the last-resort fallback when TinyFish writes prose instead of JSON
    if (result.rawText && candidates.length === 0) {
      const urlRegex = new RegExp(
        `https?://${allowedHostname.replace(/\./g, "\\.")}[^\\s"'<>\\]},]*`,
        "gi",
      );
      const found = [...result.rawText.matchAll(urlRegex)].map((m) =>
        m[0].replace(/[.,;:!?)]+$/, ""),
      );
      candidates.push(...found);
      if (found.length > 0) {
        console.log(
          `[Stage1] Regex fallback extracted ${found.length} URLs from rawText`,
        );
      }
    }

    return candidates;
  }

  const rawDiscovered = extractUrlsFromDiscovery(discoveryResult);
  discoveredUrls = dedupeUrls(
    rawDiscovered,
    allowedHostname,
    budget.maxPages * 2,
  );

  if (discoveredUrls.length > 0) {
    console.log(`[Stage1] ✓ Discovery found ${discoveredUrls.length} pages`);
  } else {
    console.warn(
      `[Stage1] ⚠ Discovery returned 0 URLs. status=${discoveryResult.error ?? "ok"} rawText="${discoveryResult.rawText?.slice(0, 200)}"`,
    );
  }

  // Always ensure root URL is included
  const rootNorm = normalizeUrl(rootUrl);
  if (!discoveredUrls.includes(rootNorm)) discoveredUrls.unshift(rootNorm);

  // Merge with free URLs — discovery takes priority, free URLs fill gaps
  const allCandidateUrls = dedupeUrls(
    [...discoveredUrls, ...freeUrls],
    allowedHostname,
    budget.maxPages,
  );

  if (discoveredUrls.length <= 1) {
    console.warn(
      `[Stage1] Discovery found ≤1 URL — filling from free seed (total candidates: ${allCandidateUrls.length})`,
    );
  }

  console.log(
    `[Stage1] Final URL list (${allCandidateUrls.length}): ${allCandidateUrls.join(", ")}`,
  );

  // ── Stage 2: Parallel extraction ──────────────────────────────────────────
  // ALL pages extracted simultaneously — no BFS, no waiting on each other.
  if (abortSignal?.aborted) throw new Error("AbortError: crawl cancelled");

  console.log(
    `[Stage2] ⚡ Extracting ${allCandidateUrls.length} pages in parallel`,
  );

  const extractionResults = await Promise.allSettled(
    allCandidateUrls.map(async (pageUrl) => {
      for (let attempt = 0; attempt <= MAX_EXTRACTION_RETRIES; attempt++) {
        if (abortSignal?.aborted || ctx.creditsExhausted) break;
        if (attempt > 0) console.log(`[Stage2] Retry ${attempt}: ${pageUrl}`);

        const timeoutMs =
          TIMEOUTS.EXTRACTION_MS + attempt * TIMEOUTS.EXTRACTION_RETRY_MS;
        const result = await withTimeout(
          runTinyFish(
            {
              url: pageUrl,
              goal: buildExtractionGoal(pageUrl, allowedHostname),
              browser_profile: "lite",
            },
            ctx,
          ),
          timeoutMs,
          {
            success: false,
            resultJson: null,
            rawText: null,
            error: "timeout",
            jobId: null,
          },
          `extract(${pageUrl}) attempt=${attempt + 1}`,
        );

        const raw = result.resultJson ?? tryParseRawText(result.rawText);
        if (!raw) {
          console.warn(
            `[Stage2] ✗ attempt ${attempt + 1} ${pageUrl}: ${result.error ?? "no data"}`,
          );
          continue;
        }

        const extracted = extractPageData(pageUrl, raw, allowedHostname);
        console.log(
          `[Stage2] ✓ "${extracted.title}" ${pageUrl} | ` +
            `elements:${extracted.elements.length} forms:${extracted.forms.length} ` +
            `links:${extracted.internalLinks.length} complexity:${extracted.complexityScore.toFixed(1)}`,
        );
        return {
          ...extracted,
          screenshots: { url375: null, url768: null, url1440: null },
        } as CrawledPage;
      }
      return null; // extraction failed after retries
    }),
  );

  if (abortSignal?.aborted) throw new Error("AbortError: crawl cancelled");

  const pages: CrawledPage[] = extractionResults
    .filter(
      (r): r is PromiseFulfilledResult<CrawledPage | null> =>
        r.status === "fulfilled",
    )
    .map((r) => r.value)
    .filter((p): p is CrawledPage => p !== null);

  if (pages.length === 0) {
    console.warn(`[Stage2] All extractions failed — inserting empty root page`);
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

  console.log(
    `[Stage2] ══ DONE: ${pages.length}/${allCandidateUrls.length} pages extracted`,
  );

  // ── Stage 3: Test budget allocation ───────────────────────────────────────
  const testBudget = allocateTestBudget(pages, budget.maxTests);
  const allLinks = [...new Set(pages.flatMap((p) => p.internalLinks))];
  const crawlTimeMs = Date.now() - startTime;

  console.log(
    `[Crawler] ══ DONE: ${pages.length} pages | ${allLinks.length} links | ${(crawlTimeMs / 1000).toFixed(1)}s`,
  );

  // ── Stage 4: Background screenshots + perf ────────────────────────────────
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
      pages.map((page, i) =>
        (async () => {
          try {
            console.log(`[Stage4] ⚡ Perf: ${page.url}`);
            const pm = await measurePagePerformanceWithPuppeteer(page.url);
            performanceMetrics[i] = pm;
            console.log(
              `[Stage4] ✓ Perf ${page.url} LCP=${pm.lcpMs}ms TTFB=${pm.ttfbMs}ms`,
            );
          } catch (err) {
            console.warn(`[Stage4] Perf failed: ${page.url}:`, err);
          }
        })(),
      ),
    );
    console.log(`[Stage4] Background tasks complete`);
  })();

  // ── Site feature detection ─────────────────────────────────────────────────
  const allElements = pages.flatMap((p) => p.elements);

  const hasLogin = pages.some(
    (p) =>
      /login|signin|auth|oauth|sso/.test(p.url) ||
      p.elements.some((e) => {
        const t = e.text?.toLowerCase() ?? "";
        return (
          t.includes("sign in") ||
          t.includes("log in") ||
          t.includes("login") ||
          t.includes("continue with google") ||
          t.includes("continue with github")
        );
      }),
  );

  const hasSignup = pages.some(
    (p) =>
      /signup|register/.test(p.url) ||
      p.elements.some((e) => {
        const t = e.text?.toLowerCase() ?? "";
        return (
          t.includes("sign up") ||
          t.includes("register") ||
          t.includes("create account")
        );
      }),
  );

  const protectedRouteRE =
    /\/(dashboard|account|profile|settings|admin|portal|members?|private|secure|my-)/i;
  const hasProtectedRoutes = pages.some(
    (p) =>
      protectedRouteRE.test(p.url) ||
      p.internalLinks.some((l) => protectedRouteRE.test(l)),
  );

  const hasSearch = allElements.some(
    (e) =>
      (e.type === "input" &&
        (e.text?.toLowerCase().includes("search") ?? false)) ||
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

export async function crawlPage(
  url: string,
  allowedHostname: string,
): Promise<CrawledPage> {
  const ctx = makeCrawlContext();
  const empty: CrawledPage = {
    url,
    title: "",
    elements: [],
    internalLinks: [],
    externalLinks: [],
    forms: [],
    apiEndpoints: [],
    navStructure: { breadcrumbs: [], menus: [] },
    screenshots: { url375: null, url768: null, url1440: null },
    complexityScore: 0,
  };
  const result = await withTimeout(
    runTinyFish(
      {
        url,
        goal: buildExtractionGoal(url, allowedHostname),
        browser_profile: "lite",
      },
      ctx,
    ),
    TIMEOUTS.EXTRACTION_MS,
    {
      success: false,
      resultJson: null,
      rawText: null,
      error: "timeout",
      jobId: null,
    },
    `crawlPage(${url})`,
  );
  const raw = result.resultJson ?? tryParseRawText(result.rawText);
  if (!raw) return empty;
  return {
    ...extractPageData(url, raw, allowedHostname),
    screenshots: { url375: null, url768: null, url1440: null },
  };
}

// ─── Performance measurement ──────────────────────────────────────────────────

export async function measurePagePerformance(
  url: string,
): Promise<PagePerformanceMetrics> {
  try {
    return await measurePagePerformanceWithPuppeteer(url);
  } catch {
    return {
      pageUrl: url,
      lcpMs: null,
      fidMs: null,
      cls: null,
      ttfbMs: null,
      rawMetrics: {},
    };
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
    TIMEOUTS.EXECUTE_TEST_BASE_MS +
      attempt * TIMEOUTS.EXECUTE_TEST_RETRY_BONUS_MS,
    {
      success: false,
      resultJson: null,
      rawText: null,
      error: "timeout",
      jobId: null,
    },
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

// ─── Failure screenshot ───────────────────────────────────────────────────────

export async function runTinyFishScreenshot(
  url: string,
): Promise<string | null> {
  try {
    const { captureFullPageScreenshot } = await import("./puppeteer.service");
    return await captureFullPageScreenshot(url, 1440);
  } catch (err) {
    console.warn(`[Screenshot] Puppeteer capture failed for ${url}:`, err);
    return null;
  }
}
