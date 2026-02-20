'use client'
import { StarredChatsDialog } from '@/components/chat/starred-chats-dialog'
import { SettingsDialog, type SettingsTab } from '@/components/settings-dialog'
import { AppSidebar } from "@/components/layout/app-sidebar"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { CreditsDisplay } from "@/components/payments/credits-display"

import { usePathname } from "next/navigation";
import { Fragment, useCallback, useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const segments = pathname
        .split('/')
        .filter(Boolean);

    const [starredOpen, setStarredOpen] = useState(false)
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [settingsTab, setSettingsTab] = useState<SettingsTab>("general")

    const handleSettingsClick = useCallback((tab: SettingsTab) => {
        setSettingsTab(tab)
        setSettingsOpen(true)
    }, [])

    // Build page title from path segments
    const pageTitle = segments.length > 0
        ? segments[segments.length - 1]!.charAt(0).toUpperCase() +
          segments[segments.length - 1]!.slice(1).replace(/-/g, ' ')
        : 'Dashboard'

    return (
        <Fragment>
            <SidebarProvider>
                <AppSidebar
                    onStarredClick={() => setStarredOpen(true)}
                    onSettingsClick={handleSettingsClick}
                />
                <SidebarInset>
                    <header className="flex h-12 shrink-0 items-center justify-between gap-2 px-4 border-b border-border/40">
                        <div className="flex items-center gap-3">
                            <SidebarTrigger className="-ml-1 size-7 text-muted-foreground hover:text-foreground" />
                            <span className="text-sm font-medium text-foreground/80">{pageTitle}</span>
                        </div>
                        <CreditsDisplay variant="button" />
                    </header>
                    <div className="flex flex-1 flex-col">
                        {children}
                    </div>
                </SidebarInset>
            </SidebarProvider>
            <StarredChatsDialog
                open={starredOpen}
                onOpenChange={setStarredOpen}
            />
            <SettingsDialog
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                defaultTab={settingsTab}
            />
        </Fragment>
    )
}
