"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Bell } from "lucide-react"

interface NotificationsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NotificationsDialog({
  open,
  onOpenChange,
}: NotificationsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Notifications</DialogTitle>
          <DialogDescription>
            Stay up to date with your account activity.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Bell className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="font-medium">No notifications yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            In-app notifications for payment confirmations, credit alerts, and updates are coming soon.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
