import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import { headers } from "next/headers";

export async function requireAdmin() {
  const requestHeaders = await headers();

  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!session?.user?.email) {
    throw new Error("UNAUTHORIZED");
  }

  const adminUser = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, session.user.email),
  });

  if (!adminUser || adminUser.role !== "admin") {
    throw new Error("FORBIDDEN");
  }

  return session.user;
}
