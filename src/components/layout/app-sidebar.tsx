"use client"

import * as React from "react"
import {
    AudioWaveform,
    BookOpen,
    Bot,
    Command,
    Frame,
    GalleryVerticalEnd,
    Map,
    MessageSquare,
    PieChart,
    Settings2,
    SquareTerminal,
} from "lucide-react"

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

const getData = ({ userName, userEmail, userAvatar }: { userName: string, userEmail: string, userAvatar: string }) => {
    return {
        user: {
            name: userName,
            email: userEmail,
            avatar: userAvatar,
        },
        platforms: [
            {
                name: "Technotribes.ai",
                logo: AudioWaveform,
                url: "#",
                isActive: true,
            },
            {
                name: "Technotribes",
                logo: GalleryVerticalEnd,
                url: "https://technotribes.com",
            },
        ],
        navMain: [
            {
                title: "New Chat",
                url: "/chat",
                icon: MessageSquare,
            },
            {
                title: "Playground",
                url: "#",
                icon: SquareTerminal,
                isActive: true,
                items: [
                    {
                        title: "History",
                        url: "#",
                    },
                    {
                        title: "Starred",
                        url: "#",
                    },
                    {
                        title: "Settings",
                        url: "#",
                    },
                ],
            },
            {
                title: "Models",
                url: "#",
                icon: Bot,
                items: [
                    {
                        title: "Genesis",
                        url: "#",
                    },
                    {
                        title: "Explorer",
                        url: "#",
                    },
                    {
                        title: "Quantum",
                        url: "#",
                    },
                ],
            },
            {
                title: "Documentation",
                url: "#",
                icon: BookOpen,
                items: [
                    {
                        title: "Introduction",
                        url: "#",
                    },
                    {
                        title: "Get Started",
                        url: "#",
                    },
                    {
                        title: "Tutorials",
                        url: "#",
                    },
                    {
                        title: "Changelog",
                        url: "#",
                    },
                ],
            },
            {
                title: "Settings",
                url: "#",
                icon: Settings2,
                items: [
                    {
                        title: "General",
                        url: "#",
                    },
                    {
                        title: "Team",
                        url: "#",
                    },
                    {
                        title: "Billing",
                        url: "#",
                    },
                    {
                        title: "Limits",
                        url: "#",
                    },
                ],
            },
        ],
    }
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

    const data = getData({
        userName: "John Doe",
        userEmail: "john.doe@example.com",
        userAvatar: "/avatars/john-doe.jpg",
    })

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <PlatformSwitcher platforms={data.platforms} />
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={data.navMain} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={data.user} />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
