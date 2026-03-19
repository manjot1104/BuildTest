'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  X, FolderOpen, Plus, Trash2, Pencil, Loader2,
  MessageSquare, ChevronRight, FolderX, Check,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatFolder {
  id: string
  name: string
  color: string | null
  position: number
  chatCount: number
}

interface FolderChat {
  id: string
  v0ChatId: string
  title: string | null
  prompt: string | null
  demoUrl: string | null
  createdAt: string
  type: 'builder' | 'openrouter'
  folderId: string | null
}

// ─── API helpers ─────────────────────────────────────────────────────────────

async function fetchFolders(): Promise<{ folders: ChatFolder[]; unfiledCount: number }> {
  const res = await fetch('/api/chat/folders')
  if (!res.ok) throw new Error('Failed to fetch folders')
  return res.json() as Promise<{ folders: ChatFolder[]; unfiledCount: number }>
}

async function fetchFolderChats(folderId: string): Promise<FolderChat[]> {
  const res = await fetch(`/api/chat/folders/${folderId}/chats`)
  if (!res.ok) throw new Error('Failed to fetch chats')
  return res.json() as Promise<FolderChat[]>
}

// ─── Color presets ───────────────────────────────────────────────────────────

const FOLDER_COLORS = [
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#F97316', // orange
  '#10B981', // emerald
  '#EAB308', // yellow
  '#6366F1', // indigo
  '#EF4444', // red
]

// ─── Component ───────────────────────────────────────────────────────────────

