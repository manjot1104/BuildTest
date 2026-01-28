/**
 * Credits Configuration
 * Centralized configuration for all credits-related values
 */

// Subscription Plans
export const SUBSCRIPTION_PLANS = {
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

export function getAllSubscriptionPlans(): SubscriptionPlan[] {
  return Object.values(SUBSCRIPTION_PLANS);
}

export function getAllCreditPacks(): CreditPack[] {
  return Object.values(CREDIT_PACKS);
}

// Calculate credit cost based on whether it's a new chat or follow-up
export function calculateCreditCost(isNewChat: boolean): number {
  return isNewChat ? CREDIT_COSTS.NEW_PROMPT : CREDIT_COSTS.FOLLOW_UP_PROMPT;
}
