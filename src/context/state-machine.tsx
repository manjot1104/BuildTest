import { AuthForm } from '@/components/auth-modal'
import { ChatHistoryDialog } from '@/components/chat-history-dialog'
import { authClient } from '@/server/better-auth/client'
import React, { createContext, useContext, useEffect, useState } from 'react'


interface StateMachineContextType {
    authModal: boolean
    toggleAuthModal: () => void
    historyModal: boolean
    toggleHistoryModal: () => void
}


const StateMachineContext = createContext<StateMachineContextType | null>(null)

const StateMachineProvider = ({ children }: { children: React.ReactNode }) => {

    const { data: session } = authClient.useSession()
    const [authModal, setAuthModal] = useState(false)
    const [historyModal, setHistoryModal] = useState(false)

    const toggleAuthModal = () => {
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
            <AuthForm />
            <ChatHistoryDialog />
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