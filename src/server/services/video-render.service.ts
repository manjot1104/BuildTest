// server/services/video-render.service.ts
//
// Server-side Remotion rendering that runs directly on Vercel (no Lambda).
//
// ── HOW IT WORKS ──────────────────────────────────────────────────────────────
// 1. Caller creates a render job row in DB (via createRenderJob in queries).
// 2. Caller invokes renderVideoJob() — this function owns the full lifecycle:
//      a. markJobRunning  → status = "running"
//      b. bundle()        → Webpack-compiles the Remotion composition
//      c. renderMedia()   → Puppeteer renders frames → FFmpeg stitches MP4
//      d. Upload MP4      → S3 (via uploadRenderedVideo)
//      e. markJobDone     → status = "done", output_url = S3 URL
//      f. On any error    → markJobFailed
// 3. Progress is reported every ~5% via updateJobProgress (DB write).
//
// ── VERCEL CONSTRAINTS ────────────────────────────────────────────────────────
// • Max function duration: 60 s (Pro) / 300 s (Enterprise).
//   Set `maxDuration = 300` in your route config for Enterprise, or keep
//   videos ≤ 40 s which renders in ~20–50 s on Pro.
// • Remotion bundles the composition on every cold start (~3–8 s).
//   The bundled output is written to /tmp (Vercel's only writable FS).
// • Puppeteer headless Chrome is available via `@sparticuz/chromium`
//   (already a peer dep of @remotion/renderer for serverless).
//
// ── OUTPUT ────────────────────────────────────────────────────────────────────
// • The rendered MP4 is uploaded to S3 at:
//     rendered-videos/{jobId}/output.mp4
// • Returns the public S3 URL on success.
//
// ── DEPENDENCIES ─────────────────────────────────────────────────────────────
// • @remotion/renderer          — renderMedia, selectComposition
// • @remotion/bundler           — bundle (Webpack)
// • @sparticuz/chromium-min     — headless Chrome binary for serverless
//
// Install:
//   pnpm add @remotion/renderer @remotion/bundler @sparticuz/chromium-min
// ---------------------------------------------------------------------------

import path from "path";
import fs from "fs";
import os from "os";
import { execSync } from "child_process";

// Remotion renderer — only imported server-side.
// These imports are never reached by the client bundle because this file
// lives under server/ and is never imported by any client component.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import chromium from "@sparticuz/chromium";

import type { VideoJson } from "@/remotion-src/types";
import {
  markJobRunning,
  markJobDone,
  markJobFailed,
  updateJobProgress,
} from "@/server/db/queries";
import { uploadRenderedVideo } from "@/server/services/s3.service";

// ── Config ────────────────────────────────────────────────────────────────────

// Composition ID as registered in your Remotion root (src/remotion-src/index.tsx
// or wherever you call registerRoot / Composition).
const COMPOSITION_ID = process.env.REMOTION_COMPOSITION_ID ?? "VideoComposition";

// Absolute path to the Remotion entry point (the file passed to bundle()).
// This must be the file that calls registerRoot().
// Adjust if your project layout differs.
const REMOTION_ENTRY = path.join(process.cwd(), "src", "remotion-src", "index.ts");

// Output quality — balanced for speed vs. file size on Vercel.
// crf 28 → ~0.5–2 MB / minute at 1080p. Lower = better quality, larger file.
const VIDEO_CRF = Number(process.env.RENDER_CRF ?? "28");

// Max concurrent Puppeteer pages. Keep at 1 for Vercel's memory limits.
const CONCURRENCY = 1;

// ── Bundle cache ─────────────────────────────────────────────────────────────
// Remotion's bundle() compiles with Webpack and writes the output to a temp dir.
// Caching the bundle path avoids recompiling on every warm invocation.
// On cold starts the cache is empty and bundle() runs (~3–8 s).
//
// NOTE: This is an in-process module-level cache. It persists across warm
// Vercel invocations of the *same* function instance but is NOT shared between
// concurrent instances. That's fine — each instance rebuilds at most once.

let _bundlePath: string | null = null;

