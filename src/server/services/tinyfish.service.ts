// src/server/services/tinyfish.service.ts
//
// ═══════════════════════════════════════════════════════════════════════════
// CRAWLER ARCHITECTURE (v3 — Discovery-first)
// ═══════════════════════════════════════════════════════════════════════════
//
// (Discovery-first):
//   STAGE 0 │ Free URL seeding (sitemap + static HTML, no TinyFish)
//   STAGE 1 │ ONE TinyFish "discoverer" call on the root URL
//            │   Goal: navigate the site, click nav items, collect all URLs
//            │   Returns: flat list of discovered page URLs
//   STAGE 2 │ Parallel TinyFish extraction on all discovered URLs
//            │   Each page gets its own call, all fire simultaneously
//   STAGE 3 │ Test budget allocation
//   STAGE 4 │ Background: screenshots for bugs + performance (non-blocking)
//
// NOTE: When maxPages === 1, Stage 0 and Stage 1 are skipped entirely.
//       We already have the only URL we need (rootUrl), so seeding and
//       discovery would waste time and TinyFish credits for zero gain.
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

// Per-run timeout overrides. All values are in milliseconds.
// When provided via CrawlOptions these replace the module-level TIMEOUTS
// defaults for the duration of a single crawlSite() invocation.
// Fields are optional — omitting a field keeps the default value.
export interface TimeoutOverrides {
  /** How long to wait for the Stage-1 discovery TinyFish call (default 300 000 ms). */
  discoveryMs?: number;
  /** How long to wait for each Stage-2 per-page extraction call (default 300 000 ms). */
  extractionMs?: number;
  /** Base timeout for a single test execution (default 300 000 ms). */
  executeTestBaseMs?: number;
}

export interface TestBudgetAllocation {
  testsPerPage: Map<string, number>;
  totalTests: number;
}

// Default budget used when the user does not specify maxPages / maxTests.
// These are the values the server falls back to — not exposed as named presets.
const DEFAULT_BUDGET: CrawlBudget = {
  maxPages: 5,
  maxTests: 10,
  concurrency: 5,
};

// Hard server-side caps — the UI enforces its own soft limits before these.
// These must stay in sync with the Elysia route schema constraints:
//   maxPages: t.Integer({ minimum: 1, maximum: 20 })
//   maxTests: t.Integer({ minimum: 1, maximum: 30 })
//  HARD_CAPS.MAX_CONCURRENCY caps the concurrency slider server-side.
//  HARD_CAPS.MIN_CONCURRENCY prevents a value of 0 from deadlocking.
//  HARD_CAPS.MAX_TIMEOUT_MS / MIN_TIMEOUT_MS guard against absurd values.
const HARD_CAPS = {
  MAX_PAGES: 20,
  MAX_TESTS: 30,
  MAX_TESTS_PER_PAGE: 8,
  MIN_TESTS_PER_PAGE: 1,
  MIN_CONCURRENCY: 1,
  MAX_CONCURRENCY: 20,
  MIN_TIMEOUT_MS: 30_000,   // 30 s — below this TinyFish almost always times out
  MAX_TIMEOUT_MS: 600_000,  // 10 min — sane upper bound
  // Maximum length (characters) for the user-supplied crawl context hint.
  // Keeps prompt sizes reasonable and prevents abuse.
  MAX_CRAWL_CONTEXT_LENGTH: 500,
} as const;

//  TIMEOUTS is now mutable-compatible via a helper (resolveTimeouts)
// so per-run overrides can be applied without mutating the module constant.
const TIMEOUTS = {
  DISCOVERY_MS: 300_000,
  EXTRACTION_MS: 300_000,
  EXTRACTION_RETRY_MS: 60_000,
  EXECUTE_TEST_BASE_MS: 300_000,
  EXECUTE_TEST_RETRY_BONUS_MS: 60_000,
} as const;

// ResolvedTimeouts is a plain mutable interface that mirrors the shape
// of TIMEOUTS but uses `number` instead of literal types. This is necessary
// because resolveTimeouts() returns values produced by clamp() (type `number`),
// which is not assignable to the readonly literal types in `typeof TIMEOUTS`.
interface ResolvedTimeouts {
  DISCOVERY_MS: number;
  EXTRACTION_MS: number;
  EXTRACTION_RETRY_MS: number;
  EXECUTE_TEST_BASE_MS: number;
  EXECUTE_TEST_RETRY_BONUS_MS: number;
}

// resolveTimeouts merges user-supplied overrides onto the module
// defaults, clamping each value to [MIN_TIMEOUT_MS, MAX_TIMEOUT_MS].
// Returns a ResolvedTimeouts object (mutable numbers, not readonly literals).
function resolveTimeouts(overrides?: TimeoutOverrides): ResolvedTimeouts {
  if (!overrides) return { ...TIMEOUTS };
  const clamp = (v: number) =>
    Math.max(HARD_CAPS.MIN_TIMEOUT_MS, Math.min(v, HARD_CAPS.MAX_TIMEOUT_MS));
  return {
    DISCOVERY_MS:
      overrides.discoveryMs !== undefined
        ? clamp(overrides.discoveryMs)
        : TIMEOUTS.DISCOVERY_MS,
    EXTRACTION_MS:
      overrides.extractionMs !== undefined
        ? clamp(overrides.extractionMs)
        : TIMEOUTS.EXTRACTION_MS,
    EXTRACTION_RETRY_MS: TIMEOUTS.EXTRACTION_RETRY_MS, // not user-overridable
    EXECUTE_TEST_BASE_MS:
      overrides.executeTestBaseMs !== undefined
        ? clamp(overrides.executeTestBaseMs)
        : TIMEOUTS.EXECUTE_TEST_BASE_MS,
    EXECUTE_TEST_RETRY_BONUS_MS: TIMEOUTS.EXECUTE_TEST_RETRY_BONUS_MS, // not user-overridable
  };
}

