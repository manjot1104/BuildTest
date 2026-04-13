// server/controllers/video-chat.controller.ts
//
// Handles GET/DELETE endpoints for video chat history.
// Video generation (POST) lives in video.controller.ts — it owns the chatId lifecycle.

import { getSession } from '@/server/better-auth/server'
import {
  getVideoChatById,
  getVideoChatsByUserId,
  deleteVideoChat,
} from '@/server/db/queries'
import type { VideoJson } from '@/remotion-src/types'

// ── GET /api/video/chats ──────────────────────────────────────────────────────

export async function getVideoChatsHandler(): Promise<
  | { chats: { id: string; title: string | null; lastPrompt: string | null; updatedAt: string }[] }
  | { error: string; status: number }
> {
  const session = await getSession()
  if (!session?.user?.id) return { error: 'Unauthorized', status: 401 }

  const rows = await getVideoChatsByUserId({ userId: session.user.id })

  return {
    chats: rows.map((r) => {
      const prompts = (r.prompts as { prompt: string; sentAt: string }[]) ?? []
      const lastPrompt = prompts.at(-1)?.prompt ?? null
      return {
        id: r.id,
        title: r.title,
        lastPrompt,
        updatedAt: r.updated_at.toISOString(),
      }
    }),
  }
}

// ── GET /api/video/chats/:chatId ──────────────────────────────────────────────

export async function getVideoChatHandler({
  params,
}: {
  params: { chatId: string }
}): Promise<
  | {
      id: string
      title: string | null
      videoJson: VideoJson
      prompts: { prompt: string; sentAt: string }[]
      options: Record<string, unknown> | null
      updatedAt: string
    }
  | { error: string; status: number }
> {
  const session = await getSession()
  if (!session?.user?.id) return { error: 'Unauthorized', status: 401 }

  const row = await getVideoChatById({ chatId: params.chatId, userId: session.user.id })
  if (!row) return { error: 'Not found', status: 404 }

  let videoJson: VideoJson
  try {
    videoJson = JSON.parse(row.video_json) as VideoJson
  } catch {
    return { error: 'Corrupt video data', status: 500 }
  }

  return {
    id: row.id,
    title: row.title,
    videoJson,
    prompts: (row.prompts as { prompt: string; sentAt: string }[]) ?? [],
    options: (row.current_options as Record<string, unknown> | null) ?? null,
    updatedAt: row.updated_at.toISOString(),
  }
}

// ── DELETE /api/video/chats/:chatId ───────────────────────────────────────────

export async function deleteVideoChatHandler({
  params,
}: {
  params: { chatId: string }
}): Promise<{ success: true } | { error: string; status: number }> {
  const session = await getSession()
  if (!session?.user?.id) return { error: 'Unauthorized', status: 401 }

  await deleteVideoChat({ chatId: params.chatId, userId: session.user.id })
  return { success: true }
}