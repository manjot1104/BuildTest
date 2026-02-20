"use client"

import * as React from "react"
import {
    BookOpen,
    MessageSquare,
    Settings2,
    SquareTerminal,
} from "lucide-react"
import { type SettingsTab } from "@/components/settings-dialog"
import { BuildifyLogo } from "@/components/buildify-logo"

import { NavMain } from "@/components/layout/nav-main"
import { NavUser } from "@/components/layout/nav-user"
import { PlatformSwitcher } from "@/components/layout/team-switcher"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from "@/components/ui/sidebar"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
    onStarredClick: () => void
    onSettingsClick: (tab: SettingsTab) => void
}

const buildNavItems = (
    onStarredClick: () => void,
    onSettingsClick: (tab: SettingsTab) => void,
) => [
    {
        title: "New Chat",
        url: "/chat",
        icon: MessageSquare,
    },
    {
        title: "Chat",
        url: "#",
        icon: SquareTerminal,
        isActive: true,
        items: [
            { title: "History", url: "#" },
            { title: "Starred", onClick: onStarredClick },
        ],
    },
    {
        title: "Documentation",
        url: "/docs",
        icon: BookOpen,
        items: [
            { title: "Introduction", url: "/docs" },
            { title: "Get Started", url: "/docs/get-started" },
            { title: "Tutorials", url: "/docs/tutorials" },
            { title: "Changelog", url: "/docs/changelog" },
        ],
    },
    {
        title: "Settings",
        url: "#",
        icon: Settings2,
        items: [
            { title: "General", onClick: () => onSettingsClick("general") },
            { title: "Team", onClick: () => onSettingsClick("team") },
            { title: "Billing", onClick: () => onSettingsClick("billing") },
            { title: "Limits", onClick: () => onSettingsClick("limits") },
        ],
    },
]

const platforms = [
    {
        name: "Buildify",
        logo: BuildifyLogo,
        url: "/chat",
        isActive: true,
    },
    {
        name: "Buildify Web",
        logo: BuildifyLogo,
        url: "https://buildify.sh",
    },
]

export function AppSidebar({
    onStarredClick,
    onSettingsClick,
    ...props
}: AppSidebarProps) {
    const navItems = React.useMemo(
        () => buildNavItems(onStarredClick, onSettingsClick),
        [onStarredClick, onSettingsClick],
    )

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <PlatformSwitcher platforms={platforms} />
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={navItems} onStarredClick={onStarredClick} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser onSettingsClick={onSettingsClick} />
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    )
}
