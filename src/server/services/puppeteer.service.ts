// src/server/services/puppeteer.service.ts
//
// Puppeteer-based screenshot and performance measurement service.
// All screenshot and perf work goes through this file — TinyFish is a browser
// automation AGENT, not a screenshot API. Puppeteer gives deterministic results.
//
// Key design decisions:
//   - capturePageScreenshots() opens ONE browser, creates 3 pages (one per viewport),
//     then closes the browser. Avoids the overhead of 3 separate browser launches.
//   - captureFullPageScreenshot() is used for single failure screenshots.
//   - measurePagePerformanceWithPuppeteer() is independent and opens its own browser.
//   - generateHtmlPdf() renders an HTML string directly — no URL loading, no auth issues.
//     Used by the PDF export endpoint instead of generatePagePdf.
//   - generatePagePdf() kept for backwards compatibility but generateHtmlPdf() is preferred.
//
// Requirements: npm install puppeteer
// For serverless/edge: npm install puppeteer-core @sparticuz/chromium

import type { PagePerformanceMetrics } from "./tinyfish.service";

// Extend window to allow arbitrary __perfMetrics key
declare global {
  interface Window {
    __perfMetrics: {
      lcpMs: number | null;
      clsScore: number;
      fidMs: number | null;
    };
  }
}

// Use puppeteer-core + @sparticuz/chromium in production for smaller bundle.
// Falls back to full puppeteer in local dev.
async function getBrowser() {
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — optional peer dep, may not be installed
    const chromium = await import("@sparticuz/chromium").then((m: { default: unknown }) => m.default).catch(() => null);
    const puppeteer = await import("puppeteer-core");

    if (chromium) {
      const c = chromium as {
        args: string[];
        defaultViewport: { width: number; height: number };
        executablePath: () => Promise<string>;
        headless: boolean;
      };
      const executablePath = await c.executablePath();
      return puppeteer.launch({
        args: c.args,
        defaultViewport: c.defaultViewport,
        executablePath,
        headless: c.headless,
      });
    }
  } catch {
    // Fall through to full puppeteer
  }

  const puppeteer = await import("puppeteer");
  return puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
    ],
  });
}

const VIEWPORT_WIDTHS = [375, 768, 1440] as const;
const PAGE_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// navigatePage
// Shared navigation helper used by screenshot and perf functions.
// Tries networkidle2 first, falls back to domcontentloaded + 3s wait.
// ---------------------------------------------------------------------------
async function navigatePage(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof getBrowser>>["newPage"]>>,
  url: string,
  timeoutMs = PAGE_TIMEOUT_MS,
): Promise<void> {
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: timeoutMs });
  } catch {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await new Promise((r) => setTimeout(r, 3_000));
  }
}

// ---------------------------------------------------------------------------
// dismissOverlays
// Best-effort dismissal of cookie banners and modals before screenshotting.
// ---------------------------------------------------------------------------
async function dismissOverlays(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof getBrowser>>["newPage"]>>,
): Promise<void> {
  await page
    .evaluate(() => {
      const selectors = [
        "[id*='cookie'] button",
        "[class*='cookie'] button",
        "[id*='consent'] button",
        "[class*='consent'] button",
        "[id*='modal'] .close",
        "[class*='modal'] .close",
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel) as HTMLButtonElement | null;
        if (el) {
          try { el.click(); } catch { /* ignore */ }
        }
      }
    })
    .catch(() => { /* ignore evaluate errors */ });
  await new Promise((r) => setTimeout(r, 500));
}

