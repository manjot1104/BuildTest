import { db } from "@/server/db"
import { shared_chat_links, user } from "@/server/db/schema"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import { SharedChatView } from "./shared-chat-view"

interface SharedMessage {
  role: string
  content: string
  timestamp?: string
}

export default async function SharedChatPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const [link] = await db
    .select({
      title: shared_chat_links.title,
      messages: shared_chat_links.messages,
      created_at: shared_chat_links.created_at,
      chat_type: shared_chat_links.chat_type,
      user_id: shared_chat_links.user_id,
    })
    .from(shared_chat_links)
    .where(eq(shared_chat_links.token, token))
    .limit(1)

  if (!link) notFound()

  // Get the username
  const [author] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, link.user_id))
    .limit(1)

  const messages: SharedMessage[] = JSON.parse(link.messages)

  return (
    <SharedChatView
      title={link.title ?? "Shared Chat"}
      messages={messages}
      chatType={link.chat_type}
      authorName={author?.name ?? "Anonymous"}
      sharedAt={link.created_at.toISOString()}
    />
  )
}
