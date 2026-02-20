"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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


if (!data) return <p className="text-muted-foreground">Loading...</p>;

  return (
  <div className="p-8 space-y-10">
    
    {/* Header */}

<div>
  <h1 className="text-3xl font-semibold tracking-tight mb-6">
    User Details
  </h1>

  <Card>
    <CardContent className="space-y-4 pt-6">

      <div>
        <p className="text-sm text-muted-foreground">Email</p>
        <p className="font-medium">{data.user.email}</p>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">Roles</p>
        <div className="flex gap-2 flex-wrap mt-2">
          {data.user.roles.map((role: string) => (
            <Badge
              key={role}
              variant={role === "admin" ? "default" : "secondary"}
              className="capitalize"
            >
              {role}
            </Badge>
          ))}
        </div>
      </div>

    </CardContent>
  </Card>
</div>
   {/* Credits Section */}
<div>
  <h2 className="text-xl font-semibold mb-4">Credits</h2>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">
          Subscription Credits
        </p>
        <p className="text-2xl font-semibold mt-2">
          {data.credits?.subscription_credits ?? 0}
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">
          Additional Credits
        </p>
        <p className="text-2xl font-semibold mt-2">
          {data.credits?.additional_credits ?? 0}
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">
          Total Credits
        </p>
        <p className="text-2xl font-semibold mt-2 text-primary">
          {(data.credits?.subscription_credits ?? 0) +
            (data.credits?.additional_credits ?? 0)}
        </p>
      </CardContent>
    </Card>

  </div>
</div>
   {/* Chats Section */}
<div>
  <h2 className="text-xl font-semibold mb-4">Chats</h2>

  {data.chats.length === 0 && (
    <p className="text-muted-foreground">
      No chats found
    </p>
  )}

  <div className="space-y-4">
    {data.chats.map((chat: any) => (
      <Card key={chat.id}>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">
            {chat.title || "Untitled Chat"}
          </h3>

          <p className="text-sm text-muted-foreground">
            {chat.prompt}
          </p>
        </CardContent>
      </Card>
    ))}
  </div>
</div>

  </div>
);

}