// ---------------------------------------------------------------------------
// capturePageScreenshots
//
// Captures full-page screenshots at 375px, 768px, and 1440px viewport widths
// using a SINGLE browser instance (3 tabs in parallel).
// Returns base64-encoded PNG strings (no data: prefix), or null on failure.
// ---------------------------------------------------------------------------
export async function capturePageScreenshots(url: string): Promise<{
  viewport375: string | null;
  viewport768: string | null;
  viewport1440: string | null;
}> {
  let browser = null;
  try {
    browser = await getBrowser();

    const results = await Promise.allSettled(
      VIEWPORT_WIDTHS.map(async (width) => {
        const page = await browser!.newPage();
        try {
          await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
          await page.setUserAgent(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          );

          // Block fonts and media to speed up loading — they don't affect layout screenshots
          await page.setRequestInterception(true);
          page.on("request", (req: { resourceType: () => string; abort: () => void; continue: () => void }) => {
            if (["font", "media"].includes(req.resourceType())) {
              req.abort();
            } else {
              req.continue();
            }
          });

          await navigatePage(page, url);

          // Wait for lazy-loaded content to settle
          await new Promise((r) => setTimeout(r, 1_500));

          await dismissOverlays(page);

          const screenshot = (await page.screenshot({
            fullPage: true,
            type: "png",
            encoding: "base64",
          })) as string;

          console.log(
            `[Puppeteer] ✓ Screenshot ${width}px for ${url} (${Math.round(screenshot.length / 1024)}KB)`,
          );
          return { width, screenshot };
        } finally {
          await page.close().catch(() => { /* ignore */ });
        }
      }),
    );

    const map: Record<number, string | null> = { 375: null, 768: null, 1440: null };
    for (const result of results) {
      if (result.status === "fulfilled") {
        map[result.value.width] = result.value.screenshot;
      } else {
        console.warn(`[Puppeteer] A viewport screenshot failed for ${url}:`, result.reason);
      }
    }

    return {
      viewport375: map[375] ?? null,
      viewport768: map[768] ?? null,
      viewport1440: map[1440] ?? null,
    };
  } catch (err) {
    console.error(`[Puppeteer] Browser launch failed for ${url}:`, err);
    return { viewport375: null, viewport768: null, viewport1440: null };
  } finally {
    if (browser) await browser.close().catch(() => { /* ignore */ });
  }
}

// ---------------------------------------------------------------------------
// captureFullPageScreenshot
//
// Captures a single full-page screenshot at the given viewport width.
// Used for bug/failure screenshots during test execution.
// Returns base64-encoded PNG string (no data: prefix), or null on failure.
// ---------------------------------------------------------------------------
export async function captureFullPageScreenshot(
  url: string,
  width = 1440,
): Promise<string | null> {
  let browser = null;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      );

      await navigatePage(page, url);
      await new Promise((r) => setTimeout(r, 1_000));

      const screenshot = (await page.screenshot({
        fullPage: true,
        type: "png",
        encoding: "base64",
      })) as string;

      console.log(
        `[Puppeteer] ✓ Failure screenshot ${width}px for ${url} (${Math.round(screenshot.length / 1024)}KB)`,
      );
      return screenshot;
    } finally {
      await page.close().catch(() => { /* ignore */ });
    }
  } catch (err) {
    console.error(`[Puppeteer] captureFullPageScreenshot failed for ${url}:`, err);
    return null;
  } finally {
    if (browser) await browser.close().catch(() => { /* ignore */ });
  }
}

// ---------------------------------------------------------------------------
// measurePagePerformanceWithPuppeteer
//
// Measures Core Web Vitals (LCP, CLS, FID, TTFB) using PerformanceObserver
// injected before navigation so observers are registered before any paint.
// ---------------------------------------------------------------------------
export async function measurePagePerformanceWithPuppeteer(
  url: string,
): Promise<PagePerformanceMetrics> {
  const fallback: PagePerformanceMetrics = {
    pageUrl: url,
    lcpMs: null,
    fidMs: null,
    cls: null,
    ttfbMs: null,
    rawMetrics: {},
  };

  let browser = null;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 1440, height: 900 });

      // Inject observers BEFORE navigation so they catch all events from the start
      await page.evaluateOnNewDocument(() => {
        window.__perfMetrics = {
          lcpMs: null,
          clsScore: 0,
          fidMs: null,
        };

        try {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const last = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
            if (last) {
              window.__perfMetrics = {
                ...window.__perfMetrics,
                lcpMs: Math.round(last.startTime),
              };
            }
          }).observe({ type: "largest-contentful-paint", buffered: true });
        } catch { /* LCP not supported in this browser */ }

        try {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const ls = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
              if (!ls.hadRecentInput) {
                window.__perfMetrics = {
                  ...window.__perfMetrics,
                  clsScore: (window.__perfMetrics.clsScore ?? 0) + ls.value,
                };
              }
            }
          }).observe({ type: "layout-shift", buffered: true });
        } catch { /* CLS not supported */ }

        try {
          new PerformanceObserver((list) => {
            const entry = list.getEntries()[0] as PerformanceEntry & {
              processingStart: number;
              startTime: number;
            };
            if (entry) {
              window.__perfMetrics = {
                ...window.__perfMetrics,
                fidMs: Math.round(entry.processingStart - entry.startTime),
              };
            }
          }).observe({ type: "first-input", buffered: true });
        } catch { /* FID not supported */ }
      });

      await navigatePage(page, url);

      // Wait for observers to collect data
      await new Promise((r) => setTimeout(r, 3_000));

      const metrics = await page.evaluate(() => {
        const perf = window.__perfMetrics;

        let ttfbMs: number | null = null;
        try {
          const nav = performance.getEntriesByType(
            "navigation",
          )[0] as PerformanceNavigationTiming | undefined;
          if (nav) ttfbMs = Math.round(nav.responseStart - nav.requestStart);
        } catch { /* ignore */ }

        return {
          lcpMs: perf?.lcpMs ?? null,
          cls:
            perf?.clsScore != null
              ? Math.round(perf.clsScore * 1000) / 1000
              : null,
          fidMs: perf?.fidMs ?? null,
          ttfbMs,
        };
      });

      console.log(
        `[Puppeteer] ⚡ Perf ${url}: LCP=${metrics.lcpMs}ms TTFB=${metrics.ttfbMs}ms CLS=${metrics.cls}`,
      );

      return {
        pageUrl: url,
        lcpMs: metrics.lcpMs,
        fidMs: metrics.fidMs,
        cls: metrics.cls,
        ttfbMs: metrics.ttfbMs,
        rawMetrics: metrics as Record<string, unknown>,
      };
    } finally {
      await page.close().catch(() => { /* ignore */ });
    }
  } catch (err) {
    console.error(`[Puppeteer] measurePagePerformance failed for ${url}:`, err);
    return fallback;
  } finally {
    if (browser) await browser.close().catch(() => { /* ignore */ });
  }
}

