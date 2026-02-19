import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { user, user_chats, user_credits } from "@/server/db/schema";

import { eq } from "drizzle-orm";
import { requireAdmin } from "@/server/admin/check-admin";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    await requireAdmin();

    const userData = await db.query.user.findFirst({
      where: eq(user.id, id),
    });

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const chats = await db.query.user_chats.findMany({
      where: eq(user_chats.user_id, id),
    });
const credits = await db.query.user_credits.findFirst({
  where: eq(user_credits.user_id, id),
});

   return NextResponse.json({
  user: userData,
  chats,
  credits,
});

  } catch (error: any) {
    if (error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (error.message === "FORBIDDEN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
