/**
 * Credits Configuration
 * Centralized configuration for all credits-related values
 */

import {
  type SupportedCurrency,
  convertFromINR,
  formatPrice,
  BASE_CURRENCY,
} from "./currency.config";

// Subscription Plans (base prices in INR)
export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: "free",
    name: "Free",
    price: 0, // INR - Free plan auto-assigned on signup
    credits: 200, // One-time 200 credits
    currency: "INR",
    interval: "monthly" as const,
    description: "Get started with 200 free credits",
    freeTier: true, // Flag to mark as auto-assigned free tier
  },
  STARTER: {
    id: "starter",
    name: "Starter",
    price: 500, // INR
    credits: 500,
    currency: "INR",
    interval: "monthly" as const,
    description: "Perfect for getting started",
  },
  PRO: {
    id: "pro",
    name: "Pro",
    price: 1000, // INR
    credits: 1000,
    currency: "INR",
    interval: "monthly" as const,
    description: "Best for regular users",
    popular: true,
  },
  ENTERPRISE: {
    id: "enterprise",
    name: "Enterprise",
    price: 2000, // INR
    credits: 2000,
    currency: "INR",
    interval: "monthly" as const,
    description: "For power users and teams",
  },
  ADMIN: {
    id: "admin",
    name: "Admin Grant",
    price: 0, // INR - Free plan for admin manual assignment
    credits: 0, // Credits will be set by admin during assignment
    currency: "INR",
    interval: "monthly" as const,
    description: "Admin-only manual subscription assignment",
    adminOnly: true, // Flag to mark this as admin-only
  },
} as const;

// Additional Credit Packs (one-time purchase, infinite validity)
export const CREDIT_PACKS = {
  PACK_100: {
    id: "pack_100",
    name: "100 Credits",
    price: 100, // INR
    credits: 100,
    currency: "INR",
  },
  PACK_200: {
    id: "pack_200",
    name: "200 Credits",
    price: 200, // INR
    credits: 200,
    currency: "INR",
  },
  PACK_500: {
    id: "pack_500",
    name: "500 Credits",
    price: 500, // INR
    credits: 500,
    currency: "INR",
  },
  PACK_1000: {
    id: "pack_1000",
    name: "1000 Credits",
    price: 1000, // INR
    credits: 1000,
    currency: "INR",
  },
} as const;

// Credit Deductions
export const CREDIT_COSTS = {
  NEW_PROMPT: 20, // Credits deducted for a new chat/prompt
  FOLLOW_UP_PROMPT: 30, // Credits deducted for follow-up message in existing chat

  // Video costs (2x the regular chat costs)
  VIDEO_NEW_PROMPT: 40,
  VIDEO_FOLLOW_UP_PROMPT: 60,
} as const;

// Rate Limiting
export const RATE_LIMITS = {
  AUTHENTICATED_MESSAGES_PER_DAY: 50,
  ANONYMOUS_MESSAGES_PER_DAY: 3,
  STT_REQUESTS_PER_DAY: 100,
} as const;

// Type exports for type safety
export type SubscriptionPlanId = keyof typeof SUBSCRIPTION_PLANS;
export type CreditPackId = keyof typeof CREDIT_PACKS;

export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[SubscriptionPlanId];
export type CreditPack = (typeof CREDIT_PACKS)[CreditPackId];

// Helper functions
export function getSubscriptionPlanById(id: string): SubscriptionPlan | undefined {
  return Object.values(SUBSCRIPTION_PLANS).find((plan) => plan.id === id);
}

export function getCreditPackById(id: string): CreditPack | undefined {
  return Object.values(CREDIT_PACKS).find((pack) => pack.id === id);
}


export function getAllCreditPacks(): CreditPack[] {
  return Object.values(CREDIT_PACKS);
}

// Calculate credit cost based on whether it's a new chat or follow-up
export function calculateCreditCost(isNewChat: boolean): number {
  return isNewChat ? CREDIT_COSTS.NEW_PROMPT : CREDIT_COSTS.FOLLOW_UP_PROMPT;
}

// Calculate video credit cost (2x the regular chat costs)
export function calculateVideoCreditCost(isNewChat: boolean): number {
  return isNewChat ? CREDIT_COSTS.VIDEO_NEW_PROMPT : CREDIT_COSTS.VIDEO_FOLLOW_UP_PROMPT;
}

// Localized pricing types
export interface LocalizedPlan extends Omit<SubscriptionPlan, "price" | "currency"> {
  basePrice: number; // Original price in INR
  baseCurrency: typeof BASE_CURRENCY;
  displayPrice: number; // Converted price in user's currency
  displayCurrency: SupportedCurrency;
  formattedPrice: string; // e.g., "$6.00" or "₹500"
}

export interface LocalizedCreditPack extends Omit<CreditPack, "price" | "currency"> {
  basePrice: number;
  baseCurrency: typeof BASE_CURRENCY;
  displayPrice: number;
  displayCurrency: SupportedCurrency;
  formattedPrice: string;
}

/**
 * Get subscription plan with localized pricing
 */
export function getLocalizedSubscriptionPlan(
  plan: SubscriptionPlan,
  currency: SupportedCurrency
): LocalizedPlan {
  const displayPrice = convertFromINR(plan.price, currency);

  return {
    id: plan.id,
    name: plan.name,
    credits: plan.credits,
    interval: plan.interval,
    description: plan.description,
    ...("popular" in plan && { popular: plan.popular }),
    basePrice: plan.price,
    baseCurrency: BASE_CURRENCY,
    displayPrice,
    displayCurrency: currency,
    formattedPrice: formatPrice(displayPrice, currency),
  };
}

/**
 * Get credit pack with localized pricing
 */
export function getLocalizedCreditPack(
  pack: CreditPack,
  currency: SupportedCurrency
): LocalizedCreditPack {
  const displayPrice = convertFromINR(pack.price, currency);

  return {
    id: pack.id,
    name: pack.name,
    credits: pack.credits,
    basePrice: pack.price,
    baseCurrency: BASE_CURRENCY,
    displayPrice,
    displayCurrency: currency,
    formattedPrice: formatPrice(displayPrice, currency),
  };
}

/**
 * Get all subscription plans with localized pricing
 * @param includeAdminPlans - If true, includes admin-only plans (default: false)
 */
export function getAllLocalizedSubscriptionPlans(
  currency: SupportedCurrency,
  includeAdminPlans = false
): LocalizedPlan[] {
  return Object.values(SUBSCRIPTION_PLANS)
    .filter((plan) => includeAdminPlans || !("adminOnly" in plan && plan.adminOnly))
    .filter((plan) => !("freeTier" in plan && plan.freeTier))
    .map((plan) => getLocalizedSubscriptionPlan(plan, currency));
}

/**
 * Get all subscription plans (for admin use)
 */
export function getAllSubscriptionPlans(includeAdminPlans = false): SubscriptionPlan[] {
  return Object.values(SUBSCRIPTION_PLANS).filter(
    (plan) =>
      (includeAdminPlans || !("adminOnly" in plan && plan.adminOnly)) &&
      !("freeTier" in plan && plan.freeTier)
  );
}

/**
 * Get all credit packs with localized pricing
 */
export function getAllLocalizedCreditPacks(
  currency: SupportedCurrency
): LocalizedCreditPack[] {
  return Object.values(CREDIT_PACKS).map((pack) =>
    getLocalizedCreditPack(pack, currency)
  );
}