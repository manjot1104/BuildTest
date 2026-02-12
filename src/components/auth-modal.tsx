/* eslint-disable @next/next/no-img-element */
"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
    AlertDialog,
    AlertDialogContent,
} from "@/components/ui/alert-dialog"
import { useStateMachine } from "@/context/state-machine"
import { authClient } from "@/server/better-auth/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"

export function AuthForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const { authModal, toggleAuthModal } = useStateMachine()
    const router = useRouter()
    const [isLogin, setIsLogin] = useState(true)
    const [isLoading, setIsLoading] = useState(false)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [name, setName] = useState("")

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
                    if (result.error.status === 403 || result.error.code === "EMAIL_NOT_VERIFIED") {
                        toggleAuthModal()
                        router.push(`/check-email?email=${encodeURIComponent(email)}`)
                        return
                    }
                    toast.error(result.error.message ?? "Failed to sign in")
                } else {
                    toast.success("Signed in successfully")
                    toggleAuthModal()
                    setEmail("")
                    setPassword("")
                }
            } else {
                if (!name.trim()) {
                    toast.error("Name is required")
                    setIsLoading(false)
                    return
                }
                const result = await authClient.signUp.email({
                    email,
                    password,
                    name: name.trim(),
                })

                if (result.error) {
                    toast.error(result.error.message ?? "Failed to sign up")
                } else {
                    toggleAuthModal()
                    router.push(`/check-email?email=${encodeURIComponent(email)}`)
                }
            }
        } catch (error) {
            toast.error("An unexpected error occurred")
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <AlertDialog open={authModal} onOpenChange={toggleAuthModal}>
            <AlertDialogContent
                className="p-0"
                style={{ width: '95vw', maxWidth: '55rem' }}
            >
                <div className={cn("flex flex-col gap-6", className)} {...props}>
                    <Card className="overflow-hidden border-0 p-0 shadow-none">
                        <CardContent className="relative grid w-full p-0 md:grid-cols-2">
                            {/* Close button */}
                            <Button variant="ghost" size="icon" className="absolute bg-background z-10 top-4 right-4" onClick={toggleAuthModal}>
                                <X className="size-4" />
                            </Button>

                            <form onSubmit={handleSubmit} className="p-6 md:p-8 relative">
                                <FieldGroup>
                                    <div className="flex flex-col items-center gap-2 text-center">
                                        <h1 className="text-2xl font-bold">
                                            {isLogin ? "Welcome back" : "Create an account"}
                                        </h1>
                                        <p className="text-muted-foreground text-balance">
                                            {isLogin
                                                ? "Login to your Buildify account"
                                                : "Sign up for your Buildify account"}
                                        </p>
                                    </div>

                                    {!isLogin && (
                                        <Field>
                                            <FieldLabel htmlFor="name">Name</FieldLabel>
                                            <Input
                                                id="name"
                                                type="text"
                                                placeholder="Enter your name"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                            />
                                        </Field>
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
                                        />
                                    </Field>

                                    <Field>
                                        <div className="flex items-center">
                                            <FieldLabel htmlFor="password">Password</FieldLabel>
                                            {isLogin && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        toggleAuthModal()
                                                        router.push('/forgot-password')
                                                    }}
                                                    className="ml-auto text-sm underline-offset-2 hover:underline"
                                                >
                                                    Forgot your password?
                                                </button>
                                            )}
                                        </div>
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="Enter your password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                    </Field>

                                    <Field>
                                        <Button type="submit" className="w-full" disabled={isLoading}>
                                            {isLoading
                                                ? "Loading..."
                                                : isLogin
                                                    ? "Login"
                                                    : "Sign up"}
                                        </Button>
                                    </Field>

                                    {/* <FieldSeparator className="*:data-[slot=field-separator-content]:bg-background">
                                        Or continue with
                                    </FieldSeparator>

                                    <Field className="grid grid-cols-3 gap-4">
                                        <Button variant="outline" type="button" disabled>
                                            <span className="sr-only">Login with Apple</span>
                                        </Button>
                                        <Button variant="outline" type="button" disabled>
                                            <span className="sr-only">Login with Google</span>
                                        </Button>
                                        <Button variant="outline" type="button" disabled>
                                            <span className="sr-only">Login with Meta</span>
                                        </Button>
                                    </Field> */}

                                    <FieldDescription className="text-center">
                                        {isLogin ? (
                                            <>
                                                Don&apos;t have an account?{" "}
                                                <button
                                                    type="button"
                                                    onClick={() => setIsLogin(false)}
                                                    className="underline underline-offset-2 hover:no-underline"
                                                >
                                                    Sign up
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                Already have an account?{" "}
                                                <button
                                                    type="button"
                                                    onClick={() => setIsLogin(true)}
                                                    className="underline underline-offset-2 hover:no-underline"
                                                >
                                                    Sign in
                                                </button>
                                            </>
                                        )}
                                    </FieldDescription>
                                </FieldGroup>
                            </form>



                            <div className="bg-muted relative hidden md:block min-h-[520px]">
                                <img
                                    src="https://picsum.photos/200/300"
                                    alt=""
                                    className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <FieldDescription className="px-6 pb-4 text-center">
                        By clicking continue, you agree to our{" "}
                        <a href="#" className="underline underline-offset-2 hover:no-underline">
                            Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="#" className="underline underline-offset-2 hover:no-underline">
                            Privacy Policy
                        </a>
                        .
                    </FieldDescription>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    )
}
