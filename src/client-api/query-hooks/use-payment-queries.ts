import { useQuery } from "@tanstack/react-query";
import type { SupportedCurrency } from "@/config/currency.config";
import type {
  LocalizedPlan,
  LocalizedCreditPack,
} from "@/config/credits.config";

/** User credits response */
export interface UserCreditsResponse {
  credits: {
    subscriptionCredits: number;
    additionalCredits: number;
    totalCredits: number;
  };
  subscription: {
    id: string;
    plan_id: string;
    plan_name: string;
    status: string;
    current_period_start: string | null;
    current_period_end: string | null;
  } | null;
  hasActiveSubscription: boolean;
}

/** Localized pricing response */
export interface LocalizedPricingResponse {
  subscriptionPlans: LocalizedPlan[];
  creditPacks: LocalizedCreditPack[];
  currency: SupportedCurrency;
  availableCurrencies: Array<{
    code: SupportedCurrency;
    symbol: string;
    name: string;
    countries: string[];
    decimalPlaces: number;
  }>;
}

/** Payment transaction */
export interface PaymentTransaction {
  id: string;
  type: "subscription" | "credit_pack" | "refund";
  amount: number;
  currency: string;
  status: string;
  credits_added: number;
  created_at: string;
}

/** Credit usage log */
export interface CreditUsageLog {
  id: string;
  action_type: string;
  credits_deducted: number;
  subscription_credits_before: number;
  additional_credits_before: number;
  created_at: string;
  chat_id: string | null;
}

/** API error response */
interface ApiErrorResponse {
  error: string;
}

/**
 * Query hook for fetching user's credits and subscription status
 */
export function useUserCredits() {
  return useQuery({
    queryKey: ["user-credits"],
    queryFn: async (): Promise<UserCreditsResponse> => {
      const response = await fetch("/api/payments/credits");

      const result = (await response.json()) as UserCreditsResponse | ApiErrorResponse;

      if (!response.ok || "error" in result) {
        throw new Error(
          "error" in result ? result.error : "Failed to fetch user credits"
        );
      }

      return result;
    },
    staleTime: 1000 * 30, // 30 seconds
    retry: 1,
  });
}

/**
 * Query hook for fetching localized pricing based on currency
 */
export function useLocalizedPlans(currency: SupportedCurrency) {
  return useQuery({
    queryKey: ["localized-pricing", currency],
    queryFn: async (): Promise<LocalizedPricingResponse> => {
      const response = await fetch(
        `/api/payments/plans/localized?currency=${currency}`
      );

      const result = (await response.json()) as LocalizedPricingResponse | ApiErrorResponse;

      if (!response.ok || "error" in result) {
        throw new Error(
          "error" in result ? result.error : "Failed to fetch localized pricing"
        );
      }

      return result;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

/**
 * Query hook for fetching payment history
 */
export function usePaymentHistory() {
  return useQuery({
    queryKey: ["payment-history"],
    queryFn: async (): Promise<{ transactions: PaymentTransaction[] }> => {
      const response = await fetch("/api/payments/history");

      const result = (await response.json()) as
        | { transactions: PaymentTransaction[] }
        | ApiErrorResponse;

      if (!response.ok || "error" in result) {
        throw new Error(
          "error" in result ? result.error : "Failed to fetch payment history"
        );
      }

      return result;
    },
    staleTime: 1000 * 60, // 1 minute
    retry: 1,
  });
}

/**
 * Query hook for fetching credit usage history
 */
export function useCreditUsageHistory() {
  return useQuery({
    queryKey: ["credit-usage-history"],
    queryFn: async (): Promise<{ usage: CreditUsageLog[] }> => {
      const response = await fetch("/api/payments/usage");

      const result = (await response.json()) as
        | { usage: CreditUsageLog[] }
        | ApiErrorResponse;

      if (!response.ok || "error" in result) {
        throw new Error(
          "error" in result ? result.error : "Failed to fetch credit usage history"
        );
      }

      return result;
    },
    staleTime: 1000 * 60, // 1 minute
    retry: 1,
  });
}
