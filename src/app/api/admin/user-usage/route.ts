import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { demo_visits } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 400 }
      );
    }

    const total = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(demo_visits)
      .where(eq(demo_visits.owner_user_id, userId));

    const featured = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(demo_visits)
      .where(
        sql`${demo_visits.owner_user_id} = ${userId} 
            AND ${demo_visits.demo_type} = 'featured'`
      );

    const community = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(demo_visits)
      .where(
        sql`${demo_visits.owner_user_id} = ${userId} 
            AND ${demo_visits.demo_type} = 'community'`
      );

    return NextResponse.json({
      totalDemoVisits: total[0]?.count ?? 0,
      featuredVisits: featured[0]?.count ?? 0,
      communityVisits: community[0]?.count ?? 0,
    });
  } catch (error) {
    console.error("User usage error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user usage" },
      { status: 500 }
    );
  }
}