async function getBundlePath(): Promise<string> {
  if (_bundlePath && fs.existsSync(_bundlePath)) {
    console.log(`[RenderService] Using cached bundle at ${_bundlePath}`);
    return _bundlePath;
  }

  console.log("[RenderService] Building Remotion bundle…");
  const start = Date.now();

  const bundleLocation = await bundle({
    entryPoint: REMOTION_ENTRY,
    // Write bundle to /tmp — the only writable location on Vercel
    outDir: path.join(os.tmpdir(), "remotion-bundle"),
    onProgress: (progress) => {
      if (progress % 25 === 0) {
        console.log(`[RenderService] Bundle progress: ${progress}%`);
      }
    },
    webpackOverride: (config) => config,
  });

  _bundlePath = bundleLocation;
  console.log(`[RenderService] ✓ Bundle ready in ${Date.now() - start}ms at ${_bundlePath}`);
  return _bundlePath;
}

// ── Browser executable resolver ───────────────────────────────────────────────
// @sparticuz/chromium only ships a real binary on Lambda/Vercel serverless.
// For local dev (Windows, macOS, Linux) we scan well-known install paths,
// then fall back to a PATH lookup, then the CHROMIUM_EXECUTABLE_PATH env var.

async function getBrowserExecutable(): Promise<string> {
  // Explicit override via env var — useful for CI, Docker, or any environment
  if (process.env.CHROMIUM_EXECUTABLE_PATH) {
    return process.env.CHROMIUM_EXECUTABLE_PATH;
  }

  // On Vercel / AWS Lambda — sparticuz ships a real binary
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return chromium.executablePath();
  }

  // Local dev: scan well-known install locations per platform
  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          (process.env.LOCALAPPDATA ?? "") + "\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files\\Chromium\\Application\\chrome.exe",
        ]
      : process.platform === "darwin"
      ? [
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Chromium.app/Contents/MacOS/Chromium",
        ]
      : [
          // Linux
          "/usr/bin/google-chrome",
          "/usr/bin/google-chrome-stable",
          "/usr/bin/chromium",
          "/usr/bin/chromium-browser",
          "/snap/bin/chromium",
        ];

  for (const p of candidates) {
    if (p && fs.existsSync(p)) {
      console.log(`[RenderService] Found local Chrome at: ${p}`);
      return p;
    }
  }

  // Last resort: ask the OS via PATH
  try {
    const which =
      process.platform === "win32"
        ? (execSync("where chrome 2>nul || where chromium 2>nul").toString().split("\n")[0] ?? "").trim()
        : execSync("which google-chrome || which chromium || which chromium-browser 2>/dev/null")
            .toString()
            .trim();
    if (which) return which;
  } catch {
    // ignore — will throw below
  }

  throw new Error(
    "No Chrome/Chromium binary found. " +
      "Install Google Chrome, or set the CHROMIUM_EXECUTABLE_PATH env var to its path.",
  );
}

// ── Main render function ──────────────────────────────────────────────────────

export interface RenderVideoJobParams {
  jobId: string;
  userId: string;
  videoJson: VideoJson;
}

export interface RenderVideoJobResult {
  success: true;
  outputUrl: string;
  jobId: string;
}

export interface RenderVideoJobError {
  success: false;
  error: string;
  jobId: string;
}

/**
 * renderVideoJob
 *
 * Renders a VideoJson to MP4, uploads to S3, and updates the DB job record.
 * This is the single entry point called by the render route handler.
 *
 * Lifecycle:
 *   pending → running → done   (on success)
 *   pending → running → failed (on any error)
 *
 * Progress is written to DB every ~5% so the polling endpoint can
 * surface a progress bar to the user.
 *
 * Key @remotion/renderer v4 API note:
 *   `browserExecutable` (the path to the Chromium binary) is a TOP-LEVEL
 *   option on both selectComposition() and renderMedia() — it does NOT go
 *   inside the `chromiumOptions` object. `chromiumOptions` only accepts
 *   browser behaviour flags (headless, gl, disableWebSecurity, etc.).
 */
