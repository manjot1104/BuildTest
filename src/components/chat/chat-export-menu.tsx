"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { Download, Share2, FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ExportMessage {
  role: string
  content: string
  timestamp?: string
}

interface ChatExportMenuProps {
  chatId: string
  chatType: "BUILDER" | "OPENROUTER"
  title?: string
  /** For builder chats where messages are client-side */
  messages?: ExportMessage[]
  disabled?: boolean
}

export function ChatExportMenu({
  chatId,
  chatType,
  title,
  messages,
  disabled,
}: ChatExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false)

  const callExportApi = async (action: "markdown" | "share") => {
    const res = await fetch("/api/chat-export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId,
        chatType,
        action,
        title,
        messages,
      }),
    })

    if (!res.ok) {
      const data = (await res.json()) as { error?: string }
      throw new Error(data.error ?? "Export failed")
    }

    return res.json()
  }

  const handleMarkdownExport = async () => {
    setIsExporting(true)
    try {
      const data = (await callExportApi("markdown")) as { markdown: string; title: string }
      const blob = new Blob([data.markdown], { type: "text/markdown" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${data.title.slice(0, 50).replace(/[^a-zA-Z0-9 -]/g, "")}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Chat exported as Markdown")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed")
    } finally {
      setIsExporting(false)
    }
  }

  const handleShareLink = async () => {
    setIsExporting(true)
    try {
      const data = (await callExportApi("share")) as { shareUrl: string }
      const fullUrl = `${window.location.origin}${data.shareUrl}`
      await navigator.clipboard.writeText(fullUrl)
      toast.success("Share link copied to clipboard")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Share failed")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={disabled || isExporting}
            >
              {isExporting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Share2 className="size-3.5" />
              )}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Export / Share</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleShareLink}>
          <Share2 className="mr-2 size-3.5" />
          Copy share link
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleMarkdownExport}>
          <FileText className="mr-2 size-3.5" />
          Download as Markdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
