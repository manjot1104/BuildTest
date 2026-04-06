// ============================================================
// VIDEO CONTROLLER
// Follows the exact same pattern as your other controllers:
//   - Receives { body }
//   - Calls the service
//   - Returns data or { error: string; status: number }
//   - Never imports from other controllers
// ============================================================

import { getSession } from '@/server/better-auth/server'
import { generateVideoJson, renderVideo } from '@/server/services/video.service'
import type { VideoJson } from '@/remotion-src/types'

// ── POST /api/video/generate ──────────────────────────────────────────────────

export async function generateVideoHandler({
  body,
}: {
  body: {
    prompt: string
    duration?: number  // seconds, default 15
  }
}): Promise<
  | { videoJson: VideoJson; meta: { scenes: number; totalFrames: number; durationSeconds: number } }
  | { error: string; status: number }
> {
  try {
    const session = await getSession()
    if (!session?.user?.id) return { error: 'Unauthorized', status: 401 }

    const { prompt, duration = 15 } = body

    if (!prompt?.trim()) return { error: 'Prompt is required', status: 400 }
    if (prompt.trim().length < 5) return { error: 'Prompt is too short', status: 400 }
    if (prompt.length > 2000) return { error: 'Prompt is too long — maximum 2000 characters', status: 400 }
    if (duration < 5 || duration > 120) return { error: 'Duration must be between 5 and 120 seconds', status: 400 }

    const result = await generateVideoJson(prompt.trim(), duration)

    if (!result.success) {
      console.error(`[VideoController] generateVideoJson failed: ${result.details}`)
      return { error: 'Failed to generate video. Please try again or rephrase your prompt.', status: 500 }
    }

    return {
      videoJson: result.videoJson,
      meta: {
        scenes: result.videoJson.scenes.length,
        totalFrames: result.videoJson.duration,
        durationSeconds: result.videoJson.duration / (result.videoJson.fps ?? 30),
      },
    }

  } catch (err) {
    console.error('[VideoController] generateVideoHandler error:', err)
    return { error: 'Internal server error', status: 500 }
  }
}

// ── POST /api/video/render ────────────────────────────────────────────────────
// Phase 5 stub — accepts VideoJson and queues a render job.

export async function renderVideoHandler({
  body,
}: {
  body: { videoJson: VideoJson }
}): Promise<
  | { jobId: string; status: 'queued'; message: string }
  | { error: string; status: number }
> {
  try {
    const session = await getSession()
    if (!session?.user?.id) return { error: 'Unauthorized', status: 401 }

    const { videoJson } = body

    if (!videoJson?.scenes?.length) {
      return { error: 'videoJson with at least one scene is required', status: 400 }
    }

    const result = await renderVideo(videoJson)

    if (!result.success) {
      return { error: result.error, status: 500 }
    }

    return {
      jobId: result.jobId,
      status: 'queued',
      message: 'Render job queued. MP4 export is coming in Phase 5.',
    }

  } catch (err) {
    console.error('[VideoController] renderVideoHandler error:', err)
    return { error: 'Internal server error', status: 500 }
  }
}