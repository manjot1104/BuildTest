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
            <DialogContent className="sm:max-w-[380px] p-0 gap-0 overflow-hidden rounded-xl border shadow-lg" showCloseButton={false}>
                <div className="px-5 pt-5 pb-4 border-b bg-muted/30">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold tracking-tight">Notifications</DialogTitle>
                        <DialogDescription className="text-[11px] text-muted-foreground">
                            Account activity and updates
                        </DialogDescription>
                    </DialogHeader>
                </div>
                <div className="flex flex-col items-center justify-center py-14 px-5 text-center">
                    <div className="size-10 flex items-center justify-center mb-3 bg-muted rounded-full">
                        <Bell className="size-5 text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-medium">No notifications yet</h3>
                    <p className="text-[10px] text-muted-foreground mt-1 max-w-xs leading-relaxed">
                        Payment confirmations, credit alerts, and updates will appear here
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
}
