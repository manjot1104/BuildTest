// src/server/services/s3.service.ts
// Stores screenshots, video-generation images, and TTS audio in AWS S3.

import { S3Client, PutObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { env } from "@/env";

const AWS_S3_BUCKET    = env.AWS_S3_BUCKET ?? "buildify-screenshots";
const AWS_S3_REGION    = env.AWS_S3_REGION ?? "us-east-1";
const AWS_ACCESS_KEY_ID     = env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = env.AWS_SECRET_ACCESS_KEY;

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
// (existing)
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

// ---------------------------------------------------------------------------
// uploadPdfReport
//
// Uploads a PDF report buffer to S3 and returns its public URL.
// Key format: a11y-reports/{testRunId}/{hostname}.pdf
// Returns null if AWS is not configured or upload fails.
// ---------------------------------------------------------------------------

export async function uploadPdfReport(params: {
  buffer: Buffer;
  testRunId: string;
  hostname: string; // domain-safe segment for filename
}): Promise<string | null> {
  const { buffer, testRunId, hostname } = params;
  if (!buffer || buffer.length === 0) return null;

  try {
    const client = getClient();
    const safeHost = hostname
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "site";

    const key = `a11y-reports/${testRunId}/${safeHost}.pdf`;

    await client.send(
      new PutObjectCommand({
        Bucket:      AWS_S3_BUCKET,
        Key:         key,
        Body:        buffer,
        ContentType: "application/pdf",
        // PDF reports are immutable; allow long cache
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    const url = `https://${AWS_S3_BUCKET}.s3.${AWS_S3_REGION}.amazonaws.com/${key}`;
    console.log(`[S3] ✓ Uploaded PDF report: ${url}`);
    return url;
  } catch (err) {
    console.error("[S3] PDF upload failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// uploadVideoImage
//
// Uploads a user-uploaded image (Buffer) for video generation to S3.
// Extension is preserved from the original filename — not hardcoded.
//
// Key format: video-images/{sessionId}/{filename}
//   e.g.      video-images/abc123def456/0.webp
//
// Returns the public HTTPS URL, or throws on failure.
// ---------------------------------------------------------------------------

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png":  "image/png",
  ".webp": "image/webp",
  ".gif":  "image/gif",
  ".avif": "image/avif",
};

export async function uploadVideoImage(params: {
  buffer:    Buffer;
  sessionId: string;
  filename:  string; // e.g. "0.webp" — extension drives Content-Type
}): Promise<string> {
  const { buffer, sessionId, filename } = params;
  const client = getClient();

  const ext         = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  const contentType = IMAGE_CONTENT_TYPES[ext] ?? "application/octet-stream";
  const key         = `video-images/${sessionId}/${filename}`;

  await client.send(
    new PutObjectCommand({
      Bucket:      AWS_S3_BUCKET,
      Key:         key,
      Body:        buffer,
      ContentType: contentType,
      // Images are tied to a session; a long TTL is fine since keys are unique per session.
      CacheControl: "public, max-age=86400",
    }),
  );

  const url = `https://${AWS_S3_BUCKET}.s3.${AWS_S3_REGION}.amazonaws.com/${key}`;
  console.log(`[S3] ✓ Video image uploaded: ${url}`);
  return url;
}

// ---------------------------------------------------------------------------
// deleteVideoImageSession
//
// Deletes all images for a given sessionId from S3.
// Mirror of the local cleanupSessionImages() — call after video generation
// completes or on session expiry. Failures are logged but not thrown.
//
// Lists objects under video-images/{sessionId}/ then bulk-deletes them.
// ---------------------------------------------------------------------------

export async function deleteVideoImageSession(sessionId: string): Promise<void> {
  try {
    const client = getClient();
    const prefix = `video-images/${sessionId}/`;

    // List all objects under this session prefix
    const listed = await client.send(
      new ListObjectsV2Command({ Bucket: AWS_S3_BUCKET, Prefix: prefix }),
    );

    const objects = listed.Contents?.map((o) => ({ Key: o.Key! })) ?? [];
    if (objects.length === 0) return;

    await client.send(
      new DeleteObjectsCommand({
        Bucket: AWS_S3_BUCKET,
        Delete: { Objects: objects, Quiet: true },
      }),
    );

    console.log(`[S3] ✓ Deleted ${objects.length} image(s) for session: ${sessionId}`);
  } catch (err) {
    console.error(`[S3] deleteVideoImageSession error for ${sessionId}:`, err);
  }
}

// ---------------------------------------------------------------------------
// uploadVideoAudio
//
// Uploads a TTS audio file (Buffer) for a single video scene to S3.
// Extension is preserved from the filename — not hardcoded to .wav.
//
// Key format: video-audio/{generationId}/{filename}
//   e.g.      video-audio/gen_1712345678901/scene-2.wav
//
// Returns the public HTTPS URL, or throws on failure.
// The URL includes a cache-bust query string so Remotion always fetches
// the latest audio when a scene is regenerated.
// ---------------------------------------------------------------------------

const AUDIO_CONTENT_TYPES: Record<string, string> = {
  ".wav":  "audio/wav",
  ".mp3":  "audio/mpeg",
  ".ogg":  "audio/ogg",
  ".aac":  "audio/aac",
  ".webm": "audio/webm",
  ".flac": "audio/flac",
};

export async function uploadVideoAudio(params: {
  buffer:       Buffer;
  generationId: string; // groups all scenes from one generation run
  filename:     string; // e.g. "scene-0.wav" — extension drives Content-Type
}): Promise<string> {
  const { buffer, generationId, filename } = params;
  const client = getClient();

  const ext         = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  const contentType = AUDIO_CONTENT_TYPES[ext] ?? "application/octet-stream";
  const key         = `video-audio/${generationId}/${filename}`;

  await client.send(
    new PutObjectCommand({
      Bucket:      AWS_S3_BUCKET,
      Key:         key,
      Body:        buffer,
      ContentType: contentType,
      // No long-term caching — audio may be regenerated for the same scene
      CacheControl: "public, max-age=3600",
    }),
  );

  const url = `https://${AWS_S3_BUCKET}.s3.${AWS_S3_REGION}.amazonaws.com/${key}`;
  console.log(`[S3] ✓ Video audio uploaded: ${url}`);
  return url;
}
// ---------------------------------------------------------------------------
// deleteVideoAudioGeneration
//
// Deletes all TTS audio files for a given generationId from S3.
// Mirror of deleteVideoImageSession — call after a follow-up generation
// replaces the current_generation_id, or when a chat is deleted.
// Failures are logged but not thrown (non-fatal, same pattern as images).
//
// Lists objects under video-audio/{generationId}/ then bulk-deletes them.
// ---------------------------------------------------------------------------

export async function deleteVideoAudioGeneration(generationId: string): Promise<void> {
  try {
    const client = getClient();
    const prefix = `video-audio/${generationId}/`;

    const listed = await client.send(
      new ListObjectsV2Command({ Bucket: AWS_S3_BUCKET, Prefix: prefix }),
    );

    const objects = listed.Contents?.map((o) => ({ Key: o.Key! })) ?? [];
    if (objects.length === 0) return;

    await client.send(
      new DeleteObjectsCommand({
        Bucket: AWS_S3_BUCKET,
        Delete: { Objects: objects, Quiet: true },
      }),
    );

    console.log(`[S3] ✓ Deleted ${objects.length} audio file(s) for generation: ${generationId}`);
  } catch (err) {
    console.error(`[S3] deleteVideoAudioGeneration error for ${generationId}:`, err);
  }
}