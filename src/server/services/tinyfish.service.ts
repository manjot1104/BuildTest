// src/server/services/tinyfish.service.ts
//
// ═══════════════════════════════════════════════════════════════════════════
// CRAWLER ARCHITECTURE  —  Why the old approach failed
// ═══════════════════════════════════════════════════════════════════════════
//
// Old approach (broken):
//   1 TinyFish call asking it to: extract elements + intercept API + navigate
//   every nav link one by one + take 3 screenshots — all in a single goal.
//   On an SPA this ALWAYS timed out because:
//     a) JS hydration wasn't awaited properly
//     b) "navigate each link one by one" = 15+ browser round trips in 1 call
//     c) Too many goals = TinyFish returns partial JSON or nothing
//
// New approach (this file):
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ STAGE 0 │ Free URL seeding (no TinyFish credit)                        │
// │         │ robots.txt → sitemap.xml → static HTML fetch → parse <a>     │
// │         │ Gets 80% of links on SSR sites for free before any AI call    │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ STAGE 1 │ TinyFish: SPA route discovery (1 call, focused goal)         │
// │         │ Single job: navigate root, wait for hydration, extract all    │
// │         │ href values from the DOM after JS renders. That's ALL it does.│
// │         │ We DO NOT ask it to click through links — too slow.           │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ STAGE 2 │ Parallel page extraction (batched, max 3 concurrent)         │
// │         │ Per page: elements + forms + links + API interception.        │
// │         │ No screenshots. Focused goal = fast, rarely times out.        │
// │         │ Batching prevents rate-limit hammer.                          │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ STAGE 3 │ Background: screenshots + performance (non-blocking void)     │
// │         │ Fire after returning. Pipeline starts test generation         │
// │         │ immediately with the rich extraction data from Stage 2.       │
// └─────────────────────────────────────────────────────────────────────────┘

import { uploadPageScreenshots, urlToSlug } from "./s3.service";

const TINYFISH_API_URL = "https://agent.tinyfish.ai/v1/automation/run-sse";
const TINYFISH_API_KEY  = process.env.TINYFISH_API_KEY;

export type SiteSize = "small" | "medium" | "large";

export interface SiteProfile {
  size: SiteSize;
  maxPages: number;
  concurrency: number;
  targetTestsPerPage: number;
  minTests: number;
}

const SIZE_THRESHOLDS = { MEDIUM_MIN_URLS: 11, LARGE_MIN_URLS: 51 } as const;

export function detectSiteSize(seededUrlCount: number): SiteProfile {
  if (seededUrlCount >= SIZE_THRESHOLDS.LARGE_MIN_URLS) {
    return { size: "large",  maxPages: 50, concurrency: 5, targetTestsPerPage: 12, minTests: 500 };
  }
  if (seededUrlCount >= SIZE_THRESHOLDS.MEDIUM_MIN_URLS) {
    return { size: "medium", maxPages: 25, concurrency: 4, targetTestsPerPage: 10, minTests: 100 };
  }
  return { size: "small",  maxPages: 10, concurrency: 3, targetTestsPerPage: 15, minTests: 30  };
}

const LIMITS = {
  MAX_PAGES_HARD_CAP:      50,
  MAX_PAGES_FREE:           2,
  DISCOVERY_TIMEOUT_MS:    120_000,  // I-04: Netlify cold-start + React hydration = 70-80s; 75s had zero margin
  EXTRACTION_TIMEOUT_MS:   120_000,  // I-05: Bot-protected/geo-redirect sites need 80-100s to load
  SCREENSHOT_TIMEOUT_MS:   60_000,
  PERF_TIMEOUT_MS:         55_000,
  EXECUTE_TEST_TIMEOUT_MS: 120_000,  // I-02: 100% of test executions timed out at 80s on cold-start hosts
  SCREENSHOT_CAPTURE_MS:   60_000,   // I-08: Failure screenshots always timed out; slow hosts are slow by definition
} as const;

export const MAX_TEST_RETRIES = 2;

