"use client"

import { useState } from "react"
import {
    BadgeCheck,
    Bell,
    ChevronsUpDown,
    Coins,
    CreditCard,
    LogOut,
    Sparkles,
    User,
} from "lucide-react"

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"
import { authClient } from "@/server/better-auth/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useUserCredits } from "@/hooks/use-user-credits"
import { SubscriptionModal } from "@/components/payments/subscription-modal"
import { NotificationsDialog } from "@/components/notifications-dialog"
import { type SettingsTab } from "@/components/settings-dialog"

interface NavUserProps {
    onSettingsClick?: (tab: SettingsTab) => void
}

export function NavUser({ onSettingsClick }: NavUserProps) {
    const { isMobile } = useSidebar()
    const { data: session } = authClient.useSession()
    const router = useRouter()
    const { credits, subscription, hasActiveSubscription, isLoading } = useUserCredits()
    const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false)
    const [notificationsOpen, setNotificationsOpen] = useState(false)

    const handleLogout = async () => {
        try {
            await authClient.signOut()
            toast.success("Signed out successfully")
            router.push("/login")
        } catch (error) {
            toast.error("Failed to sign out")
            console.error(error)
        }
    }

    if (!session?.user) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        size="lg"
                        className="hk-nav-item w-full"
                        onClick={() => router.push("/login")}
                    >
                        <Avatar className="h-8 w-8 rounded-lg">
                            <AvatarFallback className="rounded-lg">
                                <User className="size-4" />
                            </AvatarFallback>
                        </Avatar>
                        <div className="ml-2 flex-1 text-left text-sm leading-tight">
                            <span className="font-medium">Log in</span>
                        </div>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        )
    }

    const user = {
        name: session.user.name ?? session.user.email?.split("@")[0] ?? "User",
        email: session.user.email ?? "",
        avatar: session.user.image ?? "",
    }

    const initials = user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U"

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="hk-nav-item data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <div className="hk-neon-avatar relative rounded-lg">
                                <Avatar className="h-8 w-8 rounded-lg">
                                    <AvatarImage src={user.avatar} alt={user.name} />
                                    <AvatarFallback className="rounded-lg bg-primary/10 font-mono text-xs">{initials}</AvatarFallback>
                                </Avatar>
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{user.name}</span>
                                <span className="truncate font-mono text-[10px] text-muted-foreground">{user.email}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="hk-neon-dropdown w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <div className="hk-neon-avatar relative rounded-lg">
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarImage src={user.avatar} alt={user.name} />
                                        <AvatarFallback className="rounded-lg bg-primary/10 font-mono text-xs">{initials}</AvatarFallback>
                                    </Avatar>
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">{user.name}</span>
                                    <span className="truncate font-mono text-[10px] text-muted-foreground">{user.email}</span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="hk-neon-separator" />
                        <DropdownMenuGroup>
                            <DropdownMenuItem className="hk-neon-dropdown-item" onClick={() => setSubscriptionModalOpen(true)}>
                                {hasActiveSubscription ? (
                                    <>
                                        <Coins className="hk-neon-icon" />
                                        <span className="flex-1">Credits</span>
                                        <span className="ml-auto font-mono text-xs text-muted-foreground">
                                            {isLoading ? "..." : credits?.totalCredits ?? 0}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="hk-neon-icon" />
                                        Buy Pro
                                    </>
                                )}
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator className="hk-neon-separator" />
                        <DropdownMenuGroup>
                            <DropdownMenuItem className="hk-neon-dropdown-item" onClick={() => onSettingsClick?.("general")}>
                                <BadgeCheck className="hk-neon-icon" />
                                Account
                            </DropdownMenuItem>
                            <DropdownMenuItem className="hk-neon-dropdown-item" onClick={() => setSubscriptionModalOpen(true)}>
                                <CreditCard className="hk-neon-icon" />
                                Billing
                            </DropdownMenuItem>
                            <DropdownMenuItem className="hk-neon-dropdown-item" onClick={() => setNotificationsOpen(true)}>
                                <Bell className="hk-neon-icon" />
                                Notifications
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator className="hk-neon-separator" />
                        <DropdownMenuItem className="hk-neon-dropdown-item" onClick={handleLogout}>
                            <LogOut className="hk-neon-icon" />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
            <SubscriptionModal
                open={subscriptionModalOpen}
                onOpenChange={setSubscriptionModalOpen}
                hasActiveSubscription={hasActiveSubscription}
                currentCredits={credits?.totalCredits ?? 0}
                currentPlanId={subscription?.plan_id ?? null}
            />
            <NotificationsDialog
                open={notificationsOpen}
                onOpenChange={setNotificationsOpen}
            />
        </SidebarMenu>
    )
}
