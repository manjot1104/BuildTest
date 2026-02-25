import { useQuery } from "@tanstack/react-query";

interface CreditAnalyticsParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export function useAdminCredits(params?: CreditAnalyticsParams) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", params.page.toString());
  if (params?.limit) sp.set("limit", params.limit.toString());
  if (params?.search) sp.set("search", params.search);
  if (params?.sortBy) sp.set("sortBy", params.sortBy);
  if (params?.sortOrder) sp.set("sortOrder", params.sortOrder);

  const qs = sp.toString();
  const url = `/api/admin/credits-analytics${qs ? `?${qs}` : ""}`;

  return useQuery({
    queryKey: ["admin-credits", params],
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch credit analytics");
      return res.json();
    },
  });
}
