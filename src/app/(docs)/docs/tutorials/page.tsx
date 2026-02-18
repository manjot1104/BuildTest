import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, Layout, ShoppingCart, FormInput } from "lucide-react"

export default function TutorialsPage() {
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
        <h1 className="text-3xl font-bold tracking-tight">Tutorials</h1>
        <p className="text-muted-foreground mt-2">
          Learn how to build common types of applications with Buildify.
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layout className="h-4 w-4 text-blue-500" />
              Building a Landing Page
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Start with a prompt like:</p>
            <div className="rounded bg-muted p-3 font-mono text-xs">
              &quot;Create a modern SaaS landing page with a hero section, features grid, pricing
              table, and footer. Use a blue/white color scheme.&quot;
            </div>
            <p>
              Then iterate with follow-ups to add animations, refine copy, or adjust the layout.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FormInput className="h-4 w-4 text-blue-500" />
              Creating a Form with Validation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Start with a prompt like:</p>
            <div className="rounded bg-muted p-3 font-mono text-xs">
              &quot;Build a multi-step signup form with email validation, password strength
              indicator, and profile setup. Include error handling.&quot;
            </div>
            <p>
              Follow up to add specific validations, connect to an API, or style individual fields.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4 text-blue-500" />
              Building a Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Start with a prompt like:</p>
            <div className="rounded bg-muted p-3 font-mono text-xs">
              &quot;Create an analytics dashboard with a sidebar, stats cards, a line chart, and a
              data table. Use a clean, minimal design.&quot;
            </div>
            <p>
              Iterate to add interactivity, filtering, date range pickers, or export functionality.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg bg-muted/50 p-4">
        <h3 className="font-medium text-sm">More tutorials coming soon</h3>
        <p className="text-sm text-muted-foreground mt-1">
          We&apos;re adding more tutorials regularly. Check the changelog for updates.
        </p>
      </div>
    </div>
  )
}
