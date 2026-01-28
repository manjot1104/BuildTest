import { AuthForm } from '@/components/auth-modal'
import { ChatHistoryDialog } from '@/components/chat-history-dialog'
import { authClient } from '@/server/better-auth/client'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { toast } from 'sonner'


interface StateMachineContextType {
    authModal: boolean
    toggleAuthModal: () => void
    historyModal: boolean
    toggleHistoryModal: () => void
}


const StateMachineContext = createContext<StateMachineContextType | null>(null)

const StateMachineProvider = ({ children }: { children: React.ReactNode }) => {

    const { data: session, isPending } = authClient.useSession()
    const [authModal, setAuthModal] = useState(false)
    const [historyModal, setHistoryModal] = useState(false)

    const toggleAuthModal = () => {
        if (!session?.user) {
            toast.error('Please sign in to continue')
            setAuthModal(true)
            return
        }
        setAuthModal(!authModal)
    }

    const toggleHistoryModal = () => {
        setHistoryModal(!historyModal)
    }

    useEffect(() => {
        if (session?.user) {
            setAuthModal(false)
        } else {
            setAuthModal(true)
        }
    }, [session])

    return (
        <StateMachineContext.Provider value={{ authModal, toggleAuthModal, historyModal, toggleHistoryModal }}>
            {!isPending && <AuthForm />}
            {!isPending && <ChatHistoryDialog />}
            {children}
        </StateMachineContext.Provider>
    )
}

export const useStateMachine = () => {
    const context = useContext(StateMachineContext)
    if (!context) {
        throw new Error('useStateMachine must be used within a StateMachineProvider')
    }
    return context
}

export default StateMachineProvider