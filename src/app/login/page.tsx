'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field'
import { authClient } from '@/server/better-auth/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Sparkles, ArrowLeft, Moon, Sun } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from 'next-themes'

const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
}

export default function LoginPage() {
    const router = useRouter()
    const { data: session } = authClient.useSession()
    const { theme, setTheme } = useTheme()
    const [isLogin, setIsLogin] = useState(true)
    const [isLoading, setIsLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')

    useEffect(() => {
        if (session?.user) {
            router.push('/chat')
        }
    }, [session, router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            if (isLogin) {
                const result = await authClient.signIn.email({
                    email,
                    password,
                })

                if (result.error) {
                    toast.error(result.error.message ?? 'Failed to sign in')
                } else {
                    toast.success('Signed in successfully')
                    router.push('/chat')
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
                    toast.success('Account created successfully')
                    setIsLogin(true)
                    setEmail('')
                    setPassword('')
                    setName('')
                }
            }
        } catch (error) {
            toast.error('An unexpected error occurred')
            console.error(error)
        } finally {
            setIsLoading(false)
        }
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
                            <form onSubmit={handleSubmit}>
                                <FieldGroup>
                                    <motion.div
                                        variants={fadeInUp}
                                        initial="initial"
                                        animate="animate"
                                        className="flex flex-col items-center gap-2 text-center mb-6"
                                    >
                                        <h1 className="text-2xl font-bold">
                                            {isLogin ? 'Welcome back' : 'Create an account'}
                                        </h1>
                                        <p className="text-muted-foreground text-sm">
                                            {isLogin
                                                ? 'Login to your Buildify account'
                                                : 'Sign up for your Buildify account'}
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
                                                <a
                                                    href="#"
                                                    className="ml-auto text-sm text-muted-foreground underline-offset-2 hover:underline hover:text-foreground transition-colors"
                                                >
                                                    Forgot password?
                                                </a>
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
                        </CardContent>
                    </Card>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-center text-xs text-muted-foreground mt-6"
                    >
                        By continuing, you agree to our{' '}
                        <a href="#" className="underline underline-offset-2 hover:no-underline">
                            Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="#" className="underline underline-offset-2 hover:no-underline">
                            Privacy Policy
                        </a>
                        .
                    </motion.p>
                </motion.div>
            </div>
        </div>
    )
}
