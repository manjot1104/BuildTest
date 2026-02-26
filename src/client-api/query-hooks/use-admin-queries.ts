import { useQuery } from "@tanstack/react-query";

// ============================================================================
// Types
// ============================================================================

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  createdAt: string;
}

export interface AdminUserCredits {
  subscription_credits: number;
  additional_credits: number;
}

export interface AdminUserChat {
  id: string;
  v0_chat_id: string;
  title: string | null;
  prompt: string | null;
  demo_url: string | null;
  preview_url: string | null;
  created_at: string;
}

export interface AdminActiveSubscription {
  id: string;
  plan_id: string;
  plan_name: string;
  credits_per_month: number;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
}

export interface AdminUserDetail {
  user: AdminUser;
  credits: AdminUserCredits | null;
  subscription: AdminActiveSubscription | null;
  chats: AdminUserChat[];
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalChats: number;
  activeSubscriptions: number;
  totalCreditsInCirculation: number;
}

interface ApiErrorResponse {
  error: string;
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Query hook for fetching admin dashboard statistics
 */
export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async (): Promise<AdminDashboardStats> => {
      const response = await fetch("/api/admin/stats");

      const result = (await response.json()) as
        | AdminDashboardStats
        | ApiErrorResponse;

      if (!response.ok || "error" in result) {
        throw new Error(
          "error" in result ? result.error : "Failed to fetch admin stats",
        );
      }

      return result;
    },
    staleTime: 1000 * 30, // 30 seconds
    retry: 1,
  });
}

/**
 * Query hook for fetching all users (admin)
 */
export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<AdminUser[]> => {
      const response = await fetch("/api/admin/users");

      const result = (await response.json()) as
        | AdminUser[]
        | ApiErrorResponse;

      if (!response.ok || ("error" in result && !Array.isArray(result))) {
        const err = result as ApiErrorResponse;
        throw new Error(err.error ?? "Failed to fetch users");
      }

      return result as AdminUser[];
    },
    staleTime: 1000 * 30, // 30 seconds
    retry: 1,
  });
}

/**
 * Query hook for fetching a single user's details (admin)
 */
export function useAdminUserDetail(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin-user", userId],
    queryFn: async (): Promise<AdminUserDetail> => {
      if (!userId) throw new Error("User ID is required");

      const response = await fetch(`/api/admin/users/${userId}`);

      const result = (await response.json()) as
        | AdminUserDetail
        | ApiErrorResponse;

      if (!response.ok || "error" in result) {
        throw new Error(
          "error" in result ? result.error : "Failed to fetch user details",
        );
      }

      return result;
    },
    enabled: !!userId,
    staleTime: 1000 * 15, // 15 seconds
    retry: 1,
  });
}
