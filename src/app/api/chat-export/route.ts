import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/server/better-auth/server"
import { db } from "@/server/db"
import { conversation_messages, conversations, shared_chat_links, user_chats } from "@/server/db/schema"
import { eq, asc } from "drizzle-orm"
import { randomBytes } from "crypto"

interface ExportMessage {
  role: string
  content: string
  timestamp?: string
}

/** POST /api/chat-export — export chat as markdown or create a share link */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json()) as {
    chatId: string
    chatType: "BUILDER" | "OPENROUTER"
    action: "markdown" | "share"
    title?: string
    // For client-side messages (builder chat) — passed from the frontend
    messages?: ExportMessage[]
  }

  const { chatId, chatType, action, title } = body

  if (!chatId || !chatType || !action) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  let messages: ExportMessage[] = []

  if (body.messages && body.messages.length > 0) {
    // Use client-provided messages (builder chat where messages live in V0)
    messages = body.messages
  } else if (chatType === "OPENROUTER") {
    // Fetch from conversation_messages table
    const dbMessages = await db
      .select()
      .from(conversation_messages)
      .where(eq(conversation_messages.conversation_id, chatId))
      .orderBy(asc(conversation_messages.created_at))

    messages = dbMessages.map((m) => ({
      role: m.role.toLowerCase(),
      content: m.content,
      timestamp: m.created_at.toISOString(),
    }))
  }

  if (messages.length === 0) {
    return NextResponse.json({ error: "No messages found" }, { status: 404 })
  }

  // Resolve title
  const chatTitle = title ?? messages.find((m) => m.role === "user")?.content.slice(0, 60) ?? "Chat Export"

  if (action === "markdown") {
    const markdown = buildMarkdown(chatTitle, messages)
    return NextResponse.json({ markdown, title: chatTitle })
  }

  if (action === "share") {
    const token = randomBytes(16).toString("hex")
    const id = randomBytes(8).toString("hex")

    await db.insert(shared_chat_links).values({
      id,
      token,
      user_id: session.user.id,
      chat_type: chatType,
      chat_id: chatId,
      title: chatTitle,
      messages: JSON.stringify(messages),
    })

    const shareUrl = `/shared/${token}`
    return NextResponse.json({ shareUrl, token })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}

function buildMarkdown(title: string, messages: ExportMessage[]): string {
  const lines: string[] = []
  lines.push(`# ${title}`)
  lines.push("")
  lines.push(`*Exported from Buildify on ${new Date().toLocaleDateString()}*`)
  lines.push("")
  lines.push("---")
  lines.push("")

  for (const msg of messages) {
    const role = msg.role === "user" ? "You" : "Assistant"
    lines.push(`### ${role}`)
    lines.push("")
    lines.push(msg.content)
    lines.push("")
    lines.push("---")
    lines.push("")
  }

  return lines.join("\n")
}
