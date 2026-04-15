'use server'


import { getSession } from '@/server/better-auth/server'




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