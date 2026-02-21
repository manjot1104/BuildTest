import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";
import {
  subscriptions,
  payment_transactions,
} from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import {
  createSubscriptionOrder,
  createCreditPackOrder,
  verifyPaymentSignature,
  getSubscriptionPlan,
  getCreditPack,
} from "@/server/services/razorpay.service";
import {
  addSubscriptionCredits,
  addAdditionalCredits,
  getUserCreditsBreakdown,
  getUserActiveSubscription,
  hasActiveSubscription,
  getPaymentHistory,
  getCreditUsageHistory,
} from "@/server/services/credits.service";
import {
  getAllSubscriptionPlans,
  getAllCreditPacks,
  getAllLocalizedSubscriptionPlans,
  getAllLocalizedCreditPacks,
  type LocalizedPlan,
  type LocalizedCreditPack,
} from "@/config/credits.config";
import {
  isSupportedCurrency,
  type SupportedCurrency,
  DEFAULT_CURRENCY,
  getCurrencyByCountry,
  getAllCurrencies,
} from "@/config/currency.config";
import type { ApiErrorResponse } from "@/types/api.types";

/**
 * Get all available plans and packs
 * Admin plans are excluded from user-facing endpoints
 */
export async function getPlansHandler() {
  return {
    subscriptionPlans: getAllSubscriptionPlans(false), // Exclude admin plans
    creditPacks: getAllCreditPacks(),
  };
}

/**
 * Get all available plans and packs with localized pricing
 */
export async function getLocalizedPlansHandler({
  query,
}: {
  query: { currency?: string; country?: string };
}): Promise<{
  subscriptionPlans: LocalizedPlan[];
  creditPacks: LocalizedCreditPack[];
  currency: SupportedCurrency;
  availableCurrencies: ReturnType<typeof getAllCurrencies>;
}> {
  let currency: SupportedCurrency = DEFAULT_CURRENCY;

  // Priority: explicit currency > country detection
  if (query.currency && isSupportedCurrency(query.currency)) {
    currency = query.currency;
  } else if (query.country) {
    const currencyConfig = getCurrencyByCountry(query.country);
    currency = currencyConfig.code;
  }

  return {
    subscriptionPlans: getAllLocalizedSubscriptionPlans(currency, false), // Exclude admin plans
    creditPacks: getAllLocalizedCreditPacks(currency),
    currency,
    availableCurrencies: getAllCurrencies(),
  };
}

/**
 * Get user's credits and subscription status
 */
export async function getUserCreditsHandler(): Promise<
  | {
      credits: {
        subscriptionCredits: number;
        additionalCredits: number;
        totalCredits: number;
      };
      subscription: Awaited<ReturnType<typeof getUserActiveSubscription>> | null;
      hasActiveSubscription: boolean;
    }
  | ApiErrorResponse
> {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401 };
  }

  const credits = await getUserCreditsBreakdown(session.user.id);
  const subscription = await getUserActiveSubscription(session.user.id);
  const hasSubscription = await hasActiveSubscription(session.user.id);

  return {
    credits,
    subscription,
    hasActiveSubscription: hasSubscription,
  };
}

/**
 * Create order for subscription purchase
 * Note: Razorpay orders are always created in INR (base currency)
 * The displayCurrency is for UI purposes to show the user the converted amount
 */
export async function createSubscriptionOrderHandler({
  body,
}: {
  body: { planId: string; displayCurrency?: string };
}): Promise<
  | {
      orderId: string;
      amount: number;
      currency: string;
      planId: string;
      planName: string;
      displayCurrency?: string;
      displayAmount?: number;
    }
  | ApiErrorResponse
> {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401 };
  }

  const { planId, displayCurrency } = body;
  const plan = getSubscriptionPlan(planId);

  if (!plan) {
    return { error: "Invalid plan ID", status: 400 };
  }

  // Security: Prevent admin plans from being purchased through normal flow
  if ("adminOnly" in plan && plan.adminOnly) {
    return { error: "This plan cannot be purchased", status: 403 };
  }

  // Check if user already has an active subscription
  const existingSubscription = await getUserActiveSubscription(session.user.id);
  if (existingSubscription) {
    return {
      error: "You already have an active subscription. Please cancel it first or buy additional credits.",
      status: 400,
    };
  }

  try {
    const order = await createSubscriptionOrder(plan, session.user.id);

    // Create pending subscription record
    const subscriptionId = crypto.randomUUID();
    await db.insert(subscriptions).values({
      id: subscriptionId,
      user_id: session.user.id,
      plan_id: plan.id,
      plan_name: plan.name,
      plan_price: plan.price * 100, // Store in paise
      credits_per_month: plan.credits,
      status: "pending",
    });

    // Create pending transaction
    await db.insert(payment_transactions).values({
      id: crypto.randomUUID(),
      user_id: session.user.id,
      razorpay_order_id: order.id,
      type: "subscription",
      amount: plan.price * 100,
      currency: plan.currency,
      credits_added: plan.credits,
      status: "pending",
      subscription_id: subscriptionId,
    });

    return {
      orderId: order.id,
      amount: plan.price * 100,
      currency: plan.currency, // Always INR for Razorpay
      planId: plan.id,
      planName: plan.name,
      ...(displayCurrency && displayCurrency !== plan.currency && {
        displayCurrency,
      }),
    };
  } catch (error) {
    console.error("Failed to create subscription order:", error);
    return { error: "Failed to create order", status: 500 };
  }
}

