import { getSession } from '@/server/better-auth/server'
import {
  createChatFolder,
  getChatFoldersByUserId,
  updateChatFolder,
  deleteChatFolder,
  assignChatToFolder,
  getChatsByFolderId,
  getUnfiledChatCount,
} from '@/server/db/queries'

export async function createFolderHandler({ body }: { body: { name: string; color?: string } }) {
  const session = await getSession()
  if (!session?.user?.id) return { error: 'Unauthorized', status: 401 }

  const { name, color } = body
  if (!name?.trim()) return { error: 'Folder name is required', status: 400 }

  try {
    const folder = await createChatFolder({
      userId: session.user.id,
      name,
      color,
    })
    return { folder }
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505') {
      return { error: 'A folder with this name already exists', status: 409 }
    }
    throw err
  }
}

export async function getFoldersHandler() {
  const session = await getSession()
  if (!session?.user?.id) return { error: 'Unauthorized', status: 401 }

  const folders = await getChatFoldersByUserId(session.user.id)
  const unfiledCount = await getUnfiledChatCount(session.user.id)

  return { folders, unfiledCount }
}

export async function updateFolderHandler({
  params,
  body,
}: {
  params: { id: string }
  body: { name?: string; color?: string | null; position?: number }
}) {
  const session = await getSession()
  if (!session?.user?.id) return { error: 'Unauthorized', status: 401 }

  await updateChatFolder(params.id, session.user.id, body)
  return { success: true }
}

export async function deleteFolderHandler({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user?.id) return { error: 'Unauthorized', status: 401 }

  await deleteChatFolder(params.id, session.user.id)
  return { success: true }
}

export async function assignChatToFolderHandler({
  body,
}: {
  body: { chatId: string; folderId: string | null }
}) {
  const session = await getSession()
  if (!session?.user?.id) return { error: 'Unauthorized', status: 401 }

  await assignChatToFolder({
    chatId: body.chatId,
    folderId: body.folderId,
    userId: session.user.id,
  })
  return { success: true }
}

export async function getFolderChatsHandler({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user?.id) return { error: 'Unauthorized', status: 401 }

  const chats = await getChatsByFolderId({
    folderId: params.id,
    userId: session.user.id,
  })

  return chats.map((chat) => ({
    id: chat.id,
    v0ChatId: chat.v0_chat_id ?? chat.conversation_id ?? chat.id,
    title: chat.title,
    prompt: chat.prompt,
    demoUrl: chat.demo_url,
    createdAt: chat.created_at.toISOString(),
    type: chat.chat_type?.toLowerCase() === 'openrouter' ? 'openrouter' : 'builder',
    folderId: chat.folder_id,
  }))
}
