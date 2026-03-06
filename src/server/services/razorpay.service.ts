import Razorpay from "razorpay";
import crypto from "crypto";
import { env } from "@/env";
import {
  SUBSCRIPTION_PLANS,
  CREDIT_PACKS,
  type SubscriptionPlan,
  type CreditPack,
} from "@/config/credits.config";

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

export interface CreateOrderOptions {
  amount: number; // Amount in paise (INR * 100)
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface CreateSubscriptionOptions {
  planId: string; // Razorpay plan ID
  customerId?: string;
  totalCount?: number; // Total billing cycles
  notes?: Record<string, string>;
}

/**
 * Create a Razorpay order for one-time payment (credit packs)
 */
export async function createOrder(options: CreateOrderOptions) {
  const order = await razorpay.orders.create({
    amount: options.amount,
    currency: options.currency ?? "INR",
    receipt: options.receipt,
    notes: options.notes,
  });

  return order;
}

/**
 * Create a Razorpay order for subscription payment
 */
export async function createSubscriptionOrder(
  plan: SubscriptionPlan,
  userId: string,
) {
  // Generate short unique receipt (max 40 chars for Razorpay)
  // Use first 8 chars of userId + timestamp + random string
  const shortUserId = userId.slice(0, 8);
  const timestamp = Date.now().toString().slice(-8); // Last 8 digits
  const random = Math.random().toString(36).slice(2, 6); // 4 chars
  const receipt = `sub_${shortUserId}_${timestamp}_${random}`;

  const order = await razorpay.orders.create({
    amount: plan.price * 100, // Convert to paise
    currency: plan.currency,
    receipt,
    notes: {
      user_id: userId,
      plan_id: plan.id,
      plan_name: plan.name,
      type: "subscription",
    },
  });

  return order;
}

/**
 * Create a Razorpay order for credit pack purchase
 */
export async function createCreditPackOrder(pack: CreditPack, userId: string) {
  // Generate short unique receipt (max 40 chars for Razorpay)
  // Use first 8 chars of userId + timestamp + random string
  const shortUserId = userId.slice(0, 8);
  const timestamp = Date.now().toString().slice(-8); // Last 8 digits
  const random = Math.random().toString(36).slice(2, 6); // 4 chars
  const receipt = `crd_${shortUserId}_${timestamp}_${random}`;

  const order = await razorpay.orders.create({
    amount: pack.price * 100, // Convert to paise
    currency: pack.currency,
    receipt,
    notes: {
      user_id: userId,
      pack_id: pack.id,
      credits: pack.credits.toString(),
      type: "credit_pack",
    },
  });

  return order;
}

/**
 * Verify Razorpay payment signature
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}

/**
 * Verify Razorpay webhook signature
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}

/**
 * Fetch payment details from Razorpay
 */
export async function fetchPayment(paymentId: string) {
  return razorpay.payments.fetch(paymentId);
}

/**
 * Fetch order details from Razorpay
 */
export async function fetchOrder(orderId: string) {
  return razorpay.orders.fetch(orderId);
}

/**
 * Create a Razorpay subscription plan (called once during setup)
 * This creates the plan on Razorpay's side
 */
export async function createRazorpayPlan(plan: SubscriptionPlan) {
  const razorpayPlan = await razorpay.plans.create({
    period: "monthly",
    interval: 1,
    item: {
      name: plan.name,
      amount: plan.price * 100, // Convert to paise
      currency: plan.currency,
      description: plan.description,
    },
  });

  return razorpayPlan;
}

/**
 * Create a Razorpay subscription for a user
 */
export async function createSubscription(
  razorpayPlanId: string,
  userId: string,
  customerEmail: string,
  totalCount = 12, // Default 12 months
) {
  const subscription = await razorpay.subscriptions.create({
    plan_id: razorpayPlanId,
    total_count: totalCount,
    customer_notify: 1,
    notes: {
      user_id: userId,
      email: customerEmail,
    },
  });

  return subscription;
}

/**
 * Cancel a Razorpay subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtCycleEnd = true,
) {
  return razorpay.subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
}

/**
 * Fetch subscription details
 */
export async function fetchSubscription(subscriptionId: string) {
  return razorpay.subscriptions.fetch(subscriptionId);
}

/**
 * Get subscription plan by ID
 */
export function getSubscriptionPlan(planId: string): SubscriptionPlan | undefined {
  return Object.values(SUBSCRIPTION_PLANS).find((plan) => plan.id === planId);
}

/**
 * Get credit pack by ID
 */
export function getCreditPack(packId: string): CreditPack | undefined {
  return Object.values(CREDIT_PACKS).find((pack) => pack.id === packId);
}

export { razorpay };
