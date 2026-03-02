import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { db } from "@/server/db";
import {
  credit_usage_logs,
  payment_transactions,
  subscriptions,
  user,
  user_chats,
  user_credits,
} from "@/server/db/schema";
import { requireAdmin } from "@/server/admin/require-admin";

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    // ==============================
    // SUMMARY
    // ==============================

    const revenueResult = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${payment_transactions.status} = 'completed' THEN ${payment_transactions.amount} ELSE 0 END), 0)`,
        subscriptionRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${payment_transactions.status} = 'completed' AND ${payment_transactions.type} = 'subscription' THEN ${payment_transactions.amount} ELSE 0 END), 0)`,
        creditRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${payment_transactions.status} = 'completed' AND ${payment_transactions.type} = 'credit_pack' THEN ${payment_transactions.amount} ELSE 0 END), 0)`,
        failedPayments: sql<number>`COUNT(CASE WHEN ${payment_transactions.status} = 'failed' THEN 1 END)`,
      })
      .from(payment_transactions);

    const rev = revenueResult[0];
    const summary = {
      totalRevenue: Number(rev?.totalRevenue ?? 0),
      subscriptionRevenue: Number(rev?.subscriptionRevenue ?? 0),
      creditRevenue: Number(rev?.creditRevenue ?? 0),
      failedPayments: Number(rev?.failedPayments ?? 0),
    };

    // ==============================
    // MONTHLY REVENUE
    // ==============================

    const monthlyRevenueRaw = await db
      .select({
        month: sql<string>`TO_CHAR(${payment_transactions.created_at}, 'Mon YYYY')`,
        total: sql<number>`COALESCE(SUM(${payment_transactions.amount}), 0)`,
      })
      .from(payment_transactions)
      .where(eq(payment_transactions.status, "completed"))
      .groupBy(sql`TO_CHAR(${payment_transactions.created_at}, 'Mon YYYY')`)
      .orderBy(sql`MIN(${payment_transactions.created_at})`);

    const monthlyRevenue = monthlyRevenueRaw.map((r) => ({
      month: r.month,
      total: Number(r.total),
    }));

    // ==============================
    // ACTIVE SUBSCRIPTIONS LIST
    // ==============================

    const activeSubscriptions = await db
      .select({
        subscription_id: subscriptions.id,
        user_email: user.email,
        plan_name: subscriptions.plan_name,
        credits_per_month: subscriptions.credits_per_month,
        current_period_end: subscriptions.current_period_end,
        status: subscriptions.status,
        subscription_credits: user_credits.subscription_credits,
        additional_credits: user_credits.additional_credits,
      })
      .from(subscriptions)
      .innerJoin(user, eq(user.id, subscriptions.user_id))
      .leftJoin(user_credits, eq(user_credits.user_id, subscriptions.user_id))
      .where(eq(subscriptions.status, "active"));

    // ==============================
    // USAGE ANALYTICS
    // ==============================

    const totalChatsResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(user_chats);

    const totalCreditsUsedResult = await db
      .select({
        value: sql<number>`COALESCE(SUM(${credit_usage_logs.credits_used}), 0)`,
      })
      .from(credit_usage_logs);

    const monthlyChatsRaw = await db
      .select({
        month: sql<string>`TO_CHAR(${user_chats.created_at}, 'Mon YYYY')`,
        count: sql<number>`COUNT(*)`,
      })
      .from(user_chats)
      .groupBy(sql`TO_CHAR(${user_chats.created_at}, 'Mon YYYY')`)
      .orderBy(sql`MIN(${user_chats.created_at})`);

    const topUsersRaw = await db
      .select({
        user_email: user.email,
        chat_count: sql<number>`COUNT(${user_chats.id})`,
      })
      .from(user_chats)
      .innerJoin(user, eq(user.id, user_chats.user_id))
      .groupBy(user.email)
      .orderBy(sql`COUNT(${user_chats.id}) DESC`)
      .limit(10);

    return NextResponse.json({
      summary,
      monthlyRevenue,
      activeSubscriptions,
      usageAnalytics: {
        totalChats: Number(totalChatsResult[0]?.count ?? 0),
        totalCreditsUsed: Number(totalCreditsUsedResult[0]?.value ?? 0),
        monthlyChats: monthlyChatsRaw.map((r) => ({
          month: r.month,
          count: Number(r.count),
        })),
        topUsers: topUsersRaw.map((r) => ({
          user_email: r.user_email,
          chat_count: Number(r.chat_count),
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch payments overview" },
      { status: 500 },
    );
  }
}
