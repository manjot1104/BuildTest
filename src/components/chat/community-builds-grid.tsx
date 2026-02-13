'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useCommunityBuilds, useFeaturedBuilds } from '@/client-api/query-hooks'
import { type CommunityBuildItem } from '@/types/api.types'
import { cn } from '@/lib/utils'
import { Globe, Users, ExternalLink, Loader2, Trophy, Clock } from 'lucide-react'

const IFRAME_WIDTH = 1280
const IFRAME_HEIGHT = 720

type CommunityTab = 'featured' | 'recent'

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function AuthorAvatar({ name, image }: { name: string; image?: string | null }) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name}
        className="w-5 h-5 rounded-full object-cover"
      />
    )
  }

  const initial = name.charAt(0).toUpperCase()
  return (
    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-medium">
      {initial}
    </div>
  )
}

function DemoThumbnail({ demoUrl, title }: { demoUrl: string; title?: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [iframeError, setIframeError] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setScale(entry.contentRect.width / IFRAME_WIDTH)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (iframeError) {
    return (
      <div ref={containerRef} className="w-full h-full bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 flex items-center justify-center">
        <Globe className="w-8 h-8 text-muted-foreground/30" />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* Loading shimmer while iframe loads */}
      {!iframeLoaded && (
        <div className="absolute inset-0 bg-muted/40 animate-pulse" />
      )}
      {scale > 0 && (
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            width: `${IFRAME_WIDTH}px`,
            height: `${IFRAME_HEIGHT}px`,
            transform: `scale(${scale})`,
          }}
        >
          <iframe
            src={demoUrl}
            title={title ?? 'Community build preview'}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
            loading="lazy"
            onLoad={() => setIframeLoaded(true)}
            onError={() => setIframeError(true)}
          />
        </div>
      )}
    </div>
  )
}

function CommunityBuildCard({ build }: { build: CommunityBuildItem }) {
  const router = useRouter()

  const handleClick = () => {
    router.push(`/chat?chatId=${build.v0ChatId}`)
  }

  const handleDemoClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (build.demoUrl) {
      window.open(build.demoUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group cursor-pointer rounded-xl border border-border/50 bg-card',
        'hover:border-border hover:shadow-md transition-all duration-200',
        'overflow-hidden'
      )}
    >
      {/* Thumbnail — scaled iframe of the demo URL */}
      <div className="relative aspect-video bg-muted/30 overflow-hidden pointer-events-none">
        {build.demoUrl ? (
          <DemoThumbnail demoUrl={build.demoUrl} title={build.title} />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 flex items-center justify-center">
            <Globe className="w-8 h-8 text-muted-foreground/30" />
          </div>
        )}

        {/* Demo URL overlay button — re-enable pointer-events */}
        {build.demoUrl && (
          <button
            onClick={handleDemoClick}
            className={cn(
              'absolute top-2 right-2 p-1.5 rounded-lg z-10 pointer-events-auto',
              'bg-black/60 text-white backdrop-blur-sm',
              'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
              'hover:bg-black/80'
            )}
            title="Open demo"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Title */}
        <h3 className="text-sm font-medium text-foreground truncate">
          {build.title ?? 'Untitled'}
        </h3>

        {/* Prompt excerpt */}
        {build.prompt && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
            {build.prompt}
          </p>
        )}

        {/* Author + timestamp */}
        <div className="flex items-center gap-1.5 mt-2.5">
          <AuthorAvatar name={build.authorName} image={build.authorImage} />
          <span className="text-xs text-muted-foreground truncate">
            {build.authorName}
          </span>
          <span className="text-xs text-muted-foreground/50 ml-auto shrink-0">
            {formatRelativeTime(build.createdAt)}
          </span>
        </div>
      </div>
    </div>
  )
}

function CommunityBuildSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden animate-pulse">
      <div className="aspect-video bg-muted/40" />
      <div className="p-3">
        <div className="h-4 bg-muted/40 rounded w-3/4" />
        <div className="h-3 bg-muted/30 rounded w-full mt-2" />
        <div className="h-3 bg-muted/30 rounded w-2/3 mt-1" />
        <div className="flex items-center gap-1.5 mt-2.5">
          <div className="w-5 h-5 rounded-full bg-muted/40" />
          <div className="h-3 bg-muted/30 rounded w-16" />
        </div>
      </div>
    </div>
  )
}

const FEATURED_AUTHOR_NAMES: Record<string, string> = {
  unSTagzurr3: 'Emily Carter',
  p1MPkIWe8uf: 'James Mitchell',
  mqAy74clyRY: 'Sarah Thompson',
  s9a45Mv5S5h: 'Michael Brooks',
  pwAhgqhDp0K: 'Olivia Bennett',
  BiZl3MMj1fB: 'Daniel Foster',
}

function FeaturedBuildsContent() {
  const { data, isLoading, isError } = useFeaturedBuilds()

  const builds = useMemo(
    () =>
      (data?.data ?? []).map((build) => ({
        ...build,
        authorName: FEATURED_AUTHOR_NAMES[build.v0ChatId] ?? build.authorName,
        authorImage: FEATURED_AUTHOR_NAMES[build.v0ChatId] ? null : build.authorImage,
      })),
    [data],
  )

  if (isError) return null
  if (!isLoading && builds.length === 0) return null

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <CommunityBuildSkeleton key={i} />
            ))
          : builds.map((build) => (
              <CommunityBuildCard key={build.id} build={build} />
            ))}
      </div>
    </>
  )
}

function RecentBuildsContent() {
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useCommunityBuilds()

  const allBuilds = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data],
  )

  if (isError) return null
  if (!isLoading && allBuilds.length === 0) return null

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <CommunityBuildSkeleton key={i} />
            ))
          : allBuilds.map((build) => (
              <CommunityBuildCard key={build.id} build={build} />
            ))}
        {isFetchingNextPage &&
          Array.from({ length: 3 }).map((_, i) => (
            <CommunityBuildSkeleton key={`next-${i}`} />
          ))}
      </div>

      {/* Load More */}
      {hasNextPage && !isFetchingNextPage && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => fetchNextPage()}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium',
              'bg-muted/50 hover:bg-muted border border-border/50 hover:border-border',
              'text-muted-foreground hover:text-foreground',
              'transition-colors duration-150',
            )}
          >
            Load more
          </button>
        </div>
      )}

      {/* Loading indicator for next page */}
      {isFetchingNextPage && (
        <div className="flex justify-center mt-6">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      )}
    </>
  )
}

export function CommunityBuildsGrid({ showHeader = true }: { showHeader?: boolean }) {
  const [activeTab, setActiveTab] = useState<CommunityTab>('featured')

  return (
    <section className={showHeader ? 'mt-12' : undefined}>
      {/* Section header */}
      {showHeader && (
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-muted-foreground">
            Community Builds
          </h2>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-border/50">
        <button
          onClick={() => setActiveTab('featured')}
          className={cn(
            'inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium',
            'border-b-2 transition-colors duration-150 -mb-px',
            activeTab === 'featured'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
          )}
        >
          <Trophy className="w-3.5 h-3.5" />
          Checkout some of the bests
        </button>
        <button
          onClick={() => setActiveTab('recent')}
          className={cn(
            'inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium',
            'border-b-2 transition-colors duration-150 -mb-px',
            activeTab === 'recent'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          Recent builds by community
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'featured' ? (
        <FeaturedBuildsContent />
      ) : (
        <RecentBuildsContent />
      )}
    </section>
  )
}
