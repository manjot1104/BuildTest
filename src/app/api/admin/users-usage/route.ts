import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "@/server/admin/require-admin";

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const result = await db.execute(sql`
  SELECT 
  u.id,
  u.email,

  (SELECT COUNT(*) 
   FROM "pg-drizzle_user_chats" 
   WHERE user_id = u.id) AS total_chats,

  (SELECT COUNT(*) 
   FROM "pg-drizzle_credit_usage_logs" 
   WHERE user_id = u.id
   AND action IN ('new_prompt','follow_up_prompt')
  ) AS total_prompts,

  (SELECT COUNT(*) 
   FROM "pg-drizzle_demo_visits"
   WHERE owner_user_id = u.id
   AND demo_type = 'community'
  ) AS community_visits

FROM "user" u
ORDER BY total_prompts DESC
`);

    return NextResponse.json(result);

  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}