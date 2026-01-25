'use client'

import React from 'react'
import TanstackProvider from './tanstack-provider'

export const RootProvider = ({ children }: { children: React.ReactNode }) => {
    return (
        <TanstackProvider>
            {children}
        </TanstackProvider>
    )
}