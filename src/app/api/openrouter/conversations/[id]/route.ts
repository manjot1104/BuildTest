import { NextResponse } from "next/server";
import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";
import { conversation_messages } from "@/server/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const messages = await db
    .select()
    .from(conversation_messages)
    .where(eq(conversation_messages.conversation_id, id))
    .orderBy(asc(conversation_messages.created_at));

  return NextResponse.json(messages);
}