"use client"

import { ChevronRight, Moon, Sun, type LucideIcon } from "lucide-react"

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { useTheme } from "next-themes"

export function NavMain({
    items,
}: {
    items: {
        title: string
        url: string
        icon?: LucideIcon
        isActive?: boolean
        items?: {
            title: string
            url: string
        }[]
    }[]
}) {

    const { theme, setTheme } = useTheme()

    function handleToggle() {
        if (theme === "light") {
            setTheme("dark")
        } else if (theme === "dark") {
            setTheme("light")
        } else {
            setTheme("light")
        }
    }

    let icon, label
    if (theme === "dark") {
        icon = <Moon className="mr-2 h-4 w-4" />
        label = "Dark"
    } else if (theme === "light") {
        icon = <Sun className="mr-2 h-4 w-4" />
        label = "Light"
    } else {
        icon = (
            <span className="mr-2 flex items-center">
                <Sun className="h-4 w-4" />
                <Moon className="ml-[-0.4rem] h-3 w-3 opacity-70" />
            </span>
        )
        label = "System"
    }

    return (
        <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>

                {items.map((item) => {
                    if (!item.items) {
                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild>
                                    <a href={item.url}>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                    </a>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )
                    }
                    return (
                        <Collapsible
                            key={item.title}
                            asChild
                            defaultOpen={item.isActive}
                            className="group/collapsible"
                        >
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton tooltip={item.title}>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        {item.items?.map((subItem) => (
                                            <SidebarMenuSubItem key={subItem.title}>
                                                <SidebarMenuSubButton asChild>
                                                    <a href={subItem.url}>
                                                        <span>{subItem.title}</span>
                                                    </a>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    )
                })}
                <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                        <span
                            onClick={handleToggle}
                            aria-label="Toggle theme"
                            className="w-full"
                        >
                            {icon}
                            <span className="flex-1 text-left">{label} theme</span>
                        </span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroup>
    )
}
