import { NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  payment_transactions,
  subscriptions,
  credit_usage_logs,
} from "@/server/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET() {
  try {
    // ==============================
    // REVENUE METRICS
    // ==============================

    const totalRevenueResult = await db
      .select({
        value: sql<number>`COALESCE(SUM(${payment_transactions.amount}), 0)`,
      })
      .from(payment_transactions)
      .where(eq(payment_transactions.status, "completed"));

    const subscriptionRevenueResult = await db
      .select({
        value: sql<number>`COALESCE(SUM(${payment_transactions.amount}), 0)`,
      })
      .from(payment_transactions)
      .where(
        and(
          eq(payment_transactions.status, "completed"),
          eq(payment_transactions.type, "subscription"),
        ),
      );

    const creditRevenueResult = await db
      .select({
        value: sql<number>`COALESCE(SUM(${payment_transactions.amount}), 0)`,
      })
      .from(payment_transactions)
      .where(
        and(
          eq(payment_transactions.status, "completed"),
          eq(payment_transactions.type, "credit_pack"),
        ),
      );

    // ==============================
    // SUBSCRIPTION METRICS
    // ==============================

    const activeSubscriptionsResult = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"));

    const expiredSubscriptionsResult = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(subscriptions)
      .where(eq(subscriptions.status, "expired"));

    const mrrResult = await db
      .select({
        value: sql<number>`COALESCE(SUM(${subscriptions.plan_price}), 0)`,
      })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"));

    // ==============================
    // CREDIT METRICS
    // ==============================

    const totalCreditsSoldResult = await db
      .select({
        value: sql<number>`COALESCE(SUM(${payment_transactions.credits_added}), 0)`,
      })
      .from(payment_transactions)
      .where(eq(payment_transactions.status, "completed"));

    const totalCreditsUsedResult = await db
      .select({
        value: sql<number>`COALESCE(SUM(${credit_usage_logs.credits_used}), 0)`,
      })
      .from(credit_usage_logs);

    // SAFELY EXTRACT VALUES
    const totalRevenue = totalRevenueResult[0]?.value ?? 0;
    const subscriptionRevenue = subscriptionRevenueResult[0]?.value ?? 0;
    const creditRevenue = creditRevenueResult[0]?.value ?? 0;

    const activeSubscriptions = activeSubscriptionsResult[0]?.count ?? 0;
    const expiredSubscriptions = expiredSubscriptionsResult[0]?.count ?? 0;
    const mrr = mrrResult[0]?.value ?? 0;

    const totalCreditsSold = totalCreditsSoldResult[0]?.value ?? 0;
    const totalCreditsUsed = totalCreditsUsedResult[0]?.value ?? 0;

    return NextResponse.json({
      revenue: {
        total: totalRevenue,
        subscription: subscriptionRevenue,
        credits: creditRevenue,
      },
      subscriptions: {
        active: activeSubscriptions,
        expired: expiredSubscriptions,
        mrr,
      },
      credits: {
        sold: totalCreditsSold,
        used: totalCreditsUsed,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}