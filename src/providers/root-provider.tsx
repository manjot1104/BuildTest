'use client'

import React from 'react'
import TanstackProvider from './tanstack-provider'
import { ThemeProvider } from './theme-provider'
import { Toaster } from 'sonner'
import StateMachineProvider from '@/context/state-machine'
import { ReturnToProvider } from '@/context/return-to'

export const RootProvider = ({ children }: { children: React.ReactNode }) => {
    return (
        <TanstackProvider>
            <StateMachineProvider>
                <ReturnToProvider>
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="dark"
                        enableSystem
                        disableTransitionOnChange
                    >
                        {children}
                        <Toaster position='bottom-right' />
                    </ThemeProvider>
                </ReturnToProvider>
            </StateMachineProvider>
        </TanstackProvider>
    )
}