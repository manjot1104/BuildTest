import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

const footerLinks = {
    product: [
        { label: 'Features', href: '/#features' },
        { label: 'Community Builds', href: '/#community' },
        { label: 'Get Started', href: '/login' },
    ],
    company: [
        { label: 'About', href: '/about' },
        { label: 'Terms & Conditions', href: '/terms' },
        { label: 'Privacy Policy', href: '/terms#privacy' },
    ],
}

export function Footer() {
    return (
        <footer className="border-t border-border/40 bg-background/50">
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {/* Brand */}
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
                                <Sparkles className="size-4 text-primary-foreground" />
                            </div>
                            <span className="font-semibold text-lg">Buildify</span>
                        </Link>
                        <p className="text-sm text-muted-foreground max-w-xs">
                            Transform your ideas into production-ready applications with AI-powered code generation.
                        </p>
                    </div>

                    {/* Product Links */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold">Product</h4>
                        <ul className="space-y-2">
                            {footerLinks.product.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company Links */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold">Company</h4>
                        <ul className="space-y-2">
                            {footerLinks.company.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <Separator className="my-8 bg-border/40" />

                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                        &copy; {new Date().getFullYear()} Buildify. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <Link
                            href="/terms"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Terms
                        </Link>
                        <Link
                            href="/terms#privacy"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Privacy
                        </Link>
                        <Link
                            href="/about"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            About
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
