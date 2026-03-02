import { useQuery } from "@tanstack/react-query";

interface AdminAnalyticsData {
  revenue: {
    total: number;
    subscription: number;
    credits: number;
  };
  subscriptions: {
    active: number;
    expired: number;
    mrr: number;
  };
  credits: {
    sold: number;
    used: number;
  };
}

export function useAdminAnalytics() {
  return useQuery<AdminAnalyticsData>({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics");

      if (!res.ok) {
        throw new Error("Failed to fetch analytics");
      }

      return res.json() as Promise<AdminAnalyticsData>;
    },
  });
}