export async function renderVideoJob(
  params: RenderVideoJobParams,
): Promise<RenderVideoJobResult | RenderVideoJobError> {
  const { jobId, videoJson } = params;

  // ── 1. Transition job to "running" ─────────────────────────────────────────
  await markJobRunning(jobId);
  console.log(`[RenderService] Job ${jobId} started`);

  try {
    // ── 2. Get (or build) the Webpack bundle ──────────────────────────────────
    const bundlePath = await getBundlePath();
    await updateJobProgress(jobId, 5);

    // ── 3. Resolve chromium executable ────────────────────────────────────────
    // getBrowserExecutable() handles all environments: Vercel/Lambda (sparticuz),
    // Windows/macOS/Linux local dev (well-known paths + PATH lookup), and any
    // environment via the CHROMIUM_EXECUTABLE_PATH env var override.
    const browserExecutable = await getBrowserExecutable();
    console.log(`[RenderService] Chromium at: ${browserExecutable}`);

    // Shared chromium behaviour options (not the binary path — see above).
    // gl: "swiftshader" is required on Vercel because there is no GPU.
    // On local dev we use "angle" which is more stable across platforms.
    const sharedChromiumOptions = {
      headless: true,
      gl: (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
        ? ("swiftshader" as const)
        : ("angle" as const),
      disableWebSecurity: false,
      ignoreCertificateErrors: false,
    } satisfies Parameters<typeof selectComposition>[0]["chromiumOptions"];

    // ── 4. Select composition and inject inputProps ────────────────────────────
    // selectComposition() spins up a headless browser, evaluates all
    // <Composition> registrations, and returns the one matching COMPOSITION_ID.
    // `browserExecutable` is top-level (v4+), not inside chromiumOptions.
    const composition = await selectComposition({
      serveUrl: bundlePath,
      id: COMPOSITION_ID,
      inputProps: { videoJson },
      browserExecutable,           // top-level in @remotion/renderer v4
      chromiumOptions: sharedChromiumOptions,
    });

    console.log(
      `[RenderService] Composition: ${composition.durationInFrames} frames @ ${composition.fps} fps`,
    );
    await updateJobProgress(jobId, 10);

    // ── 5. Output path in /tmp ────────────────────────────────────────────────
    const outputPath = path.join(os.tmpdir(), `render-${jobId}.mp4`);

    // ── 6. Render ─────────────────────────────────────────────────────────────
    let lastReportedProgress = 10;

    await renderMedia({
      composition,
      serveUrl: bundlePath,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: { videoJson },
      browserExecutable,           // top-level in @remotion/renderer v4
      chromiumOptions: sharedChromiumOptions,
      crf: VIDEO_CRF,
      concurrency: CONCURRENCY,
      // Map render progress (0–1) → DB progress (10–90)
      onProgress: ({ progress }) => {
        const mapped = Math.round(10 + progress * 80); // 10 → 90
        if (mapped - lastReportedProgress >= 5) {
          lastReportedProgress = mapped;
          // Fire-and-forget — don't await so it doesn't block the render loop
          updateJobProgress(jobId, mapped).catch((err) =>
            console.warn(`[RenderService] Progress update failed: ${err}`),
          );
        }
      },
    });

    console.log(`[RenderService] ✓ Render complete — ${outputPath}`);
    await updateJobProgress(jobId, 92);

    // ── 7. Upload MP4 to S3 ───────────────────────────────────────────────────
    const mp4Buffer = fs.readFileSync(outputPath);
    const outputUrl = await uploadRenderedVideo({ buffer: mp4Buffer, jobId });

    console.log(`[RenderService] ✓ Uploaded to ${outputUrl}`);
    await updateJobProgress(jobId, 98);

    // ── 8. Clean up /tmp ──────────────────────────────────────────────────────
    // Non-fatal — /tmp is cleared when the function instance is recycled anyway
    fs.unlink(outputPath, (err) => {
      if (err) console.warn(`[RenderService] /tmp cleanup failed: ${err.message}`);
    });

    // ── 9. Mark done ──────────────────────────────────────────────────────────
    await markJobDone(jobId, outputUrl);
    console.log(`[RenderService] ✓ Job ${jobId} done`);

    return { success: true, outputUrl, jobId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[RenderService] Job ${jobId} failed: ${message}`, err);

    // Mark the job failed so the UI can show an error + retry button
    await markJobFailed(jobId, message).catch((dbErr) =>
      console.error(`[RenderService] Could not mark job failed: ${dbErr}`),
    );

    return { success: false, error: message, jobId };
  }
}