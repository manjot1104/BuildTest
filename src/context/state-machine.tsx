import { AuthForm } from '@/components/auth-modal'
import { ChatHistoryDialog } from '@/components/chat-history-dialog'
import { authClient } from '@/server/better-auth/client'
import React, { createContext, useContext, useState } from 'react'


interface StateMachineContextType {
    authModal: boolean
    toggleAuthModal: () => void
    openAuthModal: () => void
    historyModal: boolean
    toggleHistoryModal: () => void
    session: typeof authClient.$Infer.Session | null
    isPending: boolean
}


const StateMachineContext = createContext<StateMachineContextType | null>(null)

const StateMachineProvider = ({ children }: { children: React.ReactNode }) => {
    const { data: session, isPending } = authClient.useSession()
    const [authModal, setAuthModal] = useState(false)
    const [historyModal, setHistoryModal] = useState(false)

    const toggleAuthModal = () => {
        setAuthModal(!authModal)
    }

    const openAuthModal = () => {
        setAuthModal(true)
    }

    const toggleHistoryModal = () => {
        setHistoryModal(!historyModal)
    }

    return (
        <StateMachineContext.Provider value={{ authModal, toggleAuthModal, openAuthModal, historyModal, toggleHistoryModal, session: session ?? null, isPending }}>
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