import { TinyFish } from "@/components/shared/tiny-fish";
import { Fish } from "lucide-react";

export default function TinyFishPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-background px-6 py-12">

      {/* ── Page Header ── */}
      <div className="mb-10 text-center">

        {/* Fish icon in a rounded box */}
        <div className="bg-primary/10 mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl">
          <Fish className="text-primary h-8 w-8" />
        </div>

        {/* Page title */}
        <h1 className="text-3xl font-bold tracking-tight">Tiny Fish</h1>

        {/* Page description */}
        <p className="text-muted-foreground mt-2 text-sm">
          AI-powered web automation — describe a task, let the agent do it
        </p>

      </div>

      {/* ── Main Card ──
          Contains the TinyFish form component */}
      <div className="w-full max-w-lg rounded-2xl border bg-card p-8 shadow-sm">
        <TinyFish />
      </div>

    </div>
  );
}
