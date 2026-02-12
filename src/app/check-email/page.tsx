'use client'

import { Suspense, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { authClient } from '@/server/better-auth/client'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'
import { Sparkles, ArrowLeft, Mail, Moon, Sun } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from 'next-themes'

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
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
            <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                className="fixed top-1/4 -left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px]"
            />
            <motion.div
                animate={{ scale: [1.2, 1, 1.2], opacity: [0.15, 0.25, 0.15] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                className="fixed bottom-1/4 -right-1/4 w-96 h-96 bg-purple-500/15 rounded-full blur-[128px]"
            />

            <motion.nav
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative z-10 px-6 py-4"
            >
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <ArrowLeft className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
                            <Sparkles className="size-4 text-primary-foreground" />
                        </div>
                        <span className="font-semibold text-lg">Buildify</span>
                    </Link>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="size-9"
                    >
                        <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>
                </div>
            </motion.nav>

            <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="w-full max-w-md"
                >
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl">
                        <CardContent className="p-8">
                            <div className="flex flex-col items-center gap-4 text-center">
                                <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Mail className="size-8 text-primary" />
                                </div>
                                <h1 className="text-2xl font-bold">Check your email</h1>
                                <p className="text-muted-foreground text-sm">
                                    We&apos;ve sent a verification link to{' '}
                                    {email ? (
                                        <span className="font-medium text-foreground">{email}</span>
                                    ) : (
                                        'your email address'
                                    )}
                                    . Click the link in the email to verify your account.
                                </p>

                                <div className="w-full space-y-3 pt-4">
                                    <Button
                                        onClick={handleResend}
                                        disabled={isResending}
                                        variant="outline"
                                        className="w-full h-11"
                                    >
                                        {isResending ? 'Sending...' : 'Resend verification email'}
                                    </Button>
                                    <Link href="/login" className="block">
                                        <Button variant="ghost" className="w-full h-11">
                                            Back to Login
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
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
