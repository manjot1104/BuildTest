import { personaStore, type PersonaEntry } from '@/app/api/persona/store'

export interface PublishPersonaBody {
  slug: string
  title?: string
  layout: string
  background?: unknown
}

export function publishPersonaHandler({ body }: { body: PublishPersonaBody }) {
  const { slug, title, layout, background } = body

  personaStore.set(slug, {
    slug,
    title: title ?? 'My Persona',
    layout,
    background: background !== undefined ? JSON.stringify(background) : undefined,
    publishedAt: new Date().toISOString(),
  })

  return { success: true, slug }
}

export function getPersonaHandler({ params }: { params: { slug: string } }): PersonaEntry | null {
  return personaStore.get(params.slug) ?? null
}
