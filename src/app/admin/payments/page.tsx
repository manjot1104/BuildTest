"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CartesianGrid } from "recharts";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { IndianRupee } from "lucide-react";
import { useAdminPayments } from "@/client-api/query-hooks/use-admin-payments";
import { useQuery } from "@tanstack/react-query";

export default function PaymentsPage() {
  const { data: usersUsage } = useQuery({
  queryKey: ["users-usage"],
  queryFn: async () => {
    const res = await fetch("/api/admin/users-usage");
    return res.json();
  },
});
const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<"chats" | "prompts" | "demo">("chats");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [subscriptionSearch, setSubscriptionSearch] = useState("");
  const { data, isLoading, error } = useAdminPayments();
  const { data: userStats } = useQuery({
  queryKey: ["user-usage", selectedUser],
  queryFn: async () => {
    const res = await fetch(`/api/admin/user-usage?userId=${selectedUser}`);
    return res.json();
  },
  enabled: !!selectedUser,
});
const monthlyRevenue = data?.monthlyRevenue ?? [];
  const summary = data?.summary;
  const activeSubscriptions = data?.activeSubscriptions ?? [];
const usage = data?.usageAnalytics;
const filteredSubscriptions = activeSubscriptions.filter((sub: any) =>
  sub.user_email?.toLowerCase().includes(subscriptionSearch.toLowerCase())
);


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
    <Tabs defaultValue="overview" className="space-y-6">

      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
        <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
      </TabsList>
   

      {/* ================= OVERVIEW TAB ================= */}
      <TabsContent value="overview" className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[{
            label: "Total Revenue",
            value: (summary?.totalRevenue ?? 0) / 100,
          },{
            label: "Subscription Revenue",
            value: (summary?.subscriptionRevenue ?? 0) / 100,
          },{
            label: "Credit Revenue",
            value: (summary?.creditRevenue ?? 0) / 100,
          },{
            label: "Failed Payments",
            value: summary?.failedPayments ?? 0,
          }].map((item) => (
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
                  <p className="text-3xl font-bold tracking-tight
                  ">
                    {item.label === "Failed Payments"
                      ? item.value
                      : `₹ ${item.value.toLocaleString()}`}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Graph Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
            <ResponsiveContainer width="100%" height={300}>
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
          </CardContent>
        </Card>

        <Card>
  <CardHeader>
    <CardTitle>Revenue Distribution</CardTitle>
  </CardHeader>
  <CardContent className="flex items-center justify-center">
    <ResponsiveContainer width="100%" height={300}>
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
  outerRadius={110}
  innerRadius={60}
  paddingAngle={4}
>
  <Cell fill="#3b82f6" /> {/* Blue */}
  <Cell fill="#6b7280" /> {/* Grey */}
</Pie>

        <Tooltip
          formatter={(value: number) =>
            `₹ ${value.toLocaleString()}`
          }
        />
      </PieChart>
    </ResponsiveContainer>
    <div className="mt-4 flex justify-center gap-6 text-sm text-muted-foreground">
  <div className="flex items-center gap-2">
    <div className="h-3 w-3 rounded-full bg-primary" />
    Subscriptions
  </div>
  <div className="flex items-center gap-2">
    <div className="h-3 w-3 rounded-full bg-muted-foreground" />
    Credits
  </div>
</div>
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
        placeholder="Search your email..."
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
                {!isLoading &&
                  filteredSubscriptions.map((sub: any) => (
                    <TableRow key={sub.subscription_id}>
                      <TableCell>{sub.user_email}</TableCell>
                      <TableCell>{sub.plan_name}</TableCell>
                      <TableCell>{sub.credits_per_month}</TableCell>
                      <TableCell>
                        {sub.current_period_end
                          ? new Date(sub.current_period_end).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {(sub.subscription_credits ?? 0) +
                          (sub.additional_credits ?? 0)}
                      </TableCell>
                      <TableCell>
                        <Badge className="capitalize">
                          {sub.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Tooltip />
      
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
          <p className="text-3xl font-bold">{usage?.totalChats ?? 0}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            Total Prompts
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4">
          <p className="text-3xl font-bold">{usage?.totalPrompts ?? 0}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            Total Demo Visits
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4">
          <p className="text-3xl font-bold">{usage?.totalDemoVisits ?? 0}</p>
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
          {["chats", "prompts", "demo"].map((metric) => (
            <button
              key={metric}
              onClick={() => setActiveMetric(metric as any)}
              className={`px-3 py-1 text-sm rounded-md transition ${
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
                ? usage?.monthlyChats ?? []
                : activeMetric === "prompts"
                ? usage?.monthlyPrompts ?? []
                : usage?.monthlyDemoVisits ?? []
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
  <CardHeader>
    <CardTitle>User Analytics</CardTitle>
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
        {usersUsage?.map((u: any) => (
          <>
            <TableRow
              key={u.id}
              className="cursor-pointer hover:bg-muted/40 transition"
              onClick={() =>
                setExpandedUser(expandedUser === u.id ? null : u.id)
              }
            >
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.total_chats}</TableCell>
              <TableCell>{u.total_prompts}</TableCell>
              <TableCell>{u.community_visits}</TableCell>
            </TableRow>

            {expandedUser === u.id && (
              <TableRow>
                <TableCell colSpan={4}>
                  <div className="p-4 rounded-lg bg-muted/30 border">
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
            )}
          </>
        ))}
      </TableBody>
    </Table>
  </CardContent>
</Card>

</TabsContent>
</Tabs>
  </div>
);}