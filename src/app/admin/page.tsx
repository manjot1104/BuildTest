"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, MessageSquare, CreditCard, Coins } from "lucide-react";
import { useAdminStats } from "@/client-api/query-hooks/use-admin-queries";

export default function AdminDashboard() {
  const { data, isLoading, error } = useAdminStats();

  const stats = [
    {
      label: "Total Users",
      value: data?.totalUsers ?? 0,
      icon: Users,
    },
    {
      label: "Total Chats",
      value: data?.totalChats ?? 0,
      icon: MessageSquare,
    },
    {
      label: "Active Subscriptions",
      value: data?.activeSubscriptions ?? 0,
      icon: CreditCard,
    },
    {
      label: "Credits in Circulation",
      value: data?.totalCreditsInCirculation ?? 0,
      icon: Coins,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Overview of your platform activity.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <p className="text-3xl font-semibold tracking-tight">
                  {stat.value.toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
