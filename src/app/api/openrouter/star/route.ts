import { NextResponse } from "next/server"
import { db } from "@/server/db"
import { user_chats } from "@/server/db/schema"
import { eq } from "drizzle-orm"

export async function POST(req: Request) {

  const body = await req.json()
  const { conversationId, starred } = body

  await db
    .update(user_chats)
    .set({
      is_starred: starred,
      updated_at: new Date()
    })
    .where(eq(user_chats.conversation_id, conversationId))

  return NextResponse.json({ success: true })
}