import { useQuery } from "@tanstack/react-query";

interface CreditAnalyticsParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface CreditAnalyticsData {
  summary: {
    totalCreditsIssued: number;
    totalCreditsUsed: number;
    totalCreditsRemaining: number;
    totalCreditsPurchased: number;
    activeCreditUsers: number;
    expiredCreditUsers: number;
  };
  graphs: {
    creditsIssuedVsUsed: { month: string; issued: number; used: number }[];
    monthlyUsageTrend: { month: string; credits: number }[];
    creditsByPlan: { plan_name: string; total_credits: number }[];
    activeVsExpired: { active: number; expired: number };
  };
  users: {
    data: {
      user_id: string;
      name: string;
      email: string;
      plan_name: string | null;
      credits_assigned: number;
      credits_used: number;
      credits_remaining: number;
      expiry_date: string | null;
      status: string;
    }[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export function useAdminCredits(params?: CreditAnalyticsParams) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.search) searchParams.set("search", params.search);
  if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);

  const queryString = searchParams.toString();
  const url = `/api/admin/credits${queryString ? `?${queryString}` : ""}`;

  return useQuery<CreditAnalyticsData>({
    queryKey: ["admin-credits", params],
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to fetch credit analytics");
      }
      return res.json() as Promise<CreditAnalyticsData>;
    },
  });
}