/**
 * Create order for credit pack purchase
 * Note: Razorpay orders are always created in INR (base currency)
 */
export async function createCreditPackOrderHandler({
  body,
}: {
  body: { packId: string; displayCurrency?: string };
}): Promise<
  | {
      orderId: string;
      amount: number;
      currency: string;
      packId: string;
      credits: number;
      displayCurrency?: string;
    }
  | ApiErrorResponse
> {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401 };
  }

  const { packId, displayCurrency } = body;
  const pack = getCreditPack(packId);

  if (!pack) {
    return { error: "Invalid pack ID", status: 400 };
  }

  // User must have an active subscription to buy additional credits
  const hasSubscription = await hasActiveSubscription(session.user.id);
  if (!hasSubscription) {
    return {
      error: "You need an active subscription to purchase additional credits",
      status: 400,
    };
  }

  try {
    const order = await createCreditPackOrder(pack, session.user.id);

    // Create pending transaction
    await db.insert(payment_transactions).values({
      id: crypto.randomUUID(),
      user_id: session.user.id,
      razorpay_order_id: order.id,
      type: "credit_pack",
      amount: pack.price * 100,
      currency: pack.currency,
      credits_added: pack.credits,
      status: "pending",
      credit_pack_id: pack.id,
    });

    return {
      orderId: order.id,
      amount: pack.price * 100,
      currency: pack.currency, // Always INR for Razorpay
      packId: pack.id,
      credits: pack.credits,
      ...(displayCurrency && displayCurrency !== pack.currency && {
        displayCurrency,
      }),
    };
  } catch (error) {
    console.error("Failed to create credit pack order:", error);
    return { error: "Failed to create order", status: 500 };
  }
}

/**
 * Verify payment and activate subscription/credits
 */
export async function verifyPaymentHandler({
  body,
}: {
  body: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  };
}): Promise<{ success: boolean; message: string } | ApiErrorResponse> {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401 };
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

  // Verify signature
  const isValid = verifyPaymentSignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  );

  if (!isValid) {
    return { error: "Invalid payment signature", status: 400 };
  }

  // Find the pending transaction
  const transaction = await db.query.payment_transactions.findFirst({
    where: and(
      eq(payment_transactions.razorpay_order_id, razorpay_order_id),
      eq(payment_transactions.user_id, session.user.id),
      eq(payment_transactions.status, "pending"),
    ),
  });

  if (!transaction) {
    return { error: "Transaction not found", status: 404 };
  }

  try {
    // Update transaction as completed
    await db
      .update(payment_transactions)
      .set({
        razorpay_payment_id,
        razorpay_signature,
        status: "completed",
        updated_at: new Date(),
      })
      .where(eq(payment_transactions.id, transaction.id));

    if (transaction.type === "subscription" && transaction.subscription_id) {
      // Activate subscription
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await db
        .update(subscriptions)
        .set({
          status: "active",
          current_period_start: now,
          current_period_end: periodEnd,
          updated_at: now,
        })
        .where(eq(subscriptions.id, transaction.subscription_id));

      // Add subscription credits
      await addSubscriptionCredits(session.user.id, transaction.credits_added);

      return {
        success: true,
        message: `Subscription activated! ${transaction.credits_added} credits added.`,
      };
    } else if (transaction.type === "credit_pack") {
      // Add additional credits
      await addAdditionalCredits(session.user.id, transaction.credits_added);

      return {
        success: true,
        message: `${transaction.credits_added} credits added to your account.`,
      };
    }

    return { success: true, message: "Payment verified successfully" };
  } catch (error) {
    console.error("Failed to verify payment:", error);
    return { error: "Failed to process payment", status: 500 };
  }
}

/**
 * Get user's payment history
 */
export async function getPaymentHistoryHandler(): Promise<
  | { transactions: Awaited<ReturnType<typeof getPaymentHistory>> }
  | ApiErrorResponse
> {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401 };
  }

  const transactions = await getPaymentHistory(session.user.id);
  return { transactions };
}

/**
 * Get user's credit usage history
 */
export async function getCreditUsageHistoryHandler(): Promise<
  | { usage: Awaited<ReturnType<typeof getCreditUsageHistory>> }
  | ApiErrorResponse
> {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401 };
  }

  const usage = await getCreditUsageHistory(session.user.id);
  return { usage };
}

/**
 * Cancel subscription
 */
export async function cancelSubscriptionHandler(): Promise<
  { success: boolean; message: string } | ApiErrorResponse
> {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401 };
  }

  const subscription = await getUserActiveSubscription(session.user.id);

  if (!subscription) {
    return { error: "No active subscription found", status: 404 };
  }

  try {
    // Mark subscription as cancelled (will remain active until period end)
    await db
      .update(subscriptions)
      .set({
        status: "cancelled",
        cancelled_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id));

    return {
      success: true,
      message: "Subscription cancelled. You can continue using your credits until the end of the billing period.",
    };
  } catch (error) {
    console.error("Failed to cancel subscription:", error);
    return { error: "Failed to cancel subscription", status: 500 };
  }
}
