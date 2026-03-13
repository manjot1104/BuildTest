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
                        className="w-full"
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
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Avatar className="h-8 w-8 rounded-lg">
                                <AvatarImage src={user.avatar} alt={user.name} />
                                <AvatarFallback className="rounded-lg bg-muted text-xs">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{user.name}</span>
                                <span className="truncate text-[10px] text-muted-foreground">{user.email}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg shadow-md"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <Avatar className="h-8 w-8 rounded-lg">
                                    <AvatarImage src={user.avatar} alt={user.name} />
                                    <AvatarFallback className="rounded-lg bg-muted text-xs">{initials}</AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">{user.name}</span>
                                    <span className="truncate text-[10px] text-muted-foreground">{user.email}</span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => setSubscriptionModalOpen(true)}>
                                {hasActiveSubscription ? (
                                    <>
                                        <Coins className="size-4" />
                                        <span className="flex-1">Credits</span>
                                        <span className="ml-auto text-xs text-muted-foreground">
                                            {isLoading ? "..." : credits?.totalCredits ?? 0}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="size-4" />
                                        Buy Pro
                                    </>
                                )}
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => onSettingsClick?.("general")}>
                                <BadgeCheck className="size-4" />
                                Account
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSubscriptionModalOpen(true)}>
                                <CreditCard className="size-4" />
                                Billing
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setNotificationsOpen(true)}>
                                <Bell className="size-4" />
                                Notifications
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                            <LogOut className="size-4" />
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
