'use server'

import { getSession } from '@/server/better-auth/server'
import {
  createStudioLayout,
  getStudioLayoutsByUserId,
  getStudioLayoutById,
  getStudioLayoutBySlug,
  updateStudioLayout,
  publishStudioLayout,
  unpublishStudioLayout,
  deleteStudioLayout,
} from '@/server/db/queries'

// ─── helpers ──────────────────────────────────────────────────────────────────

async function requireSession() {
  const session = await getSession()
  if (!session?.user?.id) return null
  return session.user
}

// ─── handlers ─────────────────────────────────────────────────────────────────

/** POST /api/design — create a new design draft */
export async function createDesignHandler({
  body,
}: {
  body: { title?: string; layout?: string; background?: string }
}) {
  const user = await requireSession()
  if (!user) return { error: 'Unauthorized', status: 401 as const }

  const row = await createStudioLayout({
    userId: user.id,
    title: body.title,
    layout: body.layout,
    background: body.background ?? null,
  })

  return { success: true as const, id: row.id }
}

/** GET /api/designs — list the authenticated user's designs */
export async function listDesignsHandler() {
  const user = await requireSession()
  if (!user) return { error: 'Unauthorized', status: 401 as const }
  const rows = await getStudioLayoutsByUserId(user.id)
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    isPublished: r.is_published,
    publishedAt: r.published_at?.toISOString() ?? null,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  }))
}

/** GET /api/design/:id — get one design (owned) */
export async function getDesignByIdHandler({ params }: { params: { id: string } }) {
  const user = await requireSession()
  if (!user) return { error: 'Unauthorized', status: 401 as const }

  const row = await getStudioLayoutById(params.id)
  if (!row || row.user_id !== user.id) return { error: 'Not found', status: 404 as const }

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    layout: row.layout,
    background: row.background,
    isPublished: row.is_published,
  }
}

/** PUT /api/design/:id — save/update a draft */
export async function updateDesignHandler({
  params,
  body,
}: {
  params: { id: string }
  body: { title?: string; layout?: string; background?: string | null }
}) {
  const user = await requireSession()
  if (!user) return { error: 'Unauthorized', status: 401 as const }

  await updateStudioLayout(params.id, user.id, {
    title: body.title,
    layout: body.layout,
    background: body.background,
  })

  return { success: true as const }
}

/** POST /api/design/:id/publish — publish and set slug */
export async function publishDesignByIdHandler({
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

  // Check slug is not taken by another design
  const existing = await getStudioLayoutBySlug(cleanSlug)
  if (existing && existing.id !== params.id) {
    return { error: 'This URL is already taken', status: 409 as const }
  }

  const updated = await publishStudioLayout(params.id, user.id, cleanSlug, body.title)
  if (!updated) return { error: 'Design not found', status: 404 as const }

  return { success: true as const, slug: cleanSlug }
}

/** POST /api/design/:id/unpublish */
export async function unpublishDesignByIdHandler({ params }: { params: { id: string } }) {
  const user = await requireSession()
  if (!user) return { error: 'Unauthorized', status: 401 as const }

  await unpublishStudioLayout(params.id, user.id)
  return { success: true as const }
}

/** DELETE /api/design/:id */
export async function deleteDesignByIdHandler({ params }: { params: { id: string } }) {
  const user = await requireSession()
  if (!user) return { error: 'Unauthorized', status: 401 as const }

  await deleteStudioLayout(params.id, user.id)
  return { success: true as const }
}

/** GET /api/design/public/:slug — public page, no auth required */
export async function getPublicDesignHandler({ params }: { params: { slug: string } }) {
  return getStudioLayoutBySlug(params.slug)
}
