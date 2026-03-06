import { NextRequest, NextResponse } from "next/server"
import { db } from "@/server/db"
import { conversation_messages } from "@/server/db/schema"
import { eq } from "drizzle-orm"

export async function GET(req: NextRequest) {
  const conversationId = req.nextUrl.searchParams.get("conversationId")

  if (!conversationId) {
    return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })
  }

  try {
    const messages = await db
      .select()
      .from(conversation_messages)
      .where(eq(conversation_messages.conversation_id, conversationId))
      .orderBy(conversation_messages.created_at)

    return NextResponse.json(messages)

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}