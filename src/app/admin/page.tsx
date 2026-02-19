import { db } from "@/server/db";
import { user, user_chats } from "@/server/db/schema";
import { sql } from "drizzle-orm";

export default async function AdminDashboard() {
  const totalUsers = await db
    .select({ count: sql<number>`count(*)` })
    .from(user);

  const totalChats = await db
    .select({ count: sql<number>`count(*)` })
    .from(user_chats);

  return (
    <div>
      <h2 className="text-3xl font-bold mb-8">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-zinc-400 text-sm">Total Users</h3>
          <p className="text-3xl font-semibold mt-2">
            {totalUsers[0]?.count ?? 0}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-zinc-400 text-sm">Total Chats</h3>
          <p className="text-3xl font-semibold mt-2">
            {totalChats[0]?.count ?? 0}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-zinc-400 text-sm">System Status</h3>
          <p className="text-3xl font-semibold mt-2 text-green-400">
            Healthy
          </p>
        </div>

      </div>
    </div>
  );
}
