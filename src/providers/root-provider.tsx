'use client'

import React from 'react'
import TanstackProvider from './tanstack-provider'
import { ThemeProvider } from './theme-provider'
import { Toaster } from 'sonner'

export const RootProvider = ({ children }: { children: React.ReactNode }) => {
    return (
        <TanstackProvider>
            <ThemeProvider
                attribute="class"
                defaultTheme="dark"
                enableSystem
                disableTransitionOnChange
            >
                {children}
                <Toaster position='bottom-right' />
            </ThemeProvider>
        </TanstackProvider>
    )
}