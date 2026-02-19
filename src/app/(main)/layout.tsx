import React from 'react'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { headers } from "next/headers";

import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import MainLayoutClient from './main-layout-client';


export default async function Layout({ children }: { children: React.ReactNode }) {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({
        headers: requestHeaders,
    });

    if (session?.user?.email) {
        const dbUser = await db.query.user.findFirst({
            where: eq(user.email, session.user.email),
            columns: {
                role: true,
            },
        });

        if (dbUser?.role === "admin") {
            redirect("/admin/users");
        }
    }
    
    // Non-admins or users whose role couldn't be fetched will proceed.
    // The MainLayoutClient will then handle redirecting unauthenticated users.
    return <MainLayoutClient>{children}</MainLayoutClient>
}