"use client"

import { ChevronRight, Moon, Sun, type LucideIcon } from "lucide-react"
import Link from "next/link"

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
import { useStateMachine } from "@/context/state-machine"

export function NavMain({
    items,
    onStarredClick: _onStarredClick,
}: {
    items: {
        title: string
        url?: string
        icon?: LucideIcon
        isActive?: boolean
        items?: {
            title: string
            url?: string
            onClick?: () => void
        }[]
    }[]
    onStarredClick: () => void
}) {
    void _onStarredClick
    const { theme, setTheme } = useTheme()
    const { toggleHistoryModal } = useStateMachine()

    const handleToggle = () => {
        setTheme(theme === "dark" ? "light" : "dark")
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
                                    <Link href={item.url ?? "#"}>
                                        {item.icon && <item.icon className="size-4" />}
                                        <span>{item.title}</span>
                                    </Link>
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
                                        {item.icon && <item.icon className="size-4" />}
                                        <span>{item.title}</span>
                                        <ChevronRight className="ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        {item.items?.map((subItem) => {
                                            const hasClickHandler =
                                                subItem.title === 'History' ||
                                                subItem.title === 'Starred' ||
                                                subItem.onClick

                                            const handleClick = (e: React.MouseEvent) => {
                                                e.preventDefault()
                                                if (subItem.title === 'History') {
                                                    toggleHistoryModal()
                                                } else {
                                                    subItem.onClick?.()
                                                }
                                            }

                                            return (
                                                <SidebarMenuSubItem key={subItem.title}>
                                                    <SidebarMenuSubButton
                                                        asChild={!hasClickHandler}
                                                        onClick={hasClickHandler ? handleClick : undefined}
                                                    >
                                                        {hasClickHandler ? (
                                                            <span>{subItem.title}</span>
                                                        ) : (
                                                            <Link href={subItem.url ?? "#"}>
                                                                <span>{subItem.title}</span>
                                                            </Link>
                                                        )}
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            )
                                        })}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    )
                })}

                {/* Theme toggle */}
                <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                        <span onClick={handleToggle} aria-label="Toggle theme" className="w-full cursor-pointer">
                            {theme === "dark" ? (
                                <Moon className="size-4" />
                            ) : (
                                <Sun className="size-4" />
                            )}
                            <span className="flex-1 text-left">
                                {theme === "dark" ? "Dark" : "Light"} theme
                            </span>
                        </span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroup>
    )
}
