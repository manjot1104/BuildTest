import { NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  payment_transactions,
  user,
  subscriptions,
  user_credits,
  user_chats,
} from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    // ==========================
    // SUMMARY
    // ==========================

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
        sql`${payment_transactions.status} = 'completed' 
            AND ${payment_transactions.type} = 'subscription'`
      );

    const creditRevenueResult = await db
      .select({
        value: sql<number>`COALESCE(SUM(${payment_transactions.amount}), 0)`,
      })
      .from(payment_transactions)
      .where(
        sql`${payment_transactions.status} = 'completed' 
            AND ${payment_transactions.type} = 'credit_pack'`
      );

    const failedPaymentsResult = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(payment_transactions)
      .where(eq(payment_transactions.status, "failed"));

    // ==========================
    // ACTIVE SUBSCRIPTIONS
    // ==========================

    const activeSubscriptions = await db
      .select({
        subscription_id: subscriptions.id,
        plan_name: subscriptions.plan_name,
        credits_per_month: subscriptions.credits_per_month,
        current_period_end: subscriptions.current_period_end,
        status: subscriptions.status,
        user_email: user.email,
        subscription_credits: user_credits.subscription_credits,
        additional_credits: user_credits.additional_credits,
      })
      .from(subscriptions)
      .leftJoin(user, eq(user.id, subscriptions.user_id))
      .leftJoin(user_credits, eq(user_credits.user_id, subscriptions.user_id))
      .where(eq(subscriptions.status, "active"))
      .orderBy(sql`${subscriptions.created_at} DESC`);

    // ==========================
    // TRANSACTIONS
    // ==========================

    const transactions = await db
      .select({
        id: payment_transactions.id,
        type: payment_transactions.type,
        amount: payment_transactions.amount,
        currency: payment_transactions.currency,
        status: payment_transactions.status,
        razorpay_payment_id: payment_transactions.razorpay_payment_id,
        created_at: payment_transactions.created_at,
        user_email: user.email,
      })
      .from(payment_transactions)
      .leftJoin(user, eq(user.id, payment_transactions.user_id))
      .orderBy(sql`${payment_transactions.created_at} DESC`)
      .limit(50);

    // ==========================
    // MONTHLY REVENUE
    // ==========================

    const monthlyRevenue = await db
      .select({
        month: sql<string>`TO_CHAR(${payment_transactions.created_at}, 'Mon YYYY')`,
        total: sql<number>`SUM(${payment_transactions.amount})`,
      })
      .from(payment_transactions)
      .where(eq(payment_transactions.status, "completed"))
      .groupBy(sql`TO_CHAR(${payment_transactions.created_at}, 'Mon YYYY')`)
      .orderBy(sql`MIN(${payment_transactions.created_at})`);

    // ==========================
    // USAGE ANALYTICS
    // ==========================

    const totalChatsResult = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(user_chats);

    const totalCreditsUsedResult = await db
      .select({
        value: sql<number>`
          COALESCE(SUM(subscription_credits + additional_credits), 0)
        `,
      })
      .from(user_credits);

    const topUsers = await db
      .select({
        user_email: user.email,
        chat_count: sql<number>`COUNT(${user_chats.id})`,
      })
      .from(user_chats)
      .leftJoin(user, eq(user.id, user_chats.user_id))
      .groupBy(user.email)
      .orderBy(sql`COUNT(${user_chats.id}) DESC`)
      .limit(5);

    const monthlyChats = await db
      .select({
        month: sql<string>`TO_CHAR(${user_chats.created_at}, 'Mon YYYY')`,
        count: sql<number>`COUNT(*)`,
      })
      .from(user_chats)
      .groupBy(sql`TO_CHAR(${user_chats.created_at}, 'Mon YYYY')`)
      .orderBy(sql`MIN(${user_chats.created_at})`);

    // ==========================
    // FINAL RETURN
    // ==========================

    return NextResponse.json({
      summary: {
        totalRevenue: totalRevenueResult[0]?.value ?? 0,
        subscriptionRevenue: subscriptionRevenueResult[0]?.value ?? 0,
        creditRevenue: creditRevenueResult[0]?.value ?? 0,
        failedPayments: failedPaymentsResult[0]?.count ?? 0,
      },
      activeSubscriptions,
      transactions,
      monthlyRevenue,
      usageAnalytics: {
        totalChats: totalChatsResult[0]?.count ?? 0,
        totalCreditsUsed: totalCreditsUsedResult[0]?.value ?? 0,
        topUsers,
        monthlyChats,
      },
    });
  } catch (error) {
    console.error("Payments module error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments data" },
      { status: 500 }
    );
  }
}