import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  subscriptions,
  payment_transactions,
} from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyWebhookSignature } from "@/server/services/razorpay.service";
import {
  addSubscriptionCredits,
  resetSubscriptionCredits,
} from "@/server/services/credits.service";

interface RazorpayWebhookEvent {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payment?: {
      entity: {
        id: string;
        amount: number;
        currency: string;
        status: string;
        order_id: string;
        description?: string;
        notes?: Record<string, string>;
      };
    };
    subscription?: {
      entity: {
        id: string;
        plan_id: string;
        status: string;
        current_start?: number;
        current_end?: number;
        notes?: Record<string, string>;
      };
    };
    order?: {
      entity: {
        id: string;
        amount: number;
        status: string;
        notes?: Record<string, string>;
      };
    };
  };
  created_at: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    // Verify webhook signature
    if (!signature) {
      console.warn("Razorpay webhook received without signature — processing anyway");
    } else if (!verifyWebhookSignature(body, signature)) {
      console.error("Invalid Razorpay webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 },
      );
    }

    const event: RazorpayWebhookEvent = JSON.parse(body);
    console.log("Razorpay webhook event:", event.event);

    switch (event.event) {
      case "payment.captured":
        await handlePaymentCaptured(event);
        break;

      case "payment.failed":
        await handlePaymentFailed(event);
        break;

      case "subscription.activated":
        await handleSubscriptionActivated(event);
        break;

      case "subscription.charged":
        await handleSubscriptionCharged(event);
        break;

      case "subscription.completed":
      case "subscription.cancelled":
      case "subscription.expired":
        await handleSubscriptionEnded(event);
        break;

      case "subscription.pending":
        await handleSubscriptionPending(event);
        break;

      default:
        console.log(`Unhandled webhook event: ${event.event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

async function handlePaymentCaptured(event: RazorpayWebhookEvent) {
  const payment = event.payload.payment?.entity;
  if (!payment) return;

  const orderId = payment.order_id;
  const paymentId = payment.id;

  // Find the transaction by order ID
  let transaction = await db.query.payment_transactions.findFirst({
    where: eq(payment_transactions.razorpay_order_id, orderId),
  });

  // Fallback: try finding by payment ID
  if (!transaction) {
    transaction = await db.query.payment_transactions.findFirst({
      where: eq(payment_transactions.razorpay_payment_id, paymentId),
    });
  }

  if (!transaction) {
    console.error(`Transaction not found for order: ${orderId}, payment: ${paymentId}`);
    throw new Error(`Transaction not found for order: ${orderId}`);
  }

  // Idempotency: skip if already completed
  if (transaction.status === "completed") {
    console.log(`Transaction already completed for order: ${orderId} — skipping`);
    return;
  }

  // Update transaction status
  await db
    .update(payment_transactions)
    .set({
      razorpay_payment_id: paymentId,
      status: "completed",
      updated_at: new Date(),
    })
    .where(eq(payment_transactions.id, transaction.id));

  console.log(`Payment captured for order: ${orderId}`);
}

async function handlePaymentFailed(event: RazorpayWebhookEvent) {
  const payment = event.payload.payment?.entity;
  if (!payment) return;

  const orderId = payment.order_id;

  // Find and update the transaction
  const transaction = await db.query.payment_transactions.findFirst({
    where: eq(payment_transactions.razorpay_order_id, orderId),
  });

  if (transaction) {
    await db
      .update(payment_transactions)
      .set({
        status: "failed",
        updated_at: new Date(),
      })
      .where(eq(payment_transactions.id, transaction.id));

    // If it was a subscription payment, update subscription status
    if (transaction.subscription_id) {
      await db
        .update(subscriptions)
        .set({
          status: "pending",
          updated_at: new Date(),
        })
        .where(eq(subscriptions.id, transaction.subscription_id));
    }
  }

  console.log(`Payment failed for order: ${orderId}`);
}

async function handleSubscriptionActivated(event: RazorpayWebhookEvent) {
  const subscription = event.payload.subscription?.entity;
  if (!subscription) return;

  const userId = subscription.notes?.user_id;

  // Find the subscription by user ID and pending status
  let sub = userId
    ? await db.query.subscriptions.findFirst({
        where: and(
          eq(subscriptions.user_id, userId),
          eq(subscriptions.status, "pending"),
        ),
      })
    : null;

  // Fallback: find by razorpay_subscription_id if user_id missing or sub not found
  if (!sub && subscription.id) {
    sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.razorpay_subscription_id, subscription.id),
    });
  }

  if (!sub) {
    console.error(`Subscription not found for user: ${userId ?? "unknown"}, razorpay_sub: ${subscription.id}`);
    throw new Error("Subscription record not found");
  }

  // Idempotency: skip if already active
  if (sub.status === "active") {
    console.log(`Subscription already active for user: ${sub.user_id} — skipping`);
    return;
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await db
    .update(subscriptions)
    .set({
      razorpay_subscription_id: subscription.id,
      status: "active",
      current_period_start: now,
      current_period_end: periodEnd,
      updated_at: now,
    })
    .where(eq(subscriptions.id, sub.id));

  // Add subscription credits
  await addSubscriptionCredits(sub.user_id, sub.credits_per_month);

  console.log(`Subscription activated for user: ${sub.user_id}`);
}

async function handleSubscriptionCharged(event: RazorpayWebhookEvent) {
  const subscription = event.payload.subscription?.entity;
  if (!subscription) return;

  const razorpaySubscriptionId = subscription.id;

  // Find the subscription
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.razorpay_subscription_id, razorpaySubscriptionId),
  });

  if (sub) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Update subscription period
    await db
      .update(subscriptions)
      .set({
        current_period_start: now,
        current_period_end: periodEnd,
        updated_at: now,
      })
      .where(eq(subscriptions.id, sub.id));

    // Reset and add fresh subscription credits for the new period
    await resetSubscriptionCredits(sub.user_id);
    await addSubscriptionCredits(sub.user_id, sub.credits_per_month);

    console.log(`Subscription charged for user: ${sub.user_id}, credits renewed`);
  }
}

async function handleSubscriptionEnded(event: RazorpayWebhookEvent) {
  const subscription = event.payload.subscription?.entity;
  if (!subscription) return;

  const razorpaySubscriptionId = subscription.id;

  // Find the subscription
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.razorpay_subscription_id, razorpaySubscriptionId),
  });

  if (sub) {
    // Mark subscription as expired/cancelled
    await db
      .update(subscriptions)
      .set({
        status: "expired",
        updated_at: new Date(),
      })
      .where(eq(subscriptions.id, sub.id));

    // Reset subscription credits (additional credits remain)
    await resetSubscriptionCredits(sub.user_id);

    console.log(`Subscription ended for user: ${sub.user_id}, subscription credits removed`);
  }
}

async function handleSubscriptionPending(event: RazorpayWebhookEvent) {
  const subscription = event.payload.subscription?.entity;
  if (!subscription) return;

  console.log(`Subscription pending: ${subscription.id}`);
}