export interface CrawlOptions {
  maxPages?: number;
  allowedDomain?: string;
  testRunId?: string;
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
  elements: { type: string; text: string; href?: string; selector?: string; isVisible: boolean }[];
  internalLinks: string[];
  externalLinks: string[];
  forms: {
    action?: string;
    method?: string;
    fields: { name: string; type: string; required: boolean; pattern?: string }[];
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
  | { type: "status";      status: string; percent: number }
  | { type: "test_update"; testResultId: string; testCaseId: string; title: string; status: "pending" | "running" | "passed" | "failed" | "flaky" | "skipped"; durationMs?: number }
  | { type: "counter";     passed: number; failed: number; running: number; skipped: number; total: number }
  | { type: "bug_found";   bug: { id: string; title: string; severity: string; category: string; pageUrl: string; screenshotUrl: string | null } }
  | { type: "complete";    overallScore: number; passed: number; failed: number; skipped: number; total: number; aiSummary: string; shareableSlug: string | null }
  | { type: "error";       message: string };

export class TinyFishCreditsExhaustedError extends Error {
  constructor() {
    super("TinyFish credits exhausted. Top up at https://tinyfish.ai/dashboard");
    this.name = "TinyFishCreditsExhaustedError";
  }
}

let creditsExhausted = false;

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

function dedupeUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.pathname !== "/") u.pathname = u.pathname.replace(/\/$/, "");
    return u.href;
  } catch { return url; }
}

// I-05: Extended to match 2-segment country-locale paths (e.g. /cm-en, /bh-ar, /ch-fr, /id-en)
// that caused all 4 metroopinion.com extraction calls to timeout.
const LOCALE_PATH_RE = /^\/(?:[a-z]{2}(?:[_-][a-zA-Z]{2})?|ar|he|fa|zh|ko|ja|th|vi|hi|ur)(?:\/|$)/;

function isAllowedUrl(candidate: string, allowedHostname: string): boolean {
  try {
    const p = new URL(candidate);
    if (p.hostname !== allowedHostname) return false;
    if (/\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|tar|gz|mp4|mp3|wav|ico|woff|woff2|ttf|eot|css|js|map|xml)$/i
        .test(p.pathname)) return false;
    if (/[?&](page|offset|cursor|after|before|from|start|p)=\d/i.test(p.search)) return false;
    if (/\/page\/\d+/i.test(p.pathname)) return false;
    if (/\/(logout|signout|sign-out|log-out|delete|remove|destroy)/i.test(p.pathname)) return false;
    if (LOCALE_PATH_RE.test(p.pathname)) return false;
    return true;
  } catch { return false; }
}

const MAX_PER_PATTERN = 3;

function dedupeUrlPool(urls: string[]): string[] {
  const patternCount = new Map<string, number>();
  const result: string[] = [];
  for (const url of urls) {
    try {
      const p = new URL(url);
      const segments = p.pathname.split("/").filter(Boolean);
      const pattern  = segments.slice(0, 2).join("/") || "root";
      const count    = patternCount.get(pattern) ?? 0;
      if (count < MAX_PER_PATTERN) {
        patternCount.set(pattern, count + 1);
        result.push(url);
      }
    } catch {
      result.push(url);
    }
  }
  return result;
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T, label = "op"): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeoutP = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`[TinyFish] Timeout ${ms}ms: ${label}`);
      resolve(fallback);
    }, ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(timer)), timeoutP]);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i]!, i);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

async function runTinyFish(request: TinyFishRequest): Promise<TinyFishResult> {
  if (!TINYFISH_API_KEY) throw new Error("TINYFISH_API_KEY is not set");
  console.log(`[TinyFish] → ${request.url}`);

  let rawText = "";
  let jobId: string | null = null;

  try {
    const response = await fetch(TINYFISH_API_URL, {
      method: "POST",
      headers: {
        "X-API-Key":    TINYFISH_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    console.log(`[TinyFish] ← HTTP ${response.status} ${request.url}`);

    if (!response.ok) {
      const err = await response.text();
      if (response.status === 403 && err.includes("Insufficient credits")) {
        creditsExhausted = true;
        throw new TinyFishCreditsExhaustedError();
      }
      return { success: false, resultJson: null, rawText: null, error: `HTTP ${response.status}: ${err}`, jobId: null };
    }

    if (!response.body) {
      return { success: false, resultJson: null, rawText: null, error: "No body", jobId: null };
    }

    const reader  = response.body.getReader();
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
            console.log(`[TinyFish] ✓ ${jobId} → ${event.status} (${eventCount} events)`);
            if (event.status === "COMPLETED") {
              return {
                success:    true,
                resultJson: event.resultJson ?? null,
                rawText:    rawText || null,
                error:      null,
                jobId,
              };
            }
            return {
              success:    false,
              resultJson: null,
              rawText:    rawText || null,
              error:      event.error ?? `Completed with status: ${event.status}`,
              jobId,
            };
          }
        } catch { /* skip malformed event */ }
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
      success:    false,
      resultJson: null,
      rawText:    rawText || null,
      error:      "Stream ended without COMPLETE event",
      jobId,
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
    const cleaned = raw
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();

    try { return JSON.parse(cleaned) as Record<string, unknown>; } catch { /* continue */ }

    const start = cleaned.indexOf("{");
    const end   = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try { return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>; } catch { /* continue */ }
    }
  } catch { /* give up */ }
  return null;
}

