// src/server/services/tinyfish.service.ts
//
// TinyFish Web Agent API wrapper
// Docs: https://docs.tinyfish.ai
// Endpoint: POST https://agent.tinyfish.ai/v1/automation/run-sse
//
// Two main functions:
//   crawlPage(url)         → structured site map for one page
//   executeTest(url, goal) → pass/fail result for one test case

const TINYFISH_API_URL = "https://agent.tinyfish.ai/v1/automation/run-sse";
const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TinyFishRequest {
  url: string;
  goal: string;
  browser_profile?: "default" | "stealth";
  proxy_config?: {
    enabled: boolean;
    country_code?: string;
  };
}

export interface TinyFishResult {
  success: boolean;
  resultJson: Record<string, unknown> | null;
  rawText: string | null;
  error: string | null;
  jobId: string | null;
}

// What one crawled page looks like
export interface CrawledPage {
  url: string;
  title: string;
  elements: {
    type: string;      // button, input, link, form, etc.
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
    fields: { name: string; type: string; required: boolean }[];
  }[];
  screenshot?: string; // base64 or URL
}

// What one test execution result looks like
export interface TestExecutionResult {
  passed: boolean;
  actualResult: string;
  errorDetails: string | null;
  screenshotUrl: string | null;
  durationMs: number;
  consoleLogs: string[];
}

// ---------------------------------------------------------------------------
// Core SSE runner
// ---------------------------------------------------------------------------

async function runTinyFish(request: TinyFishRequest): Promise<TinyFishResult> {
  if (!TINYFISH_API_KEY) {
    throw new Error("TINYFISH_API_KEY is not set in environment variables");
  }

  const startTime = Date.now();
  let resultJson: Record<string, unknown> | null = null;
  let rawText = "";
  let jobId: string | null = null;

  try {
    const response = await fetch(TINYFISH_API_URL, {
      method: "POST",
      headers: {
        "X-API-Key": TINYFISH_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        resultJson: null,
        rawText: null,
        error: `TinyFish API error ${response.status}: ${errorText}`,
        jobId: null,
      };
    }

    if (!response.body) {
      return {
        success: false,
        resultJson: null,
        rawText: null,
        error: "No response body from TinyFish",
        jobId: null,
      };
    }

    // Read SSE stream line by line
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        // SSE lines are prefixed with "data: "
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        try {
          const event = JSON.parse(jsonStr) as {
            type?: string;
            status?: string;
            resultJson?: Record<string, unknown>;
            text?: string;
            jobId?: string;
            error?: string;
          };

          // Grab job ID from any event that has it
          if (event.jobId) jobId = event.jobId;

          // Accumulate any intermediate text
          if (event.text) rawText += event.text;

          // COMPLETE event has the final result
          if (event.type === "COMPLETE") {
            if (event.status === "COMPLETED") {
              resultJson = event.resultJson ?? null;
              return {
                success: true,
                resultJson,
                rawText: rawText || null,
                error: null,
                jobId,
              };
            } else {
              // COMPLETE but status is not COMPLETED (e.g. FAILED)
              return {
                success: false,
                resultJson: null,
                rawText: rawText || null,
                error: event.error ?? `Run ended with status: ${event.status}`,
                jobId,
              };
            }
          }
        } catch {
          // Malformed SSE line — skip and continue
        }
      }
    }

    // Stream ended without a COMPLETE event
    return {
      success: false,
      resultJson: null,
      rawText: rawText || null,
      error: "SSE stream ended without a COMPLETE event",
      jobId,
    };
  } catch (err) {
    return {
      success: false,
      resultJson: null,
      rawText: null,
      error: err instanceof Error ? err.message : "Unknown TinyFish error",
      jobId,
    };
  }
}

// ---------------------------------------------------------------------------
// Public: Crawl a single page
// ---------------------------------------------------------------------------
//
// Fires one TinyFish call per page. For a 20-page site, call this 20 times
// in parallel with Promise.all() — each call is independent.
//
// Usage:
//   const pages = await Promise.all(urls.map(url => crawlPage(url)));

