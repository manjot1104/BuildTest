'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useSyncLocalstorageState } from '@/hooks/use-sync-localstorage-state'
import { useStateMachine } from '@/context/state-machine'
import { ReturnToRedirectDialog } from '@/components/return-to-redirect-dialog'

interface ReturnToContextType {
    setReturnTo: (path: string) => void
    clearReturnTo: () => void
}

const ReturnToContext = createContext<ReturnToContextType | null>(null)

export const ReturnToProvider = ({ children }: { children: React.ReactNode }) => {
    const { session, isPending } = useStateMachine()
    const [returnTo, setReturnToValue, removeReturnTo] =
        useSyncLocalstorageState<string | null>('buildify_return_to', null)
    const [dialogOpen, setDialogOpen] = useState(false)

    const setReturnTo = useCallback(
        (path: string) => {
            setReturnToValue(path)
        },
        [setReturnToValue],
    )

    const clearReturnTo = useCallback(() => {
        removeReturnTo()
        setDialogOpen(false)
    }, [removeReturnTo])

    // When session becomes available and there's a stored returnTo, show the dialog
    useEffect(() => {
        if (!isPending && session?.user && returnTo) {
            setDialogOpen(true)
        }
    }, [isPending, session, returnTo])

    return (
        <ReturnToContext.Provider value={{ setReturnTo, clearReturnTo }}>
            {children}
            {returnTo && (
                <ReturnToRedirectDialog
                    open={dialogOpen}
                    returnTo={returnTo}
                    onRedirect={clearReturnTo}
                    onDismiss={clearReturnTo}
                />
            )}
        </ReturnToContext.Provider>
    )
}

export const useReturnTo = () => {
    const context = useContext(ReturnToContext)
    if (!context) {
        throw new Error('useReturnTo must be used within a ReturnToProvider')
    }
    return context
}
