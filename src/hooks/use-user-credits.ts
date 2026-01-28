"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

interface UserCredits {
  subscriptionCredits: number;
  additionalCredits: number;
  totalCredits: number;
}

interface UserCreditsResponse {
  credits: UserCredits;
  subscription: {
    id: string;
    plan_id: string;
    plan_name: string;
    status: string;
    current_period_end: string;
  } | null;
  hasActiveSubscription: boolean;
}

async function fetchUserCredits(): Promise<UserCreditsResponse | null> {
  const res = await fetch("/api/payments/credits");

  if (res.status === 401) {
    // User not authenticated
    return null;
  }

  if (!res.ok) {
    throw new Error("Failed to fetch credits");
  }

  return res.json() as Promise<UserCreditsResponse>;
}

export function useUserCredits() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["user-credits"],
    queryFn: fetchUserCredits,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true,
  });

  return {
    credits: data?.credits ?? null,
    subscription: data?.subscription ?? null,
    hasActiveSubscription: data?.hasActiveSubscription ?? false,
    isLoading,
    error,
    refetch,
  };
}

// Hook for checking if user can perform an action
export function useCanPerformAction() {
  const { credits, hasActiveSubscription } = useUserCredits();

  const canPerformNewPrompt = (cost = 20): boolean => {
    if (!credits) return false;
    return credits.totalCredits >= cost;
  };

  const canPerformFollowUp = (cost = 30): boolean => {
    if (!credits) return false;
    return credits.totalCredits >= cost;
  };

  return {
    canPerformNewPrompt,
    canPerformFollowUp,
    hasActiveSubscription,
    totalCredits: credits?.totalCredits ?? 0,
  };
}

// Hook for refreshing credits after an action
export function useRefreshCredits() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ["user-credits"] });
  };
}
