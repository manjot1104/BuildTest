'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, Trash2, Globe, GlobeLock, Loader2,
  LayoutTemplate, Palette, Zap, ExternalLink, Clock,
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

// ─── Thumbnail gradients (cycle through on cards) ─────────────────────────────
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
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const liveCount = designs.filter((p) => p.isPublished).length

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">

      {/* ── Hero header ───────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
        {/* Decorative blobs */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full opacity-60"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/3 size-48 rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)' }}
        />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <LayoutTemplate className="size-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Buildify Studio</h1>
              <p className="text-sm text-muted-foreground">
                Design and publish your pages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {designs.length > 0 && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-green-500" />
                  {liveCount} live
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                  {designs.length - liveCount} draft
                </span>
              </div>
            )}
            <Button onClick={() => router.push('/buildify-studio/new')} className="gap-2">
              <Plus className="size-4" />
              New
            </Button>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {designs.length === 0 ? (
        <EmptyState onNew={() => router.push('/buildify-studio/new')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            className="group flex h-full min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
          >
            <div className="flex size-12 items-center justify-center rounded-xl border-2 border-dashed border-current opacity-50 transition-all group-hover:opacity-100">
              <Plus className="size-5" />
            </div>
            <span className="text-sm font-medium">New Design</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-8 py-20 text-center">
      {/* Icon */}
      <div className="mb-6 flex size-20 items-center justify-center rounded-3xl bg-primary/10">
        <LayoutTemplate className="size-10 text-primary" />
      </div>

      <h2 className="mb-2 text-lg font-semibold">No designs yet</h2>
      <p className="mb-8 max-w-sm text-sm text-muted-foreground">
        Build a beautiful page — portfolio, prototype, landing page, or e-commerce store — and publish it with one click.
      </p>

      {/* Feature highlights */}
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {[
          { icon: Palette, text: 'Drag & drop editor' },
          { icon: Zap, text: 'Templates included' },
          { icon: Globe, text: 'One-click publish' },
        ].map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground"
          >
            <Icon className="size-3.5 text-primary" />
            {text}
          </div>
        ))}
      </div>

      <Button onClick={onNew} size="lg" className="gap-2">
        <Plus className="size-4" />
        Create your first design
      </Button>
    </div>
  )
}

// ─── Design card ──────────────────────────────────────────────────────────────

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
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:border-border/80 hover:shadow-lg">
      {/* Gradient thumbnail */}
      <div
        className="relative flex h-36 items-center justify-center overflow-hidden"
        style={{ background: gradient }}
      >
        {/* Faint grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <span className="relative text-5xl font-black text-white/25 select-none">
          {design.title.charAt(0).toUpperCase()}
        </span>

        {/* Status badge */}
        <div className="absolute right-2.5 top-2.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm ${
              design.isPublished
                ? 'bg-green-500/20 text-green-300 ring-1 ring-green-500/30'
                : 'bg-black/30 text-white/60 ring-1 ring-white/10'
            }`}
          >
            {design.isPublished ? (
              <><Globe className="size-2.5" /> Live</>
            ) : (
              <><GlobeLock className="size-2.5" /> Draft</>
            )}
          </span>
        </div>

        {/* Edit overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover:opacity-100">
          <Link
            href={`/buildify-studio/${design.id}`}
            className="flex items-center gap-2 rounded-lg bg-white/90 px-4 py-2 text-xs font-semibold text-gray-900 shadow-md transition-transform hover:scale-105"
          >
            <Pencil className="size-3.5" />
            Open Editor
          </Link>
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold leading-tight">{design.title}</h2>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="size-3" />
              {formatDate(design.updatedAt)}
            </p>
          </div>
        </div>

        {design.isPublished && design.slug && (
          <a
            href={`/p/${design.slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 truncate text-[11px] text-primary hover:underline"
          >
            <ExternalLink className="size-3 shrink-0" />
            /p/{design.slug}
          </a>
        )}

        {/* Actions */}
        <div className="mt-auto flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" asChild>
            <Link href={`/buildify-studio/${design.id}`}>
              <Pencil className="size-3.5" />
              Edit
            </Link>
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={isDeleting} className="px-2.5">
                {isDeleting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5 text-destructive" />
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
