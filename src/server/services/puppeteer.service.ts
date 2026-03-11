// src/server/services/puppeteer.service.ts

import type { PagePerformanceMetrics } from "./tinyfish.service";
import * as fs from "fs";
import * as os from "os";

declare global {
  interface Window {
    __perfMetrics: {
      lcpMs: number | null;
      clsScore: number;
      fidMs: number | null;
    };
  }
}

// ---------------------------------------------------------------------------
// getBrowser
//
// Universal browser resolution — works on Windows, Mac, Linux, and serverless.
//
// Resolution order:
//   1. PUPPETEER_EXECUTABLE_PATH env var  — explicit override, always wins
//   2. @sparticuz/chromium                — serverless / Linux Lambda only
//   3. System-installed browsers          — searches well-known install paths
//      for Chrome, Edge, Brave, Chromium on Windows / Mac / Linux
//   4. Puppeteer's bundled Chromium       — guaranteed fallback
//      (run `npx puppeteer browsers install chrome` once after npm install)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBrowser = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPage = any;

/** Returns the first path from the list that exists on disk, or undefined. */
function findFirstExisting(...candidates: string[]): string | undefined {
  return candidates.find((p) => {
    try { return fs.existsSync(p); } catch { return false; }
  });
}

/** Platform-aware list of well-known Chromium-compatible browser install paths. */
function getSystemBrowserCandidates(): string[] {
  const platform = os.platform();

  if (platform === "win32") {
    const pf    = process.env["ProgramFiles"]        ?? "C:\\Program Files";
    const pf86  = process.env["ProgramFiles(x86)"]   ?? "C:\\Program Files (x86)";
    const local = process.env["LOCALAPPDATA"]         ?? "";
    return [
      // Google Chrome
      `${pf}\\Google\\Chrome\\Application\\chrome.exe`,
      `${pf86}\\Google\\Chrome\\Application\\chrome.exe`,
      `${local}\\Google\\Chrome\\Application\\chrome.exe`,
      `${local}\\Google\\Chrome Beta\\Application\\chrome.exe`,
      `${local}\\Google\\Chrome SxS\\Application\\chrome.exe`,
      // Microsoft Edge (ships with Windows 10/11 — reliable fallback)
      `${pf}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${pf86}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${local}\\Microsoft\\Edge\\Application\\msedge.exe`,
      // Brave
      `${pf}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
      `${pf86}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
      // Chromium community builds
      `${pf}\\Chromium\\Application\\chrome.exe`,
      `${pf86}\\Chromium\\Application\\chrome.exe`,
    ];
  }

  if (platform === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta",
      "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ];
  }

  // Linux
  return [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome-beta",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/microsoft-edge",
    "/usr/bin/microsoft-edge-stable",
    "/usr/bin/brave-browser",
    "/snap/bin/chromium",
    "/snap/bin/google-chrome",
  ];
}

async function getBrowser(): Promise<AnyBrowser> {
  const platform  = os.platform();
  const isWindows = platform === "win32";
  const isLinux   = platform === "linux";

  // Args: Windows does not support --no-sandbox (causes immediate crash)
  const args = isWindows
    ? ["--disable-dev-shm-usage", "--disable-gpu", "--no-first-run", "--disable-extensions"]
    : ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--no-first-run", "--disable-extensions"];

  // ── 1. Explicit env override ─────────────────────────────────────────────
  const envPath = process.env["PUPPETEER_EXECUTABLE_PATH"];
  if (envPath && fs.existsSync(envPath)) {
    console.log(`[Puppeteer] Using PUPPETEER_EXECUTABLE_PATH: ${envPath}`);
    const puppeteerCore = await import("puppeteer-core");
    return puppeteerCore.launch({ executablePath: envPath, headless: true, args });
  }

  // ── 2. @sparticuz/chromium (Linux serverless / Lambda only) ─────────────
  // Skipped on Windows and Mac — this package only ships a Linux binary and
  // returns a nonexistent temp path on other platforms, causing ENOENT.
  if (isLinux) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chromium = await import("@sparticuz/chromium").then((m: any) => m.default).catch(() => null) as {
        args: string[];
        defaultViewport: { width: number; height: number } | null;
        executablePath: () => Promise<string>;
        headless: boolean;
      } | null;

      if (chromium) {
        const executablePath = await chromium.executablePath();
        if (executablePath && fs.existsSync(executablePath)) {
          const puppeteerCore = await import("puppeteer-core");
          console.log(`[Puppeteer] Using @sparticuz/chromium: ${executablePath}`);
          return puppeteerCore.launch({
            args: [...chromium.args, ...args],
            defaultViewport: chromium.defaultViewport,
            executablePath,
            headless: true,
          });
        }
      }
    } catch { /* fall through */ }
  }

  // ── 3. System-installed browser (Chrome, Edge, Brave, Chromium) ─────────
  // No extra packages — checks well-known install paths per platform.
  // On Windows, Edge is pre-installed on every Win10/11 machine, so this
  // will almost always succeed without any manual setup.
  const systemBrowser = findFirstExisting(...getSystemBrowserCandidates());
  if (systemBrowser) {
    console.log(`[Puppeteer] Using system browser: ${systemBrowser}`);
    const puppeteerCore = await import("puppeteer-core");
    return puppeteerCore.launch({ executablePath: systemBrowser, headless: true, args });
  }

  // ── 4. Puppeteer's own bundled Chromium ──────────────────────────────────
  // Requires: npx puppeteer browsers install chrome  (once after npm install)
  console.log(`[Puppeteer] Falling back to Puppeteer bundled Chromium`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const puppeteer = await import("puppeteer") as any;
  const p = puppeteer.default ?? puppeteer;
  return p.launch({ headless: true, args });
}

