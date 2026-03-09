import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";
import {
  user,
  user_chats,
  user_credits,
  subscriptions,
  credit_usage_logs,
} from "@/server/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type { ApiErrorResponse } from "@/types/api.types";
import { getDemoVisitsByType, getTotalDemoVisits } from "@/server/db/queries";

// ============================================================================
// Types
// ============================================================================

interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  roles: string[];
  createdAt: Date;
}

interface AdminActiveSubscription {
  id: string;
  plan_id: string;
  plan_name: string;
  credits_per_month: number;
  status: string;
  current_period_start: Date | null;
  current_period_end: Date | null;
}

interface AdminUserDetail {
  user: AdminUserListItem;
  credits: {
    subscription_credits: number;
    additional_credits: number;
  } | null;
  subscription: AdminActiveSubscription | null;
  chats: {
    id: string;
   v0_chat_id: string | null;
    title: string | null;
    prompt: string | null;
    demo_url: string | null;
    preview_url: string | null;
    created_at: Date;
  }[];
}

interface AdminDashboardStats {
  totalUsers: number;
  totalChats: number;
  activeSubscriptions: number;
  totalCreditsInCirculation: number;
  totalDemoVisits: number;
  featuredVisits: number;
  communityVisits: number;
}

// ============================================================================
// Helpers
// ============================================================================

async function requireAdminSession() {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401 } as ApiErrorResponse;
  }

  const adminUser = await db.query.user.findFirst({
    where: eq(user.email, session.user.email),
    columns: { id: true, roles: true },
  });

  if (!adminUser?.roles.includes("admin")) {
    return { error: "Forbidden", status: 403 } as ApiErrorResponse;
  }

  return null; // No error, user is admin
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * GET /api/admin/stats - Dashboard statistics
 */
export async function getAdminStatsHandler(): Promise<
  AdminDashboardStats | ApiErrorResponse
> {
  const authError = await requireAdminSession();
  if (authError) return authError;
const totalVisits = await getTotalDemoVisits()
const visitsByType = await getDemoVisitsByType()
  const [totalUsers, totalChats, activeSubscriptions, totalCreditsResult] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(user),
      db.select({ count: sql<number>`count(*)` }).from(user_chats),
      db
        .select({ count: sql<number>`count(*)` })
        .from(subscriptions)
        .where(eq(subscriptions.status, "active")),
      db
        .select({
          total: sql<number>`coalesce(sum(${user_credits.subscription_credits} + ${user_credits.additional_credits}), 0)`,
        })
        .from(user_credits),
    ]);

  return {
    totalUsers: totalUsers[0]?.count ?? 0,
    totalChats: totalChats[0]?.count ?? 0,
    activeSubscriptions: activeSubscriptions[0]?.count ?? 0,
    totalCreditsInCirculation: totalCreditsResult[0]?.total ?? 0,
    totalDemoVisits: totalVisits,
  featuredVisits: visitsByType.featured,
  communityVisits: visitsByType.community,
  };
}

/**
 * GET /api/admin/users - List all users (capped at 500 to prevent payload explosion)
 */
export async function getAdminUsersHandler(): Promise<
  AdminUserListItem[] | ApiErrorResponse
> {
  const authError = await requireAdminSession();
  if (authError) return authError;

  return db.query.user.findMany({
    columns: {
      id: true,
      name: true,
      email: true,
      roles: true,
      createdAt: true,
    },
    orderBy: (u, { desc }) => [desc(u.createdAt)],
    limit: 500,
  });
}

/**
 * GET /api/admin/users/:id - Get user details
 */
export async function getAdminUserDetailHandler({
  params,
}: {
  params: { id: string };
}): Promise<AdminUserDetail | ApiErrorResponse> {
  const authError = await requireAdminSession();
  if (authError) return authError;

  const userData = await db.query.user.findFirst({
    where: eq(user.id, params.id),
    columns: {
      id: true,
      name: true,
      email: true,
      roles: true,
      createdAt: true,
    },
  });

  if (!userData) {
    return { error: "User not found", status: 404 };
  }

  const [chats, credits, activeSubscription] = await Promise.all([
    db.query.user_chats.findMany({
      where: eq(user_chats.user_id, params.id),
      orderBy: (c, { desc }) => [desc(c.created_at)],
      columns: {
        id: true,
        v0_chat_id: true,
        title: true,
        prompt: true,
        demo_url: true,
        preview_url: true,
        created_at: true,
      },
    }),
    db.query.user_credits.findFirst({
      where: eq(user_credits.user_id, params.id),
      columns: {
        subscription_credits: true,
        additional_credits: true,
      },
    }),
    db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.user_id, params.id),
        eq(subscriptions.status, "active"),
      ),
      columns: {
        id: true,
        plan_id: true,
        plan_name: true,
        credits_per_month: true,
        status: true,
        current_period_start: true,
        current_period_end: true,
      },
    }),
  ]);

  return {
    user: userData,
    chats,
    credits: credits ?? null,
    subscription: activeSubscription ?? null,
  };
}

