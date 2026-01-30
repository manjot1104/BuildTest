'use client'

import DashboardLayout from '@/components/layout/dashboard-layout'
import { useStateMachine } from '@/context/state-machine'
import { useRouter } from 'next/navigation'
import React, { useEffect } from 'react'
import { motion } from 'framer-motion'

const Layout = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter()
    const { session, isPending } = useStateMachine()

    useEffect(() => {
        if (!session?.user && !isPending) {
            router.push('/login')
        }
    }, [session, isPending, router])

    if (isPending || !session?.user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="flex flex-col items-center space-y-4">
                    <motion.div
                        className="relative w-12 h-12"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        <motion.div
                            className="absolute inset-0 rounded-full border-4 border-primary/20"
                        />
                        <motion.div
                            className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent"
                            animate={{ rotate: 360 }}
                            transition={{
                                repeat: Infinity,
                                duration: 1,
                                ease: "linear"
                            }}
                        />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                        className="text-sm font-medium text-foreground"
                    >
                        Loading...
                    </motion.div>
                </div>
            </div>
        )
    }

    return (
        <DashboardLayout>{children}</DashboardLayout>
    )
}

export default Layout