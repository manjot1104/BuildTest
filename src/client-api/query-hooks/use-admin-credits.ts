import { useQuery } from "@tanstack/react-query";

interface CreditAnalyticsParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
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

  return useQuery({
    queryKey: ["admin-credits", params],
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to fetch credit analytics");
      }
      return res.json();
    },
  });
}


