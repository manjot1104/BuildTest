import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { user_credits } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/server/admin/check-admin";

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const { userId, subscriptionCredits, additionalCredits } =
      await req.json();

    const existing = await db.query.user_credits.findFirst({
      where: eq(user_credits.user_id, userId),
    });

    if (!existing) {
      await db.insert(user_credits).values({
        id: crypto.randomUUID(),
        user_id: userId,
        subscription_credits: subscriptionCredits ?? 0,
        additional_credits: additionalCredits ?? 0,
      });
    } else {
      await db
        .update(user_credits)
        .set({
          subscription_credits:
            existing.subscription_credits + (subscriptionCredits ?? 0),
          additional_credits:
            existing.additional_credits + (additionalCredits ?? 0),
        })
        .where(eq(user_credits.user_id, userId));
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();

    const { userId, deductSubscription, deductAdditional } =
      await req.json();

    const existing = await db.query.user_credits.findFirst({
      where: eq(user_credits.user_id, userId),
    });

    if (!existing) {
      return NextResponse.json({ error: "No credits found" }, { status: 404 });
    }

    await db
      .update(user_credits)
      .set({
        subscription_credits:
          existing.subscription_credits - (deductSubscription ?? 0),
        additional_credits:
          existing.additional_credits - (deductAdditional ?? 0),
      })
      .where(eq(user_credits.user_id, userId));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