async function fetchSitemapUrls(rootUrl: string, allowedHostname: string): Promise<string[]> {
  const candidates = [
    `${rootUrl.replace(/\/$/, "")}/sitemap.xml`,
    `${rootUrl.replace(/\/$/, "")}/sitemap_index.xml`,
    `${rootUrl.replace(/\/$/, "")}/robots.txt`,
  ];

  for (const candidateUrl of candidates) {
    try {
      const res = await fetch(candidateUrl, {
        headers: { "User-Agent": "Buildify/1.0 (automated testing)" },
        signal:  AbortSignal.timeout(8_000),
      });
      if (!res.ok) continue;

      const text = await res.text();

      if (candidateUrl.endsWith("robots.txt")) {
        const sitemapUrls = [...text.matchAll(/^Sitemap:\s*(.+)$/gim)]
          .map((m) => m[1]!.trim());
        for (const sitemapUrl of sitemapUrls) {
          const locs = await fetchSitemapUrls(sitemapUrl, allowedHostname);
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
    } catch { /* silent — sitemap is always optional */ }
  }
  return [];
}

async function fetchStaticHtmlLinks(rootUrl: string, allowedHostname: string): Promise<string[]> {
  try {
    const res = await fetch(rootUrl, {
      headers: {
        "User-Agent": "Buildify/1.0 (automated testing)",
        "Accept":     "text/html",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];

    const html = await res.text();

    const links = [...html.matchAll(/href=["']([^"']+)["']/gi)]
      .map((m) => m[1]!)
      .map((href) => resolveAbsolute(href, rootUrl))
      .filter((u): u is string => u !== null)
      .filter((u) => isAllowedUrl(u, allowedHostname))
      .map(dedupeUrl);

    const unique = [...new Set(links)];
    if (unique.length > 0) {
      console.log(`[Stage0] Static HTML: ${unique.length} links`);
    }
    return unique;
  } catch {
    return [];
  }
}

function buildDiscoveryGoal(url: string, allowedHostname: string): string {
  return `Navigate to this URL: ${url}

WAIT FOR FULL RENDER:
1. Wait for the page to load completely (network idle).
2. If you see <div id="root">, <div id="app">, __NEXT_DATA__, window.React, or window.__nuxt — this is a JavaScript-rendered app. Wait an ADDITIONAL 4 seconds for the client-side JavaScript to finish rendering.
3. Wait for any loading spinners or skeleton screens to fully disappear.
4. Do NOT interact with any login modals or cookie banners — just dismiss or ignore them.

EXTRACT ALL HREF VALUES:
After the page has fully rendered, find EVERY <a> element on the page (including those rendered by React Router, Vue Router, Next.js Link, etc — they all produce <a> tags in the final DOM).

For each <a> element, record:
- text: the trimmed innerText of the element
- href: the raw href attribute value

Only include links where the href resolves to the same domain: ${allowedHostname}
Convert relative hrefs to absolute: "/about" becomes "https://${allowedHostname}/about"

Look in ALL of these areas:
- Navigation bars (top nav, side nav, mobile nav)
- Header and footer
- Dropdown menus (expand them if needed)
- Sidebar menus
- Tab bars
- Any cards or tiles with navigation links

IMPORTANT: This is a READ-ONLY operation. Do NOT click any links. Do NOT navigate away from ${url}. Just read the DOM after hydration.

Return ONLY valid JSON. No markdown. No explanation. Start with { end with }.
{
  "pageTitle": "string",
  "siteType": "spa" | "ssr" | "static",
  "links": [
    {"text": "About", "resolvedUrl": "https://${allowedHostname}/about"},
    {"text": "Contact", "resolvedUrl": "https://${allowedHostname}/contact"},
    {"text": "Alphabets", "resolvedUrl": "https://${allowedHostname}/alphabets"}
  ]
}`;
}

function buildExtractionGoal(url: string, allowedHostname: string): string {
  return `Navigate to this URL: ${url}

WAIT FOR FULL RENDER:
1. Wait for network idle.
2. If this is a JavaScript app (React, Vue, Next.js, Vite — check for <div id="root">, <div id="app">, or __NEXT_DATA__), wait an EXTRA 3 seconds after network idle for JS rendering.
3. Wait for spinners and skeleton screens to disappear.

INTERCEPT NETWORK REQUESTS (during page load only):
Record fetch/XHR requests where the URL contains /api/, /v1/, /v2/, /graphql, or the Content-Type is application/json.
Record: url, method (GET/POST/etc), status (HTTP code), responseType, durationMs.
Cap at 15 requests.

EXTRACT THE FOLLOWING DATA:

1. PAGE TITLE: value of document.title

2. INTERACTIVE ELEMENTS — record type, text (or placeholder/aria-label if no text), isVisible:
   - All <a> tags → type: "link", include href attribute
   - All <button> tags → type: "button"
   - All <input> tags → type: "input", use placeholder or aria-label as text
   - All <select> tags → type: "select"
   - All <textarea> tags → type: "textarea"

3. FORMS — for each <form> element:
   - action: the action attribute (or null)
   - method: "get" or "post" (default "get" if not specified)
   - fields: array of { name, type, required, pattern } for each input/select/textarea inside the form

4. INTERNAL LINKS — array of absolute URLs on domain ${allowedHostname} only.
   Convert relative paths to absolute. Deduplicate. Max 30 links.

5. NAVIGATION STRUCTURE:
   - breadcrumbs: array of breadcrumb text strings in left-to-right order
   - menus: array of { label: "top-nav" | "sidebar" | "footer", items: [{text, href}] }

Return ONLY valid JSON. No markdown. Start with { end with }.
{
  "title": "string",
  "elements": [
    {"type": "link",     "text": "About",    "href": "/about",            "isVisible": true},
    {"type": "button",   "text": "Submit",                                 "isVisible": true},
    {"type": "input",    "text": "Search",                                 "isVisible": true},
    {"type": "link",     "text": "Alphabets","href": "/alphabets",         "isVisible": true}
  ],
  "internalLinks": [
    "https://${allowedHostname}/about",
    "https://${allowedHostname}/alphabets",
    "https://${allowedHostname}/contact"
  ],
  "forms": [
    {
      "action": "/search",
      "method": "get",
      "fields": [
        {"name": "q", "type": "text", "required": false, "pattern": null}
      ]
    }
  ],
  "apiEndpoints": [
    {"url": "https://api.example.com/v1/data", "method": "GET", "status": 200, "responseType": "json", "durationMs": 120}
  ],
  "navStructure": {
    "breadcrumbs": ["Home", "Products"],
    "menus": [
      {"label": "top-nav", "items": [{"text": "About", "href": "/about"}, {"text": "Alphabets", "href": "/alphabets"}]}
    ]
  }
}`;
}

function buildScreenshotGoal(url: string): string {
  return `Navigate to: ${url}

Wait for the page to fully load including JavaScript rendering. Wait for loading spinners to disappear.

Take a full-page screenshot at each of these viewport widths:
- 375px wide (mobile)
- 768px wide (tablet)  
- 1440px wide (desktop)

Return ONLY this JSON. No markdown. Start with { end with }.
{
  "screenshots": {
    "viewport375": "<base64-encoded PNG string, or null if failed>",
    "viewport768": "<base64-encoded PNG string, or null if failed>",
    "viewport1440": "<base64-encoded PNG string, or null if failed>"
  }
}`;
}

function buildPerformanceGoal(url: string): string {
  return `Navigate to: ${url}

Wait for the page to fully load (network idle).

Collect Core Web Vitals using the browser Performance API:
- LCP in milliseconds: get the last "largest-contentful-paint" PerformanceObserver entry, use .startTime
- FID in milliseconds: get the first "first-input" entry, calculate processingStart minus startTime (return 0 if no interaction)
- CLS score: sum all LayoutShift entries where hadRecentInput is false
- TTFB in milliseconds: from PerformanceNavigationTiming, calculate responseStart minus requestStart

Return ONLY this JSON. No markdown. Start with { end with }.
{"pageUrl":"${url}","lcpMs":<number or null>,"fidMs":<number or null>,"cls":<number or null>,"ttfbMs":<number or null>,"rawMetrics":{}}`;
}

function extractPage(
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
    const resolved = resolveAbsolute(raw, url);
    if (!resolved) return;
    const deduped = dedupeUrl(resolved);
    if (!isAllowedUrl(deduped, allowedHostname) || seen.has(deduped)) return;
    seen.add(deduped);
    internalLinks.push(deduped);
  };

  for (const raw of (d.internalLinks ?? [])) addLink(raw);

  for (const el of (d.elements ?? [])) {
    if (el.type === "link" && el.href) addLink(el.href);
  }

  const apiEndpoints: ApiEndpoint[] = ((d.apiEndpoints ?? []) as unknown[])
    .filter((e): e is { url: string; method?: string; status?: number; responseType?: string; durationMs?: number } =>
      typeof e === "object" && e !== null && typeof (e as { url?: unknown }).url === "string"
    )
    .map((e) => ({
      url:          e.url,
      method:       e.method ?? "GET",
      status:       typeof e.status === "number" ? e.status : null,
      responseType: e.responseType ?? null,
      durationMs:   typeof e.durationMs === "number" ? e.durationMs : null,
    }))
    .slice(0, 15);

  return {
    url,
    title:         typeof d.title === "string" ? d.title : "",
    elements:      d.elements ?? [],
    internalLinks,
    externalLinks: [],
    forms:         d.forms ?? [],
    apiEndpoints,
    navStructure: {
      breadcrumbs: d.navStructure?.breadcrumbs ?? [],
      menus:       d.navStructure?.menus ?? [],
    },
  };
}

export async function crawlSite(
  rootUrl: string,
  options: CrawlOptions = {},
): Promise<{
  pages: CrawledPage[];
  allLinks: string[];
  crawlTimeMs: number;
  performanceMetrics: PagePerformanceMetrics[];
  hasLogin: boolean;
  hasSignup: boolean;
  hasSearch: boolean;
  hasProtectedRoutes: boolean;
  siteProfile: SiteProfile;
}> {
  const startTime       = Date.now();
  const allowedHostname = options.allowedDomain ?? extractHostname(rootUrl);
  const testRunId       = options.testRunId;

  creditsExhausted = false;

  console.log(`[Crawler] ══ START: ${rootUrl}`);

  const [sitemapUrls, staticHtmlLinks] = await Promise.all([
    fetchSitemapUrls(rootUrl, allowedHostname),
    fetchStaticHtmlLinks(rootUrl, allowedHostname),
  ]);

  const seedUrls = new Set<string>([
    dedupeUrl(rootUrl),
    ...sitemapUrls.map(dedupeUrl),
    ...staticHtmlLinks.map(dedupeUrl),
  ]);

  const profile  = detectSiteSize(seedUrls.size);
  const maxPages = options.maxPages
    ? Math.min(options.maxPages, LIMITS.MAX_PAGES_HARD_CAP)
    : Math.min(profile.maxPages, LIMITS.MAX_PAGES_HARD_CAP);

  console.log(
    `[Stage0] size=${profile.size} | seeded=${seedUrls.size} URLs ` +
    `(sitemap:${sitemapUrls.length} html:${staticHtmlLinks.length}) | ` +
    `maxPages=${maxPages} concurrency=${profile.concurrency} minTests=${profile.minTests}`,
  );

  console.log(`[Stage1] SPA discovery on root page...`);

  const discoveryResult = await withTimeout(
    runTinyFish({
      url:             rootUrl,
      goal:            buildDiscoveryGoal(rootUrl, allowedHostname),
      browser_profile: "stealth",
    }),
    LIMITS.DISCOVERY_TIMEOUT_MS,
    { success: false, resultJson: null, rawText: null, error: "timeout", jobId: null },
    `discovery(${rootUrl})`,
  );

  const discoveryData = discoveryResult.resultJson ?? tryParseRawText(discoveryResult.rawText);

  if (discoveryData) {
    const d = discoveryData as {
      pageTitle?: string;
      siteType?: string;
      links?: { text: string; resolvedUrl: string }[];
    };

    const newLinks = (d.links ?? [])
      .map((l) => l.resolvedUrl)
      .filter((u) => typeof u === "string" && isAllowedUrl(u, allowedHostname))
      .map(dedupeUrl);

    for (const u of newLinks) seedUrls.add(u);

    console.log(
      `[Stage1] type=${d.siteType ?? "unknown"} | ` +
      `${d.links?.length ?? 0} links found | ` +
      `total pool: ${seedUrls.size} URLs`,
    );
  } else {
    console.warn(`[Stage1] Discovery failed (${discoveryResult.error ?? "no data"}) — using Stage 0 URLs only`);
  }

  const rootDeduped = dedupeUrl(rootUrl);
  const otherUrls   = dedupeUrlPool(
    [...seedUrls].filter((u) => u !== rootDeduped),
  ).slice(0, maxPages - 1);

  const urlsToExtract = [rootDeduped, ...otherUrls];

  console.log(
    `[Stage2] Extracting ${urlsToExtract.length} pages ` +
    `(concurrency: ${profile.concurrency}):\n  ${urlsToExtract.join("\n  ")}`,
  );

  const extractionResults = await mapWithConcurrency(
    urlsToExtract,
    profile.concurrency,
    async (pageUrl) => {
      if (creditsExhausted) {
        console.warn(`[Stage2] Skipping ${pageUrl} — credits exhausted`);
        return null;
      }

      const result = await withTimeout(
        runTinyFish({
          url:             pageUrl,
          goal:            buildExtractionGoal(pageUrl, allowedHostname),
          browser_profile: "stealth",
        }),
        LIMITS.EXTRACTION_TIMEOUT_MS,
        { success: false, resultJson: null, rawText: null, error: "timeout", jobId: null },
        `extract(${pageUrl})`,
      );

      const rawData = result.resultJson ?? tryParseRawText(result.rawText);
      if (!rawData) {
        console.warn(`[Stage2] ✗ ${pageUrl}: ${result.error ?? "no data"}`);
        return null;
      }

      const page = extractPage(pageUrl, rawData, allowedHostname);
      console.log(
        `[Stage2] ✓ "${page.title}" (${pageUrl}) | ` +
        `elements: ${page.elements.length} | links: ${page.internalLinks.length} | ` +
        `forms: ${page.forms.length} | api: ${page.apiEndpoints.length}`,
      );
      return page;
    },
  );

  const pages: CrawledPage[] = extractionResults
    .filter((p): p is Omit<CrawledPage, "screenshots"> => p !== null)
    .map((p) => ({ ...p, screenshots: { url375: null, url768: null, url1440: null } }));

  if (pages.length === 0) {
    console.warn(`[Stage2] All extractions failed — creating empty root page`);
    pages.push({
      url: rootUrl, title: "", elements: [], internalLinks: [], externalLinks: [],
      forms: [], apiEndpoints: [],
      navStructure: { breadcrumbs: [], menus: [] },
      screenshots: { url375: null, url768: null, url1440: null },
    });
  }

  const allLinks = [...new Set(pages.flatMap((p) => p.internalLinks))];
  const crawlTimeMs = Date.now() - startTime;

  console.log(
    `[Stage2] ══ DONE: ${pages.length} pages | ${allLinks.length} links | ${(crawlTimeMs / 1000).toFixed(1)}s`,
  );

  const performanceMetrics: PagePerformanceMetrics[] = pages.map((p) => ({
    pageUrl: p.url, lcpMs: null, fidMs: null, cls: null, ttfbMs: null, rawMetrics: {},
  }));

  void (async () => {
    await Promise.allSettled(
      pages.flatMap((page, i) => [
        (async () => {
          if (!testRunId || creditsExhausted) return;
          const ssResult = await withTimeout(
            runTinyFish({
              url:             page.url,
              goal:            buildScreenshotGoal(page.url),
              browser_profile: "lite",
            }),
            LIMITS.SCREENSHOT_TIMEOUT_MS,
            { success: false, resultJson: null, rawText: null, error: "timeout", jobId: null },
            `screenshot(${page.url})`,
          );
          const ssData = ssResult.resultJson ?? tryParseRawText(ssResult.rawText);
          if (!ssData) return;
          const ss = (ssData as { screenshots?: { viewport375?: string | null; viewport768?: string | null; viewport1440?: string | null } }).screenshots;
          if (!ss) return;
          const uploaded = await uploadPageScreenshots({
            screenshots: { viewport375: ss.viewport375 ?? null, viewport768: ss.viewport768 ?? null, viewport1440: ss.viewport1440 ?? null },
            testRunId,
            pageSlug: urlToSlug(page.url),
          });
          pages[i]!.screenshots = uploaded;
          console.log(`[Stage3] 📸 Screenshots: ${page.url}`);
        })(),

        (async () => {
          if (creditsExhausted) return;
          const perfResult = await withTimeout(
            runTinyFish({
              url:             page.url,
              goal:            buildPerformanceGoal(page.url),
              browser_profile: "lite",
            }),
            LIMITS.PERF_TIMEOUT_MS,
            { success: false, resultJson: null, rawText: null, error: "timeout", jobId: null },
            `perf(${page.url})`,
          );
          const d = perfResult.resultJson ?? tryParseRawText(perfResult.rawText);
          if (!d) return;
          const pm = d as { lcpMs?: number | null; fidMs?: number | null; cls?: number | null; ttfbMs?: number | null };
          performanceMetrics[i] = {
            pageUrl:    page.url,
            lcpMs:      typeof pm.lcpMs  === "number" ? pm.lcpMs  : null,
            fidMs:      typeof pm.fidMs  === "number" ? pm.fidMs  : null,
            cls:        typeof pm.cls    === "number" ? pm.cls    : null,
            ttfbMs:     typeof pm.ttfbMs === "number" ? pm.ttfbMs : null,
            rawMetrics: {},
          };
          console.log(`[Stage3] ⚡ Perf: ${page.url} LCP=${performanceMetrics[i]!.lcpMs}ms`);
        })(),
      ]),
    );
    console.log(`[Stage3] Background tasks complete`);
  })();

  const allElements = pages.flatMap((p) => p.elements);

  const hasLogin = pages.some((p) =>
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

  const hasSignup = pages.some((p) =>
    /signup|register/.test(p.url) ||
    p.elements.some((e) => {
      const t = e.text?.toLowerCase() ?? "";
      return t.includes("sign up") || t.includes("register") || t.includes("create account");
    }),
  );

  const protectedRoutePatterns = /\/(dashboard|account|profile|settings|admin|portal|members?|private|secure|my-)/i;
  const hasProtectedRoutes = pages.some((p) =>
    protectedRoutePatterns.test(p.url) ||
    p.internalLinks.some((l) => protectedRoutePatterns.test(l)),
  );

  const hasSearch = allElements.some((e) =>
    (e.type === "input" && (e.text?.toLowerCase().includes("search") ?? false)) ||
    e.text?.toLowerCase() === "search",
  );

  console.log(
    `[Crawler] ══ FINAL: ${pages.length} pages | ${allLinks.length} links | ` +
    `hasLogin:${hasLogin} hasSignup:${hasSignup} hasSearch:${hasSearch} ` +
    `hasProtectedRoutes:${hasProtectedRoutes} | ${((Date.now() - startTime) / 1000).toFixed(1)}s`,
  );

  return { pages, allLinks, crawlTimeMs, performanceMetrics, hasLogin, hasSignup, hasSearch, hasProtectedRoutes, siteProfile: profile };
}

export async function crawlPage(
  url: string,
  allowedHostname: string,
  _testRunId?: string,
): Promise<CrawledPage> {
  const empty: CrawledPage = {
    url, title: "", elements: [], internalLinks: [], externalLinks: [],
    forms: [], apiEndpoints: [],
    navStructure: { breadcrumbs: [], menus: [] },
    screenshots: { url375: null, url768: null, url1440: null },
  };
  if (creditsExhausted) return empty;

  const result = await withTimeout(
    runTinyFish({ url, goal: buildExtractionGoal(url, allowedHostname), browser_profile: "stealth" }),
    LIMITS.EXTRACTION_TIMEOUT_MS,
    { success: false, resultJson: null, rawText: null, error: "timeout", jobId: null },
    `crawlPage(${url})`,
  );
  const rawData = result.resultJson ?? tryParseRawText(result.rawText);
  if (!rawData) return empty;
  return { ...extractPage(url, rawData, allowedHostname), screenshots: { url375: null, url768: null, url1440: null } };
}

export async function measurePagePerformance(url: string): Promise<PagePerformanceMetrics> {
  const fallback: PagePerformanceMetrics = { pageUrl: url, lcpMs: null, fidMs: null, cls: null, ttfbMs: null, rawMetrics: {} };
  const result = await withTimeout(
    runTinyFish({ url, goal: buildPerformanceGoal(url), browser_profile: "lite" }),
    LIMITS.PERF_TIMEOUT_MS,
    { success: false, resultJson: null, rawText: null, error: "timeout", jobId: null },
    `perf(${url})`,
  );
  const d = result.resultJson ?? tryParseRawText(result.rawText);
  if (!d) return fallback;
  const pm = d as { lcpMs?: number | null; fidMs?: number | null; cls?: number | null; ttfbMs?: number | null };
  return {
    pageUrl: url,
    lcpMs:   typeof pm.lcpMs  === "number" ? pm.lcpMs  : null,
    fidMs:   typeof pm.fidMs  === "number" ? pm.fidMs  : null,
    cls:     typeof pm.cls    === "number" ? pm.cls    : null,
    ttfbMs:  typeof pm.ttfbMs === "number" ? pm.ttfbMs : null,
    rawMetrics: {},
  };
}

export async function executeTest(
  url: string,
  goal: string,
  stealth = false,
): Promise<TestExecutionResult> {
  const startTime = Date.now();

  const fullGoal =
`You are a QA test automation agent. Execute these test steps in a real browser.

TEST URL: ${url}

STEPS:
${goal}

EXECUTION RULES:
1. Navigate to the URL first.
2. If SPA (React/Vue/Next.js — check for <div id="root">), wait 3 extra seconds after load for hydration.
3. Execute each step in strict order.
4. "passed" = true ONLY if you EXPLICITLY confirmed the expected result in the browser.
5. "passed" = false if any step failed, threw an error, or the expected result was NOT observed.
6. If you are uncertain, set passed = false.
7. Record 4xx/5xx network errors in networkLogs. Record JS console errors in consoleLogs.

RESPONSE FORMAT — return ONLY this JSON, no markdown, start with { end with }:
If PASSED: {"passed":true,"actualResult":"<one sentence: what you observed>","errorDetails":null,"consoleLogs":[],"networkLogs":[]}
If FAILED: {"passed":false,"actualResult":"<one sentence: what you observed>","errorDetails":"<specific error or mismatch>","consoleLogs":[],"networkLogs":[]}`;

  const result = await withTimeout(
    runTinyFish({ url, goal: fullGoal, browser_profile: stealth ? "stealth" : "lite" }),
    LIMITS.EXECUTE_TEST_TIMEOUT_MS,
    { success: false, resultJson: null, rawText: null, error: "timeout", jobId: null },
    `executeTest(${url})`,
  );

  const durationMs = Date.now() - startTime;
  const rawData    = result.resultJson ?? tryParseRawText(result.rawText);

  if (!rawData) {
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

  const r = rawData as {
    passed?: boolean; actualResult?: string; errorDetails?: string | null;
    consoleLogs?: string[]; networkLogs?: NetworkLogEntry[];
  };

  return {
    passed:        r.passed === true,
    actualResult:  r.actualResult  ?? "No result returned",
    errorDetails:  r.errorDetails  ?? null,
    screenshotUrl: null,
    durationMs,
    consoleLogs:   r.consoleLogs   ?? [],
    networkLogs:   r.networkLogs   ?? [],
    jobId:         result.jobId,
  };
}

export async function runTinyFishScreenshot(url: string): Promise<string | null> {
  const result = await withTimeout(
    runTinyFish({
      url,
      goal: `Navigate to: ${url}\nWait for full load including JS hydration.\nTake a full-page screenshot at 1440px desktop viewport.\nReturn ONLY: {"screenshot":"<base64 PNG string or null>"}`,
      browser_profile: "lite",
    }),
    LIMITS.SCREENSHOT_CAPTURE_MS,
    { success: false, resultJson: null, rawText: null, error: "timeout", jobId: null },
    `failureScreenshot(${url})`,
  );

  const rawData = result.resultJson ?? tryParseRawText(result.rawText);
  if (!rawData) return null;
  return (rawData as { screenshot?: string | null }).screenshot ?? null;
}