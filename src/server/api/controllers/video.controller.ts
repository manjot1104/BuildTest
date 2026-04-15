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

  // No credits, no replicate
  return Response.json({
    success: true,
    message: 'Video generation disabled. Using template videos instead.',
  })
}

export async function getVideoStatusHandler() {
  return Response.json({
    status: 'completed',
    videoUrl: null,
  })
}