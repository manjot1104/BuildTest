import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  payment_transactions,
  user,
  subscriptions,
  user_credits,
  credit_usage_logs,
} from "@/server/db/schema";
import { eq, sql, and, or, ilike, inArray } from "drizzle-orm";
import { requireAdmin } from "@/server/admin/require-admin";

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") || "asc";

    const offset = (page - 1) * limit;

    // ==============================
    // SUMMARY METRICS
    // ==============================

    // Credits Purchased/Added (from completed payment transactions)
    // NOTE: This does NOT include monthly subscription credit grants (no issuance log exists yet).
    const totalCreditsPurchasedResult = await db
      .select({
        value: sql<number>`COALESCE(SUM(${payment_transactions.credits_added}), 0)`,
      })
      .from(payment_transactions)
      .where(eq(payment_transactions.status, "completed"));

    // Total Credits Used (from credit usage logs)
    const totalCreditsUsedResult = await db
      .select({
        value: sql<number>`COALESCE(SUM(${credit_usage_logs.credits_used}), 0)`,
      })
      .from(credit_usage_logs);

    // Total Credits Remaining (current balance)
    const totalCreditsRemainingResult = await db
      .select({
        value: sql<number>`
          COALESCE(
            SUM(${user_credits.subscription_credits} + ${user_credits.additional_credits}),
            0
          )
        `,
      })
      .from(user_credits);

    // Active Credit Users (users with active subscription OR additional credits > 0)
    const activeCreditUsersResult = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${user_credits.user_id})`,
      })
      .from(user_credits)
      .leftJoin(subscriptions, eq(subscriptions.user_id, user_credits.user_id))
      .where(
        or(
          eq(subscriptions.status, "active"),
          sql`${user_credits.additional_credits} > 0`,
          sql`${user_credits.subscription_credits} > 0`
        )
      );

    // Expired Credit Users (users with expired subscription AND no additional credits)
    const expiredCreditUsersResult = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${user_credits.user_id})`,
      })
      .from(user_credits)
      .leftJoin(subscriptions, eq(subscriptions.user_id, user_credits.user_id))
      .where(
        and(
          or(
            eq(subscriptions.status, "expired"),
            eq(subscriptions.status, "cancelled"),
            sql`${subscriptions.status} IS NULL`
          ),
          sql`${user_credits.additional_credits} = 0`,
          sql`${user_credits.subscription_credits} = 0`
        )
      );

    // ==============================
    // GRAPH DATA
    // ==============================

    // Credits Issued vs Used (monthly comparison)
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

    // Merge issued and used data by month
    const monthMap = new Map<string, { month: string; issued: number; used: number }>();
    
    creditsIssuedMonthly.forEach((item) => {
      monthMap.set(item.month, { month: item.month, issued: item.issued, used: 0 });
    });
    
    creditsUsedMonthly.forEach((item) => {
      const existing = monthMap.get(item.month);
      if (existing) {
        existing.used = item.used;
      } else {
        monthMap.set(item.month, { month: item.month, issued: 0, used: item.used });
      }
    });

    const creditsIssuedVsUsed = Array.from(monthMap.values()).sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });

    // Monthly Credit Usage Trend
    const monthlyUsageTrend = await db
      .select({
        month: sql<string>`TO_CHAR(${credit_usage_logs.created_at}, 'Mon YYYY')`,
        credits: sql<number>`COALESCE(SUM(${credit_usage_logs.credits_used}), 0)`,
      })
      .from(credit_usage_logs)
      .groupBy(sql`TO_CHAR(${credit_usage_logs.created_at}, 'Mon YYYY')`)
      .orderBy(sql`MIN(${credit_usage_logs.created_at})`);

    // Credits Distribution by Plan
    const creditsByPlanRaw = await db
      .select({
        plan_name: subscriptions.plan_name,
        total_credits: sql<number>`
          COALESCE(SUM(${user_credits.subscription_credits} + ${user_credits.additional_credits}), 0)
        `,
      })
      .from(user_credits)
      .leftJoin(subscriptions, eq(subscriptions.user_id, user_credits.user_id))
      .where(
        sql`${user_credits.subscription_credits} + ${user_credits.additional_credits} > 0`
      )
      .groupBy(subscriptions.plan_name);

    // Filter out null plan names and format the data
    const creditsByPlan = creditsByPlanRaw
      .filter((item) => item.plan_name !== null)
      .map((item) => ({
        plan_name: item.plan_name || "No Plan",
        total_credits: Number(item.total_credits) || 0,
      }));

    // Active vs Expired Users Count
    const activeUsersCount = activeCreditUsersResult[0]?.count ?? 0;
    const expiredUsersCount = expiredCreditUsersResult[0]?.count ?? 0;

    // ==============================
    // USERS LIST
    // ==============================

    // Build base query - get users with their most recent subscription
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

    // Apply search filter
    const whereCondition = search
      ? or(
          ilike(user.name, `%${search}%`),
          ilike(user.email, `%${search}%`)
        )
      : undefined;

    // Get all users matching search (for pagination count)
    const allUsersData = whereCondition
      ? await baseQuery.where(whereCondition)
      : await baseQuery;

    const totalUsers = allUsersData.length;

    // Get most recent subscription for each user
    const userIds = allUsersData.map((u) => u.user_id);
    const userSubscriptions = userIds.length > 0
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

    // Create a map of user_id to most recent subscription (by created_at)
    const subscriptionMap = new Map();
    userSubscriptions.forEach((sub) => {
      const existing = subscriptionMap.get(sub.user_id);
      if (!existing || new Date(sub.created_at) > new Date(existing.created_at)) {
        subscriptionMap.set(sub.user_id, sub);
      }
    });

    // Get credits assigned and used for all users

    const creditsAssignedData = userIds.length > 0
      ? await db
          .select({
            user_id: payment_transactions.user_id,
            total: sql<number>`COALESCE(SUM(${payment_transactions.credits_added}), 0)`,
          })
          .from(payment_transactions)
          .where(
            and(
              eq(payment_transactions.status, "completed"),
              inArray(payment_transactions.user_id, userIds)
            )
          )
          .groupBy(payment_transactions.user_id)
      : [];

    const creditsUsedData = userIds.length > 0
      ? await db
          .select({
            user_id: credit_usage_logs.user_id,
            total: sql<number>`COALESCE(SUM(${credit_usage_logs.credits_used}), 0)`,
          })
          .from(credit_usage_logs)
          .where(inArray(credit_usage_logs.user_id, userIds))
          .groupBy(credit_usage_logs.user_id)
      : [];

    // Create maps for quick lookup
    const creditsAssignedMap = new Map(
      creditsAssignedData.map((item) => [item.user_id, item.total])
    );
    const creditsUsedMap = new Map(
      creditsUsedData.map((item) => [item.user_id, item.total])
    );

    // Combine data and calculate derived fields
    const combinedUsers = allUsersData.map((u) => {
      const subscription = subscriptionMap.get(u.user_id);
      const creditsAssigned = creditsAssignedMap.get(u.user_id) ?? 0;
      const creditsUsed = creditsUsedMap.get(u.user_id) ?? 0;
      const creditsRemaining =
        (u.subscription_credits ?? 0) + (u.additional_credits ?? 0);
      const status =
        subscription?.subscription_status === "active" ||
        creditsRemaining > 0
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

    // Apply sorting
    combinedUsers.sort((a, b) => {
      let aVal: string | number, bVal: string | number;
      switch (sortBy) {
        case "name":
          aVal = a.name?.toLowerCase() ?? "";
          bVal = b.name?.toLowerCase() ?? "";
          break;
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
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        default:
          aVal = a.name?.toLowerCase() ?? "";
          bVal = b.name?.toLowerCase() ?? "";
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    // Apply pagination
    const sortedUsers = combinedUsers.slice(offset, offset + limit);

    // ==============================
    // RETURN RESPONSE
    // ==============================

    const totalCreditsUsed = Number(totalCreditsUsedResult[0]?.value ?? 0);
    const totalCreditsRemaining = Number(totalCreditsRemainingResult[0]?.value ?? 0);
    // Define "Issued" as credits that were available to be spent (Used + Remaining).
    // This avoids confusing situations where "issued" appears lower than "used" because
    // subscription credit grants aren't represented in payment_transactions.
    const totalCreditsIssued = totalCreditsUsed + totalCreditsRemaining;

    return NextResponse.json({
      summary: {
        totalCreditsIssued,
        totalCreditsUsed,
        totalCreditsRemaining,
        // Extra field for clarity/debugging
        totalCreditsPurchased: totalCreditsPurchasedResult[0]?.value ?? 0,
        activeCreditUsers: activeCreditUsersResult[0]?.count ?? 0,
        expiredCreditUsers: expiredCreditUsersResult[0]?.count ?? 0,
      },
      graphs: {
        creditsIssuedVsUsed,
        monthlyUsageTrend,
        creditsByPlan,
        activeVsExpired: {
          active: activeUsersCount,
          expired: expiredUsersCount,
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
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch credit analytics" },
      { status: 500 },
    );
  }
}

