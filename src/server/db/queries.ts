import { and, count, desc, eq, gte, isNotNull, inArray } from 'drizzle-orm'
import { randomUUID } from 'crypto'

import { user_chats, anonymous_chat_logs, user, github_repos, studio_layouts } from './schema'
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
}

/** Parameters for updating an existing user chat */
export interface UpdateUserChatParams {
  v0ChatId: string
  title?: string
  demoUrl?: string
  previewUrl?: string
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
}: UpdateUserChatParams): Promise<void> {
  try {
    const updates: Partial<UserChatInsert> = {
      updated_at: new Date(),
    }

    if (title !== undefined) updates.title = title
    if (demoUrl !== undefined) updates.demo_url = demoUrl
    if (previewUrl !== undefined) updates.preview_url = previewUrl

    await db
      .update(user_chats)
      .set(updates)
      .where(eq(user_chats.v0_chat_id, v0ChatId))
  } catch (error: unknown) {
    throw error
  }
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
 * Always call deactivateGithubReposForChat first if the chat already has a repo.
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
      .returning()

    return repo!
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
): Promise<void> {
  await db
    .update(studio_layouts)
    .set({
      slug,
      is_published: true,
      published_at: new Date(),
      updated_at: new Date(),
      ...(title ? { title } : {}),
    })
    .where(and(eq(studio_layouts.id, id), eq(studio_layouts.user_id, userId)))
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