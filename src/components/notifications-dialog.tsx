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
            <DialogContent className="hk-neon-dialog sm:max-w-[380px] p-0 gap-0 overflow-hidden rounded-none" showCloseButton={false}>
                <div className="hk-neon-dialog-header px-5 pt-5 pb-4">
                    <DialogHeader>
                        <DialogTitle className="hk-neon-dialog-title text-base font-semibold tracking-tight">Notifications</DialogTitle>
                        <DialogDescription className="font-mono text-[11px] text-muted-foreground">
                            // account activity and updates
                        </DialogDescription>
                    </DialogHeader>
                </div>
                <div className="flex flex-col items-center justify-center py-14 px-5 text-center">
                    <div className="hk-neon-empty-icon size-10 flex items-center justify-center mb-3">
                        <Bell className="size-5 text-muted-foreground" />
                    </div>
                    <h3 className="font-mono text-sm font-medium">No notifications yet</h3>
                    <p className="font-mono text-[10px] text-muted-foreground mt-1 max-w-xs leading-relaxed">
                        // payment confirmations, credit alerts, and updates will appear here
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
}
