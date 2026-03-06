'use client'

import React, { useState } from 'react'
import { Check, Copy, ExternalLink, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PublishDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  personaId?: string
}

type PublishState = 'idle' | 'publishing' | 'done' | 'error'

export function PublishDialog({ open, onOpenChange, personaId }: PublishDialogProps) {
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('My Persona')
  const [state, setState] = useState<PublishState>('idle')
  const [publishedUrl, setPublishedUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handlePublish = async () => {
    if (!personaId) {
      setErrorMsg('Save your draft before publishing.')
      setState('error')
      return
    }
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
    if (!cleanSlug) return

    setState('publishing')
    setErrorMsg('')

    try {
      const res = await fetch(`/api/persona/${personaId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: cleanSlug, title: title.trim() || 'My Persona' }),
      })

      if (res.status === 409) {
        throw new Error('That slug is already taken. Try another.')
      }
      if (!res.ok) throw new Error('Failed to publish')

      const url = `${window.location.origin}/persona/${cleanSlug}`
      setPublishedUrl(url)
      setState('done')
    } catch (err) {
      setState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const copyUrl = async () => {
    await navigator.clipboard.writeText(publishedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    if (state !== 'publishing') {
      onOpenChange(false)
      setState('idle')
      setSlug('')
      setPublishedUrl('')
      setErrorMsg('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publish Your Persona</DialogTitle>
          <DialogDescription>
            Choose a URL slug for your published persona page.
          </DialogDescription>
        </DialogHeader>

        {state === 'done' ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-green-700 dark:text-green-400">
              <Check className="size-5 shrink-0" />
              <span className="text-sm font-medium">Published successfully!</span>
            </div>

            <div>
              <Label className="mb-1.5 block text-sm">Your persona URL</Label>
              <div className="flex gap-2">
                <Input value={publishedUrl} readOnly className="font-mono text-xs" />
                <Button size="icon" variant="outline" onClick={copyUrl} title="Copy URL">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  asChild
                  title="Open in new tab"
                >
                  <a href={publishedUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Close</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {!personaId && (
              <p className="rounded-md bg-yellow-500/10 px-3 py-2 text-sm text-yellow-700 dark:text-yellow-400">
                Save your draft first (Ctrl+S) before publishing.
              </p>
            )}

            <div>
              <Label htmlFor="pb-title" className="mb-1.5 block text-sm">
                Page Title
              </Label>
              <Input
                id="pb-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Persona"
              />
            </div>

            <div>
              <Label htmlFor="pb-slug" className="mb-1.5 block text-sm">
                URL Slug
              </Label>
              <div className="flex items-center gap-0 overflow-hidden rounded-md border border-input">
                <span className="shrink-0 bg-muted px-3 py-2 text-xs text-muted-foreground">
                  /persona/
                </span>
                <input
                  id="pb-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  placeholder="your-name"
                  className="flex-1 bg-background px-2 py-2 text-sm outline-none"
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Only lowercase letters, numbers, and hyphens
              </p>
            </div>

            {state === 'error' && (
              <p className="text-sm text-destructive">{errorMsg}</p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={state === 'publishing'}>
                Cancel
              </Button>
              <Button
                onClick={handlePublish}
                disabled={!slug.trim() || state === 'publishing' || !personaId}
              >
                {state === 'publishing' ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Publishing…
                  </>
                ) : (
                  'Publish'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
