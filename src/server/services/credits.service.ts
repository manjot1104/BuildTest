import { db } from "@/server/db";
import {
  user_credits,
  subscriptions,
  payment_transactions,
  credit_usage_logs,
} from "@/server/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { calculateCreditCost, SUBSCRIPTION_PLANS } from "@/config/credits.config";

/**
 * Get or create user credits record
 */
export async function getOrCreateUserCredits(userId: string) {
  const existing = await db.query.user_credits.findFirst({
    where: eq(user_credits.user_id, userId),
  });

  if (existing) {
    return existing;
  }

  // Create new credits record
  const id = crypto.randomUUID();
  const [created] = await db
    .insert(user_credits)
    .values({
      id,
      user_id: userId,
      subscription_credits: 0,
      additional_credits: 0,
    })
    .returning();

  return created!;
}

/**
 * Get user's total available credits
 */
export async function getUserTotalCredits(userId: string): Promise<number> {
  const credits = await getOrCreateUserCredits(userId);
  return credits.subscription_credits + credits.additional_credits;
}

/**
 * Get user credits breakdown
 */
export async function getUserCreditsBreakdown(userId: string) {
  const credits = await getOrCreateUserCredits(userId);
  return {
    subscriptionCredits: credits.subscription_credits,
    additionalCredits: credits.additional_credits,
    totalCredits: credits.subscription_credits + credits.additional_credits,
  };
}

/**
 * Add subscription credits to user (atomic SQL increment)
 */
export async function addSubscriptionCredits(userId: string, amount: number) {
  await getOrCreateUserCredits(userId);

  const [updated] = await db
    .update(user_credits)
    .set({
      subscription_credits: sql`${user_credits.subscription_credits} + ${amount}`,
      updated_at: new Date(),
    })
    .where(eq(user_credits.user_id, userId))
    .returning({ subscription_credits: user_credits.subscription_credits });

  return updated?.subscription_credits ?? amount;
}

/**
 * Reset subscription credits (called when subscription expires)
 */
export async function resetSubscriptionCredits(userId: string) {
  await db
    .update(user_credits)
    .set({
      subscription_credits: 0,
      updated_at: new Date(),
    })
    .where(eq(user_credits.user_id, userId));
}

/**
 * Add additional credits to user (from credit pack purchase, atomic SQL increment)
 */
export async function addAdditionalCredits(userId: string, amount: number) {
  await getOrCreateUserCredits(userId);

  const [updated] = await db
    .update(user_credits)
    .set({
      additional_credits: sql`${user_credits.additional_credits} + ${amount}`,
      updated_at: new Date(),
    })
    .where(eq(user_credits.user_id, userId))
    .returning({ additional_credits: user_credits.additional_credits });

  return updated?.additional_credits ?? amount;
}

/**
 * Deduct credits from user atomically using a database transaction.
 * Priority: Use subscription credits first, then additional credits.
 * Uses SELECT ... FOR UPDATE to prevent race conditions.
 */
export async function deductCredits(
  userId: string,
  amount: number,
  action: string,
  chatId?: string,
): Promise<{ success: boolean; error?: string }> {
  return await db.transaction(async (tx) => {
    // Lock the row to prevent concurrent deductions
    const [credits] = await tx
      .select()
      .from(user_credits)
      .where(eq(user_credits.user_id, userId))
      .for("update");

    if (!credits) {
      return {
        success: false,
        error: "No credits record found for user",
      };
    }

    const totalCredits =
      credits.subscription_credits + credits.additional_credits;

    if (totalCredits < amount) {
      return {
        success: false,
        error: `Insufficient credits. Required: ${amount}, Available: ${totalCredits}`,
      };
    }

    let subscriptionDeduction = 0;
    let additionalDeduction = 0;

    if (credits.subscription_credits >= amount) {
      subscriptionDeduction = amount;
    } else {
      subscriptionDeduction = credits.subscription_credits;
      additionalDeduction = amount - credits.subscription_credits;
    }

    const newSubscriptionCredits =
      credits.subscription_credits - subscriptionDeduction;
    const newAdditionalCredits =
      credits.additional_credits - additionalDeduction;

    await tx
      .update(user_credits)
      .set({
        subscription_credits: newSubscriptionCredits,
        additional_credits: newAdditionalCredits,
        updated_at: new Date(),
      })
      .where(eq(user_credits.user_id, userId));

    await tx.insert(credit_usage_logs).values({
      id: crypto.randomUUID(),
      user_id: userId,
      credits_used: amount,
      action,
      chat_id: chatId,
      subscription_credits_remaining: newSubscriptionCredits,
      additional_credits_remaining: newAdditionalCredits,
    });

    return { success: true };
  });
}

