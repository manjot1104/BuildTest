import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { subscriptions } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/server/admin/check-admin";

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const {
      userId,
      plan_id,
      plan_name,
      plan_price,
      credits_per_month,
      startDate,
      endDate,
    } = await req.json();

    await db.insert(subscriptions).values({
      id: crypto.randomUUID(),
      user_id: userId,
      plan_id,
      plan_name,
      plan_price,
      credits_per_month,
      status: "active",
      current_period_start: new Date(startDate),
      current_period_end: new Date(endDate),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();

    const { userId } = await req.json();

    await db
      .update(subscriptions)
      .set({
        status: "cancelled",
        cancelled_at: new Date(),
      })
      .where(eq(subscriptions.user_id, userId));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
