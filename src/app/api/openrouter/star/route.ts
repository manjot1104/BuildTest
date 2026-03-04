import { NextRequest, NextResponse } from "next/server"
import { db } from "@/server/db"
import { user_chats } from "@/server/db/schema"
import { eq } from "drizzle-orm"

export async function POST(req: NextRequest) {
  const { messageId, starred } = await req.json()

  await db
    .update(user_chats)
    .set({ is_starred: starred })
    .where(eq(user_chats.id, messageId))

  return NextResponse.json({ success: true })
}