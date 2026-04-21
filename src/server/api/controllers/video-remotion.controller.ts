// ============================================================
// video-remotion.controller
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
// ── chat persistence ─────────────────────────────────────────────────────
import {
  createVideoChat,
  updateVideoChatAfterGeneration,
  appendPromptAndUpdateVideo,
  getVideoChatById,
  countVideoPromptsTodayByUserId,
  // Render job queries
  createRenderJob,
  getRenderJobById,
  countActiveRenderJobsForUser,
  countServerRenderJobsToday,
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
import { getVideoPlanId, getVideoServerPlanLimits } from "@/server/services/video-limits.service";
// ── Server-side render ────────────────────────────────────────────────────────
import { renderVideoJob } from "@/server/services/video-render.service";

// ── Helper: strip proxy URLs before server-side rendering ─────────────────────
// The client wraps S3 URLs in /api/remotion-video/s3-proxy?url=... for the
// browser Player. The Remotion renderer runs in Node.js and fetches URLs
// directly — the proxy route doesn't exist in the Webpack bundle.

function deproxyVideoJson(videoJson: VideoJson): VideoJson {
  const strip = (url: string | undefined): string | undefined => {
    if (!url) return url;
    try {
      const u = new URL(url, "http://localhost");
      if (
        u.pathname === "/api/remotion-video/s3-proxy" &&
        u.searchParams.has("url")
      ) {
        return decodeURIComponent(u.searchParams.get("url")!);
      }
    } catch { }
    return url;
  };

  return {
    ...videoJson,
    bgmUrl: strip(videoJson.bgmUrl),
    scenes: videoJson.scenes.map((s) => ({
      ...s,
      ttsUrl: strip(s.ttsUrl),
      background:
        s.background.type === "image"
          ? { ...s.background, url: strip(s.background.url)! }
          : s.background,
      elements: s.elements.map((el) =>
        el.type === "image" ? { ...el, url: strip(el.url)! } : el,
      ),
    })),
  };
}

// ── POST /api/video/generate ──────────────────────────────────────────────────

export async function generateRemotionVideoHandler({
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

    // ── Plan limits ───────────────────────────────────────────────────────────
    const planId = await getVideoPlanId(userId);
    const planLimits = getVideoServerPlanLimits(planId);

    // ── Follow-up gate ────────────────────────────────────────────────────────
    // Free plan users cannot send follow-up prompts to an existing chat.
    if (incomingChatId && !planLimits.allowFollowUp) {
      return {
        error: `Follow-up prompts are not available on the ${planId ?? "free"} plan. Upgrade to continue refining your video.`,
        status: 403,
        code: "PLAN_LIMIT_FOLLOWUP",
      };
    }

    // ── Daily prompt limit ────────────────────────────────────────────────────
    const promptsToday = await countVideoPromptsTodayByUserId(userId);
    if (promptsToday >= planLimits.dailyPrompts) {
      return {
        error: `Daily limit reached. Your ${planId ?? "free"} plan allows ${planLimits.dailyPrompts} prompt${planLimits.dailyPrompts !== 1 ? "s" : ""} per day. Resets at midnight UTC.`,
        status: 429,
        code: "DAILY_LIMIT_REACHED",
      };
    }

    // ── Image count gate ──────────────────────────────────────────────────────
    if (userImages.length > planLimits.maxImages) {
      return {
        error: `Your ${planId ?? "free"} plan allows a maximum of ${planLimits.maxImages} image${planLimits.maxImages !== 1 ? "s" : ""} per generation.`,
        status: 403,
        code: "PLAN_LIMIT_IMAGES",
      };
    }

    // ── Duration gate ─────────────────────────────────────────────────────────
    if (duration > planLimits.maxDurationSeconds) {
      return {
        error: `Your ${planId ?? "free"} plan allows a maximum duration of ${planLimits.maxDurationSeconds}s. Requested: ${duration}s.`,
        status: 403,
        code: "PLAN_LIMIT_DURATION",
      };
    }
    // ── End plan limit enforcement ────────────────────────────────────────────

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
        console.warn(`[RemotionVideoController] Could not parse existing video_json for chat ${chatId} — generating fresh`);
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
        `[RemotionVideoController] generateVideoJson failed: ${result.details}`,
      );

      // Refund explicitly here: catch block only runs for thrown errors,
      // not for early returns. Credits were deducted before generation started
      // so we must restore them on every failure path.
      if (creditsDeducted && resolvedUserId && creditsDeductedAmount > 0) {
        try {
          await addAdditionalCredits(resolvedUserId, creditsDeductedAmount);
        } catch (refundErr) {
          console.error(
            `[RemotionVideoController] CRITICAL: Credit refund failed for user ${resolvedUserId}, amount: ${creditsDeductedAmount}, chat: ${resolvedChatId}`,
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
      ({ prevImageSessionId } = await appendPromptAndUpdateVideo({
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
    console.error("[RemotionVideoController] generateVideoRemotionHandler error:", err);

    // ── Refund credits if deducted but generation threw an error ──────────────
    // Mirrors the chat controller pattern. Non-fatal: log on refund failure
    // rather than dropping the error response.
    if (creditsDeducted && resolvedUserId && creditsDeductedAmount > 0) {
      try {
        await addAdditionalCredits(resolvedUserId, creditsDeductedAmount);
      } catch (refundErr) {
        console.error(
          `[RemotionVideoController] CRITICAL: Credit refund failed for user ${resolvedUserId}, amount: ${creditsDeductedAmount}, chat: ${resolvedChatId}`,
          refundErr,
        );
      }
    }

    return { error: "Internal server error", status: 500 };
  }
}

// ── POST /api/video/render ────────────────────────────────────────────────────
//
// Server-side Remotion render running directly on Vercel (no Lambda).
//
// Flow:
//   1. Auth + input validation
//   2. Plan limits: daily server render quota + one concurrent render per user
//   3. Create a render job row (status = "pending")
//   4. Start rendering synchronously in this request — Vercel Pro allows up to
//      60 s; set maxDuration = 300 in the route config for Enterprise (needed
//      for videos close to 40 s which take ~30–60 s to render).
//   5. renderVideoJob() transitions: pending → running → done | failed
//   6. On success: return { jobId, outputUrl } immediately (no polling needed)
//      On failure: return the error so the client can surface a retry button.
//
// Polling endpoint: GET /api/video/render-status/[jobId]
//   Used if the client wants live progress (0–100) while the render runs.
//   The render service writes progress to DB every ~5%; the polling endpoint
//   reads video_render_jobs.progress and returns it alongside the status.
//   This is optional — for short videos (≤ 40 s) the render completes before
//   the user would notice, so polling is a UX nicety rather than a necessity.

// ── Render result shape ───────────────────────────────────────────────────────
// Using a discriminated union instead of `status: "done" | "failed"` so there
// is no collision between the HTTP status code (a number) and a render state
// string when elysia inspects the return value.

export type RenderSuccessResponse = {
  jobId: string;
  outputUrl: string;
  renderStatus: "done";
};

export type RenderFailedResponse = {
  jobId: string;
  renderStatus: "failed";
  renderError: string;
};

export type RenderErrorResponse = {
  error: string;
  status: number;
  code?: string;
};

export async function renderRemotionVideoHandler({
  body,
}: {
  body: {
    /**
     * The VideoJson to render. Must have at least one scene.
     * Snapshot the current chat's video_json on the client before calling
     * so a concurrent follow-up prompt doesn't affect the render payload.
     */
    videoJson: VideoJson;
    /**
     * The chatId that owns this render. Used for ownership checks and
     * to associate the render job with a chat in the DB.
     */
    chatId: string;
  };
}): Promise<RenderSuccessResponse | RenderFailedResponse | RenderErrorResponse> {
  try {
    const session = await getSession();
    if (!session?.user?.id) return { error: "Unauthorized", status: 401 };

    const userId = session.user.id;
    const { videoJson: rawVideoJson, chatId } = body;  // ← rename to rawVideoJson

    // ── Strip proxy URLs before rendering ────────────────────────────────────
    // proxyS3Urls() is applied client-side for the browser Player (CORS).
    // The server renderer fetches URLs directly in Node.js — the proxy route
    // doesn't exist inside the Remotion Webpack bundle, causing 404 errors.
    const videoJson = deproxyVideoJson(rawVideoJson);  // ← add this line

    // ── Input validation ──────────────────────────────────────────────────────
    if (!chatId?.trim()) {
      return { error: "chatId is required", status: 400 };
    }

    if (!videoJson?.scenes?.length) {
      return {
        error: "videoJson with at least one scene is required",
        status: 400,
      };
    }

    // Guard: max 40 s to keep renders within Vercel's function timeout budget.
    // (Client should enforce this too, but we validate server-side as well.)
    const fps = videoJson.fps ?? 30;
    const durationSeconds = videoJson.duration / fps;
    if (durationSeconds > 40) {
      return {
        error: `Server render supports videos up to 40 s. This video is ${durationSeconds.toFixed(1)} s. Use the client-side renderer for longer videos.`,
        status: 400,
        code: "RENDER_DURATION_EXCEEDED",
      };
    }

    // ── Ownership check ───────────────────────────────────────────────────────
    // Verify the chatId belongs to this user before creating a render job.
    const chat = await getVideoChatById({ chatId, userId });
    if (!chat) {
      return { error: "Chat not found", status: 404 };
    }

    // ── Plan limits ───────────────────────────────────────────────────────────
    const planId = await getVideoPlanId(userId);
    const planLimits = getVideoServerPlanLimits(planId);

    // Daily server render quota (separate from prompt quota).
    // `dailyServerRenders` is optional in the type; fall back to 0 (no renders
    // allowed) for plan configs that haven't set it — safer than allowing
    // unlimited renders on an unconfigured plan.
    const dailyServerRenderLimit = planLimits.dailyServerRenders ?? 0;
    const serverRendersToday = await countServerRenderJobsToday(userId);
    if (serverRendersToday >= dailyServerRenderLimit) {
      return {
        error: `Daily server render limit reached. Your ${planId ?? "free"} plan allows ${dailyServerRenderLimit} server render${dailyServerRenderLimit !== 1 ? "s" : ""} per day. Use the client-side renderer or upgrade your plan.`,
        status: 429,
        code: "DAILY_RENDER_LIMIT_REACHED",
      };
    }

    // One concurrent render per user to avoid overwhelming the server
    const activeJobs = await countActiveRenderJobsForUser(userId);
    if (activeJobs > 0) {
      return {
        error: "You already have a render in progress. Please wait for it to complete before starting another.",
        status: 429,
        code: "RENDER_ALREADY_IN_PROGRESS",
      };
    }

    // ── Create the DB job row (status = "pending") ────────────────────────────
    // Snapshot video_json now so a concurrent follow-up prompt on the same chat
    // doesn't mutate the payload mid-render.
    const job = await createRenderJob({
      userId,
      chatId,
      videoJson: JSON.stringify(videoJson),
    });

    console.log(`[RemotionVideoController] Render job ${job.id} created for chat ${chatId}`);

    // ── Render synchronously in this request ──────────────────────────────────
    // renderVideoJob() owns the full lifecycle:
    //   pending → running → done | failed
    // It writes progress to DB every ~5% and uploads the MP4 to S3 on success.
    //
    // For Vercel Pro (60 s limit): videos ≤ 40 s typically render in 20–50 s.
    // For Vercel Enterprise: set `export const maxDuration = 300` in the route.
    const renderResult = await renderVideoJob({
      jobId: job.id,
      userId,
      videoJson,
    });

    if (!renderResult.success) {
      // renderVideoJob already called markJobFailed — just surface the error.
      // Using `renderStatus` and `renderError` fields (not `status`/`error`) so
      // elysia's error-detection pattern `"error" in result && "status" in result`
      // doesn't confuse render failure with an HTTP error response.
      return {
        jobId: job.id,
        renderStatus: "failed",
        renderError: renderResult.error,
      };
    }

    return {
      jobId: job.id,
      outputUrl: renderResult.outputUrl,
      renderStatus: "done",
    };
  } catch (err) {
    console.error("[RemotionVideoController] renderRemotionVideoHandler error:", err);
    return { error: "Internal server error", status: 500 };
  }
}

// ── GET /api/video/render-status ─────────────────────────────────────────────
//
// Polling endpoint for live render progress.
// Returns the current job status and progress (0–100).
//
// Since renderRemotionVideoHandler renders synchronously and returns the
// final outputUrl in the same response, polling is only needed if the client
// wants a progress bar during the render (e.g. shown while the POST is in
// flight via a streaming UI pattern) or for resilience against network drops.
//
// Usage: GET /api/video/render-status?jobId=<id>

export async function getRenderStatusHandler({
  jobId,
}: {
  jobId: string;
}): Promise<
  | {
    jobId: string;
    renderStatus: "pending" | "running" | "done" | "failed";
    progress: number;
    outputUrl?: string;
    renderError?: string;
  }
  | { error: string; status: number }
> {
  try {
    const session = await getSession();
    if (!session?.user?.id) return { error: "Unauthorized", status: 401 };

    if (!jobId?.trim()) return { error: "jobId is required", status: 400 };

    const job = await getRenderJobById(jobId, session.user.id);
    if (!job) return { error: "Render job not found", status: 404 };

    return {
      jobId: job.id,
      renderStatus: job.status as "pending" | "running" | "done" | "failed",
      progress: job.progress ?? 0,
      // ── Never expose the raw S3 output_url to the client ──────────────────
      // Downloads go through /api/remotion-video/download?jobId=xxx instead.
      ...(job.status === "done" ? { outputReady: true } : {}),
      ...(job.error_message ? { renderError: job.error_message } : {}),
    };
  } catch (err) {
    console.error("[RemotionVideoController] getRenderStatusHandler error:", err);
    return { error: "Internal server error", status: 500 };
  }
}