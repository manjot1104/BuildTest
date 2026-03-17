import { NextResponse } from 'next/server'
import { getSession } from '@/server/better-auth/server'
import { db } from '@/server/db'
import { user_chats } from '@/server/db/schema'
import { eq, and, or } from 'drizzle-orm'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { chatId } = await req.json()
    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID required' }, { status: 400 })
    }

 
    const result = await db
      .delete(user_chats)
      .where(
        and(
          eq(user_chats.user_id, session.user.id),
          or(
            eq(user_chats.v0_chat_id, chatId),   
            eq(user_chats.conversation_id, chatId) 
          )
        )
      )
      .returning()

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Chat not found or already deleted' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true,
      deleted: result.length 
    })
  } catch (error) {
    console.error('Delete chat error:', error)
    return NextResponse.json(
      { error: 'Failed to delete chat' },
      { status: 500 }
    )
  }
}