/**
 * Check if user has enough credits for an action
 */
export async function hasEnoughCredits(
  userId: string,
  isNewChat: boolean,
): Promise<{ hasCredits: boolean; required: number; available: number }> {
  const required = calculateCreditCost(isNewChat);
  const available = await getUserTotalCredits(userId);

  return {
    hasCredits: available >= required,
    required,
    available,
  };
}

/**
 * Deduct credits for a prompt
 */
export async function deductCreditsForPrompt(
  userId: string,
  isNewChat: boolean,
  chatId?: string,
): Promise<{ success: boolean; error?: string; creditsUsed?: number }> {
  const cost = calculateCreditCost(isNewChat);
  const action = isNewChat ? "new_prompt" : "follow_up_prompt";

  const result = await deductCredits(userId, cost, action, chatId);

  if (result.success) {
    return { ...result, creditsUsed: cost };
  }

  return result;
}

/**
 * Get user's active subscription
 */
export async function getUserActiveSubscription(userId: string) {
  const subscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.user_id, userId),
      eq(subscriptions.status, "active"),
    ),
    orderBy: [desc(subscriptions.created_at)],
  });

  return subscription;
}

/**
 * Check if user has an active subscription
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const subscription = await getUserActiveSubscription(userId);
  return !!subscription;
}

/**
 * Get user's credit usage history
 */
export async function getCreditUsageHistory(
  userId: string,
  limit = 50,
  offset = 0,
) {
  const logs = await db.query.credit_usage_logs.findMany({
    where: eq(credit_usage_logs.user_id, userId),
    orderBy: [desc(credit_usage_logs.created_at)],
    limit,
    offset,
  });

  return logs;
}

/**
 * Provision free tier for a new user.
 * Creates an active FREE subscription and adds 200 additional credits (one-time, never expire).
 * Idempotent — skips if user already has an active subscription.
 */
export async function provisionFreeTier(userId: string): Promise<boolean> {
  // Skip if user already has an active subscription
  const existing = await getUserActiveSubscription(userId);
  if (existing) return false;

  const freePlan = SUBSCRIPTION_PLANS.FREE;

  // Create active free subscription (no billing period — lasts forever until upgraded)
  await db.insert(subscriptions).values({
    id: crypto.randomUUID(),
    user_id: userId,
    plan_id: freePlan.id,
    plan_name: freePlan.name,
    plan_price: 0,
    credits_per_month: 0, // No monthly renewal for free tier
    status: "active",
  });

  // Add 200 one-time credits as additional credits (never expire)
  await addAdditionalCredits(userId, freePlan.credits);

  return true;
}

/**
 * Check if user is on the free tier
 */
export async function isOnFreeTier(userId: string): Promise<boolean> {
  const subscription = await getUserActiveSubscription(userId);
  return subscription?.plan_id === "free";
}

/**
 * Get user's payment history
 */
export async function getPaymentHistory(userId: string, limit = 50, offset = 0) {
  const payments = await db.query.payment_transactions.findMany({
    where: eq(payment_transactions.user_id, userId),
    orderBy: [desc(payment_transactions.created_at)],
    limit,
    offset,
  });

  return payments;
}
