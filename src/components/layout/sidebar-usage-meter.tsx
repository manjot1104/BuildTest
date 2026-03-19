'use client'

import { useState } from 'react'
import { Zap } from 'lucide-react'
import { useUserCredits } from '@/hooks/use-user-credits'
import { SubscriptionModal } from '@/components/payments/subscription-modal'
import { useSidebar } from '@/components/ui/sidebar'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export function SidebarUsageMeter() {
  const { credits, subscription, hasActiveSubscription, isLoading } = useUserCredits()
  const [modalOpen, setModalOpen] = useState(false)
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  const total = credits?.totalCredits ?? 0
  const subCredits = credits?.subscriptionCredits ?? 0
  const addCredits = credits?.additionalCredits ?? 0

  // Estimate a max for the progress bar based on subscription plan
  // Default cap at 500 for visual purposes
  const maxCredits = Math.max(total, 500)
  const percentage = Math.min((total / maxCredits) * 100, 100)

  const isEmpty = total === 0
  const isLow = total > 0 && total <= 50

  const barColor = isEmpty
    ? 'bg-red-500'
    : isLow
      ? 'bg-amber-500'
      : 'bg-primary'

  const barTrack = isEmpty
    ? 'bg-red-500/10'
    : isLow
      ? 'bg-amber-500/10'
      : 'bg-primary/10'

  if (isLoading) return null

  // Collapsed sidebar — show just an icon with tooltip
  if (isCollapsed) {
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className={cn(
                'mx-auto flex size-8 items-center justify-center rounded-lg transition-colors',
                isEmpty
                  ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20'
                  : isLow
                    ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                    : 'text-primary bg-primary/10 hover:bg-primary/20',
              )}
            >
              <Zap className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {total} credits remaining
          </TooltipContent>
        </Tooltip>
        <SubscriptionModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          hasActiveSubscription={hasActiveSubscription}
          currentCredits={total}
          currentPlanId={subscription?.plan_id ?? null}
        />
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="group mx-2 rounded-lg border border-border/50 bg-card/50 px-3 py-2.5 text-left transition-all hover:bg-accent/50 hover:border-border"
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Zap className={cn(
              'size-3',
              isEmpty ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-primary',
            )} />
            <span className="text-[11px] font-semibold text-foreground/80">Credits</span>
          </div>
          <span className={cn(
            'text-[11px] font-bold tabular-nums',
            isEmpty ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-foreground',
          )}>
            {total}
          </span>
        </div>

        {/* Progress bar */}
        <div className={cn('h-1.5 w-full rounded-full overflow-hidden', barTrack)}>
          <div
            className={cn('h-full rounded-full transition-all duration-500 ease-out', barColor)}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Breakdown */}
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[9px] text-muted-foreground">
            {subCredits > 0 && `${subCredits} sub`}
            {subCredits > 0 && addCredits > 0 && ' + '}
            {addCredits > 0 && `${addCredits} extra`}
            {subCredits === 0 && addCredits === 0 && 'No credits'}
          </span>
          <span className="text-[9px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
            {hasActiveSubscription ? 'Buy more' : 'Upgrade'}
          </span>
        </div>
      </button>

      <SubscriptionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        hasActiveSubscription={hasActiveSubscription}
        currentCredits={total}
        currentPlanId={subscription?.plan_id ?? null}
      />
    </>
  )
}
