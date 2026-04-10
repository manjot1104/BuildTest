// ============================================================
// VIDEO CONTROLLER
//   - Receives { body }
//   - Calls the service
//   - Returns data or { error: string; status: number }
//   - Never imports from other controllers
// ============================================================

import { getSession } from "@/server/better-auth/server";
import {
  generateVideoJson,
  renderVideo,
} from "@/server/services/video-gen.service";
import type { VideoJson } from "@/remotion-src/types";
import type { UserImage } from "@/server/engines/video-gen-images.engine";

// ── POST /api/video/generate ──────────────────────────────────────────────────

export async function generateVideoHandler({
  body,
}: {
  body: {
    prompt: string;
    duration?: number; // seconds, default 15
    /**
     * User-uploaded images resolved from a prior /api/video/upload-images call.
     * Each entry has an index, a public URL, and a description the user provided.
     * The LLM will be told about these and instructed to use them where relevant.
     */
    userImages?: UserImage[];
    options?: {
      useTTS?: boolean;
      voiceId?: string;
      useMusic?: boolean;
      musicGenre?: string;
      ttsVolume?: number; // 0 to 1
      musicVolume?: number; // 0 to 1
    };
  };
}): Promise<
  | {
      videoJson: VideoJson;
      meta: {
        scenes: number;
        totalFrames: number;
        durationSeconds: number;
      };
    }
  | { error: string; status: number }
> {
  try {
    const session = await getSession();
    if (!session?.user?.id) return { error: "Unauthorized", status: 401 };

    const { prompt, duration = 15, userImages = [] } = body;

    if (!prompt?.trim()) return { error: "Prompt is required", status: 400 };
    if (prompt.trim().length < 5)
      return { error: "Prompt is too short", status: 400 };
    if (prompt.length > 2000)
      return {
        error: "Prompt is too long — maximum 2000 characters",
        status: 400,
      };
    if (duration < 5 || duration > 120)
      return {
        error: "Duration must be between 5 and 120 seconds",
        status: 400,
      };

    // Validate user images if provided
    if (userImages.length > 0) {
      for (const [i, img] of userImages.entries()) {
        if (typeof img.index !== "number" || img.index < 0) {
          return {
            error: `userImages[${i}]: invalid index`,
            status: 400,
          };
        }
        if (!img.url?.trim()) {
          return {
            error: `userImages[${i}]: url is required`,
            status: 400,
          };
        }
        if (!img.description?.trim()) {
          return {
            error: `userImages[${i}]: description is required — it helps the AI decide where to place the image`,
            status: 400,
          };
        }
      }
    }

    const result = await generateVideoJson(prompt.trim(), duration, {
      useTTS: body.options?.useTTS ?? true,
      useMusic: body.options?.useMusic ?? true,
      voiceId: body.options?.voiceId,
      musicGenre: body.options?.musicGenre,
      ttsVolume: body.options?.ttsVolume ?? 0.8,
      musicVolume: body.options?.musicVolume ?? 0.3,
      userImages,
    });

    if (!result.success) {
      console.error(
        `[VideoController] generateVideoJson failed: ${result.details}`,
      );
      return {
        error:
          "Failed to generate video. Please try again or rephrase your prompt.",
        status: 500,
      };
    }

    const fps = result.videoJson.fps || 30;
    const totalFrames = result.videoJson.duration;
    return {
      videoJson: result.videoJson,
      meta: {
        scenes: result.videoJson.scenes.length,
        totalFrames,
        durationSeconds: parseFloat((totalFrames / fps).toFixed(1)),
      },
    };
  } catch (err) {
    console.error("[VideoController] generateVideoHandler error:", err);
    return { error: "Internal server error", status: 500 };
  }
}

// ── POST /api/video/render ────────────────────────────────────────────────────
// Phase 5 stub — accepts VideoJson and queues a render job.

export async function renderVideoHandler({
  body,
}: {
  body: { videoJson: VideoJson };
}): Promise<
  | { jobId: string; status: "queued"; message: string }
  | { error: string; status: number }
> {
  try {
    const session = await getSession();
    if (!session?.user?.id) return { error: "Unauthorized", status: 401 };

    const { videoJson } = body;

    if (!videoJson?.scenes?.length) {
      return {
        error: "videoJson with at least one scene is required",
        status: 400,
      };
    }

    const result = await renderVideo(videoJson);

    if (!result.success) {
      return { error: result.error, status: 500 };
    }

    return {
      jobId: result.jobId,
      status: "queued",
      message: "Render job queued. MP4 export is coming in Phase 5.",
    };
  } catch (err) {
    console.error("[VideoController] renderVideoHandler error:", err);
    return { error: "Internal server error", status: 500 };
  }
}