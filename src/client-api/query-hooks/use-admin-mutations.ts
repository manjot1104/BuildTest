import { useMutation, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// Types
// ============================================================================

export interface AssignSubscriptionRequest {
  userId: string;
  plan_id: string;
  plan_name: string;
  plan_price?: number;
  credits_per_month: number;
  startDate: string;
  endDate: string;
}

export interface CancelUserSubscriptionRequest {
  userId: string;
}

export interface AddCreditsRequest {
  userId: string;
  subscriptionCredits?: number;
  additionalCredits?: number;
}

export interface DeductCreditsRequest {
  userId: string;
  deductSubscription?: number;
  deductAdditional?: number;
}

export interface ToggleUserRoleRequest {
  userId: string;
  role: string;
  action: "add" | "remove";
}

interface SuccessResponse {
  success: true;
}

interface ApiErrorResponse {
  error: string;
}

async function parseJsonResponse(response: Response): Promise<SuccessResponse | ApiErrorResponse> {
  const text = await response.text();
  if (!text) {
    if (!response.ok) {
      return { error: `Request failed with status ${response.status}` };
    }
    return { success: true };
  }
  try {
    return JSON.parse(text) as SuccessResponse | ApiErrorResponse;
  } catch {
    return { error: text || `Request failed with status ${response.status}` };
  }
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Mutation hook for assigning a subscription to a user (admin)
 */
export function useAssignSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: AssignSubscriptionRequest,
    ): Promise<SuccessResponse> => {
      const response = await fetch("/api/admin/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await parseJsonResponse(response);

      if (!response.ok || "error" in result) {
        throw new Error(
          "error" in result
            ? result.error
            : "Failed to assign subscription",
        );
      }

      return result;
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-user", variables.userId],
        }),
        queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-stats"] }),
      ]);
    },
  });
}

/**
 * Mutation hook for cancelling a user's subscription (admin)
 */
export function useCancelUserSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: CancelUserSubscriptionRequest,
    ): Promise<SuccessResponse> => {
      const response = await fetch("/api/admin/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await parseJsonResponse(response);

      if (!response.ok || "error" in result) {
        throw new Error(
          "error" in result
            ? result.error
            : "Failed to cancel subscription",
        );
      }

      return result;
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-user", variables.userId],
        }),
        queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-stats"] }),
      ]);
    },
  });
}

/**
 * Mutation hook for adding credits to a user (admin)
 */
export function useAddCredits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddCreditsRequest): Promise<SuccessResponse> => {
      const response = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await parseJsonResponse(response);

      if (!response.ok || "error" in result) {
        throw new Error(
          "error" in result ? result.error : "Failed to add credits",
        );
      }

      return result;
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-user", variables.userId],
        }),
        queryClient.invalidateQueries({ queryKey: ["admin-stats"] }),
      ]);
    },
  });
}

/**
 * Mutation hook for toggling a user's role (admin)
 */
export function useToggleUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: ToggleUserRoleRequest,
    ): Promise<SuccessResponse> => {
      const response = await fetch("/api/admin/users/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await parseJsonResponse(response);

      if (!response.ok || "error" in result) {
        throw new Error(
          "error" in result ? result.error : "Failed to update user role",
        );
      }

      return result;
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-user", variables.userId],
        }),
        queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
      ]);
    },
  });
}

/**
 * Mutation hook for deducting credits from a user (admin)
 */
export function useDeductCredits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: DeductCreditsRequest,
    ): Promise<SuccessResponse> => {
      const response = await fetch("/api/admin/credits/deduct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await parseJsonResponse(response);

      if (!response.ok || "error" in result) {
        throw new Error(
          "error" in result ? result.error : "Failed to deduct credits",
        );
      }

      return result;
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-user", variables.userId],
        }),
        queryClient.invalidateQueries({ queryKey: ["admin-stats"] }),
      ]);
    },
  });
}
