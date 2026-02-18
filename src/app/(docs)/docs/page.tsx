import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Zap, MessageSquare, CreditCard } from "lucide-react"
import Link from "next/link"

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documentation</h1>
        <p className="text-muted-foreground mt-2">
          Everything you need to know about using Buildify to create applications with AI.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">What is Buildify?</h2>
        <p className="text-muted-foreground leading-relaxed">
          Buildify is an AI-powered app builder that lets you create and iterate on web applications
          through a conversational chat interface. Describe what you want to build, and Buildify
          generates working code — from UI components to full pages.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/docs/get-started">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-blue-500" />
                Get Started
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Learn how to create your first project and start building with AI.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/docs/tutorials">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4 text-blue-500" />
                Tutorials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Step-by-step guides for common use cases and advanced features.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/docs/changelog">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                Changelog
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                See what&apos;s new — latest updates, fixes, and improvements.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4 text-blue-500" />
              Credit System
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              New chat costs 20 credits, follow-ups cost 30. Subscription credits reset monthly; additional credits never expire.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
