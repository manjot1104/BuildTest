// src/client-api/query-hooks/use-video-hooks.ts  [UPDATED]
//
// Adds: useUploadUserImages mutation

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { VideoJson } from "@/remotion-src/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VideoMeta {
  scenes: number;
  totalFrames: number;
  durationSeconds: number;
}

export interface GenerateVideoResponse {
  videoJson: VideoJson;
  /** Persisted chat id — store in React state for follow-up prompts. */
  chatId: string;
  meta: VideoMeta;
}

export interface GenerateVideoOptions {
  useTTS?: boolean;
  voiceId?: string;
  useMusic?: boolean;
  musicGenre?: string;
  ttsVolume?: number;
  musicVolume?: number;
}

/** Mirrors UploadedUserImage from the server controller */
export interface UploadedUserImage {
  index: number;
  /** Public URL the Remotion player can load, e.g. /user-images/abc123/0.jpg */
  url: string;
  description: string;
  filename: string;
}

export interface UploadImagesResponse {
  images: UploadedUserImage[];
  sessionId: string;
}

/** One entry in the user-images upload form */
export interface UserImageEntry {
  file: File;
  description: string;
}

/** Shape returned by GET /api/video/chats */
export interface VideoChatSummary {
  id: string;
  title: string | null;
  lastPrompt: string | null;
  updatedAt: string;
}

/** Shape returned by GET /api/video/chats/:chatId */
export interface VideoChatDetail {
  id: string;
  title: string | null;
  videoJson: VideoJson;
  prompts: { prompt: string; sentAt: string }[];
  options: Record<string, unknown> | null;
  updatedAt: string;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const videoKeys = {
  all: ["video"] as const,
  generate: () => [...videoKeys.all, "generate"] as const,
  upload: () => [...videoKeys.all, "upload"] as const,
  chats: () => [...videoKeys.all, "chats"] as const,
  chat: (id: string) => [...videoKeys.all, "chats", id] as const,
};

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * useUploadUserImages
 *
 * Calls POST /api/video/upload-images (multipart/form-data).
 * Returns { images, sessionId } — pass both to useGenerateVideo.
 */
export function useUploadUserImages() {
  return useMutation({
    mutationFn: async (
      entries: UserImageEntry[],
    ): Promise<UploadImagesResponse> => {
      const formData = new FormData();
      entries.forEach((entry, i) => {
        formData.append("images", entry.file);
        // descriptions must be an array — Elysia reads them by index
        formData.append("descriptions", entry.description || `Image ${i + 1}`);
      });

      const res = await fetch("/api/video/upload-images", {
        method: "POST",
        body: formData,
        // NOTE: Do NOT set Content-Type — browser sets it with the boundary automatically
      });

      const data = (await res.json()) as
        | UploadImagesResponse
        | { error: string; status: number };

      if (!res.ok || "error" in data) {
        throw new Error(
          "error" in data ? data.error : "Failed to upload images",
        );
      }

      return data;
    },
  });
}

/**
 * useGenerateVideo
 *
 * Calls POST /api/video/generate with a prompt and optional user images.
 * Pass chatId to continue an existing video chat (follow-up prompt).
 */
export function useGenerateVideo() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      prompt: string;
      duration?: number;
      /**
       * Pass the chatId returned from a previous generation to send a follow-up.
       * Omit (or pass null/undefined) to start a fresh video chat.
       */
      chatId?: string | null;
      options?: GenerateVideoOptions;
      /** From useUploadUserImages result — pass undefined if no images */
      userImages?: UploadedUserImage[];
      imageSessionId?: string;
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
    onSuccess: (data) => {
      // Invalidate the chat list so any history panel stays fresh
      void qc.invalidateQueries({ queryKey: videoKeys.chats() });
    },
  });
}

/**
 * useRenderVideo
 *
 * Calls POST /api/video/render with a VideoJson.
 */
export function useRenderVideo() {
  return useMutation({
    mutationFn: async (
      videoJson: VideoJson,
    ): Promise<{ jobId: string; status: string; message: string }> => {
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

// ─── Chat History ─────────────────────────────────────────────────────────────
// These hooks are used for the video chat history panel / resume flow (Phase 2+).

/** Fetches the list of video chats for the history panel. */
export function useVideoChats() {
  return useQuery({
    queryKey: videoKeys.chats(),
    queryFn: async (): Promise<VideoChatSummary[]> => {
      const res = await fetch("/api/video/chats");
      const data = (await res.json()) as
        | { chats: VideoChatSummary[] }
        | { error: string };
      if (!res.ok || "error" in data)
        throw new Error("error" in data ? data.error : "Failed to load chats");
      return data.chats;
    },
  });
}

/** Fetches a single video chat by id (for resuming a past generation). */
export function useVideoChat(chatId: string | null) {
  return useQuery({
    queryKey: videoKeys.chat(chatId ?? ""),
    enabled: !!chatId,
    queryFn: async (): Promise<VideoChatDetail> => {
      const res = await fetch(`/api/video/chats/${chatId}`);
      const data = (await res.json()) as VideoChatDetail | { error: string };
      if (!res.ok || "error" in data)
        throw new Error("error" in data ? data.error : "Failed to load chat");
      return data;
    },
  });
}