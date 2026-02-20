'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, type Variants } from 'framer-motion'
import { Button } from '@/components/ui/button'
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

const OTP_COOLDOWN_SECONDS = 60

const fadeIn: Variants = {
    hidden: { opacity: 0 },
    visible: (delay = 0) => ({
        opacity: 1,
        transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay },
    }),
}

export default function LoginPage() {
    const router = useRouter()
    const { data: session } = authClient.useSession()
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
        if (session?.user) {
            const stored = localStorage.getItem('buildify_return_to')
            if (!stored) {
                router.push('/chat')
            }
        }
    }, [session, router])

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
        if (!stored) {
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
        if (authMode === 'otp-email') return 'We\'ll send a one-time code to your email'
        return isLogin
            ? 'Sign in to your Buildify account'
            : 'Get started with Buildify'
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
                    <Link href="/" className="flex items-center gap-2 group">
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
                    {/* Auth method toggle */}
                    <div className="flex rounded-full bg-muted/50 p-1 mb-10 border border-border/40">
                        <button
                            type="button"
                            onClick={() => {
                                setAuthMode('email-password')
                                setOtp('')
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition-all duration-300 ${
                                !isOtpMode
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <KeyRound className="size-3" />
                            Password
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setAuthMode('otp-email')
                                setPassword('')
                                setName('')
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition-all duration-300 ${
                                isOtpMode
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Mail className="size-3" />
                            Email OTP
                        </button>
                    </div>

                    {/* Password-based auth form */}
                    {!isOtpMode && (
                        <form onSubmit={handlePasswordSubmit}>
                            <FieldGroup>
                                <div className="flex flex-col items-center gap-1.5 text-center mb-8">
                                    <h1 className="text-2xl font-bold tracking-tight">
                                        {getTitle()}
                                    </h1>
                                    <p className="text-sm text-muted-foreground">
                                        {getSubtitle()}
                                    </p>
                                </div>

                                {!isLogin && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Field>
                                            <FieldLabel htmlFor="name" className="text-xs font-medium text-muted-foreground">Name</FieldLabel>
                                            <Input
                                                id="name"
                                                type="text"
                                                placeholder="Enter your name"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="h-11 rounded-xl border-border/50 bg-muted/30 text-sm"
                                            />
                                        </Field>
                                    </motion.div>
                                )}

                                <Field>
                                    <FieldLabel htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</FieldLabel>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="h-11 rounded-xl border-border/50 bg-muted/30 text-sm"
                                    />
                                </Field>

                                <Field>
                                    <div className="flex items-center">
                                        <FieldLabel htmlFor="password" className="text-xs font-medium text-muted-foreground">Password</FieldLabel>
                                        {isLogin && (
                                            <Link
                                                href="/forgot-password"
                                                className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                Forgot?
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
                                        className="h-11 rounded-xl border-border/50 bg-muted/30 text-sm"
                                    />
                                </Field>

                                <Field className="pt-3">
                                    <Button
                                        type="submit"
                                        className="w-full h-11 rounded-xl text-sm font-medium"
                                        disabled={isLoading}
                                    >
                                        {isLoading
                                            ? 'Loading...'
                                            : isLogin
                                                ? 'Sign in'
                                                : 'Create account'}
                                    </Button>
                                </Field>

                                <FieldDescription className="text-center pt-4">
                                    <span className="text-xs text-muted-foreground">
                                        {isLogin ? (
                                            <>
                                                Don&apos;t have an account?{' '}
                                                <button
                                                    type="button"
                                                    onClick={() => setIsLogin(false)}
                                                    className="text-foreground font-medium hover:underline underline-offset-2"
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
                                                    className="text-foreground font-medium hover:underline underline-offset-2"
                                                >
                                                    Sign in
                                                </button>
                                            </>
                                        )}
                                    </span>
                                </FieldDescription>
                            </FieldGroup>
                        </form>
                    )}

                    {/* OTP email step */}
                    {authMode === 'otp-email' && (
                        <FieldGroup>
                            <div className="flex flex-col items-center gap-1.5 text-center mb-8">
                                <h1 className="text-2xl font-bold tracking-tight">{getTitle()}</h1>
                                <p className="text-sm text-muted-foreground">{getSubtitle()}</p>
                            </div>

                            <Field>
                                <FieldLabel htmlFor="otp-email" className="text-xs font-medium text-muted-foreground">Email</FieldLabel>
                                <Input
                                    id="otp-email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-11 rounded-xl border-border/50 bg-muted/30 text-sm"
                                />
                            </Field>

                            <Field className="pt-3">
                                <Button
                                    type="button"
                                    className="w-full h-11 rounded-xl text-sm font-medium"
                                    disabled={isLoading || !email.trim()}
                                    onClick={handleSendOTP}
                                >
                                    {isLoading ? 'Sending...' : 'Send code'}
                                </Button>
                            </Field>
                        </FieldGroup>
                    )}

                    {/* OTP verify step */}
                    {authMode === 'otp-verify' && (
                        <FieldGroup>
                            <div className="flex flex-col items-center gap-1.5 text-center mb-8">
                                <h1 className="text-2xl font-bold tracking-tight">{getTitle()}</h1>
                                <p className="text-sm text-muted-foreground">{getSubtitle()}</p>
                            </div>

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

                            <Field className="pt-3">
                                <Button
                                    type="button"
                                    className="w-full h-11 rounded-xl text-sm font-medium"
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
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {otpCooldown > 0
                                        ? `Resend in ${otpCooldown}s`
                                        : 'Resend code'}
                                </button>
                            </div>

                            <FieldDescription className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAuthMode('otp-email')
                                        setOtp('')
                                    }}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Use a different email
                                </button>
                            </FieldDescription>
                        </FieldGroup>
                    )}

                    <motion.p
                        variants={fadeIn}
                        initial="hidden"
                        animate="visible"
                        custom={0.4}
                        className="text-center text-[11px] text-muted-foreground/60 mt-8 leading-relaxed"
                    >
                        By continuing, you agree to our{' '}
                        <Link href="/terms" className="underline underline-offset-2 hover:text-muted-foreground transition-colors">
                            Terms
                        </Link>{' '}
                        and{' '}
                        <Link href="/terms#privacy" className="underline underline-offset-2 hover:text-muted-foreground transition-colors">
                            Privacy Policy
                        </Link>
                        .
                    </motion.p>
                </motion.div>
            </div>
        </div>
    )
}
