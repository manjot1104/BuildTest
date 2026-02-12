'use client'

import { Suspense, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    Field,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field'
import { authClient } from '@/server/better-auth/client'
import { toast } from 'sonner'
import { useSearchParams, useRouter } from 'next/navigation'
import { Sparkles, ArrowLeft, Moon, Sun, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from 'next-themes'

function ResetPasswordContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const token = searchParams.get('token')
    const { theme, setTheme } = useTheme()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password.length < 8) {
            toast.error('Password must be at least 8 characters')
            return
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        if (!token) return

        setIsLoading(true)
        try {
            const result = await authClient.resetPassword({
                newPassword: password,
                token,
            })

            if (result.error) {
                toast.error(result.error.message ?? 'Failed to reset password')
            } else {
                setSuccess(true)
                toast.success('Password reset successfully!')
                setTimeout(() => router.push('/login'), 3000)
            }
        } catch {
            toast.error('An unexpected error occurred')
        } finally {
            setIsLoading(false)
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
                            {!token ? (
                                <div className="flex flex-col items-center gap-4 text-center">
                                    <h1 className="text-2xl font-bold">Invalid Reset Link</h1>
                                    <p className="text-muted-foreground text-sm">
                                        This password reset link is invalid or has expired. Please request a new one.
                                    </p>
                                    <div className="w-full space-y-3 pt-4">
                                        <Link href="/forgot-password" className="block">
                                            <Button className="w-full h-11">
                                                Request New Link
                                            </Button>
                                        </Link>
                                        <Link href="/login" className="block">
                                            <Button variant="ghost" className="w-full h-11">
                                                Back to Login
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            ) : success ? (
                                <div className="flex flex-col items-center gap-4 text-center">
                                    <div className="size-16 rounded-full bg-green-500/10 flex items-center justify-center">
                                        <CheckCircle2 className="size-8 text-green-500" />
                                    </div>
                                    <h1 className="text-2xl font-bold">Password Reset!</h1>
                                    <p className="text-muted-foreground text-sm">
                                        Your password has been reset successfully. Redirecting you to login...
                                    </p>
                                    <Link href="/login" className="block w-full pt-4">
                                        <Button variant="outline" className="w-full h-11">
                                            Go to Login
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit}>
                                    <FieldGroup>
                                        <div className="flex flex-col items-center gap-2 text-center mb-6">
                                            <h1 className="text-2xl font-bold">Reset your password</h1>
                                            <p className="text-muted-foreground text-sm">
                                                Enter your new password below.
                                            </p>
                                        </div>

                                        <Field>
                                            <FieldLabel htmlFor="password">New Password</FieldLabel>
                                            <Input
                                                id="password"
                                                type="password"
                                                placeholder="Enter new password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                minLength={8}
                                                className="bg-background/50"
                                            />
                                        </Field>

                                        <Field>
                                            <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                                            <Input
                                                id="confirm-password"
                                                type="password"
                                                placeholder="Confirm new password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                                minLength={8}
                                                className="bg-background/50"
                                            />
                                        </Field>

                                        <Field className="pt-2">
                                            <Button
                                                type="submit"
                                                className="w-full h-11"
                                                disabled={isLoading}
                                            >
                                                {isLoading ? 'Resetting...' : 'Reset Password'}
                                            </Button>
                                        </Field>

                                        <div className="text-center pt-2">
                                            <Link
                                                href="/login"
                                                className="text-sm text-muted-foreground underline-offset-2 hover:underline hover:text-foreground transition-colors"
                                            >
                                                Back to Login
                                            </Link>
                                        </div>
                                    </FieldGroup>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense>
            <ResetPasswordContent />
        </Suspense>
    )
}
