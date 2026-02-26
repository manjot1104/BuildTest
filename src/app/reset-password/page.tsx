'use client'

import { Suspense, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Field,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field'
import { authClient } from '@/server/better-auth/client'
import { toast } from 'sonner'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Moon, Sun, Check } from 'lucide-react'
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
                    {!token ? (
                        <div className="flex flex-col items-center gap-4 text-center">
                            <h1 className="text-2xl font-bold tracking-tight">Invalid reset link</h1>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                This password reset link is invalid or has expired. Please request a new one.
                            </p>
                            <div className="w-full space-y-2.5 pt-4">
                                <Link href="/forgot-password" className="block">
                                    <Button className="w-full h-11 rounded-xl text-sm font-medium">
                                        Request new link
                                    </Button>
                                </Link>
                                <Link href="/login" className="block">
                                    <Button variant="ghost" className="w-full h-11 rounded-xl text-sm font-medium text-muted-foreground">
                                        Back to sign in
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ) : success ? (
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="size-12 rounded-full border border-border/50 flex items-center justify-center">
                                <Check className="size-5 text-emerald-500" />
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight">Password reset</h1>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Your password has been reset successfully. Redirecting you to sign in...
                            </p>
                            <Link href="/login" className="block w-full pt-4">
                                <Button variant="outline" className="w-full h-11 rounded-xl text-sm font-medium">
                                    Go to sign in
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <FieldGroup>
                                <div className="flex flex-col items-center gap-1.5 text-center mb-8">
                                    <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
                                    <p className="text-sm text-muted-foreground">
                                        Enter your new password below.
                                    </p>
                                </div>

                                <Field>
                                    <FieldLabel htmlFor="password" className="text-xs font-medium text-muted-foreground">New Password</FieldLabel>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="At least 8 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={8}
                                        className="h-11 rounded-xl border-border/50 bg-muted/30 text-sm"
                                    />
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="confirm-password" className="text-xs font-medium text-muted-foreground">Confirm Password</FieldLabel>
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        placeholder="Confirm new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={8}
                                        className="h-11 rounded-xl border-border/50 bg-muted/30 text-sm"
                                    />
                                </Field>

                                <Field className="pt-3">
                                    <Button
                                        type="submit"
                                        className="w-full h-11 rounded-xl text-sm font-medium"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Resetting...' : 'Reset password'}
                                    </Button>
                                </Field>

                                <div className="text-center pt-4">
                                    <Link
                                        href="/login"
                                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Back to sign in
                                    </Link>
                                </div>
                            </FieldGroup>
                        </form>
                    )}
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
