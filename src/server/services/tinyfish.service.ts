// src/server/services/tinyfish.service.ts
//
// ═══════════════════════════════════════════════════════════════════════════
// CRAWLER ARCHITECTURE
// ═══════════════════════════════════════════════════════════════════════════
//
// Design principles:
//   1. No separate discovery stage. Discovery IS extraction. The root page is
//      extracted first; its links seed the BFS queue. Every subsequent page
//      does the same. No wasted TinyFish credits on a discovery-only call.
//
//   2. Hard budget caps enforced up front: maxPages and maxTests are first-class
//      parameters, not suggestions. The crawler stops the moment either cap is hit.
//
//   3. Test budget is allocated proportionally after crawl completes. Each page
//      gets at least 1 test; remaining budget is distributed by page complexity
//      (interactive element count). No page can starve another entirely.
//
//   4. Free seeding before any TinyFish call. robots.txt → sitemap → static HTML
//      parse runs in parallel with zero AI cost. On SSR sites this often gives
//      the full URL pool for free and the BFS queue starts pre-populated.
//
//   5. Per-crawl context object, not module globals. Concurrent crawl jobs cannot
//      poison each other via shared mutable state.
//
// Pipeline:
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ STAGE 0 │ Free URL seeding                                              │
// │         │ robots.txt → sitemap.xml → static HTML → parse <a> hrefs     │
// │         │ Zero TinyFish cost. Pre-populates BFS queue.                  │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ STAGE 1 │ BFS extraction (unified crawl + discovery)                    │
// │         │ N concurrent workers drain a shared queue.                    │
// │         │ Each extracted page's internalLinks are immediately enqueued. │
// │         │ Workers stop when pages.length === maxPages or queue empties. │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ STAGE 2 │ Test budget allocation                                        │
// │         │ Distribute maxTests across crawled pages.                     │
// │         │ Floor: 1 test/page. Ceiling: MAX_TESTS_PER_PAGE.              │
// │         │ Remaining budget goes to most complex pages first.            │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ STAGE 3 │ Background: screenshots + perf (non-blocking, awaitable)      │
// │         │ Returned as stage3Promise so caller can await before DB write.│
// └─────────────────────────────────────────────────────────────────────────┘

import { uploadPageScreenshots, urlToSlug } from "./s3.service";

const TINYFISH_API_URL = "https://agent.tinyfish.ai/v1/automation/run-sse";
const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY;

// ─── Budget & limits ──────────────────────────────────────────────────────────

export interface CrawlBudget {
  /** Max pages to crawl. Hard cap — crawler stops the moment this is reached. */
  maxPages: number;
  /** Max test cases to generate across all pages. Hard cap. */
  maxTests: number;
  /** Concurrency of BFS extraction workers. */
  concurrency: number;
}

export interface TestBudgetAllocation {
  /** URL → number of test cases to generate for this page */
  testsPerPage: Map<string, number>;
  totalTests: number;
}

/** Sensible defaults for different use cases. Callers may override any field. */
export const BUDGET_PRESETS = {
  free: { maxPages: 3, maxTests: 5, concurrency: 2 } satisfies CrawlBudget,
  standard: { maxPages: 5, maxTests: 10, concurrency: 3 } satisfies CrawlBudget,
  deep: { maxPages: 10, maxTests: 15, concurrency: 4 } satisfies CrawlBudget,
} as const;

// Hard ceilings — callers cannot exceed these regardless of budget preset.
const HARD_CAPS = {
  MAX_PAGES: 10,
  MAX_TESTS: 15,
  MAX_TESTS_PER_PAGE: 5, // prevents one huge page eating all budget
  MIN_TESTS_PER_PAGE: 1, // every successfully crawled page gets at least 1 test
} as const;

const TIMEOUTS = {
  // Extraction: 150s base. Retry gets +60s per attempt — slow/bot-protected
  // sites often succeed on a second attempt if given more headroom.
  EXTRACTION_BASE_MS: 150_000,
  EXTRACTION_RETRY_BONUS_MS: 60_000,
  // Navigation probe: just a click + URL capture, not full extraction
  NAV_PROBE_MS: 45_000,
  SCREENSHOT_MS: 90_000,
  PERF_MS: 75_000,
  // Test execution: 180s base. Retry gets +60s for cold-start/complex flows.
  EXECUTE_TEST_BASE_MS: 180_000,
  EXECUTE_TEST_RETRY_BONUS_MS: 60_000,
  SCREENSHOT_FAIL_MS: 90_000,
} as const;

export const MAX_EXTRACTION_RETRIES = 2;
export const MAX_TEST_RETRIES = 1;