// ---------------------------------------------------------------------------
// generatePagePdf
//
// Renders a URL in a headless browser and returns PDF bytes.
// NOTE: Prefer generateHtmlPdf() for authenticated pages — this function
// requires the URL to be publicly accessible (no auth gate).
// Returns a Buffer, or null on failure.
// ---------------------------------------------------------------------------
export async function generatePagePdf(url: string): Promise<Buffer | null> {
  let browser = null;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 1440, height: 900 });

      await navigatePage(page, url, 60_000);

      // Wait for charts and lazy content to render
      await new Promise((r) => setTimeout(r, 3_000));

      // Expand all collapsed sections so they appear in the PDF
      await page
        .evaluate(() => {
          document.querySelectorAll("details").forEach((d) => {
            d.open = true;
          });
        })
        .catch(() => { /* ignore */ });

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
      });

      return Buffer.from(pdf);
    } finally {
      await page.close().catch(() => { /* ignore */ });
    }
  } catch (err) {
    console.error(`[Puppeteer] generatePagePdf failed for ${url}:`, err);
    return null;
  } finally {
    if (browser) await browser.close().catch(() => { /* ignore */ });
  }
}

// ---------------------------------------------------------------------------
// generateHtmlPdf
//
// Renders an HTML string directly via page.setContent() — NO URL loading,
// NO auth dependency, works in any server environment.
//
// This is the PREFERRED method for PDF export of report data because:
//   1. No session cookie needed — data is fetched server-side before calling this
//   2. No dependency on NEXT_PUBLIC_APP_URL or localhost reachability
//   3. waitUntil: "networkidle0" waits for S3 bug screenshots to load
//
// Returns a Buffer, or null on failure.
// ---------------------------------------------------------------------------
export async function generateHtmlPdf(html: string): Promise<Buffer | null> {
  let browser = null;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 1200, height: 900 });

      // Set content directly — no URL, no auth, no network dependency.
      // networkidle0 waits for any inline images (e.g. S3 bug screenshots) to load.
      await page.setContent(html, {
        waitUntil: "networkidle0",
        timeout: 30_000,
      });

      // Extra buffer for images that may still be rendering after networkidle0
      await new Promise((r) => setTimeout(r, 2_000));

      // Expand any details/summary elements so they print
      await page.evaluate(() => {
        document.querySelectorAll("details").forEach((d) => { d.open = true; });
      }).catch(() => { /* ignore */ });

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "14mm", bottom: "14mm", left: "12mm", right: "12mm" },
        displayHeaderFooter: false,
      });

      console.log(`[Puppeteer] ✓ HTML→PDF generated (${Math.round(pdf.byteLength / 1024)}KB)`);
      return Buffer.from(pdf);
    } finally {
      await page.close().catch(() => { /* ignore */ });
    }
  } catch (err) {
    console.error(`[Puppeteer] generateHtmlPdf failed:`, err);
    return null;
  } finally {
    if (browser) await browser.close().catch(() => { /* ignore */ });
  }
}