export async function crawlPage(url: string): Promise<CrawledPage> {
  const goal = `
    Crawl this page and return a JSON object with this exact structure:
    {
      "url": "<the page URL>",
      "title": "<page title>",
      "elements": [
        { "type": "button|input|link|select|textarea", "text": "<visible text>", "href": "<if link>", "isVisible": true }
      ],
      "internalLinks": ["<list of all internal links found on page>"],
      "externalLinks": ["<list of all external links found on page>"],
      "forms": [
        {
          "action": "<form action url if present>",
          "method": "get|post",
          "fields": [{ "name": "<field name>", "type": "<input type>", "required": true }]
        }
      ]
    }
    Return ONLY valid JSON. No extra text.
  `.trim();

  const result = await runTinyFish({
    url,
    goal,
    browser_profile: "stealth",
  });

  if (!result.success || !result.resultJson) {
    // Return a minimal safe result so the pipeline doesn't die on one bad page
    console.error(`[TinyFish] crawlPage failed for ${url}: ${result.error}`);
    return {
      url,
      title: "",
      elements: [],
      internalLinks: [],
      externalLinks: [],
      forms: [],
    };
  }

  return result.resultJson as unknown as CrawledPage;
}

// ---------------------------------------------------------------------------
// Public: Execute a single test case
// ---------------------------------------------------------------------------
//
// Each test case becomes one TinyFish API call.
// Fire all test cases in parallel (batches of 50).
//
// Usage:
//   const result = await executeTest(url, "Click the signup button and verify the form appears");

export async function executeTest(
  url: string,
  goal: string,
  stealth = false,
): Promise<TestExecutionResult> {
  const startTime = Date.now();

  const wrappedGoal = `
    ${goal}

    After completing the task, return a JSON object:
    {
      "passed": true,
      "actualResult": "<what actually happened>",
      "errorDetails": null,
      "consoleLogs": []
    }

    If the test FAILS (element not found, unexpected behavior, error shown), return:
    {
      "passed": false,
      "actualResult": "<what actually happened>",
      "errorDetails": "<specific error or unexpected behavior>",
      "consoleLogs": ["<any console errors if visible>"]
    }

    Return ONLY valid JSON. No extra text.
  `.trim();

  const result = await runTinyFish({
    url,
    goal: wrappedGoal,
    browser_profile: stealth ? "stealth" : "default",
  });

  const durationMs = Date.now() - startTime;

  if (!result.success || !result.resultJson) {
    return {
      passed: false,
      actualResult: "TinyFish execution failed",
      errorDetails: result.error,
      screenshotUrl: null,
      durationMs,
      consoleLogs: [],
    };
  }

  const r = result.resultJson as {
    passed?: boolean;
    actualResult?: string;
    errorDetails?: string | null;
    consoleLogs?: string[];
  };

  return {
    passed: r.passed ?? false,
    actualResult: r.actualResult ?? "",
    errorDetails: r.errorDetails ?? null,
    screenshotUrl: null, // Screenshots via R2 added in Phase 2
    durationMs,
    consoleLogs: r.consoleLogs ?? [],
  };
}

// ---------------------------------------------------------------------------
// Public: Crawl entire site (parallel across all pages)
// ---------------------------------------------------------------------------
//
// Step 1 of the pipeline. Discovers all pages from a sitemap/homepage,
// then crawls each page in parallel.
//
// Usage:
//   const siteMap = await crawlSite("https://example.com");

export async function crawlSite(rootUrl: string): Promise<{
  pages: CrawledPage[];
  allLinks: string[];
  crawlTimeMs: number;
}> {
  const startTime = Date.now();

  // First: discover all internal URLs from the root page
  const discoveryGoal = `
    Navigate to this page and return a JSON object:
    {
      "internalLinks": ["<all unique internal page URLs found — full absolute URLs>"]
    }
    Include the homepage itself. Max 50 pages. Return ONLY valid JSON.
  `.trim();

  const discovery = await runTinyFish({
    url: rootUrl,
    goal: discoveryGoal,
    browser_profile: "stealth",
  });

  let urlsToCrawl: string[] = [rootUrl];

  if (discovery.success && discovery.resultJson) {
    const discovered = discovery.resultJson as { internalLinks?: string[] };
    const links = discovered.internalLinks ?? [];
    // Deduplicate and cap at 50 pages for MVP
    urlsToCrawl = [...new Set([rootUrl, ...links])].slice(0, 50);
  }

  // Then: crawl all discovered pages in parallel
  const pages = await Promise.all(urlsToCrawl.map((url) => crawlPage(url)));

  const allLinks = [...new Set(pages.flatMap((p) => p.internalLinks))];
  const crawlTimeMs = Date.now() - startTime;

  return { pages, allLinks, crawlTimeMs };
}