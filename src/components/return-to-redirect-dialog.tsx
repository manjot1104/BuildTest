'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

const COUNTDOWN_SECONDS = 5

interface ReturnToRedirectDialogProps {
    open: boolean
    returnTo: string
    onRedirect: () => void
    onDismiss: () => void
}

export function ReturnToRedirectDialog({
    open,
    returnTo,
    onRedirect,
    onDismiss,
}: ReturnToRedirectDialogProps) {
    const router = useRouter()
    const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)

    useEffect(() => {
        if (!open) {
            setCountdown(COUNTDOWN_SECONDS)
            return
        }

        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [open])

    useEffect(() => {
        if (open && countdown === 0) {
            router.push(returnTo)
            onRedirect()
        }
    }, [open, countdown, returnTo, router, onRedirect])

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) onDismiss()
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Welcome back!</DialogTitle>
                    <DialogDescription>
                        Redirecting to{' '}
                        <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
                            {returnTo}
                        </code>{' '}
                        in {countdown} second{countdown !== 1 ? 's' : ''}...
                    </DialogDescription>
                </DialogHeader>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                        className="bg-primary h-full transition-all duration-1000 ease-linear"
                        style={{
                            width: `${((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100}%`,
                        }}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onDismiss}>
                        Stay here
                    </Button>
                    <Button
                        onClick={() => {
                            router.push(returnTo)
                            onRedirect()
                        }}
                    >
                        Go now
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
