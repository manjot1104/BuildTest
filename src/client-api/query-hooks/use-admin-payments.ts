import { useQuery } from "@tanstack/react-query";

export function useAdminPayments() {
  return useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const res = await fetch("/api/admin/payments");
      if (!res.ok) {
        throw new Error("Failed to fetch payments");
      }
      return res.json();
    },
  });
}