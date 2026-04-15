// ============================================================
// VideoGenController
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
import type { UploadedUserImage } from "@/server/api/controllers/video-upload.controller";
// ── New: chat persistence ─────────────────────────────────────────────────────
import {
  createVideoChat,
  updateVideoChatAfterGeneration,
  appendPromptAndUpdateVideo,
  getVideoChatById,
} from "@/server/db/queries";
import {
  deleteVideoImageSession,
} from "@/server/services/s3.service";
// ── Credits ───────────────────────────────────────────────────────────────────
import {
  hasEnoughCreditsForVideo,
  deductCreditsForVideo,
  addAdditionalCredits,
} from "@/server/services/credits.service";

// ── POST /api/video/generate ──────────────────────────────────────────────────

export async function generateVideoHandler({
  body,
}: {
  body: {
    prompt: string;
    duration?: number; // seconds, default 15
    /**
     * Pass a chatId to continue an existing video chat (follow-up prompt).
     * Omit (or pass null) to start a new chat.
     */
    chatId?: string | null;
    /**
     * User-uploaded images for this generation.
     * For follow-ups: pass the FULL array of images (old + new).
     * Images are persisted in current_user_images and reused until replaced.
     */
    userImages?: UserImage[];
    /**
     * Session ID from /api/video/upload-images.
     * Used to track which images belong together for cleanup.
     */
    imageSessionId?: string;
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
      chatId: string; // always returned so the client can resume later
      meta: {
        scenes: number;
        totalFrames: number;
        durationSeconds: number;
      };
    }
  | { error: string; status: number; code?: string }
> {
  // Track credit deduction state for refund-on-failure
  let creditsDeducted = false;
  let creditsDeductedAmount = 0;
  let resolvedUserId: string | undefined;
  let resolvedChatId: string | undefined;

  try {
    const session = await getSession();
    if (!session?.user?.id) return { error: "Unauthorized", status: 401 };

    const {
      prompt,
      duration = 15,
      userImages = [],
      imageSessionId,
      chatId: incomingChatId,
    } = body;
    const userId = session.user.id;
    resolvedUserId = userId;

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
    if (userImages.length > 5) {
      return {
        error: "Maximum 5 user images allowed per chat",
        status: 400,
      };
    }

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

    const options = {
      useTTS: body.options?.useTTS ?? true,
      useMusic: body.options?.useMusic ?? true,
      voiceId: body.options?.voiceId,
      musicGenre: body.options?.musicGenre,
      ttsVolume: body.options?.ttsVolume ?? 0.8,
      musicVolume: body.options?.musicVolume ?? 0.3,
    };

    const isNewChat = !incomingChatId;

    // ── Credit check — before ANY work is done ────────────────────────────────
    const creditCheck = await hasEnoughCreditsForVideo(userId, isNewChat);
    if (!creditCheck.hasCredits) {
      return {
        error: `You don't have enough credits. This action costs ${creditCheck.required} credit${creditCheck.required !== 1 ? "s" : ""} and you have ${creditCheck.available} remaining. Please upgrade your plan or purchase more credits.`,
        status: 402,
        code: "INSUFFICIENT_CREDITS",
      };
    }

    // ── 1. Deduct credits upfront — before generation begins ─────────────────
    // Mirrors the chat controller pattern: deduct atomically now, refund on failure.
    // This prevents the race condition where a user sends multiple prompts
    // concurrently during a long-running generation and only gets charged once.
    const deductResult = await deductCreditsForVideo(userId, isNewChat, incomingChatId ?? undefined);
    if (!deductResult.success) {
      return {
        error: `You don't have enough credits. Please upgrade your plan or purchase more credits.`,
        status: 402,
        code: "INSUFFICIENT_CREDITS",
      };
    }
    creditsDeducted = true;
    creditsDeductedAmount = deductResult.creditsUsed ?? 0;

    // ── 2. Validate incoming chatId (follow-up) or create a new chat row ──────
    // Row is created AFTER credit deduction so we never create orphaned rows
    // for users who can't afford the generation.

    let chatId: string;
    let previousVideoJson: VideoJson | undefined;
    let previousOptions: typeof options | undefined;
    let previousUserImages: UserImage[] | undefined;
    let originalPrompt: string | undefined;

    if (incomingChatId) {
      // Follow-up prompt: verify ownership and load previous state
      const existing = await getVideoChatById({ chatId: incomingChatId, userId });
      if (!existing) return { error: "Chat not found", status: 404 };
      chatId = incomingChatId;
      resolvedChatId = chatId;

      // Load previous VideoJson so the LLM can make targeted edits
      try {
        previousVideoJson = JSON.parse(existing.video_json) as VideoJson;
      } catch {
        // If video_json is corrupt/placeholder, proceed without previous context
        console.warn(`[VideoController] Could not parse existing video_json for chat ${chatId} — generating fresh`);
      }

      // Load previous options and images for context
      previousOptions = existing.current_options as typeof options | undefined;
      previousUserImages = (existing.current_user_images as UserImage[] | undefined) ?? [];

      // Recover original prompt from prompt log for follow-up context
      const prompts = (existing.prompts as { prompt: string; sentAt: string }[]) ?? [];
      originalPrompt = prompts[0]?.prompt;

      // ── Merge user images: keep old ones not replaced by new uploads ─────────
      // Client sends FULL array on follow-up, but we need to detect what changed
      const mergedImages: UserImage[] = [];
      const newImageIndices = new Set(userImages.map(img => img.index));

      // Keep previous images that weren't replaced
      for (const prevImg of previousUserImages) {
        if (!newImageIndices.has(prevImg.index)) {
          mergedImages.push(prevImg);
        }
      }

      // Add new/replacement images
      mergedImages.push(...userImages);

      // Sort by index and validate count
      mergedImages.sort((a, b) => a.index - b.index);
      if (mergedImages.length > 5) {
        return {
          error: "Maximum 5 user images allowed per chat",
          status: 400,
        };
      }

      // Use merged images for generation
      body.userImages = mergedImages;
    } else {
      // New chat: insert a placeholder row (video_json filled in after generation)
      chatId = await createVideoChat({
        userId,
        prompt: prompt.trim(),
        options,
        userImages: userImages.length > 0 ? userImages as UploadedUserImage[] : undefined,
        imageSessionId,
      });
      resolvedChatId = chatId;
    }

    // ── 3. Determine what changed to optimize regeneration ────────────────────

    const optionsChanged = !!(incomingChatId && previousOptions && (
      options.useTTS !== previousOptions.useTTS ||
      options.voiceId !== previousOptions.voiceId ||
      options.useMusic !== previousOptions.useMusic ||
      options.musicGenre !== previousOptions.musicGenre
    ));

    const imagesChanged = !!(incomingChatId && (
      userImages.length !== (previousUserImages?.length ?? 0) ||
      userImages.some((img, i) =>
        img.url !== previousUserImages?.[i]?.url ||
        img.description !== previousUserImages?.[i]?.description
      )
    ));

    // Note: Volume changes (ttsVolume, musicVolume) don't require regeneration
    // — they're applied client-side in the Player component

    // ── 4. Generate ───────────────────────────────────────────────────────────

    const result = await generateVideoJson(prompt.trim(), duration, {
      useTTS: options.useTTS,
      useMusic: options.useMusic,
      voiceId: options.voiceId,
      musicGenre: options.musicGenre,
      ttsVolume: options.ttsVolume,
      musicVolume: options.musicVolume,
      userImages: body.userImages, // merged images from step 2
      // Pass follow-up context when available
      previousVideoJson,
      originalPrompt,
      // Signal whether options/images changed (service can optimize accordingly)
      optionsChanged,
      imagesChanged,
    });

    if (!result.success) {
      console.error(
        `[VideoController] generateVideoJson failed: ${result.details}`,
      );

      // Refund explicitly here: catch block only runs for thrown errors,
      // not for early returns. Credits were deducted before generation started
      // so we must restore them on every failure path.
      if (creditsDeducted && resolvedUserId && creditsDeductedAmount > 0) {
        try {
          await addAdditionalCredits(resolvedUserId, creditsDeductedAmount);
        } catch (refundErr) {
          console.error(
            `[VideoController] CRITICAL: Credit refund failed for user ${resolvedUserId}, amount: ${creditsDeductedAmount}, chat: ${resolvedChatId}`,
            refundErr,
          );
        }
      }

      return {
        error:
          "Failed to generate video. Please try again or rephrase your prompt.",
        status: 500,
      };
    }

    // Generation succeeded — mark credits as consumed (no refund needed)
    creditsDeducted = false;

    // ── 5. Persist result and collect previous S3 IDs for cleanup ────────────
    // Cleanup runs AFTER the DB write succeeds so we never lose the live data
    // even if cleanup fails (S3 deletes are non-fatal).

    let prevImageSessionId: string | null = null;

    if (incomingChatId) {
      // Follow-up: append to prompt log + replace video_json + update options/images
      ({ prevImageSessionId} = await appendPromptAndUpdateVideo({
        chatId,
        userId,
        prompt: prompt.trim(),
        videoJson: result.videoJson,
        options,
        userImages: body.userImages?.length ? body.userImages as UploadedUserImage[] : undefined,
        imageSessionId,
      }));
    } else {
      // First prompt: title + prompt log already set at creation; just save result
      ({ prevImageSessionId, } = await updateVideoChatAfterGeneration({
        chatId,
        userId,
        videoJson: result.videoJson,
        options,
        userImages: body.userImages?.length ? body.userImages as UploadedUserImage[] : undefined,
        imageSessionId,
      }));
    }

    // ── 6. Clean up old S3 files (non-fatal, fire-and-forget) ─────────────────
    // Only delete the old image session if a new one was uploaded this request.
    // (If the user didn't upload new images, imageSessionId is undefined and
    // we keep the existing session untouched.)
    if (imageSessionId && prevImageSessionId && prevImageSessionId !== imageSessionId) {
      deleteVideoImageSession(prevImageSessionId).catch((err) =>
        console.error(`[VideoController] Failed to clean up old image session ${prevImageSessionId}:`, err),
      );
    }

    // Audio cleanup on follow-up is intentionally skipped here.
    // TTS uses chatId as the S3 prefix (video-audio/{chatId}/scene-N.wav),
    // so changed scenes overwrite their file in-place and unchanged scenes are
    // never re-uploaded. There are no orphaned files to delete between generations.
    // Full cleanup (all scenes) still happens on chat delete via deleteVideoChatHandler.

    // ── 7. Return ─────────────────────────────────────────────────────────────

    const fps = result.videoJson.fps || 30;
    const totalFrames = result.videoJson.duration;
    return {
      videoJson: result.videoJson,
      chatId,
      meta: {
        scenes: result.videoJson.scenes.length,
        totalFrames,
        durationSeconds: parseFloat((totalFrames / fps).toFixed(1)),
      },
    };
  } catch (err) {
    console.error("[VideoController] generateVideoHandler error:", err);

    // ── Refund credits if deducted but generation threw an error ──────────────
    // Mirrors the chat controller pattern. Non-fatal: log on refund failure
    // rather than dropping the error response.
    if (creditsDeducted && resolvedUserId && creditsDeductedAmount > 0) {
      try {
        await addAdditionalCredits(resolvedUserId, creditsDeductedAmount);
      } catch (refundErr) {
        console.error(
          `[VideoController] CRITICAL: Credit refund failed for user ${resolvedUserId}, amount: ${creditsDeductedAmount}, chat: ${resolvedChatId}`,
          refundErr,
        );
      }
    }

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