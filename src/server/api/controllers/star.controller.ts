


import { db } from '@/server/db'
import { user_chats } from '@/server/db/schema'
import { and, eq, desc, or } from 'drizzle-orm'

export async function toggleStarChat({
  userId,
  chatId,
  isStarred,
}: {
  userId: string
  chatId: string
  isStarred: boolean
}) {
  await db
    .update(user_chats)
    .set({
      is_starred: isStarred,
      updated_at: new Date(),
    })
    .where(
      and(
        eq(user_chats.user_id, userId),
        or(
          eq(user_chats.id, chatId),
          eq(user_chats.v0_chat_id, chatId),
          eq(user_chats.conversation_id, chatId),
        )
      )
    )
 
}

//  get all starred chats
// export async function getStarredChats(userId: string) {
//   return db
//     .select()
//     .from(user_chats)
//     .where(
//       and(
//         eq(user_chats.user_id, userId),
//         eq(user_chats.is_starred, true),
//       ),
//     )
//     .orderBy(desc(user_chats.updated_at))

// }
export async function getStarredChats(userId: string) {
  const chats = await db
    .select()
    .from(user_chats)
    .where(
      and(
        eq(user_chats.user_id, userId),
        eq(user_chats.is_starred, true),
      ),
    )
    .orderBy(desc(user_chats.updated_at))

  console.log('Starred chats:', chats.map(c => ({
    id: c.id,
    v0_chat_id: c.v0_chat_id,
    conversation_id: c.conversation_id,
    is_starred: c.is_starred,
  })))

  return chats
}
  

