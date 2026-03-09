import React from 'react'
import { eq } from 'drizzle-orm'
import { headers } from "next/headers";

import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import MainLayoutClient from './main-layout-client';

export const dynamic = 'force-dynamic';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  let isAdmin = false;

  if (session?.user?.email) {
    const dbUser = await db.query.user.findFirst({
      where: eq(user.email, session.user.email),
      columns: {
        roles: true,
      },
    });

    const roles = dbUser?.roles;
    if (Array.isArray(roles)) {
      isAdmin = roles.some((r) => String(r) === "admin");
    }
  }

  return (
    <MainLayoutClient isAdmin={isAdmin}>
      {children}
    </MainLayoutClient>
  );
}