// ─── Per-crawl context (not module-global) ────────────────────────────────────

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
  /**
   * Optional AbortSignal from the caller (e.g. testing.controller cancel handler).
   * When aborted, BFS workers stop before their next TinyFish call and the crawl
   * returns whatever pages have been collected so far — no further credits are spent.
   */
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
  /** Complexity score used for test budget allocation. Higher = more tests assigned. */
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
  | { type: "error"; message: string };

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

// Locale-prefixed paths: /en, /en-US, /fr-FR, /cm-en, /bh-ar, etc.
const LOCALE_PATH_RE = /^\/(?:[a-z]{2}(?:[_-][a-zA-Z]{2})?)(?:\/|$)/;

function isAllowedUrl(candidate: string, allowedHostname: string): boolean {
  // Reject un-decoded HTML entity artifacts from raw HTML parsing
  if (candidate.includes("&amp;")) return false;

  try {
    const p = new URL(candidate);

    if (p.hostname !== allowedHostname) return false;

    // Static assets
    if (
      /\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|tar|gz|mp4|mp3|wav|ico|woff|woff2|ttf|eot|css|js|map|xml)$/i.test(
        p.pathname,
      )
    )
      return false;

    // Pagination
    if (/[?&](page|offset|cursor|after|before|from|start|p)=\d/i.test(p.search))
      return false;
    if (/\/page\/\d+/i.test(p.pathname)) return false;

    // Destructive / session actions
    if (
      /\/(logout|signout|sign-out|log-out|delete|remove|destroy)/i.test(
        p.pathname,
      )
    )
      return false;

    // Per-content / action query params — these produce near-identical or
    // transient pages with no structural QA value (HN vote/hide/user/item URLs)
    if (/[?&](id|how|goto|site|whence|hmac|auth)=/i.test(p.search))
      return false;
    if (
      /\/(vote|hide|flag|reply|fave|upvote|downvote|react)\b/i.test(p.pathname)
    )
      return false;

    // Locale paths
    if (LOCALE_PATH_RE.test(p.pathname)) return false;

    return true;
  } catch {
    return false;
  }
}

// Cap structural duplicates: max N URLs sharing the same first-two-segment pattern.
// /products/shoes, /products/hats → same pattern "/products". Allows 2 by default.
// Prevents blog/e-commerce sites flooding the queue with hundreds of similar pages.
const DEFAULT_MAX_PER_PATTERN = 2;

function filterByPathPattern(
  urls: string[],
  maxPerPattern = DEFAULT_MAX_PER_PATTERN,
): string[] {
  const counts = new Map<string, number>();
  const result: string[] = [];
  for (const url of urls) {
    try {
      const segs = new URL(url).pathname.split("/").filter(Boolean);
      const key = segs.slice(0, 2).join("/") || "root";
      const n = counts.get(key) ?? 0;
      if (n < maxPerPattern) {
        counts.set(key, n + 1);
        result.push(url);
      }
    } catch {
      result.push(url);
    }
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

// Node 16-safe abort signal (AbortSignal.timeout added in Node 17.3)
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

    if (!response.body) {
      return {
        success: false,
        resultJson: null,
        rawText: null,
        error: "No body",
        jobId: null,
      };
    }

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

    // Stream ended without COMPLETE — attempt JSON recovery from rawText
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
  } catch {
    /* give up */
  }
  return null;
}

// ─── Stage 0: Free URL seeding ────────────────────────────────────────────────

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
      /* sitemap is always optional */
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

// ─── Prompt builders ──────────────────────────────────────────────────────────

// Single source of truth for hydration wait logic. Keeps all goal builders
// consistent — previously copy-pasted with subtle differences.
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
   elements with onClick handlers and NO href. This includes:
     - Top nav and sidebar menu items
     - Product cards, blog post cards, project tiles, team member cards
     - Any repeating grid or list of items where each item is a clickable container
   Standard link extraction misses ALL of these. You must click them to find the URLs.

   HOW TO FIND CANDIDATES:
   Look for any of the following patterns on the page:
     1. Elements inside <nav>, <header>, or elements with role="navigation" that
        have no href but appear to be links (cursor:pointer, or text that looks
        like a page name)
     2. Repeating groups of similar containers — e.g. a grid of <div> cards,
        a list of <li> items, a row of tiles — where each item has similar
        structure and appears clickable (cursor:pointer computed style, or
        onClick handler). These are almost always product/content collections.
        From each such group, click UP TO 3 items (first, middle, last) to
        sample the URL pattern — you do not need to click every item.
     3. Any other visible element with cursor:pointer that has no href and
        does not look like a form control or action button.

   FOR EACH CANDIDATE:
     1. Click it
     2. Wait up to 3 seconds for navigation to settle (URL change in address bar)
     3. If window.location.href changed AND hostname is still "${allowedHostname}":
          record the new absolute URL
        If URL did NOT change (modal opened, page scrolled, nothing happened):
          note it as non-navigating and skip
     4. Press browser Back, wait for the original page to finish loading before
        clicking the next candidate
     5. Stop after collecting 20 URLs this way or clicking 30 candidates total.

   Skip any click that: navigates off-domain, triggers a file download, or
   causes an irreversible action (add to cart, delete, submit form).

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


