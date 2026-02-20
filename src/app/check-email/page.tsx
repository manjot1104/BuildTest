'use client'

import { Suspense, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { authClient } from '@/server/better-auth/client'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Moon, Sun } from 'lucide-react'
import { BuildifyLogo } from '@/components/buildify-logo'
import Link from 'next/link'
import { useTheme } from 'next-themes'

const fadeIn: Variants = {
    hidden: { opacity: 0 },
    visible: (delay = 0) => ({
        opacity: 1,
        transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay },
    }),
}

function CheckEmailContent() {
    const searchParams = useSearchParams()
    const email = searchParams.get('email') ?? ''
    const { theme, setTheme } = useTheme()
    const [isResending, setIsResending] = useState(false)

    const handleResend = async () => {
        if (!email) {
            toast.error('No email address provided')
            return
        }
        setIsResending(true)
        try {
            await authClient.sendVerificationEmail({
                email,
                callbackURL: '/login',
            })
            toast.success('Verification email sent!')
        } catch {
            toast.error('Failed to resend verification email')
        } finally {
            setIsResending(false)
        }
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Subtle grain */}
            <div
                className="fixed inset-0 opacity-[0.015] dark:opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
            />

            {/* Navigation */}
            <motion.nav
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                custom={0}
                className="relative z-10 px-6 h-14 flex items-center"
            >
                <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
                    <Link href="/login" className="flex items-center gap-2 group">
                        <ArrowLeft className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        <BuildifyLogo size="sm" />
                        <span className="font-semibold text-sm tracking-tight">Buildify</span>
                    </Link>
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="size-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Sun className="size-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute size-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    </button>
                </div>
            </motion.nav>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
                <motion.div
                    variants={fadeIn}
                    initial="hidden"
                    animate="visible"
                    custom={0.15}
                    className="w-full max-w-sm"
                >
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="size-12 rounded-full border border-border/50 flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
                                <rect x="2" y="4" width="20" height="16" rx="2" />
                                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            We&apos;ve sent a verification link to{' '}
                            {email ? (
                                <span className="font-medium text-foreground">{email}</span>
                            ) : (
                                'your email address'
                            )}
                            . Click the link to verify your account.
                        </p>

                        <div className="w-full space-y-2.5 pt-4">
                            <Button
                                onClick={handleResend}
                                disabled={isResending}
                                variant="outline"
                                className="w-full h-11 rounded-xl text-sm font-medium"
                            >
                                {isResending ? 'Sending...' : 'Resend verification email'}
                            </Button>
                            <Link href="/login" className="block">
                                <Button variant="ghost" className="w-full h-11 rounded-xl text-sm font-medium text-muted-foreground">
                                    Back to sign in
                                </Button>
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

export default function CheckEmailPage() {
    return (
        <Suspense>
            <CheckEmailContent />
        </Suspense>
    )
}
