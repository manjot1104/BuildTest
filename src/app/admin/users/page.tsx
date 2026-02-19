"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data) => setUsers(data));
  }, []);

 return (
  <div className="p-8">
    <h1 className="text-3xl font-semibold tracking-tight mb-8">
All Users</h1>

    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="grid grid-cols-4 px-6 py-4 text-sm text-zinc-400 bg-zinc-800">
        <div>Email</div>
        <div>Role</div>
        <div>User ID</div>
        <div>Action</div>
      </div>

      {users.map((u) => (
        <div
          key={u.id}
          className="grid grid-cols-4 px-6 py-4 text-sm border-t border-zinc-800 hover:bg-zinc-800 transition"
        >
          <div className="truncate">{u.email}</div>

          <div className="capitalize">
            <span
              className={`px-2 py-1 rounded-md text-xs ${
                u.role === "admin"
                  ? "bg-purple-600/20 text-purple-400"
                  : "bg-blue-600/20 text-blue-400"
              }`}
            >
              {u.role}
            </span>
          </div>

          <div className="text-zinc-500 truncate">{u.id}</div>

          <div>
            <Link
              href={`/admin/users/${u.id}`}
              className="text-blue-400 hover:underline"
            >
              View
            </Link>
          </div>
        </div>
      ))}
    </div>
  </div>
);

}
