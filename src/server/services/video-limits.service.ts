// server/services/video-limits.service.ts
//
// Server-side plan limit definitions and helpers for video generation.
// ✏️  Keep VIDEO_PLAN_LIMITS in sync with VIDEO_PLAN_LIMITS in src/app/video-gen/page.tsx.

import { db } from "@/server/db";
import { subscriptions } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";

export interface VideoPlanLimits {
  dailyPrompts: number;
  allowFollowUp: boolean;
  maxImages: number;
  maxDurationSeconds: number;
  label: string;
  dailyServerRenders?: number; // Optional: only applies to server-side rendering
}

export const VIDEO_SERVER_PLAN_LIMITS: Record<string, VideoPlanLimits> = {
  free:       { dailyPrompts: 1,  allowFollowUp: false, maxImages: 1, maxDurationSeconds: 20, label: "Free",     dailyServerRenders: 1 },
  starter:    { dailyPrompts: 10, allowFollowUp: true,  maxImages: 5, maxDurationSeconds: 30, label: "Starter", dailyServerRenders: 3 },
  pro:        { dailyPrompts: 15, allowFollowUp: true,  maxImages: 5, maxDurationSeconds: 30, label: "Pro",     dailyServerRenders: 5 },
  enterprise: { dailyPrompts: 20, allowFollowUp: true,  maxImages: 5, maxDurationSeconds: 30, label: "Enterprise", dailyServerRenders: 8 },
};

export function getVideoServerPlanLimits(planId: string | null | undefined): VideoPlanLimits {
  if (!planId) return VIDEO_SERVER_PLAN_LIMITS.free!;
  return VIDEO_SERVER_PLAN_LIMITS[planId.toLowerCase()] ?? VIDEO_SERVER_PLAN_LIMITS.free!;
}

export async function getVideoPlanId(userId: string): Promise<string | null> {
  const [sub] = await db
    .select({ plan_id: subscriptions.plan_id })
    .from(subscriptions)
    .where(and(eq(subscriptions.user_id, userId), eq(subscriptions.status, "active")))
    .limit(1);

  return sub?.plan_id ?? null;
}