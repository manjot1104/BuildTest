'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, Trash2, Globe, GlobeLock, Loader2,
  LayoutTemplate, ExternalLink, Clock,
  Sparkles, ArrowRight, MousePointerClick, Rocket, PenTool,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface DesignCard {
  id: string
  title: string
  slug: string | null
  isPublished: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

const THUMB_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
]

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function BuildifyStudioPage() {
  const router = useRouter()
  const [designs, setDesigns] = useState<DesignCard[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchDesigns = async () => {
    try {
      const res = await fetch('/api/designs')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = (await res.json()) as DesignCard[]
      setDesigns(data)
    } catch {
      toast.error('Failed to load designs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchDesigns() }, [])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/design/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setDesigns((prev) => prev.filter((p) => p.id !== id))
      toast.success('Design deleted')
    } catch {
      toast.error('Failed to delete design')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="size-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Loading designs...</p>
        </div>
      </div>
    )
  }

  const liveCount = designs.filter((p) => p.isPublished).length
  const draftCount = designs.length - liveCount

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-8 pb-20">

      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buildify Studio</h1>
          <p className="mt-1.5 text-muted-foreground">
            Design, build, and publish beautiful pages
          </p>
        </div>

        <div className="flex items-center gap-3">
          {designs.length > 0 && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <span className="font-medium text-foreground">{liveCount}</span> live
              </div>
              <span className="text-border">|</span>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-muted-foreground/30" />
                <span className="font-medium text-foreground">{draftCount}</span> draft
              </div>
            </div>
          )}
          <Button
            onClick={() => router.push('/buildify-studio/new')}
            size="lg"
            className="gap-2 px-6"
          >
            <Plus className="size-4" />
            New Design
          </Button>
        </div>
      </div>

      {/* Content */}
      {designs.length === 0 ? (
        <EmptyState onNew={() => router.push('/buildify-studio/new')} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map((design, i) => (
            <DesignCardItem
              key={design.id}
              design={design}
              gradient={THUMB_GRADIENTS[i % THUMB_GRADIENTS.length]!}
              isDeleting={deletingId === design.id}
              onDelete={() => void handleDelete(design.id)}
            />
          ))}

          {/* Add new card */}
          <button
            type="button"
            onClick={() => router.push('/buildify-studio/new')}
            className="group flex h-full min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border text-muted-foreground transition-all duration-200 hover:border-primary/50 hover:bg-primary/[0.02] hover:text-primary"
          >
            <div className="flex size-12 items-center justify-center rounded-xl border border-dashed border-current transition-colors group-hover:border-solid group-hover:bg-primary/10">
              <Plus className="size-5" />
            </div>
            <span className="text-sm font-medium">Create new design</span>
          </button>
        </div>
      )}
    </div>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center pt-8 pb-4">
      {/* Illustration area */}
      <div className="relative mb-10">
        <div className="absolute -inset-8 rounded-full bg-primary/5" />
        <div className="absolute -inset-16 rounded-full bg-primary/[0.02]" />
        <div className="relative flex size-20 items-center justify-center rounded-2xl bg-primary/10">
          <LayoutTemplate className="size-10 text-primary" />
        </div>
      </div>

      <h2 className="mb-2 text-2xl font-bold tracking-tight">Start building</h2>
      <p className="mb-8 max-w-sm text-center text-sm leading-relaxed text-muted-foreground">
        Create portfolios, landing pages, prototypes, and more with our visual editor. Publish with a single click.
      </p>

      {/* Feature cards */}
      <div className="mb-10 grid w-full max-w-lg grid-cols-3 gap-3">
        {[
          { icon: MousePointerClick, title: 'Drag & Drop', desc: 'Visual editor' },
          { icon: PenTool, title: 'Templates', desc: 'Ready to use' },
          { icon: Rocket, title: 'Publish', desc: 'One click' },
        ].map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center"
          >
            <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
              <Icon className="size-4.5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-semibold">{title}</p>
              <p className="text-[11px] text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={onNew} size="lg" className="gap-2 px-8">
        <Sparkles className="size-4" />
        Create your first design
        <ArrowRight className="size-4" />
      </Button>
    </div>
  )
}

function DesignCardItem({
  design,
  gradient,
  isDeleting,
  onDelete,
}: {
  design: DesignCard
  gradient: string
  isDeleting: boolean
  onDelete: () => void
}) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all duration-200 hover:shadow-lg hover:shadow-black/[0.08] dark:hover:shadow-black/[0.3]">
      {/* Gradient thumbnail */}
      <Link
        href={`/buildify-studio/${design.id}`}
        className="relative flex h-44 items-center justify-center overflow-hidden"
        style={{ background: gradient }}
      >
        {/* Dot pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        />

        {/* Large initial letter */}
        <span className="relative text-7xl font-black text-white/25 select-none transition-transform duration-300 group-hover:scale-110">
          {design.title.charAt(0).toUpperCase()}
        </span>

        {/* Status badge */}
        <div className="absolute left-3 top-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm ${
              design.isPublished
                ? 'bg-emerald-500/20 text-white border border-emerald-400/30'
                : 'bg-black/20 text-white/70 border border-white/10'
            }`}
          >
            {design.isPublished ? (
              <>
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Live
              </>
            ) : (
              <><GlobeLock className="size-2.5" /> Draft</>
            )}
          </span>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 backdrop-blur-[2px] transition-all duration-200 group-hover:opacity-100">
          <span className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-xl">
            <Pencil className="size-3.5" />
            Open Editor
          </span>
        </div>
      </Link>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="min-w-0">
          <h2 className="truncate font-semibold leading-tight">{design.title}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3" />
            Edited {formatDate(design.updatedAt)}
          </p>
        </div>

        {design.isPublished && design.slug && (
          <a
            href={`/p/${design.slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 truncate rounded-md bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Globe className="size-3 shrink-0" />
            <span className="truncate">/p/{design.slug}</span>
            <ExternalLink className="ml-auto size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
        )}

        {/* Actions */}
        <div className="mt-auto flex gap-2 pt-2 border-t border-border/50">
          <Button size="sm" variant="ghost" className="flex-1 gap-1.5 text-xs h-8" asChild>
            <Link href={`/buildify-studio/${design.id}`}>
              <Pencil className="size-3" />
              Edit
            </Link>
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" disabled={isDeleting} className="h-8 px-2 text-muted-foreground hover:text-destructive">
                {isDeleting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this design?</AlertDialogTitle>
                <AlertDialogDescription>
                  &ldquo;{design.title}&rdquo; will be permanently deleted
                  {design.isPublished && ' and unpublished'}. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}
