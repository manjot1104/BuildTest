"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { authClient } from "@/server/better-auth/client"
import { useUserCredits } from "@/hooks/use-user-credits"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import {
    Sun,
    Moon,
    Monitor,
    Loader2,
    Users,
} from "lucide-react"
import { CREDIT_COSTS } from "@/config/credits.config"

export type SettingsTab = "general" | "team" | "billing" | "limits"

interface SettingsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    defaultTab?: SettingsTab
}

export function SettingsDialog({
    open,
    onOpenChange,
    defaultTab = "general",
}: SettingsDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="hk-neon-dialog sm:max-w-[560px] p-0 gap-0 overflow-hidden rounded-none" showCloseButton={false}>
                <div className="hk-neon-dialog-header px-6 pt-6 pb-4">
                    <DialogHeader>
                        <DialogTitle className="hk-neon-dialog-title text-lg font-semibold tracking-tight">Settings</DialogTitle>
                        <DialogDescription className="font-mono text-[11px] text-muted-foreground">
                            // manage your account and preferences
                        </DialogDescription>
                    </DialogHeader>
                </div>
                <Tabs defaultValue={defaultTab} key={defaultTab} className="w-full">
                    <div className="px-6">
                        <TabsList className="h-9 w-full justify-start bg-transparent p-0 gap-4">
                            <TabsTrigger value="general" className="hk-neon-tab h-9 rounded-none border-b-2 border-transparent px-0 pb-2.5 pt-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none">General</TabsTrigger>
                            <TabsTrigger value="team" className="hk-neon-tab h-9 rounded-none border-b-2 border-transparent px-0 pb-2.5 pt-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none">Team</TabsTrigger>
                            <TabsTrigger value="billing" className="hk-neon-tab h-9 rounded-none border-b-2 border-transparent px-0 pb-2.5 pt-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none">Billing</TabsTrigger>
                            <TabsTrigger value="limits" className="hk-neon-tab h-9 rounded-none border-b-2 border-transparent px-0 pb-2.5 pt-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none">Limits</TabsTrigger>
                        </TabsList>
                    </div>
                    <div className="hk-neon-divider" />

                    <div className="px-6 py-5 min-h-[320px]">
                        <TabsContent value="general" className="mt-0">
                            <GeneralTab />
                        </TabsContent>
                        <TabsContent value="team" className="mt-0">
                            <TeamTab />
                        </TabsContent>
                        <TabsContent value="billing" className="mt-0">
                            <BillingTab />
                        </TabsContent>
                        <TabsContent value="limits" className="mt-0">
                            <LimitsTab />
                        </TabsContent>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}

