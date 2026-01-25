import { AuthForm } from '@/components/auth-modal'
import React, { createContext, useContext, useState } from 'react'


interface StateMachineContextType {
    authModal: boolean
    toggleAuthModal: () => void
}


const StateMachineContext = createContext<StateMachineContextType | null>(null)

const StateMachineProvider = ({ children }: { children: React.ReactNode }) => {

    const [authModal, setAuthModal] = useState(true)

    const toggleAuthModal = () => {
        setAuthModal(!authModal)
    }

    return (
        <StateMachineContext.Provider value={{ authModal, toggleAuthModal }}>
            <AuthForm />
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