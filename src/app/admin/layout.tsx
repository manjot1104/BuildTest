import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { AdminSidebar } from "./admin-sidebar";

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();

  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session?.user?.email) {
    redirect("/login");
  }

  const dbUser = await db.query.user.findFirst({
    where: eq(user.email, session.user.email),
    columns: { roles: true },
  });

  const roles = dbUser?.roles;
  const isAdmin = Array.isArray(roles) && roles.some((r) => String(r) === "admin");

  if (!isAdmin) {
    redirect("/");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl p-6 lg:p-10">{children}</div>
      </main>
    </div>
  );
}