function buildScreenshotGoal(url: string): string {
  return `Navigate to: ${url}

${WAIT_PREAMBLE}

Take full-page screenshots at these viewport widths: 375px (mobile), 768px (tablet), 1440px (desktop).

Return ONLY this JSON. No markdown. Start with { end with }.
{
  "screenshots": {
    "viewport375": "<base64 PNG or null>",
    "viewport768": "<base64 PNG or null>",
    "viewport1440": "<base64 PNG or null>"
  }
}`;
}

function buildPerformanceGoal(url: string): string {
  return `Navigate to: ${url}

${WAIT_PREAMBLE}

Collect Core Web Vitals using the Performance API:
- LCP ms: last "largest-contentful-paint" PerformanceObserver entry, .startTime
- FID ms: first "first-input" entry, processingStart - startTime (0 if no interaction)
- CLS: sum all LayoutShift entries where hadRecentInput is false
- TTFB ms: PerformanceNavigationTiming responseStart - requestStart

Return ONLY this JSON. No markdown. Start with { end with }.
{"pageUrl":"${url}","lcpMs":null,"fidMs":null,"cls":null,"ttfbMs":null,"rawMetrics":{}}`;
}

// ─── Page data extraction ─────────────────────────────────────────────────────

/**
 * Complexity score for test budget allocation.
 *
 * Scoring rationale:
 *   Forms (+2 each)       — richest test surface: inputs, validation, submission
 *   Interactive els (+1)  — buttons/inputs/click-handlers worth testing
 *   Internal links (+0.5) — navigation coverage, lower priority
 *   Has API calls (+3)    — integration-level tests are high value
 */
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
    // isAllowedUrl is the authoritative filter — don't trust the agent's judgment
    // on what counts as "internal". Re-validate every URL here regardless of which
    // field it came from.
    if (!isAllowedUrl(normalized, allowedHostname) || seen.has(normalized))
      return;
    seen.add(normalized);
    internalLinks.push(normalized);
  };

  // Collect from both internalLinks array AND element hrefs.
  // The agent is asked to populate both; merging here ensures we capture links
  // the agent may have placed in one field but not the other.
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

// ─── Stage 2: Test budget allocation ─────────────────────────────────────────

