// server/controllers/video-upload.controller.ts
//
// Handles user image uploads for video generation.
// Images are stored in S3 under video-images/[sessionId]/.
// Max MAX_IMAGES_PER_SESSION images per upload batch.
//
// FUTURE: To change the bucket or region, update s3.service.ts — nothing here changes.

import { getSession } from "@/server/better-auth/server";
import crypto from "crypto";
import path from "path";
import { uploadVideoImage, deleteVideoImageSession } from "@/server/services/s3.service";

// ── Config ────────────────────────────────────────────────────────────────────

export const MAX_IMAGES_PER_SESSION = 5;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per file

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UploadedUserImage {
  index: number;
  /** Public S3 URL accessible by Remotion, e.g. https://bucket.s3.region.amazonaws.com/video-images/[sessionId]/0.jpg */
  url: string;
  description: string;
  filename: string;
}

export interface UploadImagesResult {
  images: UploadedUserImage[];
  sessionId: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateSessionId(): string {
  return crypto.randomBytes(12).toString("hex");
}

function sanitizeFilename(original: string, index: number): string {
  const ext = path.extname(original).toLowerCase() || ".jpg";
  const allowed = [".jpg", ".jpeg", ".png", ".webp"];
  const safeExt = allowed.includes(ext) ? ext : ".jpg";
  return `${index}${safeExt}`;
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

/**
 * Deletes all images for a given sessionId from S3.
 * Call this after video generation completes (or on session expiry).
 */
export async function cleanupSessionImages(sessionId: string): Promise<void> {
  await deleteVideoImageSession(sessionId);
}

// ── Handler ───────────────────────────────────────────────────────────────────

/**
 * POST /api/video/upload-images
 *
 * Accepts multipart/form-data with:
 *   - images[]: File[]  (max MAX_IMAGES_PER_SESSION)
 *   - descriptions[]: string[]  (parallel array, same length as images[])
 *
 * Returns { images: UploadedUserImage[], sessionId: string }
 */
export async function uploadUserImagesHandler({
  body,
}: {
  body: {
    images: File[];
    descriptions: string[];
  };
}): Promise<UploadImagesResult | { error: string; status: number }> {
  try {
    const session = await getSession();
    if (!session?.user?.id) return { error: "Unauthorized", status: 401 };

    const { images, descriptions } = body;

    if (!images?.length) {
      return { error: "No images provided", status: 400 };
    }

    if (images.length > MAX_IMAGES_PER_SESSION) {
      return {
        error: `Maximum ${MAX_IMAGES_PER_SESSION} images allowed`,
        status: 400,
      };
    }

    // Validate each file
    for (const [i, file] of images.entries()) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return {
          error: `Image ${i + 1}: unsupported type "${file.type}". Use JPEG, PNG, or WebP.`,
          status: 400,
        };
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return {
          error: `Image ${i + 1}: exceeds 5 MB limit`,
          status: 400,
        };
      }
    }

    const sessionId = generateSessionId();
    const uploadedImages: UploadedUserImage[] = [];

    for (const [i, file] of images.entries()) {
      const filename = sanitizeFilename(file.name, i);
      const buffer = Buffer.from(await file.arrayBuffer());

      const s3Url = await uploadVideoImage({ buffer, sessionId, filename });

      uploadedImages.push({
        index: i,
        url: s3Url,
        description: descriptions[i]?.trim() || `Image ${i + 1}`,
        filename,
      });
    }

    console.log(
      `[UploadController] Uploaded ${uploadedImages.length} images to S3 for session ${sessionId}`,
    );

    return { images: uploadedImages, sessionId };
  } catch (err) {
    console.error("[UploadController] uploadUserImagesHandler error:", err);
    return { error: "Internal server error", status: 500 };
  }
}