'use server'

import { env } from '@/env'
import { getSession } from '@/server/better-auth/server'
import { deductCredits, addAdditionalCredits } from '@/server/services/credits.service'

const REPLICATE_BASE = 'https://api.replicate.com/v1'
const VIDEO_CREDIT_COST = 50

export async function generateVideoHandler(request: Request) {
  const session = await getSession()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { prompt } = body as { prompt: string }

  if (!prompt) {
    return Response.json({ error: 'Prompt is required' }, { status: 400 })
  }

 
  const deductResult = await deductCredits(
    session.user.id,
    VIDEO_CREDIT_COST,
    'video_generation',
  )

  if (!deductResult.success) {
   
    return Response.json(
      {
        error: 'insufficient_credits',
        message: `You need ${VIDEO_CREDIT_COST} credits to generate a video. Please purchase more credits.`,
        required: VIDEO_CREDIT_COST,
      },
      { status: 402 }
    )
  }

 
  let taskId: string | undefined

  try {
  const res = await fetch(`${REPLICATE_BASE}/models/bytedance/seedance-2.0/predictions`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${env.REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait=30',
    },
    body: JSON.stringify({
      input: { prompt, duration: 5, resolution: '720p', aspect_ratio: '16:9' },
    }),
  })

  const data = await res.json() as { id?: string; error?: string; detail?: string; title?: string }
  taskId = data?.id

  if (!taskId) {
    await addAdditionalCredits(session.user.id, VIDEO_CREDIT_COST)


    const apiError = data?.error ?? data?.detail ?? data?.title ?? ''
    let userMessage = 'Video generation failed. Your credits have been refunded.'

    if (apiError.toLowerCase().includes('credit') || apiError.toLowerCase().includes('billing') || apiError.toLowerCase().includes('insufficient')) {
      userMessage = 'Video generation is temporarily unavailable due to limited resources. Please try again shortly.'
    } else if (apiError.toLowerCase().includes('unauthorized') || apiError.toLowerCase().includes('token') || apiError.toLowerCase().includes('auth')) {
      userMessage = 'API key is invalid or expired. Please check the configuration.'
    } else if (apiError.toLowerCase().includes('rate') || apiError.toLowerCase().includes('limit')) {
      userMessage = 'Rate limit reached. Please wait a moment and try again.'
    } else if (apiError.toLowerCase().includes('model') || apiError.toLowerCase().includes('not found')) {
      userMessage = 'Video model is currently unavailable. Please try again later.'
    } else if (apiError.trim()) {
      userMessage = `Generation failed: ${apiError}`
    }

    return Response.json(
      { error: 'generation_failed', message: userMessage },
      { status: 500 }
    )
  }
} catch (err) {
  await addAdditionalCredits(session.user.id, VIDEO_CREDIT_COST)
  return Response.json(
    { error: 'generation_failed', message: 'Network error. Your credits have been refunded.' },
    { status: 500 }
  )
}

  return Response.json({ taskId })
}

export async function getVideoStatusHandler(request: Request) {
  const url = new URL(request.url)
  const taskId = url.searchParams.get('taskId')

  if (!taskId) {
    return Response.json({ error: 'taskId required' }, { status: 400 })
  }

  const res = await fetch(`${REPLICATE_BASE}/predictions/${taskId}`, {
    headers: { Authorization: `Token ${env.REPLICATE_API_TOKEN}` },
  })

  const data = await res.json() as {
    status?: string
    output?: string
  }

  const statusMap: Record<string, string> = {
    starting: 'pending',
    processing: 'processing',
    succeeded: 'completed',
    failed: 'failed',
  }

  return Response.json({
    status: statusMap[data.status ?? 'starting'] ?? 'pending',
    videoUrl: data.output ?? null,
  })
}