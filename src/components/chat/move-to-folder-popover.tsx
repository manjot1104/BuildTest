'use client'

import { useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FolderOpen, Plus, Check, Loader2, FolderX } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ChatFolder {
  id: string
  name: string
  color: string | null
  chatCount: number
}

async function fetchFolders(): Promise<{ folders: ChatFolder[]; unfiledCount: number }> {
  const res = await fetch('/api/chat/folders')
  if (!res.ok) throw new Error('Failed to fetch folders')
  return res.json() as Promise<{ folders: ChatFolder[]; unfiledCount: number }>
}

export function MoveToFolderPopover({
  chatId,
  currentFolderId,
  children,
}: {
  chatId: string
  currentFolderId?: string | null
  children: React.ReactNode
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const { data } = useQuery({
    queryKey: ['chat-folders'],
    queryFn: fetchFolders,
    enabled: open,
  })

  const assignMutation = useMutation({
    mutationFn: async (folderId: string | null) => {
      const res = await fetch('/api/chat/folders/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, folderId }),
      })
      if (!res.ok) throw new Error('Failed to move chat')
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['chat-folders'] })
      void queryClient.invalidateQueries({ queryKey: ['chat-folder-chats'] })
      void queryClient.invalidateQueries({ queryKey: ['chat-history'] })
      setOpen(false)
      toast.success('Chat moved')
    },
    onError: () => {
      toast.error('Failed to move chat')
    },
  })

  const createAndAssign = useMutation({
    mutationFn: async (name: string) => {
      const createRes = await fetch('/api/chat/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!createRes.ok) throw new Error('Failed to create folder')
      const { folder } = await createRes.json() as { folder: { id: string } }

      const assignRes = await fetch('/api/chat/folders/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, folderId: folder.id }),
      })
      if (!assignRes.ok) throw new Error('Failed to assign chat')
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['chat-folders'] })
      void queryClient.invalidateQueries({ queryKey: ['chat-history'] })
      setOpen(false)
      setIsCreating(false)
      setNewName('')
      toast.success('Folder created & chat moved')
    },
    onError: () => {
      toast.error('Failed to create folder')
    },
  })

  const folders = data?.folders ?? []

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1.5" align="end" side="bottom">
        <p className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Move to folder
        </p>

        <div className="mt-1 max-h-48 overflow-y-auto">
          {/* Remove from folder option */}
          {currentFolderId && (
            <button
              type="button"
              onClick={() => assignMutation.mutate(null)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
            >
              <FolderX className="size-3.5" />
              Remove from folder
            </button>
          )}

          {/* Folder list */}
          {folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => assignMutation.mutate(folder.id)}
              disabled={folder.id === currentFolderId}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent transition-colors',
                folder.id === currentFolderId && 'opacity-50 cursor-default',
              )}
            >
              <div
                className="size-2.5 rounded-full shrink-0"
                style={{ backgroundColor: folder.color ?? '#6B7280' }}
              />
              <span className="truncate flex-1 text-left">{folder.name}</span>
              {folder.id === currentFolderId && <Check className="size-3 text-primary" />}
            </button>
          ))}

          {folders.length === 0 && !isCreating && (
            <p className="px-2 py-3 text-[11px] text-center text-muted-foreground">
              No folders yet
            </p>
          )}
        </div>

        {/* Create new folder */}
        {isCreating ? (
          <div className="mt-1 border-t pt-1.5 flex gap-1">
            <Input
              autoFocus
              placeholder="Folder name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim()) createAndAssign.mutate(newName.trim())
                if (e.key === 'Escape') setIsCreating(false)
              }}
              className="h-7 text-xs"
            />
            <Button
              size="icon"
              className="size-7 shrink-0"
              onClick={() => newName.trim() && createAndAssign.mutate(newName.trim())}
              disabled={createAndAssign.isPending || !newName.trim()}
            >
              {createAndAssign.isPending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setIsCreating(true); setNewName('') }}
            className="mt-1 flex w-full items-center gap-2 rounded-md border-t px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
          >
            <Plus className="size-3.5" />
            New Folder
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}
