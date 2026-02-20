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

    // Validate required fields
    if (!userId || !plan_id || !plan_name || credits_per_month === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return NextResponse.json(
        { error: "Invalid date range" },
        { status: 400 }
      );
    }

    // Validate credits
    if (credits_per_month < 0) {
      return NextResponse.json(
        { error: "Credits must be non-negative" },
        { status: 400 }
      );
    }

    await db.transaction(async (tx) => {
      // Cancel any existing active subscription for this user
      await tx
        .update(subscriptions)
        .set({
          status: "cancelled",
          cancelled_at: new Date(),
          updated_at: new Date(),
        })
        .where(
          and(
            eq(subscriptions.user_id, userId),
            eq(subscriptions.status, "active")
          )
        );

      // Create new subscription
      await tx.insert(subscriptions).values({
        id: crypto.randomUUID(),
        user_id: userId,
        plan_id,
        plan_name,
        plan_price: plan_price ?? 0, // Default to 0 for admin grants
        credits_per_month,
        status: "active",
        current_period_start: start,
        current_period_end: end,
      });

      // Add credits to user account (within transaction for atomicity)
      if (credits_per_month > 0) {
        // Get or create user credits record
        const existingCredits = await tx.query.user_credits.findFirst({
          where: eq(user_credits.user_id, userId),
        });

        if (existingCredits) {
          await tx
            .update(user_credits)
            .set({
              subscription_credits:
                existingCredits.subscription_credits + credits_per_month,
              updated_at: new Date(),
            })
            .where(eq(user_credits.user_id, userId));
        } else {
          await tx.insert(user_credits).values({
            id: crypto.randomUUID(),
            user_id: userId,
            subscription_credits: credits_per_month,
            additional_credits: 0,
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to assign subscription:", error);
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed" },
      { status: 500 }
    );
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
