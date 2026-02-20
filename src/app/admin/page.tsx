import { db } from "@/server/db";
import { user, user_chats } from "@/server/db/schema";
import { sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default async function AdminDashboard() {
  const totalUsers = await db
    .select({ count: sql<number>`count(*)` })
    .from(user);

  const totalChats = await db
    .select({ count: sql<number>`count(*)` })
    .from(user_chats);

  return (
   <div className="space-y-8">
      <h2 className="text-3xl font-semibold tracking-tight">
  Dashboard
</h2>

     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

 <Card className="shadow-md border-border/60">
  <CardHeader>
    <CardTitle className="text-sm text-muted-foreground">
      Total Users
    </CardTitle>
  </CardHeader>
  <CardContent className="pt-0">
    <p className="text-4xl font-semibold">
      {totalUsers[0]?.count ?? 0}
    </p>
  </CardContent>
</Card>

 <Card className="shadow-md border-border/60">

    <CardHeader>
      <CardTitle className="text-sm text-muted-foreground">
        Total Chats
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <p className="text-3xl font-semibold">
        {totalChats[0]?.count ?? 0}
      </p>
    </CardContent>
  </Card>

<Card className="shadow-md border-border/60">
    <CardHeader>
      <CardTitle className="text-sm text-muted-foreground">
        System Status
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-3xl  text-green-500 font-semibold">
        Healthy
      </p>
    </CardContent>
  </Card>

</div>
    </div>
  );
}
