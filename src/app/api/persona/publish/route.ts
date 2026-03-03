import { NextRequest, NextResponse } from 'next/server'
import { personaStore } from '../store'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { slug?: string; title?: string; layout?: string; background?: unknown }
    const { slug, title, layout, background } = body

    if (!slug || !layout) {
      return NextResponse.json({ error: 'slug and layout are required' }, { status: 400 })
    }

    personaStore.set(slug, {
      slug,
      title: title ?? 'My Persona',
      layout,
      background: background ? JSON.stringify(background) : undefined,
      publishedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, slug })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