/**
 * Distribute maxTests across crawled pages.
 *
 * Algorithm:
 *   1. Every page gets the floor (MIN_TESTS_PER_PAGE = 1).
 *   2. remaining = maxTests - pages.length (budget after flooring everyone)
 *   3. Pages ranked by complexityScore descending claim additional tests
 *      up to MAX_TESTS_PER_PAGE until remaining is exhausted.
 *
 * This guarantees: every page gets ≥1, complex pages get proportionally more,
 * no single page can monopolise the budget.
 */
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
    concurrency:
      options.budget?.concurrency ?? BUDGET_PRESETS.standard.concurrency,
  };

  console.log(
    `[Crawler] ══ START: ${rootUrl} | ` +
      `maxPages=${budget.maxPages} maxTests=${budget.maxTests} concurrency=${budget.concurrency}`,
  );

  // ── Stage 0: Free seeding ──────────────────────────────────────────────────
  const [sitemapUrls, staticHtmlLinks] = await Promise.all([
    fetchSitemapUrls(rootUrl, allowedHostname),
    fetchStaticHtmlLinks(rootUrl, allowedHostname),
  ]);

  const rootNorm = normalizeUrl(rootUrl);
  const visited = new Set<string>([rootNorm]);

  // Root goes first in queue; seeded URLs fill the rest (pattern-filtered)
  const queue: string[] = [rootNorm];
  const seedLinks = filterByPathPattern([
    ...new Set(
      [...sitemapUrls, ...staticHtmlLinks]
        .map(normalizeUrl)
        .filter((u) => !visited.has(u) && isAllowedUrl(u, allowedHostname)),
    ),
  ]);
  for (const u of seedLinks) {
    visited.add(u);
    queue.push(u);
  }

  console.log(
    `[Stage0] Queue seeded with ${queue.length} URLs (sitemap:${sitemapUrls.length} html:${staticHtmlLinks.length})`,
  );

  // ── Stage 1: BFS extraction ────────────────────────────────────────────────
  //
  // N workers share queue/visited/pages via closure.
  // Single-threaded JS means queue.shift() and pages.push() are atomic between
  // awaits — no locking needed.
  //
  // As each page is extracted, its internalLinks are enqueued immediately.
  // This gives genuine multi-hop depth: root → /about → /about/team, etc.
  // The page cap and path-pattern filter prevent link explosions.
  //
  // Dedup guarantee: visited.add() is called synchronously before the first await
  // in the enqueue block, so two concurrent workers cannot both enqueue the same URL.
  // queue.shift() is also synchronous — a URL can only be dequeued by one worker.

  const pages: CrawledPage[] = [];

  async function extractionWorker(): Promise<void> {
    while (true) {
      // ── Cancellation check ─────────────────────────────────────────────
      // Checked at the top of every iteration — BEFORE dequeuing the next URL
      // and BEFORE any TinyFish call. This ensures that the moment
      // cancelTestRunHandler aborts the signal, no further credits are spent.
      if (abortSignal?.aborted) {
        console.log(`[Stage1] Worker stopped — abort signal received`);
        break;
      }

      if (pages.length >= budget.maxPages || ctx.creditsExhausted) break;

      const pageUrl = queue.shift();
      if (!pageUrl) break;

      let extracted: Omit<CrawledPage, "screenshots"> | null = null;

      for (let attempt = 0; attempt <= MAX_EXTRACTION_RETRIES; attempt++) {
        // Check abort again before each retry attempt
        if (abortSignal?.aborted || ctx.creditsExhausted) break;

        if (attempt > 0) console.log(`[Stage1] Retry ${attempt}: ${pageUrl}`);

        const extractTimeoutMs =
          TIMEOUTS.EXTRACTION_BASE_MS + attempt * TIMEOUTS.EXTRACTION_RETRY_BONUS_MS;
        const result = await withTimeout(
          runTinyFish(
            {
              url: pageUrl,
              goal: buildExtractionGoal(pageUrl, allowedHostname),
              browser_profile: "stealth",
            },
            ctx,
          ),
          extractTimeoutMs,
          {
            success: false,
            resultJson: null,
            rawText: null,
            error: "timeout",
            jobId: null,
          },
          `extract(${pageUrl}) attempt=${attempt + 1} timeout=${extractTimeoutMs / 1000}s`,
        );

        // Don't process result if we were aborted while waiting
        if (abortSignal?.aborted) break;

        const raw = result.resultJson ?? tryParseRawText(result.rawText);
        if (!raw) {
          console.warn(
            `[Stage1] ✗ attempt ${attempt + 1} ${pageUrl}: ${result.error ?? "no data"}`,
          );
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

      pages.push({
        ...extracted,
        screenshots: { url375: null, url768: null, url1440: null },
      });

      // Enqueue newly discovered links immediately — multi-hop BFS depth.
      // visited.add() happens synchronously inside the filter predicate (no await
      // between check and mutation) so concurrent workers see consistent state.
      if (pages.length < budget.maxPages) {
        const newLinks = filterByPathPattern(
          extracted.internalLinks.filter((u) => {
            if (visited.has(u)) return false;
            // Mark as visited immediately — before any await — so a concurrent
            // worker processing a different page cannot also enqueue this URL.
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
          console.log(
            `[Stage1] +${enqueued} URLs enqueued from ${pageUrl} | queue: ${queue.length}`,
          );
        }
      }
    }
  }

  await Promise.all(
    Array.from({ length: budget.concurrency }, extractionWorker),
  );

  // If we were aborted, throw so the caller (runPipeline) handles it as cancellation
  if (abortSignal?.aborted) {
    throw new Error("AbortError: crawl cancelled");
  }

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

  // ── Stage 3: Background screenshots + perf ────────────────────────────────
  // Returned as an awaitable Promise. Caller can await it before writing to DB
  // to ensure screenshot URLs are populated, or ignore it for fire-and-forget.
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
        (async () => {
          if (!testRunId || ctx.creditsExhausted) return;
          const result = await withTimeout(
            runTinyFish(
              {
                url: page.url,
                goal: buildScreenshotGoal(page.url),
                browser_profile: "lite",
              },
              ctx,
            ),
            TIMEOUTS.SCREENSHOT_MS,
            {
              success: false,
              resultJson: null,
              rawText: null,
              error: "timeout",
              jobId: null,
            },
            `screenshot(${page.url})`,
          );
          const data = result.resultJson ?? tryParseRawText(result.rawText);
          if (!data) return;
          const ss = (
            data as {
              screenshots?: {
                viewport375?: string | null;
                viewport768?: string | null;
                viewport1440?: string | null;
              };
            }
          ).screenshots;
          if (!ss) return;
          const uploaded = await uploadPageScreenshots({
            screenshots: {
              viewport375: ss.viewport375 ?? null,
              viewport768: ss.viewport768 ?? null,
              viewport1440: ss.viewport1440 ?? null,
            },
            testRunId,
            pageSlug: urlToSlug(page.url),
          });
          pages[i]!.screenshots = uploaded;
          console.log(`[Stage3] 📸 ${page.url}`);
        })(),
        (async () => {
          if (ctx.creditsExhausted) return;
          const result = await withTimeout(
            runTinyFish(
              {
                url: page.url,
                goal: buildPerformanceGoal(page.url),
                browser_profile: "lite",
              },
              ctx,
            ),
            TIMEOUTS.PERF_MS,
            {
              success: false,
              resultJson: null,
              rawText: null,
              error: "timeout",
              jobId: null,
            },
            `perf(${page.url})`,
          );
          const data = result.resultJson ?? tryParseRawText(result.rawText);
          if (!data) return;
          const pm = data as {
            lcpMs?: number | null;
            fidMs?: number | null;
            cls?: number | null;
            ttfbMs?: number | null;
          };
          performanceMetrics[i] = {
            pageUrl: page.url,
            lcpMs: typeof pm.lcpMs === "number" ? pm.lcpMs : null,
            fidMs: typeof pm.fidMs === "number" ? pm.fidMs : null,
            cls: typeof pm.cls === "number" ? pm.cls : null,
            ttfbMs: typeof pm.ttfbMs === "number" ? pm.ttfbMs : null,
            rawMetrics: {},
          };
          console.log(
            `[Stage3] ⚡ ${page.url} LCP=${performanceMetrics[i]!.lcpMs}ms`,
          );
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
          t.includes("sign in") ||
          t.includes("log in") ||
          t.includes("login") ||
          t.includes("continue with google") ||
          t.includes("sign in with google") ||
          t.includes("continue with github") ||
          t.includes("login with")
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
        browser_profile: "stealth",
      },
      ctx,
    ),
    TIMEOUTS.EXTRACTION_BASE_MS,
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
  const ctx = makeCrawlContext();
  const fallback: PagePerformanceMetrics = {
    pageUrl: url,
    lcpMs: null,
    fidMs: null,
    cls: null,
    ttfbMs: null,
    rawMetrics: {},
  };
  const result = await withTimeout(
    runTinyFish(
      { url, goal: buildPerformanceGoal(url), browser_profile: "lite" },
      ctx,
    ),
    TIMEOUTS.PERF_MS,
    {
      success: false,
      resultJson: null,
      rawText: null,
      error: "timeout",
      jobId: null,
    },
    `perf(${url})`,
  );
  const data = result.resultJson ?? tryParseRawText(result.rawText);
  if (!data) return fallback;
  const pm = data as {
    lcpMs?: number | null;
    fidMs?: number | null;
    cls?: number | null;
    ttfbMs?: number | null;
  };
  return {
    pageUrl: url,
    lcpMs: typeof pm.lcpMs === "number" ? pm.lcpMs : null,
    fidMs: typeof pm.fidMs === "number" ? pm.fidMs : null,
    cls: typeof pm.cls === "number" ? pm.cls : null,
    ttfbMs: typeof pm.ttfbMs === "number" ? pm.ttfbMs : null,
    rawMetrics: {},
  };
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
  const ctx = makeCrawlContext();
  const result = await withTimeout(
    runTinyFish(
      {
        url,
        goal: `Navigate to: ${url}\nWait for full load including JS hydration.\nTake a full-page screenshot at 1440px viewport.\nReturn ONLY: {"screenshot":"<base64 PNG or null>"}`,
        browser_profile: "lite",
      },
      ctx,
    ),
    TIMEOUTS.SCREENSHOT_FAIL_MS,
    {
      success: false,
      resultJson: null,
      rawText: null,
      error: "timeout",
      jobId: null,
    },
    `failureScreenshot(${url})`,
  );
  const raw = result.resultJson ?? tryParseRawText(result.rawText);
  if (!raw) return null;
  return (raw as { screenshot?: string | null }).screenshot ?? null;
}