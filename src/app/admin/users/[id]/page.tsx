"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function UserDetailPage() {
  const params = useParams();
const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [data, setData] = useState<any>(null);

  useEffect(() => {
  if (!id) return;

  fetch(`/api/admin/users/${id}`)
    .then((res) => res.json())
    .then((res) => setData(res));
}, [id]);


  if (!data) return <div>Loading...</div>;

  return (
  <div className="p-8 space-y-10">
    
    {/* Header */}
    <div>
      <h1 className="text-3xl font-semibold tracking-tight mb-6">
        User Details
      </h1>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-3">
        <p>
          <span className="text-zinc-400">Email:</span>{" "}
          {data.user.email}
        </p>

        <p>
          <span className="text-zinc-400">Role:</span>{" "}
          <span
            className={`px-2 py-1 rounded-md text-xs ${
              data.user.role === "admin"
                ? "bg-purple-600/20 text-purple-400"
                : "bg-blue-600/20 text-blue-400"
            }`}
          >
            {data.user.role}
          </span>
        </p>
      </div>
    </div>

    {/* Credits Section */}
    <div>
      <h2 className="text-xl font-semibold mb-4">Credits</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-400 text-sm">Subscription Credits</p>
          <p className="text-2xl font-semibold mt-2">
            {data.credits?.subscription_credits ?? 0}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-400 text-sm">Additional Credits</p>
          <p className="text-2xl font-semibold mt-2">
            {data.credits?.additional_credits ?? 0}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-400 text-sm">Total Credits</p>
          <p className="text-2xl font-semibold mt-2 text-green-400">
            {(data.credits?.subscription_credits ?? 0) +
              (data.credits?.additional_credits ?? 0)}
          </p>
        </div>
      </div>
    </div>

    {/* Chats Section */}
    <div>
      <h2 className="text-xl font-semibold mb-4">Chats</h2>

      {data.chats.length === 0 && (
        <p className="text-zinc-500">No chats found</p>
      )}

      <div className="space-y-4">
        {data.chats.map((chat: any) => (
          <div
            key={chat.id}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
          >
            <h3 className="font-semibold mb-2">
              {chat.title || "Untitled Chat"}
            </h3>

            <p className="text-zinc-400 text-sm">
              {chat.prompt}
            </p>
          </div>
        ))}
      </div>
    </div>

  </div>
);

}
