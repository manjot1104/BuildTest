'use client'

import DashboardLayout from '@/components/layout/dashboard-layout'
import { useStateMachine } from '@/context/state-machine'
import { useReturnTo } from '@/context/return-to'
import { useRouter } from 'next/navigation'
import React, { useEffect } from 'react'
import { BuildifyLogo } from '@/components/buildify-logo'

const Layout = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter()
    const { session, isPending } = useStateMachine()
    const { setReturnTo } = useReturnTo()

    useEffect(() => {
        if (!session?.user && !isPending) {
            const currentPath = window.location.pathname + window.location.search
            if (currentPath && currentPath !== '/login') {
                setReturnTo(currentPath)
            }
            router.push('/login')
        }
    }, [session, isPending, router, setReturnTo])

    if (isPending || !session?.user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-pulse">
                        <BuildifyLogo size="lg" />
                    </div>
                    <div className="h-px w-8 bg-border rounded-full overflow-hidden">
                        <div className="h-full w-1/2 bg-foreground/20 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]"
                            style={{
                                animation: 'shimmer 1.5s ease-in-out infinite',
                            }}
                        />
                    </div>
                </div>
                <style>{`
                    @keyframes shimmer {
                        0%, 100% { transform: translateX(-100%); }
                        50% { transform: translateX(200%); }
                    }
                `}</style>
            </div>
        )
    }

    return (
        <DashboardLayout>{children}</DashboardLayout>
    )
}

export default Layout
