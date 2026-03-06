'use client'
import Link from "next/link";
import { Shield } from "lucide-react";
import { StarredChatsDialog } from '@/components/chat/starred-chats-dialog'
import { SettingsDialog, type SettingsTab } from '@/components/settings-dialog'
import { AppSidebar } from "@/components/layout/app-sidebar"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { CreditsDisplay } from "@/components/payments/credits-display"

import { usePathname } from "next/navigation";
import { Fragment, useCallback, useRef, useState } from "react";

const SEGMENT_LABELS: Record<string, string> = {
    "ai-chat": "AI Chat",
    "chat": "New Chat",
    "buildify-studio": "Buildify Studio",
    "ai-resume": "AI Resume Builder",
    "docs": "Documentation",
};

export default function DashboardLayout({
  children,
  isAdmin,
}: {
  children: React.ReactNode
  isAdmin: boolean
}) {
    const pathname = usePathname();
    const isOnAdminPage = pathname.startsWith("/admin");

    const segments = pathname
        .split('/')
        .filter(Boolean);

    const buildHref = (idx: number) => {
        return '/' + segments.slice(0, idx + 1).join('/');
    };

    const [starredOpen, setStarredOpen] = useState(false)
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [settingsTab, setSettingsTab] = useState<SettingsTab>("general")
    const beamRef = useRef<HTMLDivElement>(null)
    const headerRef = useRef<HTMLElement>(null)

    const handleHeaderMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
        if (!beamRef.current || !headerRef.current) return
        const rect = headerRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        beamRef.current.style.left = `${x}px`
        beamRef.current.style.opacity = '1'
    }, [])

    const handleHeaderMouseLeave = useCallback(() => {
        if (!beamRef.current) return
        beamRef.current.style.opacity = '0'
    }, [])

    const handleSettingsClick = useCallback((tab: SettingsTab) => {
        setSettingsTab(tab)
        setSettingsOpen(true)
    }, [])

    return (
        <Fragment>
            <SidebarProvider>
                <AppSidebar
                    onStarredClick={() => setStarredOpen(true)}
                    onSettingsClick={handleSettingsClick}
                    className="hk-sidebar-border"
                />
                <SidebarInset>
                    <header
                        ref={headerRef}
                        onMouseMove={handleHeaderMouseMove}
                        onMouseLeave={handleHeaderMouseLeave}
                        className="hk-header-line sticky top-0 z-30 flex h-14 shrink-0 items-center bg-background/80 backdrop-blur-sm transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
                    >
                        <div className="flex w-full items-center justify-between gap-2 px-4">
                            <div className="flex items-center gap-2">
                                <SidebarTrigger className="-ml-1 hk-nav-item" />
                                <Separator
                                    orientation="vertical"
                                    className="mr-2 data-[orientation=vertical]:h-4 opacity-30"
                                />
                                <Breadcrumb>
                                    <BreadcrumbList>
                                        {segments.map((segment, idx) => {
                                            const isLast = idx === segments.length - 1;
                                            const title =
                                                SEGMENT_LABELS[segment] ??
                                                (segment.charAt(0).toUpperCase() +
                                                segment.slice(1).replace(/-/g, " "));
                                            return (
                                                <Fragment key={buildHref(idx)}>
                                                    {idx !== 0 && <BreadcrumbSeparator />}
                                                    <BreadcrumbItem>
                                                        {isLast ? (
                                                            <BreadcrumbPage className="hk-breadcrumb-active font-mono text-xs">
                                                                {title}
                                                            </BreadcrumbPage>
                                                        ) : (
                                                            <BreadcrumbLink href={buildHref(idx)} className="font-mono text-xs text-muted-foreground transition-colors hover:text-primary">
                                                                {title}
                                                            </BreadcrumbLink>
                                                        )}
                                                    </BreadcrumbItem>
                                                </Fragment>
                                            );
                                        })}
                                    </BreadcrumbList>
                                </Breadcrumb>
                            </div>
                            <div className="flex items-center gap-2">
                                {isAdmin && !isOnAdminPage && (
                                    <Link
                                        href="/admin"
                                        className="hk-neon-badge flex items-center gap-1.5 rounded-none border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-mono font-medium text-primary transition-all hover:bg-primary hover:text-primary-foreground"
                                    >
                                        <Shield className="size-3" />
                                        Admin
                                    </Link>
                                )}
                                <div className="hk-neon-badge rounded-full">
                                    <CreditsDisplay variant="badge" />
                                </div>
                            </div>
                        </div>
                        <div ref={beamRef} className="hk-header-beam" style={{ opacity: 0 }} />
                    </header>
                    <div className="flex flex-1 flex-col gap-4 p-4 pt-4">
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
