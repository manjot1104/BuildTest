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
    useSidebar,
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
    const { state } = useSidebar()
    const isCollapsed = state === "collapsed"

    const handleToggle = () => {
        setTheme(theme === "dark" ? "light" : "dark")
    }

    return (
        <>
            {sections.map((section) => (
                <SidebarGroup key={section.label}>
                    {!isCollapsed && (
                        <SidebarGroupLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            {section.label}
                        </SidebarGroupLabel>
                    )}
                    <SidebarMenu>
                        {section.items.map((item) => {
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
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                tooltip={item.title}
                                                onClick={handleClick}
                                                className="rounded-md"
                                            >
                                                {item.icon && <item.icon className="size-4" />}
                                                <span>{item.title}</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    )
                                }

                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton 
                                            asChild 
                                            tooltip={item.title} 
                                            isActive={isActive} 
                                            className={cn(
                                                "rounded-none transition-colors border-l-2",
                                                isActive 
                                                    ? "bg-accent/50 text-accent-foreground border-primary" 
                                                    : "border-transparent"
                                            )}
                                        >
                                            <Link href={item.url ?? "#"}>
                                                {item.icon && <item.icon className={cn("size-4", isActive ? "text-primary" : "")} />}
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            }

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
                                    <SidebarMenuItem>
                                        <CollapsibleTrigger asChild>
                                            <SidebarMenuButton 
                                                tooltip={item.title} 
                                                isActive={isParentActive} 
                                                className={cn(
                                                    "rounded-none transition-colors border-l-2",
                                                    isParentActive 
                                                        ? "bg-accent/50 text-accent-foreground border-primary" 
                                                        : "border-transparent"
                                                )}
                                            >
                                                {item.icon && <item.icon className={cn("size-4", isParentActive ? "text-primary" : "")} />}
                                                <span>{item.title}</span>
                                                <ChevronRight className="ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                            </SidebarMenuButton>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <SidebarMenuSub>
                                                {item.items.map((subItem) => {
                                                    const hasClickHandler = !!subItem.onClick
                                                    const isSubActive = subItem.url ? pathname === subItem.url : false

                                                    return (
                                                        <SidebarMenuSubItem key={subItem.title}>
                                                            <SidebarMenuSubButton
                                                                asChild={!hasClickHandler}
                                                                isActive={isSubActive}
                                                                className={cn(
                                                                    "rounded-none transition-colors border-l-2",
                                                                    isSubActive 
                                                                        ? "bg-accent/50 text-accent-foreground border-primary" 
                                                                        : "border-transparent"
                                                                )}
                                                                onClick={hasClickHandler ? (e: React.MouseEvent) => {
                                                                    e.preventDefault()
                                                                    subItem.onClick?.()
                                                                } : undefined}
                                                            >
                                                                {hasClickHandler ? (
                                                                    <span className={cn(isSubActive ? "text-primary" : "")}>{subItem.title}</span>
                                                                ) : (
                                                                    <Link href={subItem.url ?? "#"}>
                                                                        <span className={cn(isSubActive ? "text-primary" : "")}>{subItem.title}</span>
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
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip={theme === "dark" ? "Switch to light" : "Switch to dark"}
                            onClick={handleToggle}
                            className="rounded-none"
                        >
                            {theme === "dark" ? (
                                <Moon className="size-4" />
                            ) : (
                                <Sun className="size-4" />
                            )}
                            <span>{theme === "dark" ? "Dark Theme" : "Light Theme"}</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>
        </>
    )
}
