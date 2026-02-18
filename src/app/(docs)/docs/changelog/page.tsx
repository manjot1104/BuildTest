import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

const changelog = [
  {
    version: "0.3.0",
    date: "February 2026",
    tag: "Latest",
    changes: [
      "Added in-app documentation pages",
      "Implemented full settings dialog with profile, billing, and limits tabs",
      "Custom Buildify layered-panes logo across sidebar and emails",
      "Fixed payment success page crash — no more hard reloads",
      "Added error boundaries to prevent white-screen crashes",
      "Notifications and Account menu items are now functional",
      "Improved webhook reliability with idempotency and fallback lookups",
      "Welcome email sent after email verification",
    ],
  },
  {
    version: "0.2.0",
    date: "January 2026",
    changes: [
      "Multi-currency support for subscription plans",
      "Credit pack purchases for additional credits",
      "Razorpay payment integration",
      "Email OTP login support",
      "Chat history and starred conversations",
    ],
  },
  {
    version: "0.1.0",
    date: "December 2025",
    changes: [
      "Initial release with AI chat-based app generation",
      "Email/password authentication with Better Auth",
      "Subscription-based credit system",
      "Real-time code preview in chat",
    ],
  },
]

export default function ChangelogPage() {
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
        <h1 className="text-3xl font-bold tracking-tight">Changelog</h1>
        <p className="text-muted-foreground mt-2">
          New updates and improvements to Buildify.
        </p>
      </div>

      <div className="space-y-8">
        {changelog.map((release, i) => (
          <div key={release.version}>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-lg font-semibold">v{release.version}</h2>
              <span className="text-sm text-muted-foreground">{release.date}</span>
              {release.tag && <Badge variant="default">{release.tag}</Badge>}
            </div>
            <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
              {release.changes.map((change, j) => (
                <li key={j}>{change}</li>
              ))}
            </ul>
            {i < changelog.length - 1 && <Separator className="mt-6" />}
          </div>
        ))}
      </div>
    </div>
  )
}
