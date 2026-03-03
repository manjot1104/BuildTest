import { NextRequest, NextResponse } from 'next/server'
import { personaStore } from '../store'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const persona = personaStore.get(slug)

  if (!persona) {
    return NextResponse.json({ error: 'Persona not found' }, { status: 404 })
  }

  return NextResponse.json(persona)
}