export const MAX_EXTRACTION_RETRIES = 1;
export const MAX_TEST_RETRIES = 1;

// ─── Per-crawl context ────────────────────────────────────────────────────────

interface CrawlContext {
  creditsExhausted: boolean;
}

function makeCrawlContext(): CrawlContext {
  return { creditsExhausted: false };
}

// ─── Crawl progress callback ─────────────────────────────────────────
// CrawlProgressCallback is a function the controller passes into crawlSite so
// the service can emit real-time crawl events back up to the SSE stream without
// the service needing to know about HTTP or SSE directly.
//
// WHY: Previously crawl progress was only logged to the server terminal.
// Users had no visibility into what was being discovered or extracted.
// This callback bridges that gap — zero coupling, pure function call.
//
// Events emitted through this callback:
//   crawl_stage_change  — when the pipeline moves between Stage 0/1/2/3
//   crawl_url_found     — each URL discovered during Stage 1
//   crawl_page_extracted — each page successfully extracted in Stage 2
//   crawl_page_failed   — each page that failed extraction (with reason)
export type CrawlProgressCallback = (event: CrawlProgressEvent) => void;

export type CrawlProgressEvent =
  | {
      type: "crawl_stage_change";
      /** Human-readable stage name, e.g. "Seeding URLs", "Discovering pages" */
      stage: string;
      /** Short description shown under the stage name in the UI */
      description: string;
    }
  | {
      type: "crawl_url_found";
      url: string;
      /** Where the URL came from: "sitemap" | "html" | "discovery" */
      source: "sitemap" | "html" | "discovery";
    }
  | {
      type: "crawl_page_extracted";
      url: string;
      title: string;
      elementsCount: number;
      formsCount: number;
      linksCount: number;
      /** 1-based index so the UI can show "2 / 5 pages extracted" */
      index: number;
      total: number;
    }
  | {
      type: "crawl_page_failed";
      url: string;
      reason: string;
      index: number;
      total: number;
    };

// ─── Public interfaces ────────────────────────────────────────────────────────

