// src/server/services/s3.service.ts
// Stores screenshots in AWS S3

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const AWS_S3_BUCKET    = process.env.AWS_S3_BUCKET ?? "buildify-screenshots";
const AWS_S3_REGION    = process.env.AWS_S3_REGION ?? "us-east-1";
const AWS_ACCESS_KEY_ID     = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

// ---------------------------------------------------------------------------
// S3 client — lazy-initialised so missing env vars don't crash on startup.
// Screenshots are non-critical; if S3 is not configured they silently return null.
// ---------------------------------------------------------------------------

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    throw new Error(
      "AWS credentials not configured. " +
      "Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.local.",
    );
  }

  _client = new S3Client({
    region: AWS_S3_REGION,
    credentials: {
      accessKeyId:     AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });

  return _client;
}

// ---------------------------------------------------------------------------
// uploadScreenshot
//
// Uploads a single base64-encoded PNG to S3.
// Returns the public HTTPS URL on success, null if upload fails or S3 not configured.
// Failures are non-fatal — screenshots are supplementary crawl data.
//
// Key format: screenshots/{testRunId}/{pageSlug}/{viewport}.png
//   e.g.      screenshots/abc123/about-us/375.png
// ---------------------------------------------------------------------------

export async function uploadScreenshot(params: {
  base64Png: string;                       // raw base64, no "data:image/png;base64," prefix
  testRunId: string;
  pageSlug:  string;                       // url-safe slug, e.g. "homepage", "about-us"
  viewport:  375 | 768 | 1440 | "test";   // "test" for test-execution screenshots
}): Promise<string | null> {
  const { base64Png, testRunId, pageSlug, viewport } = params;

  if (!base64Png) return null;

  try {
    const client = getClient();
    const key    = `screenshots/${testRunId}/${pageSlug}/${viewport}.png`;
    const buffer = Buffer.from(base64Png, "base64");

    await client.send(
      new PutObjectCommand({
        Bucket:       AWS_S3_BUCKET,
        Key:          key,
        Body:         buffer,
        ContentType:  "image/png",
        // Immutable per test run — safe to cache forever in CDN
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    // Standard AWS S3 public URL format
    const url = `https://${AWS_S3_BUCKET}.s3.${AWS_S3_REGION}.amazonaws.com/${key}`;
    console.log(`[S3] ✓ Uploaded: ${url}`);
    return url;

  } catch (err) {
    // Non-fatal — crawl continues without screenshot
    console.error(`[S3] Upload failed for ${params.pageSlug}/${params.viewport}:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// uploadPageScreenshots
// Uploads all three viewport screenshots for one page concurrently.
// ---------------------------------------------------------------------------

export async function uploadPageScreenshots(params: {
  screenshots: {
    viewport375?:  string | null;
    viewport768?:  string | null;
    viewport1440?: string | null;
  };
  testRunId: string;
  pageSlug:  string;
}): Promise<{ url375: string | null; url768: string | null; url1440: string | null }> {
  const { screenshots, testRunId, pageSlug } = params;

  const [url375, url768, url1440] = await Promise.all([
    screenshots.viewport375
      ? uploadScreenshot({ base64Png: screenshots.viewport375,  testRunId, pageSlug, viewport: 375  })
      : Promise.resolve(null),
    screenshots.viewport768
      ? uploadScreenshot({ base64Png: screenshots.viewport768,  testRunId, pageSlug, viewport: 768  })
      : Promise.resolve(null),
    screenshots.viewport1440
      ? uploadScreenshot({ base64Png: screenshots.viewport1440, testRunId, pageSlug, viewport: 1440 })
      : Promise.resolve(null),
  ]);

  return { url375, url768, url1440 };
}

// ---------------------------------------------------------------------------
// urlToSlug — convert a page URL to a safe S3 key segment
// "https://example.com/about-us"  → "about-us"
// "https://example.com/"          → "homepage"
// "https://example.com/a/b/c"     → "a-b-c"
// ---------------------------------------------------------------------------

export function urlToSlug(url: string): string {
  try {
    const parsed = new URL(url);
    const path   = parsed.pathname.replace(/^\/|\/$/g, "");
    if (!path) return "homepage";
    return path
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 60);
  } catch {
    return "page";
  }
}