import { NextResponse } from "next/server";
import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";
import { conversations, conversation_messages } from "@/server/db/schema";
import { desc, eq, and } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Get conversations
  const convs = await db
    .select()
    .from(conversations)
    .where(eq(conversations.user_id, userId))
    .orderBy(desc(conversations.created_at));

  // For each conversation get first USER message
  const result = await Promise.all(
    convs.map(async (conv) => {
      const firstMessage = await db
        .select()
        .from(conversation_messages)
        .where(
          and(
            eq(conversation_messages.conversation_id, conv.id),
            eq(conversation_messages.role, "USER")
          )
        )
        .orderBy(conversation_messages.created_at)
        .limit(1);

      return {
        id: conv.id,
        model_name: conv.model_name,
        created_at: conv.created_at,
        title: firstMessage[0]?.content ?? "Untitled Chat",
      };
    })
  );

  return NextResponse.json(result);
}