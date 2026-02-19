'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
    InputOTPSeparator,
} from '@/components/ui/input-otp'
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field'
import { authClient } from '@/server/better-auth/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Moon, Sun, Mail, KeyRound } from 'lucide-react'
import { BuildifyLogo } from '@/components/buildify-logo'
import Link from 'next/link'
import { useTheme } from 'next-themes'

type AuthMode = 'email-password' | 'otp-email' | 'otp-verify'

const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
}

const OTP_COOLDOWN_SECONDS = 60

export default function LoginFormClient() {
    const router = useRouter()
    const { theme, setTheme } = useTheme()
    const [authMode, setAuthMode] = useState<AuthMode>('email-password')
    const [isLogin, setIsLogin] = useState(true)
    const [isLoading, setIsLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [otp, setOtp] = useState('')
    const [otpCooldown, setOtpCooldown] = useState(0)
    const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        return () => {
            if (cooldownRef.current) clearInterval(cooldownRef.current)
        }
    }, [])

    const startCooldown = useCallback(() => {
        setOtpCooldown(OTP_COOLDOWN_SECONDS)
        if (cooldownRef.current) clearInterval(cooldownRef.current)
        cooldownRef.current = setInterval(() => {
            setOtpCooldown((prev) => {
                if (prev <= 1) {
                    if (cooldownRef.current) clearInterval(cooldownRef.current)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }, [])

    const handleRedirectAfterLogin = useCallback(() => {
        const stored = localStorage.getItem('buildify_return_to')
        if (stored) {
            router.push(stored)
            localStorage.removeItem('buildify_return_to')
        } else {
            router.push('/chat')
        }
    }, [router])

    const handleSendOTP = async () => {
        if (!email.trim()) {
            toast.error('Please enter your email')
            return
        }
        setIsLoading(true)
        try {
            const result = await authClient.emailOtp.sendVerificationOtp({
                email,
                type: 'sign-in',
            })
            if (result.error) {
                toast.error(result.error.message ?? 'Failed to send OTP')
            } else {
                toast.success('OTP sent to your email')
                setAuthMode('otp-verify')
                startCooldown()
            }
        } catch {
            toast.error('An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    const handleVerifyOTP = async (value: string) => {
        if (value.length !== 6) return
        setIsLoading(true)
        try {
            const result = await authClient.signIn.emailOtp({
                email,
                otp: value,
            })
            if (result.error) {
                toast.error(result.error.message ?? 'Invalid OTP')
                setOtp('')
            } else {
                toast.success('Signed in successfully')
                handleRedirectAfterLogin()
            }
        } catch {
            toast.error('An unexpected error occurred')
            setOtp('')
        } finally {
            setIsLoading(false)
        }
    }

    const handleResendOTP = async () => {
        if (otpCooldown > 0) return
        setIsLoading(true)
        try {
            const result = await authClient.emailOtp.sendVerificationOtp({
                email,
                type: 'sign-in',
            })
            if (result.error) {
                toast.error(result.error.message ?? 'Failed to resend OTP')
            } else {
                toast.success('OTP resent to your email')
                setOtp('')
                startCooldown()
            }
        } catch {
            toast.error('An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            if (isLogin) {
                const result = await authClient.signIn.email({
                    email,
                    password,
                })

                if (result.error) {
                    if (result.error.status === 403 || result.error.code === 'EMAIL_NOT_VERIFIED') {
                        router.push(`/check-email?email=${encodeURIComponent(email)}`)
                        return
                    }
                    toast.error(result.error.message ?? 'Failed to sign in')
                } else {
                    toast.success('Signed in successfully')
                    handleRedirectAfterLogin()
                }
            } else {
                if (!name.trim()) {
                    toast.error('Name is required')
                    setIsLoading(false)
                    return
                }
                const result = await authClient.signUp.email({
                    email,
                    password,
                    name: name.trim(),
                })

                if (result.error) {
                    toast.error(result.error.message ?? 'Failed to sign up')
                } else {
                    router.push(`/check-email?email=${encodeURIComponent(email)}`)
                }
            }
        } catch {
            toast.error('An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    const isOtpMode = authMode === 'otp-email' || authMode === 'otp-verify'

    const getTitle = () => {
        if (authMode === 'otp-verify') return 'Enter verification code'
        if (authMode === 'otp-email') return 'Sign in with email'
        return isLogin ? 'Welcome back' : 'Create an account'
    }

    const getSubtitle = () => {
        if (authMode === 'otp-verify') return `We sent a 6-digit code to ${email}`
        if (authMode === 'otp-email') return "We'll send a one-time code to your email"
        return isLogin
            ? 'Login to your Buildify account'
            : 'Sign up for your Buildify account'
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Background Elements */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.2, 0.3, 0.2]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                className="fixed top-1/4 -left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px]"
            />
            <motion.div
                animate={{
                    scale: [1.2, 1, 1.2],
                    opacity: [0.15, 0.25, 0.15]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                className="fixed bottom-1/4 -right-1/4 w-96 h-96 bg-purple-500/15 rounded-full blur-[128px]"
            />

            {/* Navigation */}
            <motion.nav
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative z-10 px-6 py-4"
            >
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <ArrowLeft className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        <BuildifyLogo size="md" />
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

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="w-full max-w-md"
                >
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl">
                        <CardContent className="p-8">
                            {/* Auth method toggle */}
                            <div className="flex rounded-lg bg-muted p-1 mb-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAuthMode('email-password')
                                        setOtp('')
                                    }}
                                    className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                        !isOtpMode
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <KeyRound className="size-3.5" />
                                    Password
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAuthMode('otp-email')
                                        setPassword('')
                                        setName('')
                                    }}
                                    className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                        isOtpMode
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <Mail className="size-3.5" />
                                    Email OTP
                                </button>
                            </div>

                            {/* Password-based auth form */}
                            {!isOtpMode && (
                                <form onSubmit={handlePasswordSubmit}>
                                    <FieldGroup>
                                        <motion.div
                                            variants={fadeInUp}
                                            initial="initial"
                                            animate="animate"
                                            className="flex flex-col items-center gap-2 text-center mb-6"
                                        >
                                            <h1 className="text-2xl font-bold">
                                                {getTitle()}
                                            </h1>
                                            <p className="text-muted-foreground text-sm">
                                                {getSubtitle()}
                                            </p>
                                        </motion.div>

                                        {!isLogin && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                <Field>
                                                    <FieldLabel htmlFor="name">Name</FieldLabel>
                                                    <Input
                                                        id="name"
                                                        type="text"
                                                        placeholder="Enter your name"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        className="bg-background/50"
                                                    />
                                                </Field>
                                            </motion.div>
                                        )}

                                        <Field>
                                            <FieldLabel htmlFor="email">Email</FieldLabel>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="Enter your email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                className="bg-background/50"
                                            />
                                        </Field>

                                        <Field>
                                            <div className="flex items-center">
                                                <FieldLabel htmlFor="password">Password</FieldLabel>
                                                {isLogin && (
                                                    <Link
                                                        href="/forgot-password"
                                                        className="ml-auto text-sm text-muted-foreground underline-offset-2 hover:underline hover:text-foreground transition-colors"
                                                    >
                                                        Forgot password?
                                                    </Link>
                                                )}
                                            </div>
                                            <Input
                                                id="password"
                                                type="password"
                                                placeholder="Enter your password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                className="bg-background/50"
                                            />
                                        </Field>

                                        <Field className="pt-2">
                                            <Button
                                                type="submit"
                                                className="w-full h-11"
                                                disabled={isLoading}
                                            >
                                                {isLoading
                                                    ? 'Loading...'
                                                    : isLogin
                                                        ? 'Login'
                                                        : 'Sign up'}
                                            </Button>
                                        </Field>

                                        <FieldDescription className="text-center pt-4">
                                            {isLogin ? (
                                                <>
                                                    Don&apos;t have an account?{' '}
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsLogin(false)}
                                                        className="text-primary underline underline-offset-2 hover:no-underline"
                                                    >
                                                        Sign up
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    Already have an account?{' '}
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsLogin(true)}
                                                        className="text-primary underline underline-offset-2 hover:no-underline"
                                                    >
                                                        Sign in
                                                    </button>
                                                </>
                                            )}
                                        </FieldDescription>
                                    </FieldGroup>
                                </form>
                            )}

                            {/* OTP email step */}
                            {authMode === 'otp-email' && (
                                <FieldGroup>
                                    <motion.div
                                        variants={fadeInUp}
                                        initial="initial"
                                        animate="animate"
                                        className="flex flex-col items-center gap-2 text-center mb-6"
                                    >
                                        <h1 className="text-2xl font-bold">{getTitle()}</h1>
                                        <p className="text-muted-foreground text-sm">{getSubtitle()}</p>
                                    </motion.div>

                                    <Field>
                                        <FieldLabel htmlFor="otp-email">Email</FieldLabel>
                                        <Input
                                            id="otp-email"
                                            type="email"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="bg-background/50"
                                        />
                                    </Field>

                                    <Field className="pt-2">
                                        <Button
                                            type="button"
                                            className="w-full h-11"
                                            disabled={isLoading || !email.trim()}
                                            onClick={handleSendOTP}
                                        >
                                            {isLoading ? 'Sending...' : 'Send OTP'}
                                        </Button>
                                    </Field>
                                </FieldGroup>
                            )}

                            {/* OTP verify step */}
                            {authMode === 'otp-verify' && (
                                <FieldGroup>
                                    <motion.div
                                        variants={fadeInUp}
                                        initial="initial"
                                        animate="animate"
                                        className="flex flex-col items-center gap-2 text-center mb-6"
                                    >
                                        <h1 className="text-2xl font-bold">{getTitle()}</h1>
                                        <p className="text-muted-foreground text-sm">{getSubtitle()}</p>
                                    </motion.div>

                                    <Field>
                                        <div className="flex justify-center">
                                            <InputOTP
                                                maxLength={6}
                                                value={otp}
                                                onChange={(value) => setOtp(value)}
                                                onComplete={handleVerifyOTP}
                                                disabled={isLoading}
                                            >
                                                <InputOTPGroup>
                                                    <InputOTPSlot index={0} />
                                                    <InputOTPSlot index={1} />
                                                    <InputOTPSlot index={2} />
                                                </InputOTPGroup>
                                                <InputOTPSeparator />
                                                <InputOTPGroup>
                                                    <InputOTPSlot index={3} />
                                                    <InputOTPSlot index={4} />
                                                    <InputOTPSlot index={5} />
                                                </InputOTPGroup>
                                            </InputOTP>
                                        </div>
                                    </Field>

                                    <Field className="pt-2">
                                        <Button
                                            type="button"
                                            className="w-full h-11"
                                            disabled={isLoading || otp.length !== 6}
                                            onClick={() => handleVerifyOTP(otp)}
                                        >
                                            {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                                        </Button>
                                    </Field>

                                    <div className="flex items-center justify-center gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={handleResendOTP}
                                            disabled={otpCooldown > 0 || isLoading}
                                            className="text-sm text-primary underline underline-offset-2 hover:no-underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed"
                                        >
                                            {otpCooldown > 0
                                                ? `Resend OTP in ${otpCooldown}s`
                                                : 'Resend OTP'}
                                        </button>
                                    </div>

                                    <FieldDescription className="text-center pt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAuthMode('otp-email')
                                                setOtp('')
                                            }}
                                            className="text-primary underline underline-offset-2 hover:no-underline"
                                        >
                                            Use a different email
                                        </button>
                                    </FieldDescription>
                                </FieldGroup>
                            )}
                        </CardContent>
                    </Card>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-center text-xs text-muted-foreground mt-6"
                    >
                        By continuing, you agree to our{' '}
                        <a href="/terms" className="underline underline-offset-2 hover:no-underline">
                            Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="/terms#privacy" className="underline underline-offset-2 hover:no-underline">
                            Privacy Policy
                        </a>
                        .
                    </motion.p>
                </motion.div>
            </div>
        </div>
    )
}
