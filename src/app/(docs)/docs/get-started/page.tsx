import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function GetStartedPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link
          href="/docs"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Docs
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Get Started</h1>
        <p className="text-muted-foreground mt-2">
          Start building your first app with Buildify in minutes.
        </p>
      </div>

      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Subscribe to a plan</h2>
          <p className="text-muted-foreground leading-relaxed">
            To start building, you need an active subscription. Click the &quot;Buy Pro&quot; button
            in the sidebar to choose a plan. Each plan includes monthly credits that reset with
            your billing cycle.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Start a new chat</h2>
          <p className="text-muted-foreground leading-relaxed">
            Click &quot;New Chat&quot; in the sidebar to open the chat interface. Describe what you
            want to build — be as specific or general as you like. Buildify will generate a working
            application based on your description.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Iterate with follow-ups</h2>
          <p className="text-muted-foreground leading-relaxed">
            After the initial generation, send follow-up messages to refine your app. You can ask
            Buildify to change layouts, add features, fix issues, or adjust styling.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Manage your credits</h2>
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">New chat</span>
                  <span className="font-medium">20 credits</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Follow-up message</span>
                  <span className="font-medium">30 credits</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Daily rate limit</span>
                  <span className="font-medium">50 messages</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <p className="text-muted-foreground leading-relaxed text-sm">
            Subscription credits reset each billing cycle. You can purchase additional credit packs
            that never expire — even after your subscription ends.
          </p>
        </section>
      </div>

      <div className="rounded-lg bg-muted/50 p-4">
        <h3 className="font-medium text-sm">Tips for better results</h3>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
          <li>Be specific about your tech preferences (e.g., &quot;use Tailwind CSS&quot;)</li>
          <li>Describe the user experience, not just features</li>
          <li>Break complex apps into smaller iterations</li>
          <li>Use follow-ups to refine rather than starting over</li>
        </ul>
      </div>
    </div>
  )
}
