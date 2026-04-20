import { and, count, desc, eq, gte, isNotNull, inArray, or } from 'drizzle-orm'
import { randomUUID } from 'crypto'

import { user_chats, anonymous_chat_logs, user, github_repos, studio_layouts, chat_folders } from './schema'
import { isNull } from 'drizzle-orm'
import {
  test_cases,
  test_runs,
  test_results,
  crawl_results,
  bug_reports,
  report_exports,
  performance_metrics,
} from './schema'

import { video_chats } from './schema'
import type { VideoJson } from '@/remotion-src/types'
import type { UploadedUserImage } from '@/server/api/controllers/video-upload.controller'

import { db } from './index'

// ============================================================================
// Type Definitions
// ============================================================================

import { demo_visits } from './schema'


export async function getTotalDemoVisits(): Promise<number> {
  const [result] = await db
    .select({ count: count(demo_visits.id) })
    .from(demo_visits)

  return result?.count ?? 0
}

export async function getDemoVisitsByType() {
  const [featured] = await db
    .select({ count: count(demo_visits.id) })
    .from(demo_visits)
    .where(eq(demo_visits.demo_type, 'featured'))

  const [community] = await db
    .select({ count: count(demo_visits.id) })
    .from(demo_visits)
    .where(eq(demo_visits.demo_type, 'community'))

  return {
    featured: featured?.count ?? 0,
    community: community?.count ?? 0,
  }
}

export async function getUserDemoVisits(userId: string): Promise<number> {
  const [result] = await db
    .select({ count: count(demo_visits.id) })
    .from(demo_visits)
    .where(eq(demo_visits.owner_user_id, userId))

  return result?.count ?? 0
}
export type UserChat = typeof user_chats.$inferSelect
export type UserChatInsert = typeof user_chats.$inferInsert
export type AnonymousChatLog = typeof anonymous_chat_logs.$inferSelect

/** Parameters for creating a new user chat */
export interface CreateUserChatParams {
  v0ChatId: string
  userId: string
  title?: string
  prompt?: string
  demoUrl?: string
  previewUrl?: string
  demoHtml?: string
}

/** Parameters for updating an existing user chat */
export interface UpdateUserChatParams {
  v0ChatId: string
  title?: string
  demoUrl?: string
  previewUrl?: string
  demoHtml?: string
}

// Legacy type alias for backward compatibility
export type ChatOwnership = UserChat

// ============================================================================
// User Chat Functions
// ============================================================================

/**
 * Creates a new user chat record
 * Stores chat metadata locally for efficient history retrieval
 */
