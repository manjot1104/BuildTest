"use client"
import { useRouter, usePathname } from "next/navigation"
import * as React from "react"
import {
    BookOpen,
    MessageSquare,
    Settings2,
    BrainCircuit,
    Bug,
    FileText,
    LayoutTemplate,
    History,
    Star,
    ShieldCheck,
    FolderOpen,
    Film,
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
    onFoldersClick: () => void
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
    onFoldersClick: () => void,
    onSettingsClick: (tab: SettingsTab) => void,
    onNewChat: () => void,
): NavSection[] => [
    {
        label: "Create",
        items: [
            {
                title: "New Chat",
                onClick: onNewChat,
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
            {
                title: "Accessibility Tester",
                url: "/dashboard/accessibility-tester",
                icon: ShieldCheck,
            },
            {
                title: "Video Generator",
                url: "/video-gen",
                icon: Film,
            },
            {
                title: "Testing",
                url: "/testing",
                icon: Bug,
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
                title: "Folders",
                icon: FolderOpen,
                onClick: onFoldersClick,
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

export function AppSidebar({ onStarredClick, onFoldersClick, onSettingsClick, ...props }: AppSidebarProps) {
    const router = useRouter()
    const pathname = usePathname()

    const handleNewChat = React.useCallback(() => {
        if (pathname === '/chat') {
            router.push('/chat?reset=true&t=' + Date.now())
        } else {
            router.push('/chat')
        }
    }, [router, pathname])

    const navSections = React.useMemo(
        () => buildNavSections(onStarredClick, onFoldersClick, onSettingsClick, handleNewChat),
        [onStarredClick, onFoldersClick, onSettingsClick, handleNewChat],
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