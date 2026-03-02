import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { db } from "@/server/db";
import {
  credit_usage_logs,
  payment_transactions,
  subscriptions,
  user,
  user_credits,
} from "@/server/db/schema";
import { requireAdmin } from "@/server/admin/require-admin";

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const sp = request.nextUrl.searchParams;
    const page = parseInt(sp.get("page") ?? "1");
    const limit = parseInt(sp.get("limit") ?? "50");
    const search = sp.get("search") ?? "";
    const sortBy = sp.get("sortBy") ?? "name";
    const sortOrder = sp.get("sortOrder") ?? "asc";
    const offset = (page - 1) * limit;

    // ==============================
    // SUMMARY METRICS
    // ==============================

    const totalCreditsUsedResult = await db
      .select({
        value: sql<number>`COALESCE(SUM(${credit_usage_logs.credits_used}), 0)`,
      })
      .from(credit_usage_logs);

    const totalCreditsRemainingResult = await db
      .select({
        value: sql<number>`COALESCE(SUM(${user_credits.subscription_credits} + ${user_credits.additional_credits}), 0)`,
      })
      .from(user_credits);

    const totalCreditsPurchasedResult = await db
      .select({
        value: sql<number>`COALESCE(SUM(${payment_transactions.credits_added}), 0)`,
      })
      .from(payment_transactions)
      .where(eq(payment_transactions.status, "completed"));

    const activeCreditUsersResult = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${user_credits.user_id})` })
      .from(user_credits)
      .leftJoin(subscriptions, eq(subscriptions.user_id, user_credits.user_id))
      .where(
        or(
          eq(subscriptions.status, "active"),
          sql`${user_credits.additional_credits} > 0`,
          sql`${user_credits.subscription_credits} > 0`,
        ),
      );

    const expiredCreditUsersResult = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${user_credits.user_id})` })
      .from(user_credits)
      .leftJoin(subscriptions, eq(subscriptions.user_id, user_credits.user_id))
      .where(
        and(
          or(
            eq(subscriptions.status, "expired"),
            eq(subscriptions.status, "cancelled"),
            sql`${subscriptions.status} IS NULL`,
          ),
          sql`${user_credits.additional_credits} = 0`,
          sql`${user_credits.subscription_credits} = 0`,
        ),
      );

    // ==============================
    // GRAPH DATA
    // ==============================

    const creditsIssuedMonthly = await db
      .select({
        month: sql<string>`TO_CHAR(${payment_transactions.created_at}, 'Mon YYYY')`,
        issued: sql<number>`COALESCE(SUM(${payment_transactions.credits_added}), 0)`,
      })
      .from(payment_transactions)
      .where(eq(payment_transactions.status, "completed"))
      .groupBy(sql`TO_CHAR(${payment_transactions.created_at}, 'Mon YYYY')`)
      .orderBy(sql`MIN(${payment_transactions.created_at})`);

    const creditsUsedMonthly = await db
      .select({
        month: sql<string>`TO_CHAR(${credit_usage_logs.created_at}, 'Mon YYYY')`,
        used: sql<number>`COALESCE(SUM(${credit_usage_logs.credits_used}), 0)`,
      })
      .from(credit_usage_logs)
      .groupBy(sql`TO_CHAR(${credit_usage_logs.created_at}, 'Mon YYYY')`)
      .orderBy(sql`MIN(${credit_usage_logs.created_at})`);

    const monthMap = new Map<string, { month: string; issued: number; used: number }>();
    creditsIssuedMonthly.forEach((item) => {
      monthMap.set(item.month, { month: item.month, issued: Number(item.issued), used: 0 });
    });
    creditsUsedMonthly.forEach((item) => {
      const existing = monthMap.get(item.month);
      if (existing) {
        existing.used = Number(item.used);
      } else {
        monthMap.set(item.month, { month: item.month, issued: 0, used: Number(item.used) });
      }
    });
    const creditsIssuedVsUsed = Array.from(monthMap.values()).sort(
      (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime(),
    );

    const monthlyUsageTrend = await db
      .select({
        month: sql<string>`TO_CHAR(${credit_usage_logs.created_at}, 'Mon YYYY')`,
        credits: sql<number>`COALESCE(SUM(${credit_usage_logs.credits_used}), 0)`,
      })
      .from(credit_usage_logs)
      .groupBy(sql`TO_CHAR(${credit_usage_logs.created_at}, 'Mon YYYY')`)
      .orderBy(sql`MIN(${credit_usage_logs.created_at})`);

    const creditsByPlanRaw = await db
      .select({
        plan_name: subscriptions.plan_name,
        total_credits: sql<number>`COALESCE(SUM(${user_credits.subscription_credits} + ${user_credits.additional_credits}), 0)`,
      })
      .from(user_credits)
      .leftJoin(subscriptions, eq(subscriptions.user_id, user_credits.user_id))
      .where(sql`${user_credits.subscription_credits} + ${user_credits.additional_credits} > 0`)
      .groupBy(subscriptions.plan_name);

    const creditsByPlan = creditsByPlanRaw
      .filter((item) => item.plan_name !== null)
      .map((item) => ({
        plan_name: item.plan_name ?? "No Plan",
        total_credits: Number(item.total_credits),
      }));

    // ==============================
    // USERS LIST
    // ==============================

    const baseQuery = db
      .select({
        user_id: user.id,
        name: user.name,
        email: user.email,
        subscription_credits: user_credits.subscription_credits,
        additional_credits: user_credits.additional_credits,
      })
      .from(user)
      .leftJoin(user_credits, eq(user_credits.user_id, user.id));

    const whereCondition = search
      ? or(ilike(user.name, `%${search}%`), ilike(user.email, `%${search}%`))
      : undefined;

    const allUsersData = whereCondition
      ? await baseQuery.where(whereCondition)
      : await baseQuery;

    const totalUsers = allUsersData.length;
    const userIds = allUsersData.map((u) => u.user_id);

    const userSubscriptions =
      userIds.length > 0
        ? await db
            .select({
              user_id: subscriptions.user_id,
              plan_name: subscriptions.plan_name,
              expiry_date: subscriptions.current_period_end,
              subscription_status: subscriptions.status,
              created_at: subscriptions.created_at,
            })
            .from(subscriptions)
            .where(inArray(subscriptions.user_id, userIds))
        : [];

    const subscriptionMap = new Map<string, (typeof userSubscriptions)[0]>();
    userSubscriptions.forEach((sub) => {
      const existing = subscriptionMap.get(sub.user_id);
      if (!existing || new Date(sub.created_at) > new Date(existing.created_at)) {
        subscriptionMap.set(sub.user_id, sub);
      }
    });

    const creditsAssignedData =
      userIds.length > 0
        ? await db
            .select({
              user_id: payment_transactions.user_id,
              total: sql<number>`COALESCE(SUM(${payment_transactions.credits_added}), 0)`,
            })
            .from(payment_transactions)
            .where(
              and(
                eq(payment_transactions.status, "completed"),
                inArray(payment_transactions.user_id, userIds),
              ),
            )
            .groupBy(payment_transactions.user_id)
        : [];

    const creditsUsedData =
      userIds.length > 0
        ? await db
            .select({
              user_id: credit_usage_logs.user_id,
              total: sql<number>`COALESCE(SUM(${credit_usage_logs.credits_used}), 0)`,
            })
            .from(credit_usage_logs)
            .where(inArray(credit_usage_logs.user_id, userIds))
            .groupBy(credit_usage_logs.user_id)
        : [];

    const creditsAssignedMap = new Map(
      creditsAssignedData.map((item) => [item.user_id, Number(item.total)]),
    );
    const creditsUsedMap = new Map(
      creditsUsedData.map((item) => [item.user_id, Number(item.total)]),
    );

    let combinedUsers = allUsersData.map((u) => {
      const subscription = subscriptionMap.get(u.user_id);
      const creditsAssigned = creditsAssignedMap.get(u.user_id) ?? 0;
      const creditsUsed = creditsUsedMap.get(u.user_id) ?? 0;
      const creditsRemaining =
        (u.subscription_credits ?? 0) + (u.additional_credits ?? 0);
      const status =
        subscription?.subscription_status === "active" || creditsRemaining > 0
          ? "active"
          : "expired";

      return {
        user_id: u.user_id,
        name: u.name,
        email: u.email,
        plan_name: subscription?.plan_name ?? null,
        credits_assigned: creditsAssigned,
        credits_used: creditsUsed,
        credits_remaining: creditsRemaining,
        expiry_date: subscription?.expiry_date ?? null,
        status,
      };
    });

    combinedUsers.sort((a, b) => {
      let aVal: unknown;
      let bVal: unknown;
      switch (sortBy) {
        case "email":
          aVal = a.email?.toLowerCase() ?? "";
          bVal = b.email?.toLowerCase() ?? "";
          break;
        case "credits_remaining":
          aVal = a.credits_remaining;
          bVal = b.credits_remaining;
          break;
        case "credits_used":
          aVal = a.credits_used;
          bVal = b.credits_used;
          break;
        case "credits_assigned":
          aVal = a.credits_assigned;
          bVal = b.credits_assigned;
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        default:
          aVal = a.name?.toLowerCase() ?? "";
          bVal = b.name?.toLowerCase() ?? "";
      }
      if (aVal! < bVal!) return sortOrder === "asc" ? -1 : 1;
      if (aVal! > bVal!) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    const sortedUsers = combinedUsers.slice(offset, offset + limit);

    const totalCreditsUsed = Number(totalCreditsUsedResult[0]?.value ?? 0);
    const totalCreditsRemaining = Number(totalCreditsRemainingResult[0]?.value ?? 0);
    const totalCreditsIssued = totalCreditsUsed + totalCreditsRemaining;

    return NextResponse.json({
      summary: {
        totalCreditsIssued,
        totalCreditsUsed,
        totalCreditsRemaining,
        totalCreditsPurchased: Number(totalCreditsPurchasedResult[0]?.value ?? 0),
        activeCreditUsers: Number(activeCreditUsersResult[0]?.count ?? 0),
        expiredCreditUsers: Number(expiredCreditUsersResult[0]?.count ?? 0),
      },
      graphs: {
        creditsIssuedVsUsed,
        monthlyUsageTrend: monthlyUsageTrend.map((r) => ({
          month: r.month,
          credits: Number(r.credits),
        })),
        creditsByPlan,
        activeVsExpired: {
          active: Number(activeCreditUsersResult[0]?.count ?? 0),
          expired: Number(expiredCreditUsersResult[0]?.count ?? 0),
        },
      },
      users: {
        data: sortedUsers,
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
      { error: "Failed to fetch credit analytics" },
      { status: 500 },
    );
  }
}