/**
 * POST /api/admin/subscription - Assign subscription to user
 */
export async function assignSubscriptionHandler({
  body,
}: {
  body: {
    userId: string;
    plan_id: string;
    plan_name: string;
    plan_price?: number;
    credits_per_month: number;
    startDate: string;
    endDate: string;
  };
}): Promise<{ success: true } | ApiErrorResponse> {
  const authError = await requireAdminSession();
  if (authError) return authError;

  const {
    userId,
    plan_id,
    plan_name,
    plan_price,
    credits_per_month,
    startDate,
    endDate,
  } = body;

  if (!userId || !plan_id || !plan_name || credits_per_month === undefined) {
    return {
      error:
        "Missing required fields: userId, plan_id, plan_name, credits_per_month",
      status: 400,
    };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return { error: "Invalid date range: endDate must be after startDate", status: 400 };
  }

  if (credits_per_month < 0 || credits_per_month > 100000) {
    return { error: "Credits must be between 0 and 100,000", status: 400 };
  }

  await db.transaction(async (tx) => {
    // Cancel any existing active subscription
    await tx
      .update(subscriptions)
      .set({
        status: "cancelled",
        cancelled_at: new Date(),
        updated_at: new Date(),
      })
      .where(
        and(
          eq(subscriptions.user_id, userId),
          eq(subscriptions.status, "active"),
        ),
      );

    // Create new subscription
    await tx.insert(subscriptions).values({
      id: crypto.randomUUID(),
      user_id: userId,
      plan_id,
      plan_name,
      plan_price: plan_price ?? 0,
      credits_per_month,
      status: "active",
      current_period_start: start,
      current_period_end: end,
    });

    // Add credits to user account
    if (credits_per_month > 0) {
      const existingCredits = await tx.query.user_credits.findFirst({
        where: eq(user_credits.user_id, userId),
      });

      if (existingCredits) {
        await tx
          .update(user_credits)
          .set({
            subscription_credits:
              existingCredits.subscription_credits + credits_per_month,
            updated_at: new Date(),
          })
          .where(eq(user_credits.user_id, userId));
      } else {
        await tx.insert(user_credits).values({
          id: crypto.randomUUID(),
          user_id: userId,
          subscription_credits: credits_per_month,
          additional_credits: 0,
        });
      }
    }
  });

  return { success: true };
}

/**
 * DELETE /api/admin/subscription - Cancel user subscription
 */
export async function cancelUserSubscriptionHandler({
  body,
}: {
  body: { userId: string };
}): Promise<{ success: true } | ApiErrorResponse> {
  const authError = await requireAdminSession();
  if (authError) return authError;

  const { userId } = body;

  if (!userId) {
    return { error: "userId is required", status: 400 };
  }

  await db.transaction(async (tx) => {
    // Cancel active subscriptions
    await tx
      .update(subscriptions)
      .set({
        status: "cancelled",
        cancelled_at: new Date(),
        updated_at: new Date(),
      })
      .where(
        and(
          eq(subscriptions.user_id, userId),
          eq(subscriptions.status, "active"),
        ),
      );

    const creditsRecord = await tx.query.user_credits.findFirst({
      where: eq(user_credits.user_id, userId),
    });

    if (!creditsRecord) return;

    const previousSubCredits = creditsRecord.subscription_credits;

    // Remove subscription credits
    await tx
      .update(user_credits)
      .set({
        subscription_credits: 0,
        updated_at: new Date(),
      })
      .where(eq(user_credits.user_id, userId));

    // Log deduction
    if (previousSubCredits > 0) {
      await tx.insert(credit_usage_logs).values({
        id: crypto.randomUUID(),
        user_id: userId,
        credits_used: previousSubCredits,
        action: "admin_subscription_cancel",
        subscription_credits_remaining: 0,
        additional_credits_remaining: creditsRecord.additional_credits,
      });
    }
  });

  return { success: true };
}

