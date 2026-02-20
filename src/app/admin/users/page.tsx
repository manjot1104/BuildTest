"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data) => setUsers(data));
  }, []);

 return (
  <div className="space-y-8">
    <h1 className="text-3xl font-semibold tracking-tight">
All Users</h1>

  <div className="rounded-xl border border-border/60 bg-card shadow-md">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead className="text-muted-foreground">
  Email
</TableHead>
        <TableHead className="text-muted-foreground">Roles</TableHead>
        <TableHead className="text-muted-foreground">User ID</TableHead>
        <TableHead className="text-muted-foreground">Action</TableHead>
      </TableRow>
    </TableHeader>

    <TableBody>
      {users.map((u) => (
        <TableRow
  key={u.id}
  className="hover:bg-muted/40 transition-colors"
>
          <TableCell className="truncate">
            {u.email}
          </TableCell>

          <TableCell>
            <div className="flex gap-2 flex-wrap">
              {u.roles?.map((role: string) => (
                <Badge
                  key={role}
                  variant={role === "admin" ? "default" : "secondary"}
                  className="capitalize"
                >
                  {role}
                </Badge>
              ))}
            </div>
          </TableCell>

          <TableCell className="text-muted-foreground truncate">
            {u.id}
          </TableCell>

          <TableCell>
            <Button variant="link" asChild>
              <Link href={`/admin/users/${u.id}`}>
                View
              </Link>
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
      </div>
);
}
