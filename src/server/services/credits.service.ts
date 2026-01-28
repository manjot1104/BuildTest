import { db } from "@/server/db";
import {
  user_credits,
  subscriptions,
  payment_transactions,
  credit_usage_logs,
} from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { calculateCreditCost } from "@/config/credits.config";

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
 * Add subscription credits to user
 */
export async function addSubscriptionCredits(userId: string, amount: number) {
  const credits = await getOrCreateUserCredits(userId);

  await db
    .update(user_credits)
    .set({
      subscription_credits: credits.subscription_credits + amount,
      updated_at: new Date(),
    })
    .where(eq(user_credits.user_id, userId));

  return credits.subscription_credits + amount;
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
 * Add additional credits to user (from credit pack purchase)
 */
export async function addAdditionalCredits(userId: string, amount: number) {
  const credits = await getOrCreateUserCredits(userId);

  await db
    .update(user_credits)
    .set({
      additional_credits: credits.additional_credits + amount,
      updated_at: new Date(),
    })
    .where(eq(user_credits.user_id, userId));

  return credits.additional_credits + amount;
}

/**
 * Deduct credits from user
 * Priority: Use subscription credits first, then additional credits
 */
export async function deductCredits(
  userId: string,
  amount: number,
  action: string,
  chatId?: string,
): Promise<{ success: boolean; error?: string }> {
  const credits = await getOrCreateUserCredits(userId);
  const totalCredits = credits.subscription_credits + credits.additional_credits;

  if (totalCredits < amount) {
    return {
      success: false,
      error: `Insufficient credits. Required: ${amount}, Available: ${totalCredits}`,
    };
  }

  let subscriptionDeduction = 0;
  let additionalDeduction = 0;

  // Deduct from subscription credits first
  if (credits.subscription_credits >= amount) {
    subscriptionDeduction = amount;
  } else {
    subscriptionDeduction = credits.subscription_credits;
    additionalDeduction = amount - credits.subscription_credits;
  }

  const newSubscriptionCredits = credits.subscription_credits - subscriptionDeduction;
  const newAdditionalCredits = credits.additional_credits - additionalDeduction;

  // Update credits
  await db
    .update(user_credits)
    .set({
      subscription_credits: newSubscriptionCredits,
      additional_credits: newAdditionalCredits,
      updated_at: new Date(),
    })
    .where(eq(user_credits.user_id, userId));

  // Log the usage
  await db.insert(credit_usage_logs).values({
    id: crypto.randomUUID(),
    user_id: userId,
    credits_used: amount,
    action,
    chat_id: chatId,
    subscription_credits_remaining: newSubscriptionCredits,
    additional_credits_remaining: newAdditionalCredits,
  });

  return { success: true };
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
