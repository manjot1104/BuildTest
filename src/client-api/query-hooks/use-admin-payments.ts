import { useQuery } from "@tanstack/react-query";

interface AdminPaymentsData {
  summary: {
    totalRevenue: number;
    subscriptionRevenue: number;
    creditRevenue: number;
    failedPayments: number;
  };
  activeSubscriptions: {
    subscription_id: string;
    user_email: string;
    plan_name: string;
    credits_per_month: number;
    current_period_end: string | null;
    status: string;
    subscription_credits: number | null;
    additional_credits: number | null;
  }[];
  monthlyRevenue: { month: string; total: number }[];
  usageAnalytics: {
    totalChats: number;
    totalPrompts: number;
    totalDemoVisits: number;
    featuredVisits: number;
    communityVisits: number;
    topUsers: { user_email: string; chat_count: number }[];
    monthlyChats: { month: string; count: number }[];
    monthlyPrompts: { month: string; count: number }[];
    monthlyDemoVisits: { month: string; count: number }[];
  };
}

export function useAdminPayments() {
  return useQuery<AdminPaymentsData>({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const res = await fetch("/api/admin/payments");
      if (!res.ok) {
        throw new Error("Failed to fetch payments");
      }
      return res.json() as Promise<AdminPaymentsData>;
    },
  });
}
