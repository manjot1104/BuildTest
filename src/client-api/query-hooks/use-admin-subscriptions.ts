import { useQuery } from "@tanstack/react-query";

interface SubscriptionAnalyticsData {
  summary: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    expiredSubscriptions: number;
    cancelledSubscriptions: number;
    newThisMonth: number;
    newThisWeek: number;
  };
  graphs: {
    growthTrend: { month: string; count: number }[];
    activeVsExpired: { active: number; expired: number; cancelled: number; pending: number };
    byPlan: { plan_name: string; count: number }[];
    newVsCancelled: { month: string; new: number; cancelled: number }[];
  };
  subscriptions: {
    data: {
      subscription_id: string;
      user_email: string;
      user_name: string;
      plan_name: string;
      plan_price: number;
      created_at: string;
      current_period_end: string | null;
      cancelled_at: string | null;
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

interface SubscriptionAnalyticsParams {
  dateRange?: string;
  startDate?: string;
  endDate?: string;
  plan?: string;
  statusFilter?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export function useAdminSubscriptions(params?: SubscriptionAnalyticsParams) {
  const sp = new URLSearchParams();
  if (params?.dateRange) sp.set("dateRange", params.dateRange);
  if (params?.startDate) sp.set("startDate", params.startDate);
  if (params?.endDate) sp.set("endDate", params.endDate);
  if (params?.plan) sp.set("plan", params.plan);
  if (params?.statusFilter) sp.set("statusFilter", params.statusFilter);
  if (params?.page) sp.set("page", params.page.toString());
  if (params?.limit) sp.set("limit", params.limit.toString());
  if (params?.search) sp.set("search", params.search);
  if (params?.sortBy) sp.set("sortBy", params.sortBy);
  if (params?.sortOrder) sp.set("sortOrder", params.sortOrder);

  const qs = sp.toString();
  const url = `/api/admin/subscriptions-analytics${qs ? `?${qs}` : ""}`;

  return useQuery<SubscriptionAnalyticsData>({
    queryKey: ["admin-subscriptions", params],
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch subscription analytics");
      return res.json() as Promise<SubscriptionAnalyticsData>;
    },
  });
}