export async function createUserChat({
  v0ChatId,
  userId,
  title,
  prompt,
  demoUrl,
  previewUrl,
  demoHtml,
}: CreateUserChatParams): Promise<void> {
  try {
    await db
      .insert(user_chats)
      .values({
        id: randomUUID(),
        v0_chat_id: v0ChatId,
        user_id: userId,
        title: title ?? null,
        prompt: prompt ?? null,
        demo_url: demoUrl ?? null,
        preview_url: previewUrl ?? null,
        demo_html: demoHtml ?? null,
      })
      .onConflictDoNothing({ target: user_chats.v0_chat_id })
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Updates an existing user chat record
 * Used to update metadata after v0 responds (title, demo URL, etc.)
 */
export async function updateUserChat({
  v0ChatId,
  title,
  demoUrl,
  previewUrl,
  demoHtml,
}: UpdateUserChatParams): Promise<void> {
  try {
    const updates: Partial<UserChatInsert> = {
      updated_at: new Date(),
    }

    if (title !== undefined) updates.title = title
    if (demoUrl !== undefined) updates.demo_url = demoUrl
    if (previewUrl !== undefined) updates.preview_url = previewUrl
    if (demoHtml !== undefined) updates.demo_html = demoHtml

    await db
      .update(user_chats)
      .set(updates)
      .where(eq(user_chats.v0_chat_id, v0ChatId))
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Renames a chat title with ownership verification.
 * Matches by id, v0_chat_id, or conversation_id.
 */
export async function renameUserChat({
  chatId,
  userId,
  title,
}: {
  chatId: string
  userId: string
  title: string
}): Promise<boolean> {
  const result = await db
    .update(user_chats)
    .set({ title: title.trim(), updated_at: new Date() })
    .where(
      and(
        eq(user_chats.user_id, userId),
        or(
          eq(user_chats.id, chatId),
          eq(user_chats.v0_chat_id, chatId),
          eq(user_chats.conversation_id, chatId),
        ),
      ),
    )
    .returning({ id: user_chats.id })
  return result.length > 0
}

/**
 * Gets a user chat by v0 chat ID
 */
export async function getUserChat({
  v0ChatId,
}: {
  v0ChatId: string
}): Promise<UserChat | undefined> {
  try {
    const [chat] = await db
      .select()
      .from(user_chats)
      .where(eq(user_chats.v0_chat_id, v0ChatId))
      .limit(1)
    return chat
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Gets the demo URL for a chat by v0 chat ID (public, no auth needed)
 * Used for the /apps/[chatId] page to render the deployed app
 */
export async function getChatDemoUrl({
  v0ChatId,
}: {
  v0ChatId: string
}): Promise<{ demoUrl: string; title: string | null } | undefined> {
  try {
    const [chat] = await db
      .select({
        demo_url: user_chats.demo_url,
        title: user_chats.title,
      })
      .from(user_chats)
      .where(eq(user_chats.v0_chat_id, v0ChatId))
      .limit(1)

    if (!chat?.demo_url) return undefined
    return { demoUrl: chat.demo_url, title: chat.title }
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Gets all chats for a user, ordered by most recent first
 * This is the main function for chat history - no v0 API call needed
 */
export async function getUserChatsByUserId({
  userId,
  limit = 50,
  offset = 0,
  type = "all",
}: {
  userId: string
  limit?: number
  offset?: number
  type?: "builder" | "openrouter" | "all"
}): Promise<UserChat[]> {
  try {

    const chats = await db
      .select()
      .from(user_chats)
      .where(
        type === "builder"
          ? and(
              eq(user_chats.user_id, userId),
              eq(user_chats.chat_type, "BUILDER")
            )
          : type === "openrouter"
          ? and(
              eq(user_chats.user_id, userId),
              eq(user_chats.chat_type, "OPENROUTER")
            )
          : eq(user_chats.user_id, userId)
      )
      .orderBy(desc(user_chats.updated_at))
      .limit(limit)
      .offset(offset)

    return chats
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Gets just the chat IDs for a user (legacy function for backward compatibility)
 */
export async function getChatIdsByUserId({
  userId,
}: {
  userId: string
}): Promise<string[]> {
  try {
    const chats = await db
      .select({ v0ChatId: user_chats.v0_chat_id })
      .from(user_chats)
      .where(eq(user_chats.user_id, userId))
      .orderBy(desc(user_chats.created_at))

    return chats.map((c) => c.v0ChatId).filter(Boolean) as string[]
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Deletes a user chat (requires userId for ownership verification)
 */
export async function deleteUserChat({
  v0ChatId,
  userId,
}: {
  v0ChatId: string
  userId: string
}): Promise<void> {
  try {
    await db
      .delete(user_chats)
      .where(
        and(eq(user_chats.v0_chat_id, v0ChatId), eq(user_chats.user_id, userId)),
      )
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Gets community chats (chats with a demo_url) with author info
 * Used for the community builds discovery grid
 */
export async function getCommunityChats({
  limit = 12,
  offset = 0,
}: {
  limit?: number
  offset?: number
} = {}): Promise<
  {
    id: string
    v0_chat_id: string | null
    title: string | null
    prompt: string | null
    demo_url: string | null
    preview_url: string | null
    demo_html: string | null 
    created_at: Date
    updated_at: Date
    author_name: string
    author_image: string | null
  }[]
> {
  try {
    const chats = await db
      .select({
        id: user_chats.id,
        v0_chat_id: user_chats.v0_chat_id,
        title: user_chats.title,
        prompt: user_chats.prompt,
        demo_url: user_chats.demo_url,
        preview_url: user_chats.preview_url,
        demo_html: user_chats.demo_html,
        created_at: user_chats.created_at,
        updated_at: user_chats.updated_at,
        author_name: user.name,
        author_image: user.image,
      })
      .from(user_chats)
      .innerJoin(user, eq(user_chats.user_id, user.id))
      .where(isNotNull(user_chats.demo_url))
      .orderBy(desc(user_chats.created_at))
      .limit(limit)
      .offset(offset)

    return chats
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Gets featured/best community chats by their v0 chat IDs
 * Used for the "Checkout some of the bests" tab
 */
export async function getFeaturedChats(
  chatIds: string[],
): Promise<
  {
    id: string
    v0_chat_id: string | null
    title: string | null
    prompt: string | null
    demo_url: string | null
    preview_url: string | null
    demo_html: string | null
    created_at: Date
    updated_at: Date
    author_name: string
    author_image: string | null
  }[]
> {
  try {
    if (chatIds.length === 0) return []

    const chats = await db
      .select({
        id: user_chats.id,
        v0_chat_id: user_chats.v0_chat_id,
        title: user_chats.title,
        prompt: user_chats.prompt,
        demo_url: user_chats.demo_url,
        preview_url: user_chats.preview_url,
        demo_html: user_chats.demo_html,
        created_at: user_chats.created_at,
        updated_at: user_chats.updated_at,
        author_name: user.name,
        author_image: user.image,
      })
      .from(user_chats)
      .innerJoin(user, eq(user_chats.user_id, user.id))
      .where(inArray(user_chats.v0_chat_id, chatIds))

    return chats
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Gets total count of community chats (chats with demo_url)
 */
export async function getCommunityChatsCount(): Promise<number> {
  try {
    const [result] = await db
      .select({ count: count(user_chats.id) })
      .from(user_chats)
      .where(isNotNull(user_chats.demo_url))

    return result?.count ?? 0
  } catch (error: unknown) {
    throw error
  }
}

// ============================================================================
// Legacy Aliases (for backward compatibility)
// ============================================================================

/** @deprecated Use createUserChat instead */
export const createChatOwnership = createUserChat

/** @deprecated Use getUserChat instead */
export const getChatOwnership = getUserChat

/** @deprecated Use deleteUserChat instead */
export const deleteChatOwnership = deleteUserChat

// ============================================================================
// Rate Limiting Functions
// ============================================================================

/**
 * Gets the count of chats created by a user within a time window
 * Used for rate limiting authenticated users
 */
export async function getChatCountByUserId({
  userId,
  differenceInHours,
}: {
  userId: string
  differenceInHours: number
}): Promise<number> {
  try {
    const hoursAgo = new Date(Date.now() - differenceInHours * 60 * 60 * 1000)

    const [stats] = await db
      .select({ count: count(user_chats.id) })
      .from(user_chats)
      .where(
        and(
          eq(user_chats.user_id, userId),
          gte(user_chats.created_at, hoursAgo),
        ),
      )

    return stats?.count ?? 0
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Gets the count of anonymous chats created from an IP within a time window
 * Used for rate limiting anonymous users
 */
export async function getChatCountByIP({
  ipAddress,
  differenceInHours,
}: {
  ipAddress: string
  differenceInHours: number
}): Promise<number> {
  try {
    const hoursAgo = new Date(Date.now() - differenceInHours * 60 * 60 * 1000)

    const [stats] = await db
      .select({ count: count(anonymous_chat_logs.id) })
      .from(anonymous_chat_logs)
      .where(
        and(
          eq(anonymous_chat_logs.ip_address, ipAddress),
          gte(anonymous_chat_logs.created_at, hoursAgo),
        ),
      )

    return stats?.count ?? 0
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Creates a log entry for anonymous chat creation
 * Used for rate limiting anonymous users
 */
export async function createAnonymousChatLog({
  ipAddress,
  v0ChatId,
}: {
  ipAddress: string
  v0ChatId: string
}): Promise<void> {
  try {
    await db.insert(anonymous_chat_logs).values({
      id: randomUUID(),
      ip_address: ipAddress,
      v0_chat_id: v0ChatId,
    })
  } catch (error: unknown) {
    throw error
  }
}

// ============================================================================
// GitHub Repo Functions
// ============================================================================

export type GithubRepo = typeof github_repos.$inferSelect
export type GithubRepoInsert = typeof github_repos.$inferInsert

export interface CreateGithubRepoParams {
  chatId: string
  userId: string
  githubRepoId: string
  repoName: string
  repoFullName: string
  repoUrl: string
  visibility: 'public' | 'private'
}

/**
 * Gets the currently active GitHub repo for a chat.
 * This is what pushes target.
 */
export async function getActiveGithubRepo({
  chatId,
}: {
  chatId: string
}): Promise<GithubRepo | undefined> {
  try {
    const [repo] = await db
      .select()
      .from(github_repos)
      .where(
        and(
          eq(github_repos.chat_id, chatId),
          eq(github_repos.is_active, true),
        ),
      )
      .limit(1)
    return repo
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Deactivates all currently active repos for a chat.
 * Called before linking a new repo to the same chat.
 */
export async function deactivateGithubReposForChat({
  chatId,
}: {
  chatId: string
}): Promise<void> {
  try {
    await db
      .update(github_repos)
      .set({ is_active: false, updated_at: new Date() })
      .where(
        and(
          eq(github_repos.chat_id, chatId),
          eq(github_repos.is_active, true),
        ),
      )
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Creates a new GitHub repo record and marks it as active.
 *
 * Uses upsert on (chat_id, github_repo_id) so that reconnecting a previously-used
 * repo within the same chat updates the existing row rather than crashing.
 *
 * Prefer replaceActiveGithubRepo when also needing to deactivate an existing repo —
 * that function wraps both operations in a transaction to prevent race conditions.
 */
export async function createGithubRepo({
  chatId,
  userId,
  githubRepoId,
  repoName,
  repoFullName,
  repoUrl,
  visibility,
}: CreateGithubRepoParams): Promise<GithubRepo> {
  try {
    const [repo] = await db
      .insert(github_repos)
      .values({
        id: randomUUID(),
        chat_id: chatId,
        user_id: userId,
        github_repo_id: githubRepoId,
        repo_name: repoName,
        repo_full_name: repoFullName,
        repo_url: repoUrl,
        visibility,
        is_active: true,
      })
      .onConflictDoUpdate({
        // Scoped to (chat_id, github_repo_id) — not globally unique.
        // Fires only when the same chat reconnects to a repo it previously used.
        target: [github_repos.chat_id, github_repos.github_repo_id],
        set: {
          user_id: userId,
          repo_name: repoName,
          repo_full_name: repoFullName,
          repo_url: repoUrl,
          visibility,
          is_active: true,
          updated_at: new Date(),
        },
      })
      .returning()

    return repo!
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Atomically deactivates any existing active repo for a chat and links a new one.
 *
 * Wraps deactivation + insert in a single transaction so concurrent requests
 * for the same chat can never interleave and produce two active rows or a
 * half-updated state. The upsert on (chat_id, github_repo_id) handles the
 * case where this exact repo was previously linked to this chat (deactivated
 * by a prior replace) — it re-activates and updates that row rather than
 * inserting a duplicate.
 *
 * This is the only function the controller should call when linking a repo.
 * deactivateGithubReposForChat and createGithubRepo remain available
 * individually but should not be called in sequence outside a transaction.
 */
export async function replaceActiveGithubRepo({
  chatId,
  userId,
  githubRepoId,
  repoName,
  repoFullName,
  repoUrl,
  visibility,
}: CreateGithubRepoParams): Promise<GithubRepo> {
  try {
    return await db.transaction(async (tx) => {
      // Step 1: deactivate any currently active repo for this chat
      await tx
        .update(github_repos)
        .set({ is_active: false, updated_at: new Date() })
        .where(
          and(
            eq(github_repos.chat_id, chatId),
            eq(github_repos.is_active, true),
          ),
        )

      // Step 2: insert the new repo (or re-activate if previously linked to this chat)
      const [repo] = await tx
        .insert(github_repos)
        .values({
          id: randomUUID(),
          chat_id: chatId,
          user_id: userId,
          github_repo_id: githubRepoId,
          repo_name: repoName,
          repo_full_name: repoFullName,
          repo_url: repoUrl,
          visibility,
          is_active: true,
        })
        .onConflictDoUpdate({
          // Scoped to (chat_id, github_repo_id) — not globally unique.
          // Fires only when the same chat reconnects to a repo it previously used.
          target: [github_repos.chat_id, github_repos.github_repo_id],
          set: {
            user_id: userId,
            repo_name: repoName,
            repo_full_name: repoFullName,
            repo_url: repoUrl,
            visibility,
            is_active: true,
            updated_at: new Date(),
          },
        })
        .returning()

      return repo!
    })
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Updates the visibility of a GitHub repo.
 * For future use: allow changing visibility from the app.
 */
export async function updateGithubRepoVisibility({
  id,
  visibility,
}: {
  id: string
  visibility: 'public' | 'private'
}): Promise<void> {
  try {
    await db
      .update(github_repos)
      .set({ visibility, updated_at: new Date() })
      .where(eq(github_repos.id, id))
  } catch (error: unknown) {
    throw error
  }
}

// ============================================================================
// Studio Layout Queries
// ============================================================================

export type StudioLayout = typeof studio_layouts.$inferSelect

export async function createStudioLayout({
  userId,
  title,
  layout,
  background,
}: {
  userId: string
  title?: string
  layout?: string
  background?: string | null
}): Promise<StudioLayout> {
  const id = randomUUID()
  const [row] = await db
    .insert(studio_layouts)
    .values({
      id,
      user_id: userId,
      title: title ?? 'Untitled',
      layout: layout ?? '[]',
      background: background ?? null,
    })
    .returning()
  return row!
}

export async function getStudioLayoutsByUserId(userId: string): Promise<StudioLayout[]> {
  return db
    .select()
    .from(studio_layouts)
    .where(eq(studio_layouts.user_id, userId))
    .orderBy(desc(studio_layouts.updated_at))
}

export async function getStudioLayoutById(id: string): Promise<StudioLayout | null> {
  const [row] = await db
    .select()
    .from(studio_layouts)
    .where(eq(studio_layouts.id, id))
  return row ?? null
}

export async function getStudioLayoutBySlug(slug: string): Promise<StudioLayout | null> {
  const [row] = await db
    .select()
    .from(studio_layouts)
    .where(and(eq(studio_layouts.slug, slug), eq(studio_layouts.is_published, true)))
  return row ?? null
}

export async function updateStudioLayout(
  id: string,
  userId: string,
  data: { title?: string; layout?: string; background?: string | null },
): Promise<void> {
  await db
    .update(studio_layouts)
    .set({ ...data, updated_at: new Date() })
    .where(and(eq(studio_layouts.id, id), eq(studio_layouts.user_id, userId)))
}

export async function publishStudioLayout(
  id: string,
  userId: string,
  slug: string,
  title?: string,
): Promise<boolean> {
  const result = await db
    .update(studio_layouts)
    .set({
      slug,
      is_published: true,
      published_at: new Date(),
      updated_at: new Date(),
      ...(title ? { title } : {}),
    })
    .where(and(eq(studio_layouts.id, id), eq(studio_layouts.user_id, userId)))
    .returning({ id: studio_layouts.id })
  return result.length > 0
}

export async function unpublishStudioLayout(id: string, userId: string): Promise<void> {
  await db
    .update(studio_layouts)
    .set({ is_published: false, updated_at: new Date() })
    .where(and(eq(studio_layouts.id, id), eq(studio_layouts.user_id, userId)))
}

export async function deleteStudioLayout(id: string, userId: string): Promise<void> {
  await db
    .delete(studio_layouts)
    .where(and(eq(studio_layouts.id, id), eq(studio_layouts.user_id, userId)))
}

// ─── Chat Folders ────────────────────────────────────────────────────────────

export type ChatFolder = typeof chat_folders.$inferSelect

export async function createChatFolder({
  userId,
  name,
  color,
}: {
  userId: string
  name: string
  color?: string
}): Promise<ChatFolder> {
  const id = randomUUID()
  // Get the next position
  const existing = await db
    .select({ position: chat_folders.position })
    .from(chat_folders)
    .where(eq(chat_folders.user_id, userId))
    .orderBy(desc(chat_folders.position))
    .limit(1)
  const nextPos = (existing[0]?.position ?? -1) + 1

  const [folder] = await db
    .insert(chat_folders)
    .values({
      id,
      user_id: userId,
      name: name.trim(),
      color: color ?? null,
      position: nextPos,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning()

  return folder!
}

export async function getChatFoldersByUserId(userId: string): Promise<(ChatFolder & { chatCount: number })[]> {
  const folders = await db
    .select()
    .from(chat_folders)
    .where(eq(chat_folders.user_id, userId))
    .orderBy(chat_folders.position, chat_folders.created_at)

  // Get chat counts per folder
  const counts = await db
    .select({
      folder_id: user_chats.folder_id,
      count: count(user_chats.id),
    })
    .from(user_chats)
    .where(and(eq(user_chats.user_id, userId), isNotNull(user_chats.folder_id)))
    .groupBy(user_chats.folder_id)

  const countMap = new Map(counts.map((c) => [c.folder_id, c.count]))
  return folders.map((f) => ({ ...f, chatCount: countMap.get(f.id) ?? 0 }))
}

export async function updateChatFolder(
  id: string,
  userId: string,
  data: { name?: string; color?: string | null; position?: number },
): Promise<void> {
  await db
    .update(chat_folders)
    .set({
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.position !== undefined ? { position: data.position } : {}),
      updated_at: new Date(),
    })
    .where(and(eq(chat_folders.id, id), eq(chat_folders.user_id, userId)))
}

export async function deleteChatFolder(id: string, userId: string): Promise<void> {
  // Chats in this folder will have folder_id set to null due to ON DELETE SET NULL
  await db
    .delete(chat_folders)
    .where(and(eq(chat_folders.id, id), eq(chat_folders.user_id, userId)))
}

export async function assignChatToFolder({
  chatId,
  folderId,
  userId,
}: {
  chatId: string
  folderId: string | null
  userId: string
}): Promise<void> {
  // Try matching by id first, then by v0_chat_id, then by conversation_id
  const [chat] = await db
    .select({ id: user_chats.id })
    .from(user_chats)
    .where(
      and(
        eq(user_chats.user_id, userId),
        eq(user_chats.id, chatId),
      ),
    )
    .limit(1)

  const targetId = chat?.id

  if (!targetId) {
    // Try v0_chat_id
    const [byV0] = await db
      .select({ id: user_chats.id })
      .from(user_chats)
      .where(and(eq(user_chats.user_id, userId), eq(user_chats.v0_chat_id, chatId)))
      .limit(1)
    if (!byV0) {
      // Try conversation_id
      const [byConv] = await db
        .select({ id: user_chats.id })
        .from(user_chats)
        .where(and(eq(user_chats.user_id, userId), eq(user_chats.conversation_id, chatId)))
        .limit(1)
      if (!byConv) return
      await db
        .update(user_chats)
        .set({ folder_id: folderId, updated_at: new Date() })
        .where(eq(user_chats.id, byConv.id))
      return
    }
    await db
      .update(user_chats)
      .set({ folder_id: folderId, updated_at: new Date() })
      .where(eq(user_chats.id, byV0.id))
    return
  }

  await db
    .update(user_chats)
    .set({ folder_id: folderId, updated_at: new Date() })
    .where(eq(user_chats.id, targetId))
}

export async function getChatsByFolderId({
  folderId,
  userId,
  limit: lim = 50,
}: {
  folderId: string
  userId: string
  limit?: number
}): Promise<UserChat[]> {
  return db
    .select()
    .from(user_chats)
    .where(
      and(
        eq(user_chats.user_id, userId),
        eq(user_chats.folder_id, folderId),
      ),
    )
    .orderBy(desc(user_chats.updated_at))
    .limit(lim)
}

export async function getUnfiledChatCount(userId: string): Promise<number> {
  const [result] = await db
    .select({ count: count(user_chats.id) })
    .from(user_chats)
    .where(and(eq(user_chats.user_id, userId), isNull(user_chats.folder_id)))

  return result?.count ?? 0
}


// ============================================================================
// Testing Engine Queries
// ============================================================================

export type TestRun = typeof test_runs.$inferSelect
export type TestCase = typeof test_cases.$inferSelect
export type TestCaseInsert = typeof test_cases.$inferInsert

// ─── Test Run ─────────────────────────────────────────────────────────────────

/**
 * Counts test runs started by a user today (UTC calendar day).
 * Used to enforce per-plan daily run limits in startTestRunHandler and
 * getTestUsageHandler. Counts all statuses so a failed or in-progress run
 * still consumes quota — only the DB insert happening counts, regardless of
 * outcome. This prevents users from repeatedly hammering the endpoint on
 * transient failures to work around the daily cap.
 */
export async function countTestRunsTodayByUserId(userId: string): Promise<number> {
  // Start of today in UTC (midnight)
  const todayUtc = new Date()
  todayUtc.setUTCHours(0, 0, 0, 0)

  const [result] = await db
    .select({ count: count(test_runs.id) })
    .from(test_runs)
    .where(
      and(
        eq(test_runs.user_id, userId),
        gte(test_runs.started_at, todayUtc),
      ),
    )

  return result?.count ?? 0
}

/**
 * Fetches a single test run by id with optional relations.
 * Used by getTestRunHandler, streamTestRunHandler, cancelTestRunHandler.
 */
export async function getTestRunById(
  testRunId: string,
  opts: { withReportExports?: boolean; withBugReports?: boolean } = {},
): Promise<TestRun & { reportExports?: unknown[]; bugReports?: unknown[] } | undefined> {
  return db.query.test_runs.findFirst({
    where: eq(test_runs.id, testRunId),
    with: {
      ...(opts.withReportExports && { reportExports: true }),
      ...(opts.withBugReports && {
        bugReports: { orderBy: (b, { asc }) => [asc(b.severity)] },
      }),
    },
  }) as Promise<TestRun & { reportExports?: unknown[]; bugReports?: unknown[] } | undefined>
}

/**
 * Updates test run status and optional extra fields.
 * Centralises all status transitions — called throughout the pipeline.
 */
export async function updateTestRunStatus(
  testRunId: string,
  status: typeof test_runs.$inferInsert.status,
  extra?: Partial<typeof test_runs.$inferInsert>,
): Promise<void> {
  await db
    .update(test_runs)
    .set({ status, ...extra })
    .where(eq(test_runs.id, testRunId))
}

/**
 * Updates live execution counters on a test run.
 * Called after each test settles during the executing phase.
 */
export async function updateTestRunCounters(
  testRunId: string,
  counters: { passed?: number; failed?: number; running?: number; skipped?: number },
): Promise<void> {
  await db
    .update(test_runs)
    .set(counters)
    .where(eq(test_runs.id, testRunId))
}

/**
 * Gets all test runs for a user ordered by most recent first.
 * Used by getTestHistoryHandler.
 */
export async function getTestRunsByUserId(userId: string, limit = 50) {
  return db.query.test_runs.findMany({
    where: eq(test_runs.user_id, userId),
    orderBy: [desc(test_runs.started_at)],
    with: { reportExports: true },
    limit,
  })
}

/**
 * Gets full test run report with all relations.
 * Used by getTestReportHandler.
 */
export async function getTestRunReport(testRunId: string) {
  return db.query.test_runs.findFirst({
    where: eq(test_runs.id, testRunId),
    with: {
      testCases: { with: { results: true } },
      bugReports: true,
      reportExports: true,
      crawlResult: true,
    },
  })
}

/**
 * Gets recent test runs for the same URL for trend chart.
 */
export async function getTestRunTrend(targetUrl: string, limit = 10) {
  return db.query.test_runs.findMany({
    where: eq(test_runs.target_url, targetUrl),
    orderBy: [desc(test_runs.started_at)],
    limit,
    columns: { id: true, overall_score: true, started_at: true, status: true },
  })
}

// ─── Test Cases ───────────────────────────────────────────────────────────────

/**
 * Gets all test cases for a run ordered by creation time.
 * Used to populate review UI and seed execution after confirm.
 */
export async function getTestCasesByRunId(testRunId: string): Promise<TestCase[]> {
  return db
    .select()
    .from(test_cases)
    .where(eq(test_cases.test_run_id, testRunId))
    .orderBy(test_cases.created_at)
}

/**
 * Counts test cases for a run.
 * Called before create (enforce plan max) and before delete (enforce min 1).
 * Also called in confirmAndExecuteHandler as final gate before execution.
 */
export async function countTestCasesByRunId(testRunId: string): Promise<number> {
  const [result] = await db
    .select({ count: count(test_cases.id) })
    .from(test_cases)
    .where(eq(test_cases.test_run_id, testRunId))
  return result?.count ?? 0
}

/**
 * Inserts multiple AI-generated test cases in one statement.
 * Used at the end of the generating phase.
 */
export async function insertTestCases(
  records: typeof test_cases.$inferInsert[],
): Promise<void> {
  if (records.length === 0) return
  await db.insert(test_cases).values(records)
}

/**
 * Creates a single user-defined test case during the review phase.
 * Controller must verify status === "awaiting_review" and count < planMax.
 */
export async function createTestCase(data: {
  testRunId: string
  title: string
  category: string
  steps: string[]
  expectedResult: string
  priority?: 'P0' | 'P1' | 'P2'
  description?: string
  tags?: string[]
}): Promise<TestCase> {
  const { randomUUID } = await import('crypto')
  const [row] = await db
    .insert(test_cases)
    .values({
      id: randomUUID(),
      test_run_id: data.testRunId,
      title: data.title,
      category: data.category,
      steps: data.steps,
      expected_result: data.expectedResult,
      priority: data.priority ?? 'P1',
      description: data.description ?? null,
      tags: data.tags ?? [],
      estimated_duration: 15000,
    })
    .returning()
  return row!
}

/**
 * Updates a test case during the review phase.
 * Scoped to both id AND test_run_id — never update by id alone.
 * Returns undefined if the case doesn't belong to the given run.
 */
export async function updateTestCase(
  testCaseId: string,
  testRunId: string,
  data: {
    title?: string
    category?: string
    steps?: string[]
    expectedResult?: string
    priority?: 'P0' | 'P1' | 'P2'
    description?: string
  },
): Promise<TestCase | undefined> {
  const updates: Partial<TestCaseInsert> = {}
  if (data.title !== undefined)          updates.title = data.title
  if (data.category !== undefined)       updates.category = data.category
  if (data.steps !== undefined)          updates.steps = data.steps
  if (data.expectedResult !== undefined) updates.expected_result = data.expectedResult
  if (data.priority !== undefined)       updates.priority = data.priority
  if (data.description !== undefined)    updates.description = data.description

  const [row] = await db
    .update(test_cases)
    .set(updates)
    .where(
      and(
        eq(test_cases.id, testCaseId),
        eq(test_cases.test_run_id, testRunId),
      ),
    )
    .returning()
  return row
}

/**
 * Hard deletes a test case.
 * Safe during awaiting_review — no test_results rows reference it yet.
 */
export async function deleteTestCase(
  testCaseId: string,
  testRunId: string,
): Promise<void> {
  await db
    .delete(test_cases)
    .where(
      and(
        eq(test_cases.id, testCaseId),
        eq(test_cases.test_run_id, testRunId),
      ),
    )
}

// ─── Crawl Results ────────────────────────────────────────────────────────────

/**
 * Inserts crawl result data after the crawling phase completes.
 */
export async function insertCrawlResult(
  data: typeof crawl_results.$inferInsert,
): Promise<void> {
  await db.insert(crawl_results).values(data)
}

// ─── Performance Metrics ──────────────────────────────────────────────────────

/**
 * Inserts per-page performance metrics after stage3 completes.
 */
export async function insertPerformanceMetrics(
  records: typeof performance_metrics.$inferInsert[],
): Promise<void> {
  if (records.length === 0) return
  await db.insert(performance_metrics).values(records)
}

/**
 * Gets performance metrics for a test run.
 * Used by getTestReportHandler.
 */
export async function getPerformanceMetricsByRunId(testRunId: string) {
  return db
    .select()
    .from(performance_metrics)
    .where(eq(performance_metrics.test_run_id, testRunId))
}

// ─── Test Results ─────────────────────────────────────────────────────────────

/**
 * Inserts a single test result after a test case executes.
 */
export async function insertTestResult(
  data: typeof test_results.$inferInsert,
): Promise<void> {
  await db.insert(test_results).values(data)
}

// ─── Bug Reports ──────────────────────────────────────────────────────────────

/**
 * Inserts all bug reports after the executing phase completes.
 */
export async function insertBugReports(
  records: typeof bug_reports.$inferInsert[],
): Promise<void> {
  if (records.length === 0) return
  await db.insert(bug_reports).values(records)
}

// ─── Report Exports ───────────────────────────────────────────────────────────

/**
 * Inserts the final report export row.
 */
export async function insertReportExport(
  data: typeof report_exports.$inferInsert,
): Promise<void> {
  await db.insert(report_exports).values(data)
}

/**
 * Gets a report export by shareable slug.
 */
export async function getReportExportBySlug(slug: string) {
  return db.query.report_exports.findFirst({
    where: eq(report_exports.shareable_slug, slug),
  })
}

/**
 * Gets a report export by embed badge token, with test run joined.
 */
export async function getReportExportByBadgeToken(token: string) {
  return db.query.report_exports.findFirst({
    where: eq(report_exports.embed_badge_token, token),
    with: { testRun: true },
  })
}

// ============================================================================
// Video Generation Queries
// ============================================================================

// ── Types ─────────────────────────────────────────────────────────────────────

export type VideoChat = typeof video_chats.$inferSelect

export interface VideoOptions {
  useTTS?: boolean
  useMusic?: boolean
  voiceId?: string
  musicGenre?: string
  ttsVolume?: number
  musicVolume?: number
}

export interface PromptLogEntry {
  prompt: string
  sentAt: string // ISO string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Derive a title from the first prompt (first 80 chars, trimmed). */
function deriveTitle(prompt: string): string {
  return prompt.trim().slice(0, 80)
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Creates a new video_chats row BEFORE generation starts.
 * video_json is set to a placeholder "[]" — updated once generation completes.
 * Returns the new chat id so the controller can pass it to the client immediately.
 */
export async function createVideoChat({
  userId,
  prompt,
  options,
  userImages,
  imageSessionId,
}: {
  userId: string
  prompt: string
  options?: VideoOptions
  userImages?: UploadedUserImage[]
  imageSessionId?: string
}): Promise<string> {
  const id = randomUUID()
  const promptEntry: PromptLogEntry = { prompt, sentAt: new Date().toISOString() }

  await db.insert(video_chats).values({
    id,
    user_id: userId,
    title: deriveTitle(prompt),
    video_json: '[]', // placeholder; filled in by updateVideoChatAfterGeneration
    current_options: options ?? null,
    current_user_images: userImages ?? null,
    image_session_id: imageSessionId ?? null,
    prompts: [promptEntry],
  })

  return id
}

/**
 * Updates the video_json field after generation succeeds.
 * Also updates current_options, current_user_images, and image_session_id.
 * Bumps updated_at so the history list stays sorted correctly.
 *
 * Returns the previous image_session_id so the caller can clean up old S3
 * image files after the DB write succeeds.
 */
export async function updateVideoChatAfterGeneration({
  chatId,
  userId,
  videoJson,
  options,
  userImages,
  imageSessionId,
}: {
  chatId: string
  userId: string
  videoJson: VideoJson
  options?: VideoOptions
  userImages?: UploadedUserImage[]
  imageSessionId?: string
}): Promise<{ prevImageSessionId: string | null }> {
  // Fetch previous image session ID before overwriting so the caller can delete old S3 files.
  const [prev] = await db
    .select({ image_session_id: video_chats.image_session_id })
    .from(video_chats)
    .where(and(eq(video_chats.id, chatId), eq(video_chats.user_id, userId)))
    .limit(1)

  await db
    .update(video_chats)
    .set({
      video_json: JSON.stringify(videoJson),
      current_options: options ?? null,
      current_user_images: userImages ?? null,
      image_session_id: imageSessionId ?? null,
      updated_at: new Date(),
    })
    .where(and(eq(video_chats.id, chatId), eq(video_chats.user_id, userId)))

  return { prevImageSessionId: prev?.image_session_id ?? null }
}

/**
 * Appends a new prompt to the prompts log and replaces video_json.
 * Also updates current_options, current_user_images, and image_session_id.
 * Used for follow-up prompts.
 *
 * Returns the previous image_session_id so the caller can clean up old S3
 * image files after the DB write succeeds.
 */
export async function appendPromptAndUpdateVideo({
  chatId,
  userId,
  prompt,
  videoJson,
  options,
  userImages,
  imageSessionId,
}: {
  chatId: string
  userId: string
  prompt: string
  videoJson: VideoJson
  options?: VideoOptions
  userImages?: UploadedUserImage[]
  imageSessionId?: string
}): Promise<{ prevImageSessionId: string | null }> {
  // Fetch current prompts + previous image session ID in one query.
  const [row] = await db
    .select({
      prompts: video_chats.prompts,
      image_session_id: video_chats.image_session_id,
    })
    .from(video_chats)
    .where(and(eq(video_chats.id, chatId), eq(video_chats.user_id, userId)))
    .limit(1)

  if (!row) return { prevImageSessionId: null }

  const existing = (row.prompts as PromptLogEntry[]) ?? []
  const newEntry: PromptLogEntry = { prompt, sentAt: new Date().toISOString() }

  await db
    .update(video_chats)
    .set({
      video_json: JSON.stringify(videoJson),
      prompts: [...existing, newEntry],
      current_options: options ?? null,
      current_user_images: userImages ?? null,
      image_session_id: imageSessionId ?? null,
      updated_at: new Date(),
    })
    .where(and(eq(video_chats.id, chatId), eq(video_chats.user_id, userId)))

  return {
    // Only meaningful to clean up the old image session if a new one was uploaded.
    // The controller decides whether to act on this.
    prevImageSessionId: row.image_session_id ?? null,
  }
}

/**
 * Gets a single video chat by id with ownership check.
 */
export async function getVideoChatById({
  chatId,
  userId,
}: {
  chatId: string
  userId: string
}): Promise<VideoChat | undefined> {
  const [row] = await db
    .select()
    .from(video_chats)
    .where(and(eq(video_chats.id, chatId), eq(video_chats.user_id, userId)))
    .limit(1)

  return row
}

/**
 * Gets all video chats for a user, most recently updated first.
 * Returns lightweight rows (no video_json) for list views.
 */
export async function getVideoChatsByUserId({
  userId,
  limit = 30,
  offset = 0,
}: {
  userId: string
  limit?: number
  offset?: number
}): Promise<
  Pick<VideoChat, 'id' | 'title' | 'prompts' | 'created_at' | 'updated_at'>[]
> {
  return db
    .select({
      id: video_chats.id,
      title: video_chats.title,
      prompts: video_chats.prompts,
      created_at: video_chats.created_at,
      updated_at: video_chats.updated_at,
    })
    .from(video_chats)
    .where(eq(video_chats.user_id, userId))
    .orderBy(desc(video_chats.updated_at))
    .limit(limit)
    .offset(offset)
}
export async function renameVideoChat({
  chatId,
  userId,
  title,
}: {
  chatId: string;
  userId: string;
  title: string;
}) {
  await db
    .update(video_chats)
    .set({ title, updated_at: new Date() })
    .where(and(eq(video_chats.id, chatId), eq(video_chats.user_id, userId)));
}

/**
 * Deletes a video chat (with ownership check).
 * Returns the image_session_id that was stored so the caller can clean up
 * the associated S3 image files. TTS audio is stored under video-audio/{chatId}/
 * and is cleaned up using the chatId directly.
 */
export async function deleteVideoChat({
  chatId,
  userId,
}: {
  chatId: string
  userId: string
}): Promise<{ imageSessionId: string | null }> {
  // Fetch image session ID before deleting so the caller can clean up S3.
  const [row] = await db
    .select({ image_session_id: video_chats.image_session_id })
    .from(video_chats)
    .where(and(eq(video_chats.id, chatId), eq(video_chats.user_id, userId)))
    .limit(1)

  await db
    .delete(video_chats)
    .where(and(eq(video_chats.id, chatId), eq(video_chats.user_id, userId)))

  return { imageSessionId: row?.image_session_id ?? null }
}

/**
 * Counts how many video generation prompts (initial + follow-up) a user has
 * sent today (UTC calendar day). Used by generateVideoHandler to enforce the
 * per-plan daily prompt limit server-side.
 *
 * Each row in video_chats.prompts is a PromptLogEntry[]. We sum the array
 * lengths across all chats updated today, which counts every prompt (initial
 * + follow-ups) sent in the current UTC day.
 */
export async function countVideoPromptsTodayByUserId(userId: string): Promise<number> {
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)

  const rows = await db
  .select({ prompts: video_chats.prompts })
  .from(video_chats)
  .where(
    and(
      eq(video_chats.user_id, userId),
      gte(video_chats.updated_at, startOfDay),
    )
  )

  let count = 0
  for (const row of rows) {
      const prompts = (row.prompts as PromptLogEntry[]) ?? []
      for (const entry of prompts) {
        if (new Date(entry.sentAt) >= startOfDay) {
          count++
        }
      } 
    }
  return count
}