function GeneralTab() {
    const { data: session } = authClient.useSession()
    const { theme, setTheme } = useTheme()
    const [displayName, setDisplayName] = useState(session?.user?.name ?? "")
    const [saving, setSaving] = useState(false)

    const handleSaveName = async () => {
        if (!displayName.trim()) return
        setSaving(true)
        try {
            await authClient.updateUser({ name: displayName.trim() })
            toast.success("Display name updated")
        } catch {
            toast.error("Failed to update display name")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="display-name" className="hk-neon-label">Display Name</Label>
                <div className="flex gap-2">
                    <Input
                        id="display-name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your name"
                        className="hk-neon-input h-9 text-sm"
                    />
                    <Button
                        onClick={handleSaveName}
                        disabled={saving || displayName.trim() === (session?.user?.name ?? "")}
                        size="sm"
                        className="hk-neon-btn-primary h-9 px-4"
                    >
                        {saving && <Loader2 className="mr-1.5 size-3 animate-spin" />}
                        Save
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="email" className="hk-neon-label">Email</Label>
                <Input
                    id="email"
                    value={session?.user?.email ?? ""}
                    disabled
                    className="hk-neon-input h-9 text-sm opacity-50"
                />
                <p className="font-mono text-[10px] text-muted-foreground/60">// email cannot be changed</p>
            </div>

            <div className="hk-neon-divider pt-0" />
            <div className="space-y-2">
                <Label className="hk-neon-label">Theme</Label>
                <div className="flex gap-1.5">
                    {[
                        { value: "light", label: "Light", icon: Sun },
                        { value: "dark", label: "Dark", icon: Moon },
                        { value: "system", label: "System", icon: Monitor },
                    ].map(({ value, label, icon: Icon }) => (
                        <Button
                            key={value}
                            variant={theme === value ? "default" : "outline"}
                            size="sm"
                            onClick={() => setTheme(value)}
                            className={theme === value ? "hk-neon-btn-primary h-8 px-3 gap-1.5" : "hk-neon-btn h-8 px-3 gap-1.5"}
                        >
                            <Icon className="size-3" />
                            {label}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    )
}

function TeamTab() {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="hk-neon-empty-icon size-10 flex items-center justify-center mb-3">
                <Users className="size-5 text-muted-foreground" />
            </div>
            <h3 className="font-mono text-sm font-medium">Team features coming soon</h3>
            <p className="font-mono text-[10px] text-muted-foreground mt-1 max-w-xs leading-relaxed">
                // collaborate with your team on projects, share chats, and manage access
            </p>
        </div>
    )
}

function BillingTab() {
    const { credits, subscription, hasActiveSubscription } = useUserCredits()

    return (
        <div className="space-y-4">
            <div className="hk-neon-card border p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="hk-neon-label">Subscription</span>
                    <span className={
                        hasActiveSubscription
                            ? 'hk-neon-status-active px-2 py-0.5'
                            : 'hk-neon-status-inactive px-2 py-0.5 text-muted-foreground'
                    }>
                        {hasActiveSubscription ? "Active" : "Inactive"}
                    </span>
                </div>
                {subscription && (
                    <>
                        <div className="hk-neon-divider" />
                        <div className="pt-1 grid grid-cols-2 gap-3">
                            <div>
                                <p className="hk-neon-label">Plan</p>
                                <p className="font-mono text-sm font-medium mt-0.5">{subscription.plan_name}</p>
                            </div>
                            <div>
                                <p className="hk-neon-label">Period ends</p>
                                <p className="font-mono text-sm font-medium mt-0.5">
                                    {new Date(subscription.current_period_end).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="hk-neon-card border p-4 space-y-3">
                <span className="hk-neon-label">Credits</span>
                <div className="hk-neon-divider" />
                <div className="pt-1 grid grid-cols-3 gap-3">
                    <div>
                        <p className="hk-neon-label">Total</p>
                        <p className="hk-neon-stat text-xl font-bold mt-0.5 tabular-nums">{credits?.totalCredits ?? 0}</p>
                    </div>
                    <div>
                        <p className="hk-neon-label">Subscription</p>
                        <p className="hk-neon-stat text-xl font-bold mt-0.5 tabular-nums">{credits?.subscriptionCredits ?? 0}</p>
                        <p className="font-mono text-[9px] text-muted-foreground/60 mt-0.5">// resets each cycle</p>
                    </div>
                    <div>
                        <p className="hk-neon-label">Additional</p>
                        <p className="hk-neon-stat text-xl font-bold mt-0.5 tabular-nums">{credits?.additionalCredits ?? 0}</p>
                        <p className="font-mono text-[9px] text-muted-foreground/60 mt-0.5">// never expires</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function LimitsTab() {
    return (
        <div className="space-y-4">
            <div className="hk-neon-card border p-4 space-y-3">
                <span className="hk-neon-label">Rate Limits</span>
                <div className="hk-neon-divider" />
                <div className="pt-1 space-y-2.5">
                    <div className="flex justify-between items-center">
                        <span className="font-mono text-[11px] text-muted-foreground">authenticated_users</span>
                        <span className="hk-neon-stat font-mono text-xs font-medium tabular-nums">50 / day</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-mono text-[11px] text-muted-foreground">anonymous_users</span>
                        <span className="hk-neon-stat font-mono text-xs font-medium tabular-nums">3 / day</span>
                    </div>
                </div>
            </div>

            <div className="hk-neon-card border p-4 space-y-3">
                <span className="hk-neon-label">Credit Costs</span>
                <div className="hk-neon-divider" />
                <div className="pt-1 space-y-2.5">
                    <div className="flex justify-between items-center">
                        <span className="font-mono text-[11px] text-muted-foreground">new_chat</span>
                        <span className="hk-neon-stat font-mono text-xs font-medium tabular-nums">{CREDIT_COSTS.NEW_PROMPT} credits</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-mono text-[11px] text-muted-foreground">follow_up_message</span>
                        <span className="hk-neon-stat font-mono text-xs font-medium tabular-nums">{CREDIT_COSTS.FOLLOW_UP_PROMPT} credits</span>
                    </div>
                </div>
            </div>

            <p className="font-mono text-[10px] text-muted-foreground/60 leading-relaxed">
                // rate limits reset daily at midnight UTC. credits are deducted before each generation.
            </p>
        </div>
    )
}