export function ChatFoldersDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(FOLDER_COLORS[0]!)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  // Fetch folders
  const { data, isLoading } = useQuery({
    queryKey: ['chat-folders'],
    queryFn: fetchFolders,
    enabled: open,
  })

  // Fetch chats for active folder
  const { data: folderChats, isLoading: chatsLoading } = useQuery({
    queryKey: ['chat-folder-chats', activeFolderId],
    queryFn: () => fetchFolderChats(activeFolderId!),
    enabled: open && !!activeFolderId,
  })

  // Create folder
  const createMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const res = await fetch('/api/chat/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? 'Failed to create folder')
      }
      return res.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['chat-folders'] })
      setIsCreating(false)
      setNewName('')
      toast.success('Folder created')
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  // Delete folder
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/chat/folders/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete folder')
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['chat-folders'] })
      if (activeFolderId) setActiveFolderId(null)
      toast.success('Folder deleted')
    },
    onError: () => {
      toast.error('Failed to delete folder')
    },
  })

  // Rename folder
  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`/api/chat/folders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Failed to rename folder')
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['chat-folders'] })
      setEditingId(null)
      toast.success('Folder renamed')
    },
    onError: () => {
      toast.error('Failed to rename folder')
    },
  })

  // Remove chat from folder
  const removeChatMutation = useMutation({
    mutationFn: async (chatId: string) => {
      const res = await fetch('/api/chat/folders/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, folderId: null }),
      })
      if (!res.ok) throw new Error('Failed to remove chat')
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['chat-folders'] })
      void queryClient.invalidateQueries({ queryKey: ['chat-folder-chats', activeFolderId] })
    },
  })

  const handleChatClick = (chat: FolderChat) => {
    if (chat.type === 'openrouter') {
      router.push(`/ai-chat?chatId=${chat.v0ChatId}`)
    } else {
      router.push(`/chat?chatId=${chat.v0ChatId}`)
    }
    onOpenChange(false)
  }

  const handleCreateSubmit = () => {
    if (!newName.trim()) return
    createMutation.mutate({ name: newName.trim(), color: newColor })
  }

  const handleRenameSubmit = (id: string) => {
    if (!editName.trim()) return
    renameMutation.mutate({ id, name: editName.trim() })
  }

  const folders = data?.folders ?? []
  const unfiledCount = data?.unfiledCount ?? 0

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="p-0 gap-0 overflow-hidden rounded-xl border shadow-lg"
        style={{ width: '95vw', maxWidth: '32rem' }}
      >
        <AlertDialogTitle className="sr-only">Chat Folders</AlertDialogTitle>
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              {activeFolderId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-md"
                  onClick={() => setActiveFolderId(null)}
                >
                  <ChevronRight className="size-3.5 rotate-180" />
                </Button>
              )}
              <div>
                <h2 className="text-base font-semibold tracking-tight">
                  {activeFolderId
                    ? folders.find((f) => f.id === activeFolderId)?.name ?? 'Folder'
                    : 'Chat Folders'}
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {activeFolderId
                    ? `${folderChats?.length ?? 0} conversations`
                    : 'Organize your conversations'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!activeFolderId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-foreground rounded-md"
                  onClick={() => { setIsCreating(true); setNewName(''); setNewColor(FOLDER_COLORS[0]!) }}
                >
                  <Plus className="size-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground rounded-md"
                onClick={() => onOpenChange(false)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="px-3 py-3 max-h-[60vh] overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Create new folder form */}
            {isCreating && !activeFolderId && (
              <div className="mb-3 rounded-lg border bg-muted/30 p-3 space-y-3">
                <Input
                  autoFocus
                  placeholder="Folder name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSubmit(); if (e.key === 'Escape') setIsCreating(false) }}
                  className="h-8 text-sm"
                />
                <div className="flex items-center gap-1.5">
                  {FOLDER_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={cn(
                        'size-5 rounded-full transition-all',
                        newColor === c ? 'ring-2 ring-offset-2 ring-offset-background' : 'opacity-60 hover:opacity-100',
                      )}
                      style={{ backgroundColor: c, ['--tw-ring-color' as string]: c }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={handleCreateSubmit} disabled={createMutation.isPending || !newName.trim()}>
                    {createMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                    Create
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Folder list */}
            {!activeFolderId && !isLoading && (
              <div className="flex flex-col gap-0.5">
                {folders.length === 0 && !isCreating && (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <div className="size-10 flex items-center justify-center bg-muted rounded-full">
                      <FolderOpen className="size-5 text-muted-foreground" />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      No folders yet
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 mt-1"
                      onClick={() => { setIsCreating(true); setNewName(''); setNewColor(FOLDER_COLORS[0]!) }}
                    >
                      <Plus className="size-3" />
                      Create Folder
                    </Button>
                  </div>
                )}

                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    {editingId === folder.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSubmit(folder.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          className="h-7 text-sm flex-1"
                        />
                        <Button size="icon" className="size-6" onClick={() => handleRenameSubmit(folder.id)}>
                          <Check className="size-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="flex flex-1 items-center gap-3 min-w-0 text-left"
                          onClick={() => setActiveFolderId(folder.id)}
                        >
                          <div
                            className="size-3 rounded-full shrink-0"
                            style={{ backgroundColor: folder.color ?? '#6B7280' }}
                          />
                          <span className="text-sm font-medium truncate flex-1">
                            {folder.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                            {folder.chatCount}
                          </span>
                          <ChevronRight className="size-3.5 text-muted-foreground/40 shrink-0" />
                        </button>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-muted-foreground"
                            onClick={(e) => { e.stopPropagation(); setEditingId(folder.id); setEditName(folder.name) }}
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-muted-foreground hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(folder.id) }}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {/* Unfiled count */}
                {folders.length > 0 && (
                  <div className="flex items-center gap-3 px-3 py-2 mt-1 border-t">
                    <FolderX className="size-3.5 text-muted-foreground/50 shrink-0" />
                    <span className="text-xs text-muted-foreground">
                      {unfiledCount} unfiled conversation{unfiledCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Folder chats view */}
            {activeFolderId && !chatsLoading && folderChats && (
              <div className="flex flex-col gap-0.5">
                {folderChats.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <div className="size-10 flex items-center justify-center bg-muted rounded-full">
                      <MessageSquare className="size-5 text-muted-foreground" />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      No chats in this folder
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Move chats here from your chat history
                    </p>
                  </div>
                )}

                {folderChats.map((chat) => (
                  <div
                    key={chat.v0ChatId}
                    className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <button
                      type="button"
                      className="flex flex-1 items-center gap-3 min-w-0 text-left"
                      onClick={() => handleChatClick(chat)}
                    >
                      <MessageSquare className="size-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {chat.title ?? chat.prompt ?? 'Untitled Chat'}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          {formatDistanceToNow(new Date(chat.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeChatMutation.mutate(chat.v0ChatId)}
                      title="Remove from folder"
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {activeFolderId && chatsLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
