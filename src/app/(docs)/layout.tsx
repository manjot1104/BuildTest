"use client"

import { usePathname } from "next/navigation"
import { DocsSidebar } from "@/components/layout/docs-sidebar"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"

const pageNames: Record<string, string> = {
    "/docs": "Introduction",
    "/docs/get-started": "Get Started",
    "/docs/tutorials": "Tutorials",
    "/docs/changelog": "Changelog",
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const title = pageNames[pathname] ?? "Docs"

    return (
        <SidebarProvider>
            <DocsSidebar />
            <SidebarInset>
                <header className="flex h-12 shrink-0 items-center gap-3 px-4 border-b border-border/40">
                    <SidebarTrigger className="-ml-1 size-7 text-muted-foreground hover:text-foreground" />
                    <span className="text-sm font-medium text-foreground/80">{title}</span>
                </header>
                <div className="flex-1 overflow-y-auto">
                    <div className="px-6 py-10 lg:px-10">
                        {children}
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
