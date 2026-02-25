import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";

import { AdminSidebar } from "./admin-sidebar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();

  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session?.user?.email) {
    redirect("/login");
  }

  const dbUser = await db.query.user.findFirst({
    where: eq(user.email, session.user.email),
  });

  if (!dbUser || !dbUser.roles.includes("admin")) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