// CrawlOptions now accepts an optional timeouts field so callers
// (testing.controller.ts → runPipelineStages) can pass user-requested
// timeout overrides all the way down to the TinyFish calls.
//
//CrawlOptions now also accepts an optional onProgress callback so
// the controller can forward live crawl events to SSE clients.
//
// CrawlOptions now also accepts an optional crawlContext string.
// When provided, it is injected into both the Stage-1 discovery prompt and
// the Stage-2 per-page extraction prompts so TinyFish can handle sites that
// require authentication, form submission, or other user interaction to
// access content. The value is sanitised (trimmed, length-capped) before use.
export interface CrawlOptions {
  budget?: Partial<CrawlBudget>;
  allowedDomain?: string;
  testRunId?: string;
  abortSignal?: AbortSignal;
  /** Optional per-run timeout overrides (milliseconds). Clamped server-side. */
  timeouts?: TimeoutOverrides;
  /**
   * Optional callback fired for each significant crawl event.
   * Used by testing.controller to fan out real-time progress to SSE clients.
   * Omit if you don't need live progress (e.g. unit tests, single-page crawls).
   */
  onProgress?: CrawlProgressCallback;
  /**
   * Optional free-text hint supplied by the user to help the crawler
   * navigate sites that require authentication or interaction.
   *
   * Examples:
   *   "Login with email: user@example.com and password: demo1234"
   *   "Click 'Enter as guest' to skip the login screen"
   *   "The dashboard is only visible after accepting the cookie banner"
   *
   * This string is injected verbatim (after sanitisation) into the TinyFish
   * discovery and extraction prompts so the agent can act on the hint.
   * Maximum length: HARD_CAPS.MAX_CRAWL_CONTEXT_LENGTH characters.
   */
  crawlContext?: string;
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
  // Raw TinyFish output preserved for AI fix suggestion generation.
  // Contains everything TinyFish returned (step logs, error fields, rawText)
  // so the AI can reason about partial failures without losing signal.
  tinyfishRaw: string | null;
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
    }
  // crawl_progress is a new SSE event type that wraps CrawlProgressEvent
  // so the frontend can receive the same typed events the service emits via callback.
  // Keeping it as a wrapper (rather than inlining each sub-type) means the client
  // SSE parser only needs one new case, not four.
  | {
      type: "crawl_progress";
      event: CrawlProgressEvent;
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

// ─── TinyFish SSE event shape ─────────────────────────────────────────────────
//
// The TinyFish API is inconsistent about field names across event types
// and API versions. To be resilient we treat every known alias as valid:
//
//   jobId      — "jobId" | "job_id" | "id" | "run_id" | "taskId" | "task_id" | "runId" | "executionId"
//   resultJson — "resultJson" | "result" | "data" | "output" | "response"
//   type       — "type" | "event"        (COMPLETE marker)
//   status     — "status" | "state"
//
// extractJobId / extractResultJson / isCompleteEvent centralise all
// alias-handling so the main SSE loop stays clean and new aliases only
// need one-line additions here.

type RawSSEEvent = Record<string, unknown>;

// Pull jobId from any field name TinyFish might use.
// "run_id" is the field used for live TinyFish SSE events
// (observed: { type, run_id, status, timestamp, result }).
function extractJobId(ev: RawSSEEvent): string | null {
  for (const key of [
    "run_id",      
    "jobId",
    "job_id",
    "id",
    "taskId",
    "task_id",
    "jobid",
    "runId",
    "executionId",
  ]) {
    const v = ev[key];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

// Pull the result payload from any field name TinyFish might use.
// Returns the first non-null object found, or null.
function extractResultJson(ev: RawSSEEvent): Record<string, unknown> | null {
  for (const key of ["resultJson", "result", "data", "output", "response"]) {
    const v = ev[key];
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      return v as Record<string, unknown>;
    }
  }
  return null;
}

// Returns true if this SSE event signals job completion.
// Handles both `type: "COMPLETE"` and `event: "COMPLETE"` shapes,
// and also bare `status: "COMPLETED"` events that lack a type field.
/* eslint-disable @typescript-eslint/dot-notation */
function isCompleteEvent(ev: RawSSEEvent): boolean {
  const type = (ev["type"] ?? ev["event"] ?? "") as string;
  const status = (ev["status"] ?? ev["state"] ?? "") as string;
  return (
    type.toUpperCase() === "COMPLETE" ||
    type.toUpperCase() === "COMPLETED" ||
    status.toUpperCase() === "COMPLETED"
  );
}

// Extract status string from whichever field TinyFish uses.
function extractStatus(ev: RawSSEEvent): string {
  return ((ev["status"] ?? ev["state"] ?? "") as string).toUpperCase();
}
/* eslint-enable @typescript-eslint/dot-notation */

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

        // Parse into a typed RawSSEEvent so alias helpers can inspect it.
        // If JSON is malformed, accumulate the raw string — it may be a text chunk.
        let ev: RawSSEEvent;
        try {
          ev = JSON.parse(jsonStr) as RawSSEEvent;
        } catch {
          rawText += jsonStr;
          continue;
        }

        // Harvest jobId from EVERY event, not just the first.
        // TinyFish sends run_id on all events, so we pick it up as early
        // as possible (typically the very first event).
        const evJobId = extractJobId(ev);
        if (evJobId && !jobId) jobId = evJobId;

        // Accumulate text from all known streaming-chunk field names.
        // eslint-disable-next-line @typescript-eslint/dot-notation
        if (typeof ev["text"] === "string") rawText += ev["text"] as string;
        // eslint-disable-next-line @typescript-eslint/dot-notation
        if (typeof ev["chunk"] === "string") rawText += ev["chunk"] as string;
        // eslint-disable-next-line @typescript-eslint/dot-notation
        if (typeof ev["content"] === "string") rawText += ev["content"] as string;

        // Use isCompleteEvent() instead of a hard-coded type === "COMPLETE"
        // check so we handle every shape TinyFish might send for completion.
        if (isCompleteEvent(ev)) {
          const status = extractStatus(ev);

          // Use extractResultJson() instead of ev.resultJson directly.
          // TinyFish sends the payload as "result" not "resultJson" in most
          // API versions, which was causing resultJson to always be null.
          const resultJson = extractResultJson(ev);

          // Re-harvest jobId from COMPLETE in case it wasn't in any
          // earlier event (common when TinyFish omits it from progress events).
          const completeJobId = extractJobId(ev);
          if (completeJobId && !jobId) jobId = completeJobId;

          console.log(
            `[TinyFish] ✓ jobId=${jobId ?? "unknown"} → ${status} (${eventCount} events)`,
          );

          if (!resultJson) {
            // Log all keys present so we can diagnose future alias
            // mismatches without having to add more console.log statements.
            console.warn(
              `[TinyFish] ⚠ No resultJson in COMPLETE event. ` +
                `Keys present: [${Object.keys(ev).join(", ")}]. ` +
                `rawText preview: "${rawText.slice(0, 300)}"`,
            );
          }

          if (status === "COMPLETED") {
            return {
              success: true,
              //  fall back to rawText parse when resultJson fields
              // were all empty — previously this fallback only ran after
              // stream-end, not on a successful COMPLETE event.
              resultJson: resultJson ?? tryParseRawText(rawText),
              rawText: rawText || null,
              error: null,
              jobId,
            };
          }
          return {
            success: false,
            resultJson: null,
            rawText: rawText || null,
            // Also check ev.message as a fallback error field.
            // eslint-disable-next-line @typescript-eslint/dot-notation
            error:
              (ev["error"] as string | undefined) ??
              // eslint-disable-next-line @typescript-eslint/dot-notation
              (ev["message"] as string | undefined) ??
              `Status: ${status}`,
            jobId,
          };
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

// sanitiseCrawlContext strips the user-supplied hint to a safe
// plain-text string. We remove backticks and angle brackets to prevent
// accidental prompt-injection, then hard-cap the length. Returns an empty
// string when the input is blank so callers can skip injection cleanly.
function sanitiseCrawlContext(raw: string | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/[`<>]/g, "")   // strip prompt-injection characters
    .trim()
    .slice(0, HARD_CAPS.MAX_CRAWL_CONTEXT_LENGTH);
}

function buildDiscoveryGoal(
  rootUrl: string,
  allowedHostname: string,
  maxPages: number,
  crawlContext?: string,
): string {
  const safeContext = sanitiseCrawlContext(crawlContext);
  const contextBlock = safeContext
    ? `\nUSER-PROVIDED CONTEXT (follow these instructions before doing anything else):\n${safeContext}\n`
    : "";

  return `You are a website URL sampler, NOT a crawler. Your job is to collect a SMALL LIMITED set of URLs and STOP EARLY. You MUST NOT explore the full site. Hard limit: stop as soon as you have ${maxPages} unique URLs OR after 25 navigation clicks, whichever happens first. Exceeding this limit is a failure.

START URL: ${rootUrl}
${contextBlock}
STEP 1: Navigate to the start URL and wait for full load. If <div id="root"> or <div id="app"> or React is detected, wait 4 extra seconds.

STEP 2: Collect passive links without clicking: all <a href>, data-href, data-to, data-url, and any routes from window.__NEXT_DATA__ or window.__NUXT__.

STEP 3: Click navigation items ONLY UNTIL LIMIT IS REACHED. For each nav item: click, wait up to 3 seconds, if URL changes and hostname matches "${allowedHostname}" then record it, go back, continue. The MOMENT you reach ${maxPages} URLs OR 25 clicks you MUST STOP ALL ACTIONS immediately. Do NOT continue exploring.

STEP 4: Return ONLY JSON with collected URLs — no markdown, no explanation, start with { end with }:
{"urls":["https://${allowedHostname}/","https://${allowedHostname}/example"]}`;
}

// ─── Stage 2: Extraction prompt ───────────────────────────────────────────────

function buildExtractionGoal(
  url: string,
  allowedHostname: string,
  // crawlContext is injected into extraction prompts so TinyFish can
  // authenticate or interact before extracting each page.
  crawlContext?: string,
): string {
  const safeContext = sanitiseCrawlContext(crawlContext);
  // Same optional context block pattern as in buildDiscoveryGoal.
  const contextBlock = safeContext
    ? `\nUSER-PROVIDED CONTEXT (follow these instructions before extracting the page):\n${safeContext}\n`
    : "";

  return `Navigate to this URL: ${url}
${contextBlock}
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

// crawlSite now reads options.budget.concurrency (user-supplied,
// clamped to HARD_CAPS) and options.timeouts (merged via resolveTimeouts).
// The resolved concurrency is logged alongside pages/tests so it's visible
// in server logs when diagnosing slow or failed crawls.
//
// crawlSite also reads options.onProgress and fires it at key crawl
// milestones so the controller can relay live events to SSE clients.
// All onProgress calls are fire-and-forget (no await) — they must never
// block or throw inside the crawl hot path.
//
// crawlSite reads options.crawlContext and forwards the sanitised
// value into buildDiscoveryGoal and buildExtractionGoal so TinyFish receives
// user-provided authentication or navigation hints in both Stage 1 and Stage 2.
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

  // Convenience wrapper — fires the progress callback safely.
  // Using a helper prevents repetition and ensures we never throw from a missing callback.
  const emitProgress = (event: CrawlProgressEvent) => {
    try {
      options.onProgress?.(event);
    } catch {
      /* progress callbacks must never crash the crawl */
    }
  };

  // Per-run timeout overrides. All values are in milliseconds.
  const timeouts = resolveTimeouts(options.timeouts);

  // Sanitise the crawl context once here so every downstream call
  // receives a clean, length-capped string (or empty string = no injection).
  const crawlContext = sanitiseCrawlContext(options.crawlContext);
  if (crawlContext) {
    console.log(
      `[Crawler] crawlContext provided (${crawlContext.length} chars) — injecting into TinyFish prompts`,
    );
  }

  // Resolve effective budget: user values → defaults → hard caps.
  //  concurrency is now clamped to [MIN_CONCURRENCY, MAX_CONCURRENCY]
  // so a user supplying concurrency=0 or concurrency=999 gets a safe value.
  const budget: CrawlBudget = {
    maxPages: Math.min(
      options.budget?.maxPages ?? DEFAULT_BUDGET.maxPages,
      HARD_CAPS.MAX_PAGES,
    ),
    maxTests: Math.min(
      options.budget?.maxTests ?? DEFAULT_BUDGET.maxTests,
      HARD_CAPS.MAX_TESTS,
    ),
    concurrency: Math.max(
      HARD_CAPS.MIN_CONCURRENCY,
      Math.min(
        options.budget?.concurrency ?? DEFAULT_BUDGET.concurrency,
        HARD_CAPS.MAX_CONCURRENCY,
      ),
    ),
  };

  console.log(
    `[Crawler] ══ START: ${rootUrl} | maxPages=${budget.maxPages} maxTests=${budget.maxTests} concurrency=${budget.concurrency} ` +
      `discoveryMs=${timeouts.DISCOVERY_MS} extractionMs=${timeouts.EXTRACTION_MS} executeBaseMs=${timeouts.EXECUTE_TEST_BASE_MS} ` +
      `(user-requested: pages=${options.budget?.maxPages ?? "default"} tests=${options.budget?.maxTests ?? "default"} ` +
      `concurrency=${options.budget?.concurrency ?? "default"})`,
  );

  // ── Stage 0 + 1: Skip entirely when maxPages === 1 ────────────────────────
  //
  // When the user only needs one page we already have the exact URL we
  // need (rootUrl). Running the sitemap fetch, static HTML scrape, and TinyFish
  // discovery call would waste time and credits without adding any value.
  // Jump straight to Stage 2 with a single-element candidate list.
  let allCandidateUrls: string[];

  if (budget.maxPages === 1) {
    console.log(
      `[Stage0/1] maxPages=1 — skipping seeding & discovery, using rootUrl directly`,
    );
    const rootNorm = normalizeUrl(rootUrl);
    allCandidateUrls = [rootNorm];
    emitProgress({ type: "crawl_url_found", url: rootNorm, source: "html" });
  } else {
    // ── Stage 0: Free URL seeding ──────────────────────────────────────────
    // Notify the client that we're starting the free seeding stage.
    emitProgress({
      type: "crawl_stage_change",
      stage: "Seeding URLs",
      description: "Scanning sitemap and static HTML for page URLs",
    });

    const [sitemapUrls, staticHtmlLinks] = await Promise.all([
      fetchSitemapUrls(rootUrl, allowedHostname),
      fetchStaticHtmlLinks(rootUrl, allowedHostname),
    ]);

    const freeUrls = dedupeUrls(
      [normalizeUrl(rootUrl), ...sitemapUrls, ...staticHtmlLinks],
      allowedHostname,
      budget.maxPages * 3,
    );

    console.log(
      `[Stage0] Free seed: ${freeUrls.length} URLs (sitemap:${sitemapUrls.length} html:${staticHtmlLinks.length})`,
    );

    // Emit each URL found during free seeding so the UI can start
    // populating the "URLs found" list immediately, before TinyFish even starts.
    for (const url of freeUrls) {
      const source = sitemapUrls.includes(url) ? "sitemap" : "html";
      emitProgress({ type: "crawl_url_found", url, source });
    }

    // ── Stage 1: Discovery via TinyFish ───────────────────────────────────
    let discoveredUrls: string[] = [];

    if (abortSignal?.aborted) throw new Error("AbortError: crawl cancelled");

    console.log(`[Stage1] 🔍 Discovering pages via TinyFish: ${rootUrl}`);

    //  Tell the user we're now running the TinyFish discovery call.
    emitProgress({
      type: "crawl_stage_change",
      stage: "Discovering pages",
      description: `Navigating ${rootUrl} to find all page routes`,
    });

    //Use resolved timeouts.DISCOVERY_MS instead of the module constant.
    const discoveryResult = await withTimeout(
      runTinyFish(
        {
          url: rootUrl,
          // Pass crawlContext into the discovery goal so TinyFish
          // can authenticate / interact before collecting URLs.
          goal: buildDiscoveryGoal(rootUrl, allowedHostname, budget.maxPages, crawlContext),
          browser_profile: "stealth",
        },
        ctx,
      ),
      timeouts.DISCOVERY_MS,
      {
        success: false,
        resultJson: null,
        rawText: null,
        error: "timeout",
        jobId: null,
      },
      `discovery(${rootUrl})`,
    );

    function extractUrlsFromDiscovery(result: TinyFishResult): string[] {
      const candidates: string[] = [];

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
      // Emit each newly-discovered URL (not already seen from free seeding).
      // We track which ones are new to avoid double-emitting root URL and sitemap links.
      const alreadyEmitted = new Set(freeUrls);
      for (const url of discoveredUrls) {
        if (!alreadyEmitted.has(url)) {
          emitProgress({ type: "crawl_url_found", url, source: "discovery" });
        }
      }
    } else {
      console.warn(
        `[Stage1] ⚠ Discovery returned 0 URLs. status=${discoveryResult.error ?? "ok"} rawText="${discoveryResult.rawText?.slice(0, 200)}"`,
      );
    }

    const rootNorm = normalizeUrl(rootUrl);
    if (!discoveredUrls.includes(rootNorm)) discoveredUrls.unshift(rootNorm);

    allCandidateUrls = dedupeUrls(
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
  }

  // ── Stage 2: Parallel extraction ──────────────────────────────────────────
  if (abortSignal?.aborted) throw new Error("AbortError: crawl cancelled");

  console.log(
    `[Stage2] ⚡ Extracting ${allCandidateUrls.length} pages in parallel (concurrency=${budget.concurrency})`,
  );

  // Notify the client that we're moving into page extraction.
  emitProgress({
    type: "crawl_stage_change",
    stage: "Extracting pages",
    description: `Analyzing ${allCandidateUrls.length} page${allCandidateUrls.length !== 1 ? "s" : ""} for elements, forms and links`,
  });

  // Previously all pages were fired simultaneously with
  // Promise.allSettled. Now we respect budget.concurrency by processing
  // pages in sliding-window batches of size `budget.concurrency`.
  // This prevents saturating the TinyFish API with too many simultaneous
  // connections on large crawls.
  const extractionResults: PromiseSettledResult<CrawledPage | null>[] = [];

  // Track how many pages have settled (succeeded or failed) so we can
  // include a 1-based index in crawl_page_extracted / crawl_page_failed events.
  let extractedCount = 0;
  const totalToExtract = allCandidateUrls.length;

  for (
    let batchStart = 0;
    batchStart < allCandidateUrls.length;
    batchStart += budget.concurrency
  ) {
    const batchUrls = allCandidateUrls.slice(
      batchStart,
      batchStart + budget.concurrency,
    );

    const batchResults = await Promise.allSettled(
      batchUrls.map(async (pageUrl) => {
        for (let attempt = 0; attempt <= MAX_EXTRACTION_RETRIES; attempt++) {
          if (abortSignal?.aborted || ctx.creditsExhausted) break;
          if (attempt > 0) console.log(`[Stage2] Retry ${attempt}: ${pageUrl}`);

          //  Use resolved timeouts.EXTRACTION_MS instead of module constant.
          const timeoutMs =
            timeouts.EXTRACTION_MS + attempt * timeouts.EXTRACTION_RETRY_MS;
          const result = await withTimeout(
            runTinyFish(
              {
                url: pageUrl,
                // Pass crawlContext into every extraction call so
                // TinyFish can authenticate before extracting each page.
                goal: buildExtractionGoal(pageUrl, allowedHostname, crawlContext),
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
            // Only emit failure after the last retry attempt so the UI
            // doesn't flicker between "extracting" and "failed" on transient errors.
            if (attempt === MAX_EXTRACTION_RETRIES) {
              extractedCount++;
              emitProgress({
                type: "crawl_page_failed",
                url: pageUrl,
                reason: result.error ?? "No data returned",
                index: extractedCount,
                total: totalToExtract,
              });
            }
            continue;
          }

          const extracted = extractPageData(pageUrl, raw, allowedHostname);
          console.log(
            `[Stage2] ✓ "${extracted.title}" ${pageUrl} | ` +
              `elements:${extracted.elements.length} forms:${extracted.forms.length} ` +
              `links:${extracted.internalLinks.length} complexity:${extracted.complexityScore.toFixed(1)}`,
          );

          // Emit success event with enough metadata for the UI to render
          // a rich "N of M pages extracted" card with title + stats.
          extractedCount++;
          emitProgress({
            type: "crawl_page_extracted",
            url: pageUrl,
            title: extracted.title || pageUrl,
            elementsCount: extracted.elements.length,
            formsCount: extracted.forms.length,
            linksCount: extracted.internalLinks.length,
            index: extractedCount,
            total: totalToExtract,
          });

          return {
            ...extracted,
            screenshots: { url375: null, url768: null, url1440: null },
          } as CrawledPage;
        }
        return null;
      }),
    );

    extractionResults.push(...batchResults);
  }

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
  // Notify the client that budget allocation is happening.
  emitProgress({
    type: "crawl_stage_change",
    stage: "Allocating test budget",
    description: `Planning test distribution across ${pages.length} page${pages.length !== 1 ? "s" : ""}`,
  });

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

// buildExecuteTestGoal constructs the TinyFish prompt for a single test.
// The prompt instructs TinyFish to produce one structured log object per step
// and never stop early — the only format that reliably gets step-level signal
// back from TinyFish given its current non-deterministic output behaviour.
// The step count is injected so TinyFish knows exactly how many logs to emit.
function buildExecuteTestGoal(url: string, steps: string[]): string {
  const stepCount = steps.length;
  const numberedSteps = steps.map((s, i) => `STEP ${i + 1}: ${s}`).join("\n");

  return `Go to ${url} and complete these steps in order.

BEFORE starting any step:
- Wait for the page to fully load
- If you detect a React/Next.js/Vue SPA (div#root, div#app, __NEXT_DATA__, or __nuxt__), wait an extra 4 seconds for hydration
- If a cookie/GDPR banner is visible, click its dismiss or accept button ONCE, then wait 1 second
- Do NOT log in or create accounts unless a step explicitly tells you to

STEPS TO EXECUTE:
${numberedSteps}

After completing all steps, output ONLY this JSON. No explanation, no markdown, no text before or after:
{"logs":[{"id":1,"status":"PASSED","data":null}]}

Rules for the JSON:
- One entry per step, in order, id matches step number
- status is exactly one of: "PASSED", "FAILED"
  - PASSED: action was performed and the observable result matched, OR the element was found and behaved correctly
  - FAILED: element was not found, action could not be completed, or result did not match expectations
- data: null when PASSED, or a short plain-text reason (max 120 chars) when FAILED
- The array must have exactly ${stepCount} entries
- Do not include any field other than id, status, data`;
}

// buildFallbackExecuteTestGoal is the simpler, more resilient prompt used
// when TinyFish returns a platform-level error (Case B) on the primary prompt.
//
// WHY THIS EXISTS:
//   TinyFish periodically enters a degraded state where it rejects normal
//   detailed prompts with its own error response (e.g. { status: "FAILED",
//   error: "...", help_url: "..." }) before executing any steps. When this
//   happens the primary buildExecuteTestGoal prompt fails immediately.
//
//   During one such outage we discovered a minimal, imperative prompt style
//   that TinyFish accepted reliably. This function encodes that style as a
//   dedicated fallback so we can auto-retry with it instead of surfacing a
//   confusing "browser agent error" to the user.
//
//   The key differences vs the primary prompt:
//     - No preamble paragraphs — opens directly with the task statement
//     - Explicit "do NOT stop early / always continue" directives
//     - Inline fallback data values ("Element not found", "Page requires login")
//     - Minimal JSON example inline rather than after a rules block
//
// This prompt is ONLY used on the fallback retry triggered by a TinyFish-own
// error response. Normal execution always uses buildExecuteTestGoal first.
function buildFallbackExecuteTestGoal(steps: string[]): string {
  const stepCount = steps.length;
  const numberedSteps = steps.map((s, i) => `STEP ${i + 1}: ${s}`).join("\n");

  return `You are a browser test agent. Your task is to execute ALL steps and produce ${stepCount} structured logs. The task is NOT complete until all ${stepCount} logs are produced. Do NOT stop early. Always continue execution even if a step fails. If element not found set data=Element not found. If login required set data=Page requires login. If previous step failed set data=Previous step failed. STEPS:\n${numberedSteps}
Return ONLY this exact JSON shape, no other text:
{"logs":[{"id":1,"status":"PASSED","data":null},{"id":2,"status":"FAILED","data":"Element not found"}]}`;
}

// isTinyFishOwnError returns true when the TinyFishResult represents a
// platform-level error emitted by TinyFish itself — as opposed to a test
// step failure or a missing/malformed result.
//
// TinyFish-own errors look like:
//   { status: "FAILED", error: "...", help_url: "...", run_id: "..." }
// They have an error string and a status field but NO step-log arrays
// (logs / steps / results). We use this shape to decide whether to retry
// with the fallback prompt rather than immediately surfacing the failure.
function isTinyFishOwnError(result: TinyFishResult): boolean {
  if (!result.resultJson) return false;
  const rj = result.resultJson as Record<string, unknown>;
  const hasErrorField =
    typeof rj["error"] === "string" && (rj["error"] as string).length > 0;
  const hasStatusField = typeof rj["status"] === "string";
  const hasStepLogs =
    Array.isArray(rj["logs"]) ||
    Array.isArray(rj["steps"]) ||
    Array.isArray(rj["results"]);
  return hasErrorField && hasStatusField && !hasStepLogs;
}

// parseExecuteTestResult interprets TinyFish's non-deterministic output.
// TinyFish may return:
//   A) A structured result with step logs — parsed from resultJson or rawText
//   B) A TinyFish-own error event — { type, run_id, status, error, help_url, ... }
//   C) Nothing useful — timeout, credits exhausted, network error
//
// For (A) we walk the step logs: the test passes only if ALL steps have
// status PASSED. The first FAILED log becomes the errorDetails.
// For (B) and (C) we mark the test as failed and surface whatever signal
// TinyFish gave us so the AI fix suggestion has something to work with.
function parseExecuteTestResult(
  result: TinyFishResult,
  durationMs: number,
): Pick<TestExecutionResult, "passed" | "actualResult" | "errorDetails" | "consoleLogs" | "networkLogs"> {

  // ── Case B: TinyFish-own error event (no step logs) ──────────────────────
  if (result.resultJson) {
    const rj = result.resultJson as Record<string, unknown>;
    const hasErrorField = typeof rj["error"] === "string" && (rj["error"] as string).length > 0;
    const hasStatusField = typeof rj["status"] === "string";
    const hasStepLogs =
      Array.isArray(rj["logs"]) ||
      Array.isArray(rj["steps"]) ||
      Array.isArray(rj["results"]);

    if (hasErrorField && hasStatusField && !hasStepLogs) {
      const tfError = rj["error"] as string;
      const tfStatus = rj["status"] as string;
      console.error(`[TestExecution] TinyFish agent error — status: ${tfStatus}, error: ${tfError}`);
      return {
        passed: false,
        actualResult: `Browser agent encountered an error`,
        errorDetails: tfError,
        consoleLogs: [],
        networkLogs: [],
      };
    }
  }

  // ── Case A: structured JSON logs (resultJson or rawText) ──────────────────
  const raw = result.resultJson ?? tryParseRawText(result.rawText);
  if (raw) {
    const rr = raw as Record<string, unknown>;

    // Accept flat array or nested under logs / steps / results
    const logArray: unknown[] = Array.isArray(raw)
      ? raw
      : Array.isArray(rr["logs"])
        ? (rr["logs"] as unknown[])
        : Array.isArray(rr["steps"])
          ? (rr["steps"] as unknown[])
          : Array.isArray(rr["results"])
            ? (rr["results"] as unknown[])
            : [];

    if (logArray.length > 0) {
      const stepLogs = logArray.filter(
        (entry): entry is { id: number | string; status: string; data: unknown } =>
          typeof entry === "object" &&
          entry !== null &&
          "status" in (entry as object),
      );

      if (stepLogs.length > 0) {
        // Any step that is not explicitly PASSED is a failure.
        // This covers FAILED, SKIPPED, ERROR, or any unknown status —
        // we never silently pass a test with unattempted or failed steps.
        const firstNonPassed = stepLogs.find(
          (s) => s.status?.toString().toUpperCase() !== "PASSED",
        );
        const allPassed = !firstNonPassed;

        const actualResult = allPassed
          ? `All ${stepLogs.length} steps passed`
          : `Step ${firstNonPassed!.id} ${firstNonPassed!.status.toLowerCase()}: ${
              firstNonPassed!.data ?? "element not found or action could not be completed"
            }`;

        const errorDetails = firstNonPassed
          ? `Step ${firstNonPassed.id} — ${firstNonPassed.data ?? firstNonPassed.status}`
          : null;

        console.log(
          `[TestExecution] ${allPassed ? "✓ PASSED" : "✗ FAILED"} — ` +
            `${stepLogs.filter((s) => s.status?.toString().toUpperCase() === "PASSED").length}` +
            `/${stepLogs.length} steps passed` +
            (firstNonPassed
              ? ` — first issue: step ${firstNonPassed.id} (${firstNonPassed.status}): ${firstNonPassed.data ?? "no detail"}`
              : ""),
        );

        return {
          passed: allPassed,
          actualResult,
          errorDetails,
          consoleLogs: [],
          networkLogs: [],
        };
      }
    }

    // resultJson present but no recognisable step logs
    const summary = JSON.stringify(raw).slice(0, 500);
    console.error(`[TestExecution] Unrecognised result structure:`, summary);
    return {
      passed: false,
      actualResult: `Unexpected response from browser agent`,
      errorDetails: `Raw result: ${summary}`,
      consoleLogs: [],
      networkLogs: [],
    };
  }

  // ── Case C: nothing returned at all ──────────────────────────────────────
  console.error(
    `[TestExecution] TinyFish returned nothing. error=${result.error} success=${result.success}`,
  );
  return {
    passed: false,
    actualResult: result.error?.includes("timeout")
      ? `Test timed out — the page took too long`
      : `No result returned from the browser agent`,
    errorDetails: result.error ?? "Empty response",
    consoleLogs: [],
    networkLogs: [],
  };
}

// executeTest now accepts an optional timeouts argument so the
// controller can pass user-requested timeout overrides into individual test
// execution calls. When omitted the module-level TIMEOUTS defaults apply.
//
// TinyFish-own error fallback retry:
//   If the primary prompt triggers a TinyFish platform-level error (Case B in
//   parseExecuteTestResult — isTinyFishOwnError returns true), we automatically
//   retry ONCE using buildFallbackExecuteTestGoal before giving up. This handles
//   TinyFish degraded states where the detailed primary prompt is rejected but
//   the simpler fallback prompt is accepted. The fallback retry always uses
//   stealth profile since it is already a recovery path, and does not consume
//   one of the caller's MAX_TEST_RETRIES slots (those are for test-step failures,
//   not platform errors).
export async function executeTest(
  url: string,
  goal: string,
  stealth = false,
  attempt = 0,
  timeoutOverrides?: TimeoutOverrides,
): Promise<TestExecutionResult> {
  const ctx = makeCrawlContext();
  const startTime = Date.now();

  // Resolve timeouts for this execution call.
  const resolvedTimeouts = resolveTimeouts(timeoutOverrides);

  // Parse the goal string back into individual steps so we can inject
  // the step count into the TinyFish prompt. The goal is formatted by
  // buildTestGoal in testing.controller.ts as:
  //   "Step 1: <action>\nStep 2: <action>\n...\n\nExpected result: <result>"
  const stepLines = goal
    .split("\n")
    .filter((line) => /^Step \d+:/i.test(line.trim()))
    .map((line) => line.replace(/^Step \d+:\s*/i, "").trim())
    .filter(Boolean);

  // If we couldn't parse steps (unexpected format), fall back to the full
  // goal text as a single step so the prompt is always well-formed.
  const steps = stepLines.length > 0 ? stepLines : [goal];

  const fullGoal = buildExecuteTestGoal(url, steps);

  // Use resolved EXECUTE_TEST_BASE_MS instead of the module constant.
  const timeoutMs =
    resolvedTimeouts.EXECUTE_TEST_BASE_MS +
    attempt * resolvedTimeouts.EXECUTE_TEST_RETRY_BONUS_MS;

  const result = await withTimeout(
    runTinyFish(
      { url, goal: fullGoal, browser_profile: stealth ? "stealth" : "lite" },
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
    `executeTest(${url}) attempt=${attempt + 1}`,
  );

  // ── TinyFish-own error fallback retry ─────────────────────────────────────
  // When TinyFish returns a platform-level error (not a test-step failure),
  // retry once with the simpler fallback prompt before giving up.
  // This is separate from the MAX_TEST_RETRIES logic in testing.controller.ts,
  // which retries on test-step failures. This retry is specifically for the case
  // where TinyFish rejects our prompt entirely with its own error response.
  if (isTinyFishOwnError(result)) {
    const tfError = (result.resultJson as Record<string, unknown>)["error"] as string;
    console.warn(
      `[TestExecution] TinyFish-own error on primary prompt — retrying with fallback prompt. ` +
        `url=${url} attempt=${attempt + 1} tfError="${tfError}"`,
    );

    const fallbackGoal = buildFallbackExecuteTestGoal(steps);
    const fallbackResult = await withTimeout(
      runTinyFish(
        { url, goal: fallbackGoal, browser_profile: "stealth" },
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
      `executeTest(${url}) fallback attempt=${attempt + 1}`,
    );

    const fallbackDurationMs = Date.now() - startTime;

    const fallbackTinyfishRaw = JSON.stringify({
      success: fallbackResult.success,
      error: fallbackResult.error,
      resultJson: fallbackResult.resultJson,
      rawText: fallbackResult.rawText,
      // Tag the raw snapshot so we know which prompt path was used —
      // useful when debugging AI fix suggestions for this result.
      _promptPath: "fallback",
    });

    const fallbackParsed = parseExecuteTestResult(fallbackResult, fallbackDurationMs);

    return {
      ...fallbackParsed,
      screenshotUrl: null,
      durationMs: fallbackDurationMs,
      jobId: fallbackResult.jobId,
      tinyfishRaw: fallbackTinyfishRaw,
    };
  }

  const durationMs = Date.now() - startTime;

  // Build a serialised snapshot of everything TinyFish returned.
  // Stored on the result so testing.controller can pass it straight to
  // generateBugFixSuggestion without any further DB round-trips.
  const tinyfishRaw = JSON.stringify({
    success: result.success,
    error: result.error,
    resultJson: result.resultJson,
    rawText: result.rawText,
  });

  const parsed = parseExecuteTestResult(result, durationMs);

  return {
    ...parsed,
    screenshotUrl: null,
    durationMs,
    jobId: result.jobId,
    tinyfishRaw,
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