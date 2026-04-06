// src/client-api/query-hooks/use-video-hooks.ts
//
// TanStack Query hooks for the video generation pipeline.
// Follows the same patterns as use-testing-hooks.ts:
//   - useQuery for reads, useMutation for writes
//   - typed interfaces at the top
//   - queryKey factories

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { VideoJson } from "@/remotion-src/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VideoMeta {
  scenes: number;
  totalFrames: number;
  durationSeconds: number;
}

export interface GenerateVideoResponse {
  videoJson: VideoJson;
  meta: VideoMeta;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const videoKeys = {
  all: ["video"] as const,
  generate: () => [...videoKeys.all, "generate"] as const,
};

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * useGenerateVideo
 *
 * Calls POST /api/video/generate with a prompt and duration.
 * Returns validated VideoJson ready to pass to the Remotion Player.
 */
export function useGenerateVideo() {
  return useMutation({
    mutationFn: async (input: {
      prompt: string;
      /** Target duration in seconds (default 15, range 5–120) */
      duration?: number;
    }): Promise<GenerateVideoResponse> => {
      const res = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data = (await res.json()) as
        | GenerateVideoResponse
        | { error: string; status: number };

      if (!res.ok || "error" in data) {
        throw new Error(
          "error" in data ? data.error : "Failed to generate video",
        );
      }

      return data;
    },
  });
}

/**
 * useRenderVideo
 *
 * Calls POST /api/video/render with a VideoJson.
 * Currently returns a stub jobId — Phase 5 replaces this with a real render queue.
 */
export function useRenderVideo() {
  return useMutation({
    mutationFn: async (videoJson: VideoJson): Promise<{ jobId: string; status: string; message: string }> => {
      const res = await fetch("/api/video/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoJson }),
      });

      const data = (await res.json()) as
        | { jobId: string; status: string; message: string }
        | { error: string; status: number };

      if (!res.ok || "error" in data) {
        throw new Error(
          "error" in data ? data.error : "Failed to queue render",
        );
      }

      return data;
    },
  });
}