// ---------------------------------------------------------------------------
// safePdfBytes
//
// Converts whatever page.pdf() returns (Uint8Array or Buffer) into a plain
// ArrayBuffer that owns its own memory — no Buffer pool offset issues,
// and accepted by TypeScript's BodyInit without any casting.
// ---------------------------------------------------------------------------
function safePdfBytes(pdf: Uint8Array | ArrayBuffer): ArrayBuffer {
  if (pdf instanceof ArrayBuffer) return pdf;
  return pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
}

const PAGE_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// navigatePage
// ---------------------------------------------------------------------------
async function navigatePage(page: AnyPage, url: string, timeoutMs = PAGE_TIMEOUT_MS): Promise<void> {
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: timeoutMs });
  } catch {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await new Promise((r) => setTimeout(r, 3_000));
  }
}

// ---------------------------------------------------------------------------
// dismissOverlays
// ---------------------------------------------------------------------------
async function dismissOverlays(page: AnyPage): Promise<void> {
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
// ---------------------------------------------------------------------------
const VIEWPORT_WIDTHS = [375, 768, 1440] as const;

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
        const page: AnyPage = await browser!.newPage();
        try {
          await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
          await page.setUserAgent(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          );
          await page.setRequestInterception(true);
          page.on("request", (req: { resourceType: () => string; abort: () => void; continue: () => void }) => {
            if (["font", "media"].includes(req.resourceType())) req.abort();
            else req.continue();
          });
          await navigatePage(page, url);
          await new Promise((r) => setTimeout(r, 1_500));
          await dismissOverlays(page);
          const screenshot = await page.screenshot({ fullPage: true, type: "png", encoding: "base64" }) as string;
          console.log(`[Puppeteer] ✓ Screenshot ${width}px for ${url} (${Math.round(screenshot.length / 1024)}KB)`);
          return { width, screenshot };
        } finally {
          await page.close().catch(() => { /* ignore */ });
        }
      }),
    );
    const map: Record<number, string | null> = { 375: null, 768: null, 1440: null };
    for (const result of results) {
      if (result.status === "fulfilled") map[result.value.width] = result.value.screenshot;
      else console.warn(`[Puppeteer] Viewport screenshot failed for ${url}:`, result.reason);
    }
    return { viewport375: map[375] ?? null, viewport768: map[768] ?? null, viewport1440: map[1440] ?? null };
  } catch (err) {
    console.error(`[Puppeteer] Browser launch failed for ${url}:`, err);
    return { viewport375: null, viewport768: null, viewport1440: null };
  } finally {
    if (browser) await browser.close().catch(() => { /* ignore */ });
  }
}

