"use client"

import * as React from "react"
import { ChevronsUpDown, ExternalLink } from "lucide-react"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"

export function PlatformSwitcher({
    platforms,
}: {
    platforms: {
        name: string
        logo: React.ComponentType<{ size?: "sm" | "md" | "lg" }>
        url: string
        isActive?: boolean
    }[]
}) {
    const { isMobile } = useSidebar()

    const activePlatform = platforms.find((platform) => platform.isActive) ?? platforms[0]

    if (!activePlatform) {
        return null
    }

    const isExternal = (url: string) => url.startsWith("http")

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="hk-nav-item data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <div className="hk-neon-logo-box flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10">
                                <activePlatform.logo size="sm" />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">{activePlatform.name}</span>
                                <span className="truncate font-mono text-[10px] text-muted-foreground">App Builder</span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="hk-neon-dropdown w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        align="start"
                        side={isMobile ? "bottom" : "right"}
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="hk-group-label text-muted-foreground text-xs">
                            Platforms
                        </DropdownMenuLabel>
                        {platforms.map((platform) => (
                            <DropdownMenuItem
                                key={platform.name}
                                onClick={() => window.location.href = platform.url}
                                className="hk-neon-dropdown-item gap-2 p-2"
                            >
                                <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                                    <platform.logo size="sm" />
                                </div>
                                <span className="flex-1">{platform.name}</span>
                                {isExternal(platform.url) && (
                                    <ExternalLink className="size-3 text-muted-foreground" />
                                )}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
