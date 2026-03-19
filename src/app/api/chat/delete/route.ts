import { NextResponse } from 'next/server'
import { getSession } from '@/server/better-auth/server'
import { db } from '@/server/db'
import { user_chats, conversations } from '@/server/db/schema'  
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

    console.log('═══ DELETE REQUEST ═══')
    console.log('User ID:', session.user.id)
    console.log('Chat ID to delete:', chatId)
    console.log('Chat ID type:', typeof chatId)

    // Delete from user_chats (Builder chats)
    const result = await db
      .delete(user_chats)
      .where(
        and(
          eq(user_chats.user_id, session.user.id),
          or(
            eq(user_chats.v0_chat_id, chatId),
            eq(user_chats.id, chatId),
            eq(user_chats.conversation_id, chatId)
          )
        )
      )
      .returning()

    console.log('Deleted from user_chats:', result.length)

    //  If not found in user_chats, try conversations (AI/OpenRouter chats)
    if (result.length === 0) {
      console.log('Not found in user_chats, checking conversations...')
      
      const conversationResult = await db
        .delete(conversations)
        .where(
          and(
            eq(conversations.user_id, session.user.id),
            eq(conversations.id, chatId)
          )
        )
        .returning()

      console.log('Deleted from conversations:', conversationResult.length)
      console.log('═══ END DELETE ═══')

      if (conversationResult.length === 0) {
        return NextResponse.json(
          { error: 'Chat not found or already deleted' },
          { status: 404 }
        )
      }

      return NextResponse.json({ 
        success: true,
        deleted: conversationResult.length,
        source: 'conversations'
      })
    }

    console.log('═══ END DELETE ═══')

    return NextResponse.json({ 
      success: true,
      deleted: result.length,
      source: 'user_chats'
    })
  } catch (error) {
    console.error('Delete chat error:', error)
    return NextResponse.json(
      { error: 'Failed to delete chat' },
      { status: 500 }
    )
  }
}