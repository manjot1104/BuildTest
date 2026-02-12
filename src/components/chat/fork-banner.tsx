'use client'

import { GitFork, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ForkBannerProps {
  isAuthenticated: boolean
  isForking: boolean
  onFork: () => void
  onSignIn: () => void
}

export function ForkBanner({
  isAuthenticated,
  isForking,
  onFork,
  onSignIn,
}: ForkBannerProps) {
  return (
    <div className="border-t border-border bg-muted/30 px-4 py-3">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            This chat was shared by someone else
          </p>
          <p className="text-xs text-muted-foreground">
            Fork it to make your own copy and continue building
          </p>
        </div>
        {isAuthenticated ? (
          <Button
            onClick={onFork}
            disabled={isForking}
            size="sm"
            className="shrink-0"
          >
            <GitFork className="mr-1.5 h-4 w-4" />
            {isForking ? 'Forking...' : 'Fork'}
          </Button>
        ) : (
          <Button
            onClick={onSignIn}
            variant="outline"
            size="sm"
            className="shrink-0"
          >
            <LogIn className="mr-1.5 h-4 w-4" />
            Sign in to Fork
          </Button>
        )}
      </div>
    </div>
  )
}
