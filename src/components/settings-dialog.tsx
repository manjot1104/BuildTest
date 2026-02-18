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
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
  CreditCard,
  Gauge,
  MessageSquare,
  Zap,
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your account settings and preferences.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue={defaultTab} key={defaultTab} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="limits">Limits</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-4">
            <GeneralTab />
          </TabsContent>
          <TabsContent value="team" className="mt-4">
            <TeamTab />
          </TabsContent>
          <TabsContent value="billing" className="mt-4">
            <BillingTab />
          </TabsContent>
          <TabsContent value="limits" className="mt-4">
            <LimitsTab />
          </TabsContent>
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
        <Label htmlFor="display-name">Display Name</Label>
        <div className="flex gap-2">
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
          <Button
            onClick={handleSaveName}
            disabled={saving || displayName.trim() === (session?.user?.name ?? "")}
            size="sm"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          value={session?.user?.email ?? ""}
          disabled
          className="opacity-60"
        />
        <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
      </div>

      <Separator />

      <div className="space-y-3">
        <Label>Theme</Label>
        <div className="flex gap-2">
          <Button
            variant={theme === "light" ? "default" : "outline"}
            size="sm"
            onClick={() => setTheme("light")}
          >
            <Sun className="mr-2 h-4 w-4" />
            Light
          </Button>
          <Button
            variant={theme === "dark" ? "default" : "outline"}
            size="sm"
            onClick={() => setTheme("dark")}
          >
            <Moon className="mr-2 h-4 w-4" />
            Dark
          </Button>
          <Button
            variant={theme === "system" ? "default" : "outline"}
            size="sm"
            onClick={() => setTheme("system")}
          >
            <Monitor className="mr-2 h-4 w-4" />
            System
          </Button>
        </div>
      </div>
    </div>
  )
}

function TeamTab() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Users className="h-10 w-10 text-muted-foreground mb-3" />
      <h3 className="font-medium">Team features coming soon</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        Collaborate with your team on projects, share chats, and manage access — all in one place.
      </p>
    </div>
  )
}

function BillingTab() {
  const { credits, subscription, hasActiveSubscription } = useUserCredits()

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Subscription</span>
          </div>
          <Badge variant={hasActiveSubscription ? "default" : "secondary"}>
            {hasActiveSubscription ? "Active" : "Inactive"}
          </Badge>
        </div>
        {subscription && (
          <>
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Plan</p>
                <p className="font-medium">{subscription.plan_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Billing Period Ends</p>
                <p className="font-medium">
                  {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Credits</span>
        </div>
        <Separator />
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Total</p>
            <p className="text-lg font-bold">{credits?.totalCredits ?? 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Subscription</p>
            <p className="text-lg font-bold">{credits?.subscriptionCredits ?? 0}</p>
            <p className="text-xs text-muted-foreground">Resets each billing cycle</p>
          </div>
          <div>
            <p className="text-muted-foreground">Additional</p>
            <p className="text-lg font-bold">{credits?.additionalCredits ?? 0}</p>
            <p className="text-xs text-muted-foreground">Never expires</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function LimitsTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Rate Limits</span>
        </div>
        <Separator />
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Authenticated users</span>
            <span className="font-medium">50 messages / day</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Anonymous users</span>
            <span className="font-medium">3 messages / day</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Credit Costs</span>
        </div>
        <Separator />
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">New chat</span>
            <span className="font-medium">{CREDIT_COSTS.NEW_PROMPT} credits</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Follow-up message</span>
            <span className="font-medium">{CREDIT_COSTS.FOLLOW_UP_PROMPT} credits</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Rate limits reset daily at midnight UTC. Credits are deducted before each AI generation.
      </p>
    </div>
  )
}
