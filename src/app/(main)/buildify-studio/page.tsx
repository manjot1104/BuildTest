'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, Trash2, Globe, GlobeLock, Loader2,
  LayoutTemplate, Palette, Zap, ExternalLink, Clock,
  Sparkles, Layers, ArrowRight,
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
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
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
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <Loader2 className="relative size-6 animate-spin text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Loading your designs...</p>
        </div>
      </div>
    )
  }

  const liveCount = designs.filter((p) => p.isPublished).length

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 pb-20">

      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-card/80">
        {/* Animated background mesh */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -right-20 -top-20 size-80 animate-pulse rounded-full opacity-30 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-10 -left-10 size-60 rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)', animationDelay: '1s', animationDuration: '3s' }}
          />
          <div
            className="absolute right-1/3 top-1/2 size-40 animate-pulse rounded-full opacity-15 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)', animationDelay: '2s' }}
          />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
        </div>

        <div className="relative px-8 py-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 blur-sm" />
                <div className="relative flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5">
                  <Sparkles className="size-7 text-primary" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Buildify Studio</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Design, build, and publish beautiful pages
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {designs.length > 0 && (
                <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-background/50 px-4 py-2.5 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-green-500" />
                    </span>
                    <span className="text-xs font-medium">{liveCount} live</span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-muted-foreground/30" />
                    <span className="text-xs text-muted-foreground">{designs.length - liveCount} draft</span>
                  </div>
                </div>
              )}
              <Button
                onClick={() => router.push('/buildify-studio/new')}
                size="lg"
                className="gap-2 shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30"
              >
                <Plus className="size-4" />
                New Design
              </Button>
            </div>
          </div>
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
            className="group flex h-full min-h-[260px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-border/60 text-muted-foreground transition-all duration-300 hover:border-primary/40 hover:bg-primary/[0.03] hover:text-primary hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="relative">
              <div className="absolute -inset-3 rounded-2xl bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative flex size-14 items-center justify-center rounded-2xl border-2 border-dashed border-current opacity-40 transition-all group-hover:opacity-100 group-hover:border-solid group-hover:bg-primary/10">
                <Plus className="size-6" />
              </div>
            </div>
            <div className="text-center">
              <span className="block text-sm font-semibold">New Design</span>
              <span className="block text-xs opacity-60">Start from scratch or template</span>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/60 bg-gradient-to-b from-card/80 to-card/40 px-8 py-24 text-center">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-0 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      <div className="relative flex flex-col items-center">
        {/* Icon stack */}
        <div className="relative mb-8">
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/10 to-purple-500/10 blur-xl" />
          <div className="relative flex size-24 items-center justify-center rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/10 to-primary/5">
            <LayoutTemplate className="size-12 text-primary" />
          </div>
          <div className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full border-2 border-background bg-primary shadow-lg">
            <Plus className="size-4 text-primary-foreground" />
          </div>
        </div>

        <h2 className="mb-2 text-xl font-bold tracking-tight">No designs yet</h2>
        <p className="mb-10 max-w-md text-sm leading-relaxed text-muted-foreground">
          Create stunning pages — portfolios, prototypes, landing pages, or stores — with our drag & drop editor and publish with one click.
        </p>

        {/* Feature highlights */}
        <div className="mb-10 flex flex-wrap justify-center gap-3">
          {[
            { icon: Palette, text: 'Drag & drop editor', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
            { icon: Layers, text: 'Templates included', color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
            { icon: Globe, text: 'One-click publish', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
          ].map(({ icon: Icon, text, color }) => (
            <div
              key={text}
              className={`flex items-center gap-2.5 rounded-full border px-4 py-2 text-xs font-medium ${color}`}
            >
              <Icon className="size-4" />
              {text}
            </div>
          ))}
        </div>

        <Button onClick={onNew} size="lg" className="gap-2.5 px-8 shadow-lg shadow-primary/20">
          <Sparkles className="size-4" />
          Create your first design
          <ArrowRight className="size-4" />
        </Button>
      </div>
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
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-border hover:shadow-xl hover:shadow-black/[0.08] dark:hover:shadow-black/30">
      {/* Gradient thumbnail */}
      <div
        className="relative flex h-40 items-center justify-center overflow-hidden"
        style={{ background: gradient }}
      >
        {/* Grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Large initial letter */}
        <span className="relative text-6xl font-black text-white/20 select-none transition-transform duration-300 group-hover:scale-110">
          {design.title.charAt(0).toUpperCase()}
        </span>

        {/* Status badge */}
        <div className="absolute right-3 top-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md ${
              design.isPublished
                ? 'bg-green-500/20 text-green-200 ring-1 ring-green-400/30'
                : 'bg-black/30 text-white/60 ring-1 ring-white/10'
            }`}
          >
            {design.isPublished ? (
              <>
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-green-400" />
                </span>
                Live
              </>
            ) : (
              <><GlobeLock className="size-2.5" /> Draft</>
            )}
          </span>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-[2px] transition-all duration-300 group-hover:opacity-100">
          <Link
            href={`/buildify-studio/${design.id}`}
            className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-xl transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            <Pencil className="size-3.5" />
            Open Editor
          </Link>
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold leading-tight">{design.title}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="size-3" />
            {formatDate(design.updatedAt)}
          </p>
        </div>

        {design.isPublished && design.slug && (
          <a
            href={`/p/${design.slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 truncate rounded-lg bg-primary/5 px-2.5 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
          >
            <ExternalLink className="size-3 shrink-0" />
            /p/{design.slug}
          </a>
        )}

        {/* Actions */}
        <div className="mt-auto flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="flex-1 gap-1.5 rounded-xl text-xs" asChild>
            <Link href={`/buildify-studio/${design.id}`}>
              <Pencil className="size-3.5" />
              Edit
            </Link>
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={isDeleting} className="rounded-xl px-2.5">
                {isDeleting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5 text-destructive/70 transition-colors group-hover:text-destructive" />
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
