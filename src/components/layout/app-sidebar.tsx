"use client"

import * as React from "react"
import {
    BookOpen,
    MessageSquare,
    Settings2,
    BrainCircuit,
    FileText,
    LayoutTemplate,
    History,
    Star,
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

export type NavSection = {
    label: string
    items: NavItem[]
}

export type NavItem = {
    title: string
    url?: string
    icon?: React.ComponentType<{ className?: string }>
    onClick?: () => void
    items?: {
        title: string
        url?: string
        onClick?: () => void
    }[]
}

const buildNavSections = (
    onStarredClick: () => void,
    onSettingsClick: (tab: SettingsTab) => void,
): NavSection[] => [
    {
        label: "Create",
        items: [
            {
                title: "New Chat",
                url: "/chat",
                icon: MessageSquare,
            },
            {
                title: "AI Chat",
                url: "/ai-chat",
                icon: BrainCircuit,
            },
            {
                title: "Buildify Studio",
                url: "/buildify-studio",
                icon: LayoutTemplate,
            },
            {
                title: "AI Resume Builder",
                url: "/dashboard/ai-resume",
                icon: FileText,
            },
        ],
    },
    {
        label: "Library",
        items: [
            {
                title: "History",
                icon: History,
                onClick: undefined, // handled specially in nav-main
            },
            {
                title: "Starred",
                icon: Star,
                onClick: onStarredClick,
            },
        ],
    },
    {
        label: "Resources",
        items: [
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
    const navSections = React.useMemo(
        () => buildNavSections(onStarredClick, onSettingsClick),
        [onStarredClick, onSettingsClick],
    )

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <PlatformSwitcher platforms={platforms} />
            </SidebarHeader>

            <SidebarContent>
                <NavMain sections={navSections} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser onSettingsClick={onSettingsClick} />
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    )
}
