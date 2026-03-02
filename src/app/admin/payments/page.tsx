"use client";
import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Coins,
  Search,
  IndianRupee,
} from "lucide-react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  BarChart,
  Bar,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useAdminCredits } from "@/client-api/query-hooks/use-admin-credits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAdminPayments } from "@/client-api/query-hooks/use-admin-payments";
import { useQuery } from "@tanstack/react-query";

// ============================================================================
// Types
// ============================================================================

interface UserUsageRow {
  id: string;
  email: string;
  total_chats: number;
  total_prompts: number;
  community_visits: number;
}

interface SubscriptionRow {
  subscription_id: string;
  user_email: string;
  plan_name: string;
  credits_per_month: number;
  current_period_end: string | null;
  status: string;
  subscription_credits: number | null;
  additional_credits: number | null;
}

interface CreditPlanEntry {
  plan_name: string;
  total_credits: number;
}

interface CreditUserRow {
  user_id: string;
  name: string;
  email: string;
  plan_name: string | null;
  credits_assigned: number;
  credits_used: number;
  credits_remaining: number;
  expiry_date: string | null;
  status: string;
}

const CREDIT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function PaymentsPage() {
  //  USERS USAGE QUERY
  const { data: usersUsage } = useQuery<UserUsageRow[]>({
    queryKey: ["users-usage"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users-usage");
      return res.json() as Promise<UserUsageRow[]>;
    },
  });

  //  STATES
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] =
    useState<"chats" | "prompts" | "demo">("chats");

  //  SEARCH PARAMS
  const searchParams = useSearchParams();
  const initialTab = useMemo(
    () => searchParams.get("tab") ?? "overview",
    [searchParams],
  );

  const [tab, setTab] = useState<string>(initialTab);

  // ------------------------------
  // Payments analytics query
  // ------------------------------
  const [subscriptionSearch, setSubscriptionSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const { data, isLoading } = useAdminPayments();

  const monthlyRevenue = data?.monthlyRevenue ?? [];
  const summary = data?.summary;
  const activeSubscriptions = (data?.activeSubscriptions ?? []) as SubscriptionRow[];
  const usage = data?.usageAnalytics;

  const filteredSubscriptions = activeSubscriptions.filter(
    (sub: SubscriptionRow) =>
      sub.user_email?.toLowerCase().includes(subscriptionSearch.toLowerCase()),
  );
  const filteredUsers = usersUsage?.filter((u: UserUsageRow) =>
    u.email?.toLowerCase().includes(userSearch.toLowerCase()),
  );

  // ------------------------------
  // Credit analytics query (4th tab)
  // ------------------------------
  const [creditSearch, setCreditSearch] = useState("");
  const [creditPage, setCreditPage] = useState(1);
  const [creditSortBy, setCreditSortBy] = useState("name");
  const [creditSortOrder, setCreditSortOrder] = useState<"asc" | "desc">(
    "asc",
  );
  const creditLimit = 50;

  const {
    data: creditData,
    isLoading: creditLoading,
    error: creditError,
  } = useAdminCredits({
    page: creditPage,
    limit: creditLimit,
    search: creditSearch,
    sortBy: creditSortBy,
    sortOrder: creditSortOrder,
  });

  const creditSummary = creditData?.summary;
  const creditGraphs = creditData?.graphs;
  const creditUsers = creditData?.users;

  const handleCreditSort = (column: string) => {
    if (creditSortBy === column) {
      setCreditSortOrder(creditSortOrder === "asc" ? "desc" : "asc");
    } else {
      setCreditSortBy(column);
      setCreditSortOrder("asc");
    }
  };

  const CreditSortIcon = ({ column }: { column: string }) => {
    if (creditSortBy !== column)
      return <ArrowUpDown className="ml-1 h-3 w-3" />;
    return creditSortOrder === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };

  return (
    <div className="space-y-8">
      {/* ===== HEADER FIRST ===== */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Payments Analytics
        </h1>
        <p className="text-sm text-muted-foreground">
          Revenue, subscriptions and usage insights.
        </p>
      </div>

      {/* ===== TABS BELOW HEADER ===== */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
          <TabsTrigger value="credits">Credit Analytics</TabsTrigger>
        </TabsList>

        {/* ================= OVERVIEW TAB ================= */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Total Revenue",
                value: (summary?.totalRevenue ?? 0) / 100,
              },
              {
                label: "Subscription Revenue",
                value: (summary?.subscriptionRevenue ?? 0) / 100,
              },
              {
                label: "Credit Revenue",
                value: (summary?.creditRevenue ?? 0) / 100,
              },
              {
                label: "Failed Payments",
                value: summary?.failedPayments ?? 0,
              },
            ].map((item) => (
              <Card key={item.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {item.label}
                  </CardTitle>
                  <IndianRupee className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <p className="text-2xl font-semibold">
                      {item.label === "Failed Payments"
                        ? item.value
                        : `₹ ${item.value.toLocaleString()}`}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : monthlyRevenue.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyRevenue}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex h-[300px] items-center justify-center">
                  <Skeleton className="h-64 w-64 rounded-full" />
                </div>
              ) : (
                <>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: "Subscriptions",
                              value:
                                (summary?.subscriptionRevenue ?? 0) / 100,
                            },
                            {
                              name: "Credits",
                              value: (summary?.creditRevenue ?? 0) / 100,
                            },
                          ]}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={100}
                          innerRadius={50}
                          paddingAngle={4}
                        >
                          <Cell fill="#3b82f6" />
                          <Cell fill="#6b7280" />
                        </Pie>
                        <Tooltip
                          formatter={(value: number) =>
                            `₹ ${value.toLocaleString()}`
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex justify-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-[#3b82f6]" />
                      Subscriptions
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-[#6b7280]" />
                      Credits
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= SUBSCRIPTIONS TAB ================= */}
        <TabsContent value="subscriptions" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Active Subscriptions</CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by email..."
                  value={subscriptionSearch}
                  onChange={(e) => setSubscriptionSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Monthly Credits</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Total Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading &&
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-40" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-16" />
                        </TableCell>
                      </TableRow>
                    ))}

                  {!isLoading && filteredSubscriptions.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-muted-foreground"
                      >
                        {subscriptionSearch
                          ? "No subscriptions match your search."
                          : "No active subscriptions found."}
                      </TableCell>
                    </TableRow>
                  )}

                  {!isLoading &&
                    filteredSubscriptions.map((sub: SubscriptionRow) => (
                      <TableRow key={sub.subscription_id}>
                        <TableCell>{sub.user_email}</TableCell>
                        <TableCell>{sub.plan_name}</TableCell>
                        <TableCell>{sub.credits_per_month}</TableCell>
                        <TableCell>
                          {sub.current_period_end
                            ? new Date(
                                sub.current_period_end,
                              ).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {(sub.subscription_credits ?? 0) +
                            (sub.additional_credits ?? 0)}
                        </TableCell>
                        <TableCell>
                          <Badge className="capitalize">{sub.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= USAGE TAB ================= */}
        <TabsContent value="usage" className="space-y-10">
          {/* ===== GLOBAL OVERVIEW ===== */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Global Usage Overview</h2>
              <p className="text-sm text-muted-foreground">
                Overall platform usage statistics.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">
                    Total Chats
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-4">
                  <p className="text-3xl font-bold">
                    {usage?.totalChats ?? 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">
                    Total Prompts
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-4">
                  <p className="text-3xl font-bold">
                    {usage?.totalPrompts ?? 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">
                    Total Demo Visits
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-4">
                  <p className="text-3xl font-bold">
                    {usage?.totalDemoVisits ?? 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">
                    Active Users
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-4">
                  <p className="text-3xl font-bold">
                    {usage?.topUsers?.length ?? 0}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ===== USAGE TRENDS ===== */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Usage Trends</h2>
              <p className="text-sm text-muted-foreground">
                Monthly growth across chats, prompts and demo visits.
              </p>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  {activeMetric === "chats" && "Monthly Chats"}
                  {activeMetric === "prompts" && "Monthly Prompts"}
                  {activeMetric === "demo" && "Monthly Demo Visits"}
                </CardTitle>

                <div className="flex gap-2">
                  {(["chats", "prompts", "demo"] as const).map((metric) => (
                    <button
                      key={metric}
                      onClick={() => setActiveMetric(metric)}
                      className={`rounded-md px-3 py-1 text-sm transition ${
                        activeMetric === metric
                          ? "bg-primary text-white"
                          : "bg-muted hover:bg-muted/70"
                      }`}
                    >
                      {metric === "chats"
                        ? "Chats"
                        : metric === "prompts"
                          ? "Prompts"
                          : "Demo Visits"}
                    </button>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={
                      activeMetric === "chats"
                        ? (usage?.monthlyChats ?? [])
                        : activeMetric === "prompts"
                          ? (usage?.monthlyPrompts ?? [])
                          : (usage?.monthlyDemoVisits ?? [])
                    }
                  >
                    <CartesianGrid stroke="#1F2937" vertical={false} />

                    <XAxis
                      dataKey="month"
                      stroke="#9CA3AF"
                      tick={{ fill: "#9CA3AF", fontSize: 12 }}
                    />

                    <YAxis
                      allowDecimals={false}
                      stroke="#9CA3AF"
                      tick={{ fill: "#9CA3AF", fontSize: 12 }}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="count"
                      fill="#3b82f6"
                      radius={[8, 8, 0, 0]}
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* ===== USER ANALYTICS ===== */}
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>User Analytics</CardTitle>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search your email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Chats</TableHead>
                    <TableHead>Prompts</TableHead>
                    <TableHead>Community Visits</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredUsers?.map((u: UserUsageRow) => (
                    <TableRow
                      key={u.id}
                      className="cursor-pointer transition hover:bg-muted/40"
                      onClick={() =>
                        setExpandedUser(expandedUser === u.id ? null : u.id)
                      }
                    >
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.total_chats}</TableCell>
                      <TableCell>{u.total_prompts}</TableCell>
                      <TableCell>{u.community_visits}</TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers?.map(
                    (u: UserUsageRow) =>
                      expandedUser === u.id && (
                        <TableRow key={`${u.id}-detail`}>
                          <TableCell colSpan={4}>
                            <div className="rounded-lg border bg-muted/30 p-4">
                              <div className="grid grid-cols-3 gap-6">
                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    Detailed Chats
                                  </p>
                                  <p className="text-2xl font-bold">
                                    {u.total_chats}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    Detailed Prompts
                                  </p>
                                  <p className="text-2xl font-bold">
                                    {u.total_prompts}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    Community Visits
                                  </p>
                                  <p className="text-2xl font-bold">
                                    {u.community_visits}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ),
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= CREDIT ANALYTICS TAB ================= */}
        <TabsContent value="credits" className="space-y-6">
          {creditError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {creditError.message || "Failed to load credit analytics data"}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                label: "Total Credits Issued",
                value: creditSummary?.totalCreditsIssued ?? 0,
              },
              {
                label: "Total Credits Used",
                value: creditSummary?.totalCreditsUsed ?? 0,
              },
              {
                label: "Total Credits Remaining",
                value: creditSummary?.totalCreditsRemaining ?? 0,
              },
              {
                label: "Active Credit Users",
                value: creditSummary?.activeCreditUsers ?? 0,
              },
              {
                label: "Expired Credit Users",
                value: creditSummary?.expiredCreditUsers ?? 0,
              },
            ].map((item) => (
              <Card key={item.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {item.label}
                  </CardTitle>
                  <Coins className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {creditLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <p className="text-2xl font-semibold">
                      {item.value.toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Credits Purchased vs Used</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {creditLoading ? (
                <Skeleton className="h-full w-full" />
              ) : !creditGraphs?.creditsIssuedVsUsed?.length ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={creditGraphs.creditsIssuedVsUsed}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="issued"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      name="Purchased"
                    />
                    <Line
                      type="monotone"
                      dataKey="used"
                      stroke="#10b981"
                      strokeWidth={3}
                      name="Used"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Credit Usage Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {creditLoading ? (
                <Skeleton className="h-full w-full" />
              ) : !creditGraphs?.monthlyUsageTrend?.length ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={creditGraphs.monthlyUsageTrend}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="credits"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Credits Distribution by Plan</CardTitle>
            </CardHeader>
            <CardContent>
              {creditLoading ? (
                <div className="flex h-[300px] items-center justify-center">
                  <Skeleton className="h-64 w-64 rounded-full" />
                </div>
              ) : !creditGraphs?.creditsByPlan?.length ? (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  No data available
                </div>
              ) : (
                <>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={creditGraphs.creditsByPlan}
                          dataKey="total_credits"
                          nameKey="plan_name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          innerRadius={50}
                          paddingAngle={4}
                        >
                          {creditGraphs.creditsByPlan.map(
                            (_entry: CreditPlanEntry, index: number) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  CREDIT_COLORS[index % CREDIT_COLORS.length]
                                }
                              />
                            ),
                          )}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) =>
                            value.toLocaleString()
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                    {creditGraphs.creditsByPlan.map(
                      (plan: CreditPlanEntry, index: number) => (
                        <div
                          key={plan.plan_name || `plan-${index}`}
                          className="flex items-center gap-2"
                        >
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor:
                                CREDIT_COLORS[index % CREDIT_COLORS.length],
                            }}
                          />
                          {plan.plan_name || "No Plan"}
                        </div>
                      ),
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active vs Expired Users</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {creditLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        name: "Users",
                        Active: creditGraphs?.activeVsExpired?.active ?? 0,
                        Expired: creditGraphs?.activeVsExpired?.expired ?? 0,
                      },
                    ]}
                  >
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Active" fill="#10b981" />
                    <Bar dataKey="Expired" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Credit Users</CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={creditSearch}
                  onChange={(e) => {
                    setCreditSearch(e.target.value);
                    setCreditPage(1);
                  }}
                  className="pl-9"
                />
              </div>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
                        onClick={() => handleCreditSort("name")}
                      >
                        Name
                        <CreditSortIcon column="name" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
                        onClick={() => handleCreditSort("email")}
                      >
                        Email
                        <CreditSortIcon column="email" />
                      </Button>
                    </TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
                        onClick={() => handleCreditSort("credits_assigned")}
                      >
                        Credits Assigned
                        <CreditSortIcon column="credits_assigned" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
                        onClick={() => handleCreditSort("credits_used")}
                      >
                        Credits Used
                        <CreditSortIcon column="credits_used" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
                        onClick={() => handleCreditSort("credits_remaining")}
                      >
                        Credits Remaining
                        <CreditSortIcon column="credits_remaining" />
                      </Button>
                    </TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
                        onClick={() => handleCreditSort("status")}
                      >
                        Status
                        <CreditSortIcon column="status" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditLoading &&
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-40" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                      </TableRow>
                    ))}

                  {!creditLoading &&
                    (!creditUsers?.data ||
                      creditUsers.data.length === 0) && (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="py-8 text-center text-muted-foreground"
                        >
                          {creditSearch
                            ? "No users match your search."
                            : "No users found."}
                        </TableCell>
                      </TableRow>
                    )}

                  {!creditLoading &&
                    creditUsers?.data?.map((u: CreditUserRow) => (
                      <TableRow key={u.user_id}>
                        <TableCell>{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{u.plan_name || "-"}</TableCell>
                        <TableCell>
                          {(u.credits_assigned ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {(u.credits_used ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {(u.credits_remaining ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {u.expiry_date
                            ? new Date(u.expiry_date).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              u.status === "active"
                                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                : "bg-red-500/10 text-red-700 dark:text-red-400"
                            }
                          >
                            {u.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>

              {creditUsers?.pagination &&
                creditUsers.pagination.totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {(creditPage - 1) * creditLimit + 1} to{" "}
                      {Math.min(
                        creditPage * creditLimit,
                        creditUsers.pagination.total,
                      )}{" "}
                      of {creditUsers.pagination.total} users
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCreditPage((p) => Math.max(1, p - 1))
                        }
                        disabled={creditPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCreditPage((p) =>
                            Math.min(
                              creditUsers.pagination.totalPages,
                              p + 1,
                            ),
                          )
                        }
                        disabled={
                          creditPage >= creditUsers.pagination.totalPages
                        }
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
