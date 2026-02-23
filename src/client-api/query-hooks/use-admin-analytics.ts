import { useQuery } from "@tanstack/react-query";

export function useAdminAnalytics() {
  return useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics");

      if (!res.ok) {
        throw new Error("Failed to fetch analytics");
      }

      return res.json();
    },
  });
}