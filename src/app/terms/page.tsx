'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Sparkles, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Footer } from '@/components/layout/footer'
import Link from 'next/link'
import { useTheme } from 'next-themes'

export default function TermsPage() {
    const { theme, setTheme } = useTheme()

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Navigation */}
            <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
                            <Sparkles className="size-4 text-primary-foreground" />
                        </div>
                        <span className="font-semibold text-lg">Buildify</span>
                    </Link>
                    <div className="flex items-center gap-3">
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
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/" className="gap-2">
                                <ArrowLeft className="size-4" />
                                Back to Home
                            </Link>
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Content */}
            <main className="flex-1 py-16 px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert"
                >
                    <h1>Terms and Conditions</h1>
                    <p className="text-muted-foreground">
                        Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>

                    <h2>1. Acceptance of Terms</h2>
                    <p>
                        By accessing and using Buildify (&quot;the Service&quot;), you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our Service.
                    </p>

                    <h2>2. Description of Service</h2>
                    <p>
                        Buildify is an AI-powered application builder that enables users to generate, iterate, and deploy applications through a conversational interface. The Service includes features such as code generation, community builds, and credit-based usage.
                    </p>

                    <h2>3. User Accounts</h2>
                    <p>
                        To access certain features, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate information and notify us immediately of any unauthorized use.
                    </p>

                    <h2>4. Credits and Subscriptions</h2>
                    <p>
                        Buildify operates on a credit-based system. Subscription credits are allocated per billing cycle and expire at the end of each cycle. Additional purchased credits do not expire. Usage costs vary by action type. All purchases are subject to our refund policy.
                    </p>

                    <h2>5. Acceptable Use</h2>
                    <p>You agree not to:</p>
                    <ul>
                        <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
                        <li>Attempt to reverse engineer, decompile, or extract the underlying AI models</li>
                        <li>Use automated tools to scrape or collect data from the Service</li>
                        <li>Share your account credentials or allow unauthorized access</li>
                        <li>Generate content that is harmful, abusive, or violates third-party rights</li>
                    </ul>

                    <h2>6. Intellectual Property</h2>
                    <p>
                        Code generated through Buildify is provided for your use. You retain ownership of the applications you build. However, the Buildify platform, its design, AI models, and underlying technology remain the intellectual property of Buildify.
                    </p>

                    <h2>7. Rate Limits</h2>
                    <p>
                        To ensure fair usage, the Service enforces rate limits. Authenticated users are limited to 50 messages per day. Anonymous access is limited to 3 messages per day. These limits may be adjusted at our discretion.
                    </p>

                    <h2>8. Limitation of Liability</h2>
                    <p>
                        Buildify is provided &quot;as is&quot; without warranties of any kind. We are not liable for any damages arising from your use of the Service, including but not limited to loss of data, profits, or business opportunities. The generated code is provided as a starting point and should be reviewed before production use.
                    </p>

                    <h2>9. Termination</h2>
                    <p>
                        We reserve the right to suspend or terminate your account at any time for violation of these terms or for any other reason at our sole discretion. Upon termination, your right to use the Service ceases immediately.
                    </p>

                    <h2>10. Changes to Terms</h2>
                    <p>
                        We may update these terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated terms. We will notify users of significant changes via email or through the Service.
                    </p>

                    <h2 id="privacy">Privacy Policy</h2>
                    <p>
                        Your privacy is important to us. This section outlines how we handle your data.
                    </p>

                    <h3>Information We Collect</h3>
                    <ul>
                        <li><strong>Account information:</strong> Email address, name, and authentication data</li>
                        <li><strong>Usage data:</strong> Chat messages, generated code, and interaction patterns</li>
                        <li><strong>Payment information:</strong> Processed securely through Razorpay; we do not store payment card details</li>
                        <li><strong>Technical data:</strong> IP address, browser type, and device information for analytics and rate limiting</li>
                    </ul>

                    <h3>How We Use Your Data</h3>
                    <ul>
                        <li>To provide and improve the Service</li>
                        <li>To process payments and manage subscriptions</li>
                        <li>To enforce rate limits and prevent abuse</li>
                        <li>To communicate important updates about the Service</li>
                    </ul>

                    <h3>Data Security</h3>
                    <p>
                        We implement industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
                    </p>

                    <h2>11. Contact</h2>
                    <p>
                        If you have questions about these Terms and Conditions, please contact us through the Service or reach out to our support team.
                    </p>
                </motion.div>
            </main>

            <Footer />
        </div>
    )
}
