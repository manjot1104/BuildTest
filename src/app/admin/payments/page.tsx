"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Coins,
  IndianRupee,
  Search,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAdminCredits } from "@/client-api/query-hooks/use-admin-credits";
import { useAdminPayments } from "@/client-api/query-hooks/use-admin-payments";
import { useAdminSubscriptions } from "@/client-api/query-hooks/use-admin-subscriptions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

// ─── Helpers ────────────────────────────────────────────────────────────────

function SortIcon({
  column,
  sortBy,
  sortOrder,
}: {
  column: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}) {
  if (sortBy !== column) return <ArrowUpDown className="ml-1 h-3 w-3" />;
  return sortOrder === "asc" ? (
    <ArrowUp className="ml-1 h-3 w-3" />
  ) : (
    <ArrowDown className="ml-1 h-3 w-3" />
  );
}

function SummaryCard({
  label,
  value,
  loading,
  icon,
}: {
  label: string;
  value: string | number;
  loading: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-2xl font-semibold">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const searchParams = useSearchParams();
  const initialTab = useMemo(
    () => searchParams.get("tab") ?? "overview",
    [searchParams],
  );
  const [tab, setTab] = useState(initialTab);

  // ── Overview / Usage ──────────────────────────────────────────────────────
  const { data, isLoading, error } = useAdminPayments();
  const monthlyRevenue = data?.monthlyRevenue ?? [];
  const summary = data?.summary;
  const activeSubscriptionsList = data?.activeSubscriptions ?? [];
  const usage = data?.usageAnalytics;

  // ── Subscriptions ─────────────────────────────────────────────────────────
  const [subSearch, setSubSearch] = useState("");
  const [subPage, setSubPage] = useState(1);
  const [subSortBy, setSubSortBy] = useState("created_at");
  const [subSortOrder, setSubSortOrder] = useState<"asc" | "desc">("desc");
  const [subStatusFilter, setSubStatusFilter] = useState("all");
  const [subDateRange, setSubDateRange] = useState("");
  const [subStartDate, setSubStartDate] = useState("");
  const [subEndDate, setSubEndDate] = useState("");
  const [subPlanFilter, setSubPlanFilter] = useState("");
  const subLimit = 50;

  const {
    data: subData,
    isLoading: subLoading,
    error: subError,
  } = useAdminSubscriptions({
    dateRange: subDateRange,
    startDate: subStartDate,
    endDate: subEndDate,
    plan: subPlanFilter,
    statusFilter: subStatusFilter,
    page: subPage,
    limit: subLimit,
    search: subSearch,
    sortBy: subSortBy,
    sortOrder: subSortOrder,
  });

  const subSummary = subData?.summary;
  const subGraphs = subData?.graphs;
  const subList = subData?.subscriptions;

  const handleSubSort = (col: string) => {
    if (subSortBy === col) {
      setSubSortOrder(subSortOrder === "asc" ? "desc" : "asc");
    } else {
      setSubSortBy(col);
      setSubSortOrder("asc");
    }
  };

  // Derive plan options from byPlan graph
  const planOptions: string[] = useMemo(
    () =>
      (subGraphs?.byPlan ?? [])
        .map((p: { plan_name: string }) => p.plan_name)
        .filter(Boolean),
    [subGraphs],
  );

  // ── Credits ───────────────────────────────────────────────────────────────
  const [creditSearch, setCreditSearch] = useState("");
  const [creditPage, setCreditPage] = useState(1);
  const [creditSortBy, setCreditSortBy] = useState("name");
  const [creditSortOrder, setCreditSortOrder] = useState<"asc" | "desc">("asc");
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

  const handleCreditSort = (col: string) => {
    if (creditSortBy === col) {
      setCreditSortOrder(creditSortOrder === "asc" ? "desc" : "asc");
    } else {
      setCreditSortBy(col);
      setCreditSortOrder("asc");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Payments Analytics
        </h1>
        <p className="text-sm text-muted-foreground">
          Revenue, subscriptions and usage insights.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {(error as Error).message}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
          <TabsTrigger value="credits">Credit Analytics</TabsTrigger>
        </TabsList>

        {/* ════════════════ OVERVIEW ════════════════ */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Total Revenue",
                value: `₹ ${((summary?.totalRevenue ?? 0) / 100).toLocaleString()}`,
              },
              {
                label: "Subscription Revenue",
                value: `₹ ${((summary?.subscriptionRevenue ?? 0) / 100).toLocaleString()}`,
              },
              {
                label: "Credit Revenue",
                value: `₹ ${((summary?.creditRevenue ?? 0) / 100).toLocaleString()}`,
              },
              {
                label: "Failed Payments",
                value: (summary?.failedPayments ?? 0).toLocaleString(),
              },
            ].map((item) => (
              <SummaryCard
                key={item.label}
                label={item.label}
                value={item.value}
                loading={isLoading}
                icon={<IndianRupee className="size-4 text-muted-foreground" />}
              />
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
                    <YAxis tickFormatter={(v: number) => `₹${(v / 100).toLocaleString()}`} />
                    <Tooltip formatter={(v: number) => `₹ ${(v / 100).toLocaleString()}`} />
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
                              value: (summary?.subscriptionRevenue ?? 0) / 100,
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
                          formatter={(v: number) =>
                            `₹ ${v.toLocaleString()}`
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

        {/* ════════════════ SUBSCRIPTIONS ════════════════ */}
        <TabsContent value="subscriptions" className="space-y-6">
          {subError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {(subError as Error).message}
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-end gap-4">
                {/* Date range */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Date Range</p>
                  <Select
                    value={subDateRange || "all"}
                    onValueChange={(v) => {
                      setSubDateRange(v === "all" ? "" : v);
                      setSubStartDate("");
                      setSubEndDate("");
                      setSubPage(1);
                    }}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="All time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All time</SelectItem>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="custom">Custom range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {subDateRange === "custom" && (
                  <>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">From</p>
                      <Input
                        type="date"
                        value={subStartDate}
                        onChange={(e) => {
                          setSubStartDate(e.target.value);
                          setSubPage(1);
                        }}
                        className="w-40"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">To</p>
                      <Input
                        type="date"
                        value={subEndDate}
                        onChange={(e) => {
                          setSubEndDate(e.target.value);
                          setSubPage(1);
                        }}
                        className="w-40"
                      />
                    </div>
                  </>
                )}

                {/* Plan filter */}
                {planOptions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Plan</p>
                    <Select
                      value={subPlanFilter || "all"}
                      onValueChange={(v) => {
                        setSubPlanFilter(v === "all" ? "" : v);
                        setSubPage(1);
                      }}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="All plans" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All plans</SelectItem>
                        {planOptions.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Total Subscriptions", value: subSummary?.totalSubscriptions ?? 0 },
              { label: "Active", value: subSummary?.activeSubscriptions ?? 0 },
              { label: "Expired", value: subSummary?.expiredSubscriptions ?? 0 },
              { label: "Cancelled", value: subSummary?.cancelledSubscriptions ?? 0 },
              { label: "New This Month", value: subSummary?.newThisMonth ?? 0 },
              { label: "New This Week", value: subSummary?.newThisWeek ?? 0 },
            ].map((item) => (
              <SummaryCard
                key={item.label}
                label={item.label}
                value={(item.value as number).toLocaleString()}
                loading={subLoading}
                icon={<IndianRupee className="size-4 text-muted-foreground" />}
              />
            ))}
          </div>

          {/* Charts row 1 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Growth Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Subscription Growth Trend</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                {subLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : !subGraphs?.growthTrend?.length ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={subGraphs.growthTrend}>
                      <XAxis dataKey="month" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        name="New Subscriptions"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Active vs Expired Donut */}
            <Card>
              <CardHeader>
                <CardTitle>Active vs Expired vs Cancelled</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                {subLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <Skeleton className="h-48 w-48 rounded-full" />
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height="80%">
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: "Active",
                              value: subGraphs?.activeVsExpired?.active ?? 0,
                            },
                            {
                              name: "Expired",
                              value: subGraphs?.activeVsExpired?.expired ?? 0,
                            },
                            {
                              name: "Cancelled",
                              value: subGraphs?.activeVsExpired?.cancelled ?? 0,
                            },
                          ]}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={80}
                          innerRadius={40}
                          paddingAngle={4}
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#ef4444" />
                          <Cell fill="#f59e0b" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-full bg-[#10b981]" />
                        Active
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-full bg-[#ef4444]" />
                        Expired
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-full bg-[#f59e0b]" />
                        Cancelled
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts row 2 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* By Plan Bar */}
            <Card>
              <CardHeader>
                <CardTitle>Subscriptions by Plan</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                {subLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : !subGraphs?.byPlan?.length ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={subGraphs.byPlan}
                      layout="vertical"
                      margin={{ left: 16 }}
                    >
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="plan_name" width={80} />
                      <Tooltip />
                      <Bar dataKey="count" name="Subscriptions" radius={[0, 4, 4, 0]}>
                        {subGraphs.byPlan.map((_: unknown, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* New vs Cancelled */}
            <Card>
              <CardHeader>
                <CardTitle>New vs Cancelled (Monthly)</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                {subLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : !subGraphs?.newVsCancelled?.length ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={subGraphs.newVsCancelled}>
                      <XAxis dataKey="month" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="new"
                        stroke="#10b981"
                        strokeWidth={2}
                        name="New"
                      />
                      <Line
                        type="monotone"
                        dataKey="cancelled"
                        stroke="#ef4444"
                        strokeWidth={2}
                        name="Cancelled"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Subscriptions Table */}
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Subscriptions</CardTitle>
              <div className="flex flex-wrap items-center gap-3">
                {/* Status tabs */}
                <div className="flex rounded-md border border-border overflow-hidden">
                  {(["all", "active", "expired", "cancelled"] as const).map(
                    (s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setSubStatusFilter(s);
                          setSubPage(1);
                        }}
                        className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                          subStatusFilter === s
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {s}
                      </button>
                    ),
                  )}
                </div>
                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={subSearch}
                    onChange={(e) => {
                      setSubSearch(e.target.value);
                      setSubPage(1);
                    }}
                    className="pl-9"
                  />
                </div>
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
                        onClick={() => handleSubSort("user_name")}
                      >
                        User
                        <SortIcon column="user_name" sortBy={subSortBy} sortOrder={subSortOrder} />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
                        onClick={() => handleSubSort("plan_name")}
                      >
                        Plan
                        <SortIcon column="plan_name" sortBy={subSortBy} sortOrder={subSortOrder} />
                      </Button>
                    </TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
                        onClick={() => handleSubSort("created_at")}
                      >
                        Started
                        <SortIcon column="created_at" sortBy={subSortBy} sortOrder={subSortOrder} />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
                        onClick={() => handleSubSort("current_period_end")}
                      >
                        Expires
                        <SortIcon column="current_period_end" sortBy={subSortBy} sortOrder={subSortOrder} />
                      </Button>
                    </TableHead>
                    <TableHead>Cancelled</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
                        onClick={() => handleSubSort("status")}
                      >
                        Status
                        <SortIcon column="status" sortBy={subSortBy} sortOrder={subSortOrder} />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subLoading &&
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}

                  {!subLoading &&
                    (!subList?.data || subList.data.length === 0) && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-8 text-center text-muted-foreground"
                        >
                          {subSearch
                            ? "No subscriptions match your search."
                            : "No subscriptions found."}
                        </TableCell>
                      </TableRow>
                    )}

                  {!subLoading &&
                    subList?.data?.map((sub: any) => (
                      <TableRow key={sub.subscription_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sub.user_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {sub.user_email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{sub.plan_name}</TableCell>
                        <TableCell>
                          ₹ {((sub.plan_price ?? 0) / 100).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {sub.created_at
                            ? new Date(sub.created_at).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {sub.current_period_end
                            ? new Date(sub.current_period_end).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {sub.cancelled_at
                            ? new Date(sub.cancelled_at).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              sub.status === "active"
                                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                : sub.status === "cancelled"
                                  ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                                  : "bg-red-500/10 text-red-700 dark:text-red-400"
                            }
                          >
                            {sub.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>

              {subList?.pagination && subList.pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {(subPage - 1) * subLimit + 1}–
                    {Math.min(subPage * subLimit, subList.pagination.total)} of{" "}
                    {subList.pagination.total}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSubPage((p) => Math.max(1, p - 1))}
                      disabled={subPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSubPage((p) =>
                          Math.min(subList.pagination.totalPages, p + 1),
                        )
                      }
                      disabled={subPage >= subList.pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════ USAGE ════════════════ */}
        <TabsContent value="usage" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SummaryCard
              label="Total Chats"
              value={(usage?.totalChats ?? 0).toLocaleString()}
              loading={isLoading}
              icon={<Coins className="size-4 text-muted-foreground" />}
            />
            <SummaryCard
              label="Total Credits Used"
              value={(usage?.totalCreditsUsed ?? 0).toLocaleString()}
              loading={isLoading}
              icon={<Coins className="size-4 text-muted-foreground" />}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Chats</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={usage?.monthlyChats ?? []}>
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Chats</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usage?.topUsers?.map((u: any) => (
                    <TableRow key={u.user_email}>
                      <TableCell>{u.user_email}</TableCell>
                      <TableCell>{u.chat_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════ CREDIT ANALYTICS ════════════════ */}
        <TabsContent value="credits" className="space-y-6">
          {creditError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {(creditError as Error).message}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Total Credits Issued", value: creditSummary?.totalCreditsIssued ?? 0 },
              { label: "Total Credits Used", value: creditSummary?.totalCreditsUsed ?? 0 },
              { label: "Total Credits Remaining", value: creditSummary?.totalCreditsRemaining ?? 0 },
              { label: "Active Credit Users", value: creditSummary?.activeCreditUsers ?? 0 },
              { label: "Expired Credit Users", value: creditSummary?.expiredCreditUsers ?? 0 },
            ].map((item) => (
              <SummaryCard
                key={item.label}
                label={item.label}
                value={(item.value as number).toLocaleString()}
                loading={creditLoading}
                icon={<Coins className="size-4 text-muted-foreground" />}
              />
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
                          outerRadius={100}
                          innerRadius={50}
                          paddingAngle={4}
                        >
                          {creditGraphs.creditsByPlan.map(
                            (_: unknown, i: number) => (
                              <Cell
                                key={i}
                                fill={COLORS[i % COLORS.length]}
                              />
                            ),
                          )}
                        </Pie>
                        <Tooltip
                          formatter={(v: number) => v.toLocaleString()}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                    {creditGraphs.creditsByPlan.map(
                      (plan: any, i: number) => (
                        <div key={plan.plan_name ?? i} className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          />
                          {plan.plan_name ?? "No Plan"}
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

          {/* Credit Users Table */}
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
                    {[
                      { col: "name", label: "Name" },
                      { col: "email", label: "Email" },
                    ].map(({ col, label }) => (
                      <TableHead key={col}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8"
                          onClick={() => handleCreditSort(col)}
                        >
                          {label}
                          <SortIcon
                            column={col}
                            sortBy={creditSortBy}
                            sortOrder={creditSortOrder}
                          />
                        </Button>
                      </TableHead>
                    ))}
                    <TableHead>Plan</TableHead>
                    {[
                      { col: "credits_assigned", label: "Assigned" },
                      { col: "credits_used", label: "Used" },
                      { col: "credits_remaining", label: "Remaining" },
                    ].map(({ col, label }) => (
                      <TableHead key={col}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8"
                          onClick={() => handleCreditSort(col)}
                        >
                          {label}
                          <SortIcon
                            column={col}
                            sortBy={creditSortBy}
                            sortOrder={creditSortOrder}
                          />
                        </Button>
                      </TableHead>
                    ))}
                    <TableHead>Expiry</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
                        onClick={() => handleCreditSort("status")}
                      >
                        Status
                        <SortIcon
                          column="status"
                          sortBy={creditSortBy}
                          sortOrder={creditSortOrder}
                        />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditLoading &&
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-20" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}

                  {!creditLoading &&
                    (!creditUsers?.data || creditUsers.data.length === 0) && (
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
                    creditUsers?.data?.map((u: any) => (
                      <TableRow key={u.user_id}>
                        <TableCell>{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{u.plan_name ?? "-"}</TableCell>
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
                      Showing {(creditPage - 1) * creditLimit + 1}–
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
                            Math.min(creditUsers.pagination.totalPages, p + 1),
                          )
                        }
                        disabled={creditPage >= creditUsers.pagination.totalPages}
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
