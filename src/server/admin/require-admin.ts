"use server";

import { NextResponse } from "next/server";
import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * Checks that the current request is from an authenticated admin user.
 * Returns null if the user is an admin, or a NextResponse error if not.
 * Use at the top of every admin Next.js route handler:
 *
 * ```ts
 * const authError = await requireAdmin();
 * if (authError) return authError;
 * ```
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminUser = await db.query.user.findFirst({
    where: eq(user.email, session.user.email),
    columns: { id: true, roles: true },
  });

  if (!adminUser?.roles.includes("admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
