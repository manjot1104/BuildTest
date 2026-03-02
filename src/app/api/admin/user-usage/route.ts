import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { demo_visits, user_chats, credit_usage_logs } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/server/admin/require-admin";

export async function GET(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 400 }
      );
    }

    // 🔹 Demo Visits (Community only)
    const community = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(demo_visits)
      .where(
        sql`${demo_visits.owner_user_id} = ${userId}
            AND ${demo_visits.demo_type} = 'community'`
      );

    // 🔹 Chats Count
    const chats = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(user_chats)
      .where(eq(user_chats.user_id, userId));

    // 🔹 Prompts Count (from credit usage logs)
    const prompts = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(credit_usage_logs)
      .where(eq(credit_usage_logs.user_id, userId));

    return NextResponse.json({
      totalChats: chats[0]?.count ?? 0,
      totalPrompts: prompts[0]?.count ?? 0,
      communityVisits: community[0]?.count ?? 0,
    });

  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch user usage" },
      { status: 500 },
    );
  }
}