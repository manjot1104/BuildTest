"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

import {
  LineChart,
  Line,
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

export default function PaymentsPage() {
  
  const [subscriptionSearch, setSubscriptionSearch] = useState("");
  const { data, isLoading, error } = useAdminPayments();
const monthlyRevenue = data?.monthlyRevenue ?? [];
  const summary = data?.summary;
  const activeSubscriptions = data?.activeSubscriptions ?? [];
const usage = data?.usageAnalytics;
const filteredSubscriptions = activeSubscriptions.filter((sub: any) =>
  sub.user_email?.toLowerCase().includes(subscriptionSearch.toLowerCase())
);


  return (
  <div className="space-y-8">
    {/* Header */}
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Payments Analytics
      </h1>
      <p className="text-sm text-muted-foreground">
        Revenue, subscriptions and usage insights.
      </p>
    </div>

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
      </TabsContent>
    
<TabsContent value="overview" className="space-y-6">

  

 

  

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
     <TabsContent value="usage" className="space-y-6">

  {/* Usage Summary Cards */}
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">
          Total Chats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">
          {usage?.totalChats ?? 0}
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">
          Total Credits Used
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">
          {usage?.totalCreditsUsed ?? 0}
        </p>
      </CardContent>
    </Card>
  </div>

  {/* Monthly Chats Graph */}
  <Card>
    <CardHeader>
      <CardTitle>Monthly Chats</CardTitle>
    </CardHeader>
    <CardContent className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={usage?.monthlyChats ?? []}>
          <XAxis dataKey="month" />
          <YAxis />
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

  {/* Top Users Table */}
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
    </Tabs>
  </div>
);}