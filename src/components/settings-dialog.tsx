"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"

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
          <TabsContent value="general" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">
                General settings will be available soon.
              </Label>
            </div>
          </TabsContent>
          <TabsContent value="team" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">
                Team management will be available soon.
              </Label>
            </div>
          </TabsContent>
          <TabsContent value="billing" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">
                Billing settings will be available soon.
              </Label>
            </div>
          </TabsContent>
          <TabsContent value="limits" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">
                Usage limits will be available soon.
              </Label>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
