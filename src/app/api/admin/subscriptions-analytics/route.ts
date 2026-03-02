import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, ilike, lte, or, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { subscriptions, user } from "@/server/db/schema";
import { requireAdmin } from "@/server/admin/require-admin";

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const sp = request.nextUrl.searchParams;

    const page = parseInt(sp.get("page") ?? "1");
    const limit = parseInt(sp.get("limit") ?? "50");
    const search = sp.get("search") ?? "";
    const sortBy = sp.get("sortBy") ?? "created_at";
    const sortOrder = sp.get("sortOrder") ?? "desc";
    const plan = sp.get("plan") ?? "";
    const statusFilter = sp.get("statusFilter") ?? "all";
    const dateRange = sp.get("dateRange") ?? "";
    const startDateParam = sp.get("startDate") ?? "";
    const endDateParam = sp.get("endDate") ?? "";

    const offset = (page - 1) * limit;

    // Resolve date bounds for graph/summary filtering
    let dateFrom: Date | null = null;
    let dateTo: Date | null = null;

    if (dateRange === "7d") {
      dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateRange === "30d") {
      dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    } else if (dateRange === "custom" && startDateParam && endDateParam) {
      dateFrom = new Date(startDateParam);
      dateTo = new Date(endDateParam);
    }

    // ==============================
    // SUMMARY CARDS
    // ==============================

    const buildDateWhere = () => {
      const conditions = [];
      if (dateFrom) conditions.push(gte(subscriptions.created_at, dateFrom));
      if (dateTo) conditions.push(lte(subscriptions.created_at, dateTo));
      return conditions.length ? and(...conditions) : undefined;
    };

    const totalResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(subscriptions)
      .where(buildDateWhere());

    const activeResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(subscriptions)
      .where(
        and(eq(subscriptions.status, "active"), buildDateWhere()),
      );

    const expiredResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(subscriptions)
      .where(
        and(eq(subscriptions.status, "expired"), buildDateWhere()),
      );

    const cancelledResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(subscriptions)
      .where(
        and(eq(subscriptions.status, "cancelled"), buildDateWhere()),
      );

    // New this month (always use calendar month, not dateRange)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newThisMonthResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(subscriptions)
      .where(gte(subscriptions.created_at, startOfMonth));

    // New this week
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const newThisWeekResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(subscriptions)
      .where(gte(subscriptions.created_at, startOfWeek));

    // ==============================
    // GRAPHS
    // ==============================

    // Growth trend — new subscriptions per month
    const growthRaw = await db
      .select({
        month: sql<string>`TO_CHAR(${subscriptions.created_at}, 'Mon YYYY')`,
        count: sql<number>`COUNT(*)`,
      })
      .from(subscriptions)
      .where(buildDateWhere())
      .groupBy(sql`TO_CHAR(${subscriptions.created_at}, 'Mon YYYY')`)
      .orderBy(sql`MIN(${subscriptions.created_at})`);

    // Active vs Expired vs Cancelled (current state, date filter applied)
    const statusCountsRaw = await db
      .select({
        status: subscriptions.status,
        count: sql<number>`COUNT(*)`,
      })
      .from(subscriptions)
      .where(buildDateWhere())
      .groupBy(subscriptions.status);

    const statusCounts = { active: 0, expired: 0, cancelled: 0, pending: 0 };
    statusCountsRaw.forEach((r) => {
      if (r.status in statusCounts) {
        statusCounts[r.status as keyof typeof statusCounts] = Number(r.count);
      }
    });

    // By plan
    const byPlanRaw = await db
      .select({
        plan_name: subscriptions.plan_name,
        count: sql<number>`COUNT(*)`,
      })
      .from(subscriptions)
      .where(buildDateWhere())
      .groupBy(subscriptions.plan_name)
      .orderBy(sql`COUNT(*) DESC`);

    // New vs Cancelled per month
    const newPerMonthRaw = await db
      .select({
        month: sql<string>`TO_CHAR(${subscriptions.created_at}, 'Mon YYYY')`,
        new_count: sql<number>`COUNT(*)`,
      })
      .from(subscriptions)
      .where(buildDateWhere())
      .groupBy(sql`TO_CHAR(${subscriptions.created_at}, 'Mon YYYY')`)
      .orderBy(sql`MIN(${subscriptions.created_at})`);

    const cancelledPerMonthRaw = await db
      .select({
        month: sql<string>`TO_CHAR(${subscriptions.cancelled_at}, 'Mon YYYY')`,
        cancelled_count: sql<number>`COUNT(*)`,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, "cancelled"),
          sql`${subscriptions.cancelled_at} IS NOT NULL`,
          ...(dateFrom ? [gte(subscriptions.cancelled_at, dateFrom)] : []),
          ...(dateTo ? [lte(subscriptions.cancelled_at, dateTo)] : []),
        ),
      )
      .groupBy(sql`TO_CHAR(${subscriptions.cancelled_at}, 'Mon YYYY')`)
      .orderBy(sql`MIN(${subscriptions.cancelled_at})`);

    // Merge new vs cancelled by month
    const newVsCancelledMap = new Map<string, { month: string; new: number; cancelled: number }>();
    newPerMonthRaw.forEach((r) => {
      newVsCancelledMap.set(r.month, { month: r.month, new: Number(r.new_count), cancelled: 0 });
    });
    cancelledPerMonthRaw.forEach((r) => {
      const existing = newVsCancelledMap.get(r.month);
      if (existing) {
        existing.cancelled = Number(r.cancelled_count);
      } else {
        newVsCancelledMap.set(r.month, { month: r.month, new: 0, cancelled: Number(r.cancelled_count) });
      }
    });
    const newVsCancelled = Array.from(newVsCancelledMap.values());

    // ==============================
    // SUBSCRIPTIONS LIST
    // ==============================

    // Build where conditions for list
    const listConditions: ReturnType<typeof eq>[] = [];

    if (statusFilter && statusFilter !== "all") {
      listConditions.push(eq(subscriptions.status, statusFilter as "active" | "expired" | "cancelled" | "pending"));
    }
    if (plan) {
      listConditions.push(eq(subscriptions.plan_name, plan));
    }

    const searchCondition = search
      ? or(ilike(user.name, `%${search}%`), ilike(user.email, `%${search}%`))
      : undefined;

    const baseWhere = listConditions.length
      ? and(...listConditions, ...(searchCondition ? [searchCondition] : []))
      : searchCondition;

    const allRows = await db
      .select({
        subscription_id: subscriptions.id,
        user_email: user.email,
        user_name: user.name,
        plan_name: subscriptions.plan_name,
        plan_price: subscriptions.plan_price,
        created_at: subscriptions.created_at,
        current_period_end: subscriptions.current_period_end,
        cancelled_at: subscriptions.cancelled_at,
        status: subscriptions.status,
      })
      .from(subscriptions)
      .innerJoin(user, eq(user.id, subscriptions.user_id))
      .where(baseWhere);

    // Sort
    allRows.sort((a, b) => {
      let aVal: unknown;
      let bVal: unknown;
      switch (sortBy) {
        case "user_name":
          aVal = a.user_name?.toLowerCase() ?? "";
          bVal = b.user_name?.toLowerCase() ?? "";
          break;
        case "user_email":
          aVal = a.user_email?.toLowerCase() ?? "";
          bVal = b.user_email?.toLowerCase() ?? "";
          break;
        case "plan_name":
          aVal = a.plan_name?.toLowerCase() ?? "";
          bVal = b.plan_name?.toLowerCase() ?? "";
          break;
        case "status":
          aVal = a.status ?? "";
          bVal = b.status ?? "";
          break;
        case "current_period_end":
          aVal = a.current_period_end ? new Date(a.current_period_end).getTime() : 0;
          bVal = b.current_period_end ? new Date(b.current_period_end).getTime() : 0;
          break;
        default: // created_at
          aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
          bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
          break;
      }
      if (aVal! < bVal!) return sortOrder === "asc" ? -1 : 1;
      if (aVal! > bVal!) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    const totalUsers = allRows.length;
    const paginatedRows = allRows.slice(offset, offset + limit);

    return NextResponse.json({
      summary: {
        totalSubscriptions: Number(totalResult[0]?.count ?? 0),
        activeSubscriptions: Number(activeResult[0]?.count ?? 0),
        expiredSubscriptions: Number(expiredResult[0]?.count ?? 0),
        cancelledSubscriptions: Number(cancelledResult[0]?.count ?? 0),
        newThisMonth: Number(newThisMonthResult[0]?.count ?? 0),
        newThisWeek: Number(newThisWeekResult[0]?.count ?? 0),
      },
      graphs: {
        growthTrend: growthRaw.map((r) => ({ month: r.month, count: Number(r.count) })),
        activeVsExpired: statusCounts,
        byPlan: byPlanRaw.map((r) => ({ plan_name: r.plan_name, count: Number(r.count) })),
        newVsCancelled,
      },
      subscriptions: {
        data: paginatedRows,
        pagination: {
          page,
          limit,
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / limit),
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch subscriptions analytics" },
      { status: 500 },
    );
  }
}
