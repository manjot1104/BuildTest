"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bot, Wrench } from "lucide-react"

interface Props {
  onSelect: (mode: "BUILDER" | "AI_CHAT") => void
}

export function ModeSelection({ onSelect }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <h1 className="text-3xl font-semibold mb-2 text-foreground">
        What would you like to use?
      </h1>
      <p className="text-muted-foreground mb-10 text-center max-w-xl">
        Choose how you want to interact. You can build full projects visually or chat with AI for ideas, debugging, and explanations.
      </p>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl">
        {/* Builder Card */}
        <Card
          className="cursor-pointer hover:border-primary transition-all duration-200"
          onClick={() => onSelect("BUILDER")}
        >
          <CardContent className="p-8 flex flex-col gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wrench className="text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Builder</h2>
            <p className="text-muted-foreground text-sm">
              Generate full applications, UI layouts, dashboards, landing pages,
              and structured projects with guided AI generation.
            </p>
            <Button className="mt-4 w-fit">
              Start Building
            </Button>
          </CardContent>
        </Card>

        {/* AI Chat Card */}
        <Card
          className="cursor-pointer hover:border-primary transition-all duration-200"
          onClick={() => onSelect("AI_CHAT")}
        >
          <CardContent className="p-8 flex flex-col gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot className="text-primary" />
            </div>
            <h2 className="text-xl font-semibold">AI Chat</h2>
            <p className="text-muted-foreground text-sm">
              Ask questions, debug code, brainstorm ideas, and iterate quickly
              with real-time AI responses.
            </p>
            <Button variant="secondary" className="mt-4 w-fit">
              Start Chatting
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}