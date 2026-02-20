import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const requestHeaders = await headers();

  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

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
  <div className="min-h-screen bg-black text-white flex">
    
    {/* Sidebar */}
   <aside className="w-64 border-r border-zinc-800 p-6 space-y-6">
  
  {/* Back to User Dashboard */}
  <a
    href="/chat"
    className="text-sm text-blue-400 hover:underline"
  >
    ← User Dashboard
  </a>

  <h1 className="text-xl font-semibold tracking-wide mt-4">
    Admin Panel
  </h1>

      <nav className="flex flex-col space-y-3 text-sm">
        <a
          href="/admin"
          className="hover:bg-zinc-800 px-3 py-2 rounded-md transition"
        >
          📊 Dashboard
        </a>

        <a
          href="/admin/users"
          className="hover:bg-zinc-800 px-3 py-2 rounded-md transition"
        >
          👥 Users
        </a>
      </nav>
    </aside>

    {/* Main Content */}
    <main className="flex-1 p-10 bg-gradient-to-b from-black via-zinc-900 to-black">
      {children}
    </main>
  </div>
);

}
