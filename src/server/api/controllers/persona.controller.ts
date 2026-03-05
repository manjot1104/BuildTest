'use server'

import { getSession } from '@/server/better-auth/server'
import {
  createPersonaLayout,
  getPersonaLayoutsByUserId,
  getPersonaLayoutById,
  getPersonaLayoutBySlug,
  updatePersonaLayout,
  publishPersonaLayout,
  unpublishPersonaLayout,
  deletePersonaLayout,
} from '@/server/db/queries'

// ─── helpers ──────────────────────────────────────────────────────────────────

async function requireSession() {
  const session = await getSession()
  if (!session?.user?.id) return null
  return session.user
}

// ─── handlers ─────────────────────────────────────────────────────────────────

/** POST /api/persona — create a new draft */
export async function createPersonaHandler({
  body,
}: {
  body: { title?: string; layout?: string; background?: string }
}) {
  const user = await requireSession()
  if (!user) return { error: 'Unauthorized', status: 401 as const }

  const row = await createPersonaLayout({
    userId: user.id,
    title: body.title,
    layout: body.layout,
    background: body.background ?? null,
  })

  return { success: true as const, id: row.id }
}

/** GET /api/personas — list the authenticated user's personas */
export async function listPersonasHandler() {
  const user = await requireSession()
  if (!user) return { error: 'Unauthorized', status: 401 as const }
  return getPersonaLayoutsByUserId(user.id)
}

/** GET /api/persona/:id — get one persona (owned) */
export async function getPersonaByIdHandler({ params }: { params: { id: string } }) {
  const user = await requireSession()
  if (!user) return { error: 'Unauthorized', status: 401 as const }

  const row = await getPersonaLayoutById(params.id)
  if (!row || row.user_id !== user.id) return { error: 'Not found', status: 404 as const }

  return row
}

/** PUT /api/persona/:id — save/update a draft */
export async function updatePersonaHandler({
  params,
  body,
}: {
  params: { id: string }
  body: { title?: string; layout?: string; background?: string | null }
}) {
  const user = await requireSession()
  if (!user) return { error: 'Unauthorized', status: 401 as const }

  await updatePersonaLayout(params.id, user.id, {
    title: body.title,
    layout: body.layout,
    background: body.background,
  })

  return { success: true as const }
}

/** POST /api/persona/:id/publish — publish and set slug */
export async function publishPersonaByIdHandler({
  params,
  body,
}: {
  params: { id: string }
  body: { slug: string; title?: string }
}) {
  const user = await requireSession()
  if (!user) return { error: 'Unauthorized', status: 401 as const }

  const cleanSlug = body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
  if (!cleanSlug) return { error: 'Invalid slug', status: 400 as const }

  // Check slug is not taken by another persona
  const existing = await getPersonaLayoutBySlug(cleanSlug)
  if (existing && existing.id !== params.id) {
    return { error: 'This URL is already taken', status: 409 as const }
  }

  await publishPersonaLayout(params.id, user.id, cleanSlug, body.title)

  return { success: true as const, slug: cleanSlug }
}

/** POST /api/persona/:id/unpublish */
export async function unpublishPersonaByIdHandler({ params }: { params: { id: string } }) {
  const user = await requireSession()
  if (!user) return { error: 'Unauthorized', status: 401 as const }

  await unpublishPersonaLayout(params.id, user.id)
  return { success: true as const }
}

/** DELETE /api/persona/:id */
export async function deletePersonaByIdHandler({ params }: { params: { id: string } }) {
  const user = await requireSession()
  if (!user) return { error: 'Unauthorized', status: 401 as const }

  await deletePersonaLayout(params.id, user.id)
  return { success: true as const }
}

/** GET /api/persona/public/:slug — public, no auth required */
export async function getPublicPersonaHandler({ params }: { params: { slug: string } }) {
  return getPersonaLayoutBySlug(params.slug)
}
