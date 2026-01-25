'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowDownIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useCallback } from 'react'

// Simple implementation without use-stick-to-bottom dependency
export type ConversationProps = ComponentProps<'div'>

export const Conversation = ({ className, ...props }: ConversationProps) => (
  <div
    className={cn('relative flex-1 overflow-y-auto', className)}
    role="log"
    {...props}
  />
)

export type ConversationContentProps = ComponentProps<'div'>

export const ConversationContent = ({
  className,
  ...props
}: ConversationContentProps) => (
  <div className={cn('p-4', className)} {...props} />
)

export type ConversationScrollButtonProps = ComponentProps<typeof Button> & {
  isAtBottom?: boolean
  scrollToBottom?: () => void
}

export const ConversationScrollButton = ({
  className,
  isAtBottom = false,
  scrollToBottom,
  ...props
}: ConversationScrollButtonProps) => {
  const handleScrollToBottom = useCallback(() => {
    scrollToBottom?.()
  }, [scrollToBottom])

  return (
    !isAtBottom && (
      <Button
        className={cn(
          'absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full',
          className,
        )}
        onClick={handleScrollToBottom}
        size="icon"
        type="button"
        variant="outline"
        {...props}
      >
        <ArrowDownIcon className="size-4" />
      </Button>
    )
  )
}
