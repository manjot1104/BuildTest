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
            <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4">
                    <DialogTitle className="text-lg font-semibold tracking-tight">Settings</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Manage your account and preferences.
                    </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue={defaultTab} key={defaultTab} className="w-full">
                    <div className="border-b border-border/40 px-6">
                        <TabsList className="h-9 w-full justify-start bg-transparent p-0 gap-4">
                            <TabsTrigger value="general" className="h-9 rounded-none border-b-2 border-transparent px-0 pb-2.5 pt-2 text-xs font-medium data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none">General</TabsTrigger>
                            <TabsTrigger value="team" className="h-9 rounded-none border-b-2 border-transparent px-0 pb-2.5 pt-2 text-xs font-medium data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none">Team</TabsTrigger>
                            <TabsTrigger value="billing" className="h-9 rounded-none border-b-2 border-transparent px-0 pb-2.5 pt-2 text-xs font-medium data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none">Billing</TabsTrigger>
                            <TabsTrigger value="limits" className="h-9 rounded-none border-b-2 border-transparent px-0 pb-2.5 pt-2 text-xs font-medium data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none">Limits</TabsTrigger>
                        </TabsList>
                    </div>

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
                <Label htmlFor="display-name" className="text-xs font-medium text-muted-foreground">Display Name</Label>
                <div className="flex gap-2">
                    <Input
                        id="display-name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your name"
                        className="h-9 rounded-lg text-sm"
                    />
                    <Button
                        onClick={handleSaveName}
                        disabled={saving || displayName.trim() === (session?.user?.name ?? "")}
                        size="sm"
                        className="h-9 rounded-lg px-4 text-xs"
                    >
                        {saving && <Loader2 className="mr-1.5 size-3 animate-spin" />}
                        Save
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</Label>
                <Input
                    id="email"
                    value={session?.user?.email ?? ""}
                    disabled
                    className="h-9 rounded-lg text-sm opacity-50"
                />
                <p className="text-[11px] text-muted-foreground/60">Email cannot be changed.</p>
            </div>

            <div className="border-t border-border/40 pt-5 space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Theme</Label>
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
                            className="h-8 rounded-lg px-3 text-xs gap-1.5"
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
            <div className="size-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <Users className="size-5 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium">Team features coming soon</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                Collaborate with your team on projects, share chats, and manage access.
            </p>
        </div>
    )
}

function BillingTab() {
    const { credits, subscription, hasActiveSubscription } = useUserCredits()

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-border/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Subscription</span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        hasActiveSubscription
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-muted text-muted-foreground'
                    }`}>
                        {hasActiveSubscription ? "Active" : "Inactive"}
                    </span>
                </div>
                {subscription && (
                    <>
                        <div className="border-t border-border/30 pt-3 grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-[11px] text-muted-foreground">Plan</p>
                                <p className="text-sm font-medium mt-0.5">{subscription.plan_name}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-muted-foreground">Period ends</p>
                                <p className="text-sm font-medium mt-0.5">
                                    {new Date(subscription.current_period_end).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="rounded-xl border border-border/50 p-4 space-y-3">
                <span className="text-xs font-medium text-muted-foreground">Credits</span>
                <div className="border-t border-border/30 pt-3 grid grid-cols-3 gap-3">
                    <div>
                        <p className="text-[11px] text-muted-foreground">Total</p>
                        <p className="text-xl font-bold mt-0.5 tabular-nums">{credits?.totalCredits ?? 0}</p>
                    </div>
                    <div>
                        <p className="text-[11px] text-muted-foreground">Subscription</p>
                        <p className="text-xl font-bold mt-0.5 tabular-nums">{credits?.subscriptionCredits ?? 0}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">Resets each cycle</p>
                    </div>
                    <div>
                        <p className="text-[11px] text-muted-foreground">Additional</p>
                        <p className="text-xl font-bold mt-0.5 tabular-nums">{credits?.additionalCredits ?? 0}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">Never expires</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function LimitsTab() {
    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-border/50 p-4 space-y-3">
                <span className="text-xs font-medium text-muted-foreground">Rate Limits</span>
                <div className="border-t border-border/30 pt-3 space-y-2.5">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Authenticated users</span>
                        <span className="text-xs font-medium tabular-nums">50 / day</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Anonymous users</span>
                        <span className="text-xs font-medium tabular-nums">3 / day</span>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-border/50 p-4 space-y-3">
                <span className="text-xs font-medium text-muted-foreground">Credit Costs</span>
                <div className="border-t border-border/30 pt-3 space-y-2.5">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">New chat</span>
                        <span className="text-xs font-medium tabular-nums">{CREDIT_COSTS.NEW_PROMPT} credits</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Follow-up message</span>
                        <span className="text-xs font-medium tabular-nums">{CREDIT_COSTS.FOLLOW_UP_PROMPT} credits</span>
                    </div>
                </div>
            </div>

            <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                Rate limits reset daily at midnight UTC. Credits are deducted before each generation.
            </p>
        </div>
    )
}
