import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { subscriptions } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/server/admin/check-admin";
import { user_credits, credit_usage_logs } from "@/server/db/schema";
import { and } from "drizzle-orm";

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

    await db.transaction(async (tx) => {
      //  Cancel subscription
      await tx
        .update(subscriptions)
        .set({
          status: "cancelled",
          cancelled_at: new Date(),
        })
        .where(eq(subscriptions.user_id, userId));

      //  Get current subscription credits
      const creditsRecord = await tx.query.user_credits.findFirst({
        where: eq(user_credits.user_id, userId),
      });

      if (!creditsRecord) return;

      const previousSubCredits = creditsRecord.subscription_credits;

      //  Remove only subscription credits
      await tx
        .update(user_credits)
        .set({
          subscription_credits: 0,
          updated_at: new Date(),
        })
        .where(eq(user_credits.user_id, userId));

      //  Log deduction (only if there were credits)
      if (previousSubCredits > 0) {
        await tx.insert(credit_usage_logs).values({
          id: crypto.randomUUID(),
          user_id: userId,
          credits_used: previousSubCredits,
          action: "admin_subscription_cancel",
          subscription_credits_remaining: 0,
          additional_credits_remaining:
            creditsRecord.additional_credits,
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