/**
 * POST /api/admin/credits - Add credits to user
 */
export async function addCreditsHandler({
  body,
}: {
  body: {
    userId: string;
    subscriptionCredits?: number;
    additionalCredits?: number;
  };
}): Promise<{ success: true } | ApiErrorResponse> {
  const authError = await requireAdminSession();
  if (authError) return authError;

  const { userId, subscriptionCredits, additionalCredits } = body;

  if (!userId) {
    return { error: "userId is required", status: 400 };
  }

  const subCredits = subscriptionCredits ?? 0;
  const addCredits = additionalCredits ?? 0;

  if (subCredits < 0 || addCredits < 0) {
    return { error: "Credit amounts must be non-negative", status: 400 };
  }

  if (subCredits > 100000 || addCredits > 100000) {
    return { error: "Credit amounts cannot exceed 100,000", status: 400 };
  }

  const existing = await db.query.user_credits.findFirst({
    where: eq(user_credits.user_id, userId),
  });

  if (!existing) {
    await db.insert(user_credits).values({
      id: crypto.randomUUID(),
      user_id: userId,
      subscription_credits: subCredits,
      additional_credits: addCredits,
    });
  } else {
    await db
      .update(user_credits)
      .set({
        subscription_credits: existing.subscription_credits + subCredits,
        additional_credits: existing.additional_credits + addCredits,
        updated_at: new Date(),
      })
      .where(eq(user_credits.user_id, userId));
  }

  return { success: true };
}

/**
 * PATCH /api/admin/users/role - Toggle admin role for a user
 */
type UserRole = "user" | "admin" | "manager" | "team_member";

export async function toggleUserRoleHandler({
  body,
}: {
  body: { userId: string; role: string; action: "add" | "remove" };
}): Promise<{ success: true } | ApiErrorResponse> {
  const authError = await requireAdminSession();
  if (authError) return authError;

  const { userId, role, action } = body;

  if (!userId || !role || !action) {
    return { error: "userId, role, and action are required", status: 400 };
  }

  const validRoles: UserRole[] = ["admin", "manager"];
  if (!validRoles.includes(role as UserRole)) {
    return {
      error: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
      status: 400,
    };
  }

  const typedRole = role as UserRole;

  const targetUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { id: true, roles: true },
  });

  if (!targetUser) {
    return { error: "User not found", status: 404 };
  }

  let newRoles: UserRole[];

  if (action === "add") {
    if (targetUser.roles.includes(typedRole)) {
      return { error: `User already has the ${role} role`, status: 400 };
    }
    newRoles = [...targetUser.roles, typedRole];
  } else {
    if (!targetUser.roles.includes(typedRole)) {
      return { error: `User does not have the ${role} role`, status: 400 };
    }
    newRoles = targetUser.roles.filter((r) => r !== typedRole);
    // Ensure user always has at least the "user" role
    if (!newRoles.includes("user")) {
      newRoles = ["user", ...newRoles];
    }
  }

  await db
    .update(user)
    .set({ roles: newRoles })
    .where(eq(user.id, userId));

  return { success: true };
}

/**
 * PATCH /api/admin/credits - Deduct credits from user
 */
export async function deductCreditsHandler({
  body,
}: {
  body: {
    userId: string;
    deductSubscription?: number;
    deductAdditional?: number;
  };
}): Promise<{ success: true } | ApiErrorResponse> {
  const authError = await requireAdminSession();
  if (authError) return authError;

  const { userId, deductSubscription, deductAdditional } = body;

  if (!userId) {
    return { error: "userId is required", status: 400 };
  }

  const deductSub = deductSubscription ?? 0;
  const deductAdd = deductAdditional ?? 0;

  if (deductSub < 0 || deductAdd < 0) {
    return { error: "Deduction amounts must be non-negative", status: 400 };
  }

  const existing = await db.query.user_credits.findFirst({
    where: eq(user_credits.user_id, userId),
  });

  if (!existing) {
    return { error: "No credit record found for this user", status: 404 };
  }

  if (
    deductSub > existing.subscription_credits ||
    deductAdd > existing.additional_credits
  ) {
    return { error: "Insufficient credits for deduction", status: 400 };
  }

  await db
    .update(user_credits)
    .set({
      subscription_credits: existing.subscription_credits - deductSub,
      additional_credits: existing.additional_credits - deductAdd,
      updated_at: new Date(),
    })
    .where(eq(user_credits.user_id, userId));

  return { success: true };
}
