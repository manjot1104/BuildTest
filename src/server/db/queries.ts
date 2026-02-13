'use server'

import { and, count, desc, eq, gte, isNotNull, inArray } from 'drizzle-orm'
import { randomUUID } from 'crypto'

import { user_chats, anonymous_chat_logs, user } from './schema'
import { db } from './index'

// ============================================================================
// Type Definitions
// ============================================================================

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
  } catch (error) {
    console.error('Failed to create user chat in database:', error)
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
  } catch (error) {
    console.error('Failed to update user chat in database:', error)
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
  } catch (error) {
    console.error('Failed to get user chat from database:', error)
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
  } catch (error) {
    console.error('Failed to get chat demo URL from database:', error)
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
}: {
  userId: string
  limit?: number
}): Promise<UserChat[]> {
  try {
    const chats = await db
      .select()
      .from(user_chats)
      .where(eq(user_chats.user_id, userId))
      .orderBy(desc(user_chats.updated_at))
      .limit(limit)

    return chats
  } catch (error) {
    console.error('Failed to get user chats from database:', error)
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

    return chats.map((c) => c.v0ChatId)
  } catch (error) {
    console.error('Failed to get chat IDs by user from database:', error)
    throw error
  }
}

/**
 * Deletes a user chat
 */
export async function deleteUserChat({
  v0ChatId,
}: {
  v0ChatId: string
}): Promise<void> {
  try {
    await db.delete(user_chats).where(eq(user_chats.v0_chat_id, v0ChatId))
  } catch (error) {
    console.error('Failed to delete user chat from database:', error)
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
    v0_chat_id: string
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
  } catch (error) {
    console.error('Failed to get community chats from database:', error)
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
    v0_chat_id: string
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
  } catch (error) {
    console.error('Failed to get featured chats from database:', error)
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
  } catch (error) {
    console.error('Failed to get community chats count from database:', error)
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
  } catch (error) {
    console.error('Failed to get chat count by user from database:', error)
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
  } catch (error) {
    console.error('Failed to get chat count by IP from database:', error)
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
  } catch (error) {
    console.error('Failed to create anonymous chat log in database:', error)
    throw error
  }
}
