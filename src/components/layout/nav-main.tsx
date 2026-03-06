"use client"

import { ChevronRight, Moon, Sun } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

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
import { type NavSection } from "@/components/layout/app-sidebar"
import { HackerText } from "@/components/layout/hacker-text"
import { cn } from "@/lib/utils"

export function NavMain({ sections }: { sections: NavSection[] }) {
    const { theme, setTheme } = useTheme()
    const { toggleHistoryModal } = useStateMachine()
    const pathname = usePathname()

    const handleToggle = () => {
        setTheme(theme === "dark" ? "light" : "dark")
    }

    return (
        <>
            {sections.map((section) => (
                <SidebarGroup key={section.label}>
                    <SidebarGroupLabel className="hk-group-label">
                        {section.label}
                    </SidebarGroupLabel>
                    <SidebarMenu>
                        {section.items.map((item) => {
                            // Top-level items without sub-items
                            if (!item.items) {
                                const isActive = item.url ? pathname === item.url || pathname.startsWith(item.url + "/") : false
                                const isClickAction = item.title === "History" || !!item.onClick

                                if (isClickAction) {
                                    const handleClick = () => {
                                        if (item.title === "History") {
                                            toggleHistoryModal()
                                        } else {
                                            item.onClick?.()
                                        }
                                    }
                                    return (
                                        <SidebarMenuItem key={item.title} className={cn("hk-nav-item")}>
                                            <SidebarMenuButton
                                                tooltip={item.title}
                                                onClick={handleClick}
                                            >
                                                {item.icon && <item.icon className="size-4" />}
                                                <HackerText text={item.title} />
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    )
                                }

                                return (
                                    <SidebarMenuItem key={item.title} className={cn("hk-nav-item", isActive && "hk-nav-active")}>
                                        <SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
                                            <Link href={item.url ?? "#"}>
                                                {item.icon && <item.icon className="size-4" />}
                                                <HackerText text={item.title} />
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            }

                            // Collapsible items with sub-items
                            const isParentActive = item.items.some(
                                (sub) => sub.url && (pathname === sub.url || pathname.startsWith(sub.url + "/"))
                            )

                            return (
                                <Collapsible
                                    key={item.title}
                                    asChild
                                    defaultOpen={isParentActive}
                                    className="group/collapsible"
                                >
                                    <SidebarMenuItem className={cn("hk-nav-item", isParentActive && "hk-nav-active")}>
                                        <CollapsibleTrigger asChild>
                                            <SidebarMenuButton tooltip={item.title} isActive={isParentActive}>
                                                {item.icon && <item.icon className="size-4" />}
                                                <HackerText text={item.title} />
                                                <ChevronRight className="ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                            </SidebarMenuButton>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <SidebarMenuSub>
                                                {item.items.map((subItem) => {
                                                    const hasClickHandler = !!subItem.onClick
                                                    const isSubActive = subItem.url ? pathname === subItem.url : false

                                                    return (
                                                        <SidebarMenuSubItem key={subItem.title} className="hk-nav-item">
                                                            <SidebarMenuSubButton
                                                                asChild={!hasClickHandler}
                                                                isActive={isSubActive}
                                                                onClick={hasClickHandler ? (e: React.MouseEvent) => {
                                                                    e.preventDefault()
                                                                    subItem.onClick?.()
                                                                } : undefined}
                                                            >
                                                                {hasClickHandler ? (
                                                                    <HackerText text={subItem.title} />
                                                                ) : (
                                                                    <Link href={subItem.url ?? "#"}>
                                                                        <HackerText text={subItem.title} />
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
                    </SidebarMenu>
                </SidebarGroup>
            ))}

            {/* Theme toggle at bottom */}
            <SidebarGroup className="mt-auto">
                <SidebarMenu>
                    <SidebarMenuItem className="hk-nav-item">
                        <SidebarMenuButton tooltip={theme === "dark" ? "Switch to light" : "Switch to dark"} onClick={handleToggle}>
                            {theme === "dark" ? (
                                <Moon className="size-4" />
                            ) : (
                                <Sun className="size-4" />
                            )}
                            <HackerText text={theme === "dark" ? "Dark Theme" : "Light Theme"} />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>
        </>
    )
}
