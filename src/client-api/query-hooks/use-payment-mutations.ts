import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupportedCurrency } from "@/config/currency.config";

/** Subscribe request body */
export interface SubscribeRequest {
  planId: string;
  displayCurrency?: SupportedCurrency;
}

/** Subscribe response */
export interface SubscribeResponse {
  orderId: string;
  amount: number;
  currency: string;
  planId: string;
  planName: string;
  displayCurrency?: string;
}

/** Buy credits request body */
export interface BuyCreditsRequest {
  packId: string;
  displayCurrency?: SupportedCurrency;
}

/** Buy credits response */
export interface BuyCreditsResponse {
  orderId: string;
  amount: number;
  currency: string;
  packId: string;
  credits: number;
  displayCurrency?: string;
}

/** Verify payment request body */
export interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/** Verify payment response */
export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
}

/** Cancel subscription response */
export interface CancelSubscriptionResponse {
  success: boolean;
  message: string;
}

/** API error response */
interface ApiErrorResponse {
  error: string;
}

/**
 * Mutation hook for subscribing to a plan
 */
export function useSubscribe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SubscribeRequest): Promise<SubscribeResponse> => {
      const response = await fetch("/api/payments/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = (await response.json()) as SubscribeResponse | ApiErrorResponse;

      if (!response.ok || "error" in result) {
        throw new Error(
          "error" in result ? result.error : "Failed to create subscription order"
        );
      }

      return result;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["user-credits"],
      });
    },
  });
}

/**
 * Mutation hook for buying credit packs
 */
export function useBuyCredits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BuyCreditsRequest): Promise<BuyCreditsResponse> => {
      const response = await fetch("/api/payments/credits/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = (await response.json()) as BuyCreditsResponse | ApiErrorResponse;

      if (!response.ok || "error" in result) {
        throw new Error(
          "error" in result ? result.error : "Failed to create credit pack order"
        );
      }

      return result;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["user-credits"],
      });
    },
  });
}

/**
 * Mutation hook for verifying payment after Razorpay checkout
 */
export function useVerifyPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: VerifyPaymentRequest
    ): Promise<VerifyPaymentResponse> => {
      const response = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = (await response.json()) as VerifyPaymentResponse | ApiErrorResponse;

      if (!response.ok || "error" in result) {
        throw new Error(
          "error" in result ? result.error : "Failed to verify payment"
        );
      }

      return result;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["user-credits"] }),
        queryClient.invalidateQueries({ queryKey: ["payment-history"] }),
      ]);
    },
  });
}

/**
 * Mutation hook for cancelling subscription
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<CancelSubscriptionResponse> => {
      const response = await fetch("/api/payments/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result = (await response.json()) as CancelSubscriptionResponse | ApiErrorResponse;

      if (!response.ok || "error" in result) {
        throw new Error(
          "error" in result ? result.error : "Failed to cancel subscription"
        );
      }

      return result;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["user-credits"],
      });
    },
  });
}