// ---------------------------------------------------------------------------
// captureFullPageScreenshot
// ---------------------------------------------------------------------------
export async function captureFullPageScreenshot(url: string, width = 1440): Promise<string | null> {
  let browser = null;
  try {
    browser = await getBrowser();
    const page: AnyPage = await browser.newPage();
    try {
      await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      );
      await navigatePage(page, url);
      await new Promise((r) => setTimeout(r, 1_000));
      const screenshot = await page.screenshot({ fullPage: true, type: "png", encoding: "base64" }) as string;
      console.log(`[Puppeteer] ✓ Failure screenshot ${width}px for ${url} (${Math.round(screenshot.length / 1024)}KB)`);
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
// ---------------------------------------------------------------------------
export async function measurePagePerformanceWithPuppeteer(url: string): Promise<PagePerformanceMetrics> {
  const fallback: PagePerformanceMetrics = { pageUrl: url, lcpMs: null, fidMs: null, cls: null, ttfbMs: null, rawMetrics: {} };
  let browser = null;
  try {
    browser = await getBrowser();
    const page: AnyPage = await browser.newPage();
    try {
      await page.setViewport({ width: 1440, height: 900 });

      // Inject observers BEFORE navigation so they catch all events
      await page.evaluateOnNewDocument(() => {
        window.__perfMetrics = { lcpMs: null, clsScore: 0, fidMs: null };

        // LCP — fires on largest paint, buffered so we catch it after load too
        try {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const last = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
            if (last) window.__perfMetrics.lcpMs = Math.round(last.startTime);
          }).observe({ type: "largest-contentful-paint", buffered: true });
        } catch { /* browser doesn't support LCP */ }

        // CLS — accumulate all layout shifts that weren't caused by user input
        try {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const ls = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
              if (!ls.hadRecentInput) window.__perfMetrics.clsScore += ls.value;
            }
          }).observe({ type: "layout-shift", buffered: true });
        } catch { /* browser doesn't support CLS */ }

        // Event Timing (INP-adjacent) — Puppeteer can't generate real user
        // input, so this will only fire if the page itself dispatches events
        // during load (e.g. auto-focus, programmatic clicks). We keep it
        // because it's occasionally useful and never harmful.
        try {
          new PerformanceObserver((list) => {
            const entry = list.getEntries()[0] as PerformanceEntry & { processingStart: number; startTime: number };
            if (entry && window.__perfMetrics.fidMs === null) {
              window.__perfMetrics.fidMs = Math.round(entry.processingStart - entry.startTime);
            }
          }).observe({ type: "first-input", buffered: true });
        } catch { /* not supported */ }
      });

      await navigatePage(page, url);

      // Give LCP + CLS observers more breathing room
      await new Promise((r) => setTimeout(r, 4_000));

      const metrics = await page.evaluate(() => {
        const perf = window.__perfMetrics;

        // Navigation Timing — these are always present and reliable
        let ttfbMs: number | null = null;
        let domContentLoadedMs: number | null = null;
        let loadEventMs: number | null = null;

        try {
          const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
          if (nav) {
            ttfbMs = Math.round(nav.responseStart - nav.requestStart);
            domContentLoadedMs = Math.round(nav.domContentLoadedEventEnd);
            loadEventMs = Math.round(nav.loadEventEnd);
          }
        } catch { /* ignore */ }

        return {
          lcpMs: perf?.lcpMs ?? null,
          // Round CLS to 3 decimal places — the standard display precision
          cls: perf?.clsScore != null ? Math.round(perf.clsScore * 1000) / 1000 : null,
          // FID/first-input: null unless page fired a programmatic event during load
          fidMs: perf?.fidMs ?? null,
          ttfbMs,
          domContentLoadedMs,
          loadEventMs,
        };
      });

      console.log(
        `[Puppeteer] ⚡ Perf ${url}: LCP=${metrics.lcpMs}ms TTFB=${metrics.ttfbMs}ms ` +
        `DCL=${metrics.domContentLoadedMs}ms Load=${metrics.loadEventMs}ms CLS=${metrics.cls}`
      );

      return {
        pageUrl: url,
        lcpMs: metrics.lcpMs,
        fidMs: metrics.fidMs, // kept in type for schema compat, usually null
        cls: metrics.cls,
        ttfbMs: metrics.ttfbMs,
        rawMetrics: {
          domContentLoadedMs: metrics.domContentLoadedMs,
          loadEventMs: metrics.loadEventMs,
          ...metrics,
        },
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
// ---------------------------------------------------------------------------
export async function generatePagePdf(url: string): Promise<ArrayBuffer | null> {
  let browser = null;
  try {
    browser = await getBrowser();
    const page: AnyPage = await browser.newPage();
    try {
      await page.setViewport({ width: 1440, height: 900 });
      await navigatePage(page, url, 60_000);
      await new Promise((r) => setTimeout(r, 3_000));
      await page.evaluate(() => {
        document.querySelectorAll("details").forEach((d) => { (d as HTMLDetailsElement).open = true; });
      }).catch(() => { /* ignore */ });
      const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" } });
      return safePdfBytes(pdf);
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
// Renders an HTML string via page.setContent() — no URL, no auth required.
// Returns a plain ArrayBuffer so it is always accepted as BodyInit by
// TypeScript across all Next.js / Bun / Node targets without any casting.
// ---------------------------------------------------------------------------
export async function generateHtmlPdf(html: string): Promise<ArrayBuffer | null> {
  let browser = null;
  try {
    browser = await getBrowser();
    const page: AnyPage = await browser.newPage();
    try {
      await page.setViewport({ width: 1200, height: 900 });
      await page.setContent(html, { waitUntil: "networkidle0", timeout: 30_000 });
      await new Promise((r) => setTimeout(r, 2_000));
      await page.evaluate(() => {
        document.querySelectorAll("details").forEach((d) => { (d as HTMLDetailsElement).open = true; });
      }).catch(() => { /* ignore */ });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "14mm", bottom: "14mm", left: "12mm", right: "12mm" },
        displayHeaderFooter: false,
      });
      const pdfBuffer = safePdfBytes(pdf);
      console.log(`[Puppeteer] ✓ HTML→PDF generated (${Math.round(pdfBuffer.byteLength / 1024)}KB)`);
      return pdfBuffer;
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