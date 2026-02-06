"use client"

import * as React from "react"
import {
    AudioWaveform,
    BookOpen,
    Bot,
    GalleryVerticalEnd,
    MessageSquare,
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

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  onStarredClick: () => void
}

// ---------- data builder ----------
const buildSidebarData = ({
  userName,
  userEmail,
  userAvatar,
  onStarredClick,
}: {
  userName: string
  userEmail: string
  userAvatar: string
  onStarredClick: () => void
}) => ({
  user: {
    name: userName,
    email: userEmail,
    avatar: userAvatar,
  },
        platforms: [
            {
                name: "Buildify",
                logo: AudioWaveform,
                url: "#",
                isActive: true,
            },
            {
                name: "Buildify",
                logo: GalleryVerticalEnd,
                url: "https://buildify.sh",
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
                        // url: "#",
                        onClick: onStarredClick,
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
    })


export function AppSidebar({
  onStarredClick,
  ...props
}: AppSidebarProps) {
  const data = buildSidebarData({
    userName: "John Doe",
    userEmail: "john.doe@example.com",
    userAvatar: "/avatars/john-doe.jpg",
    onStarredClick,
  })

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <PlatformSwitcher platforms={data.platforms} />
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={data.navMain} onStarredClick={onStarredClick} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
