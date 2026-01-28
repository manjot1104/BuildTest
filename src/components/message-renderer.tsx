import React from 'react'
import { Message, type MessageBinaryFormat } from '@v0-sdk/react'
import { sharedComponents } from './shared-components'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { authClient } from '@/server/better-auth/client'
import { type MessageBinaryFormatRow } from '@/types/api.types'

// Function to preprocess message content and remove V0_FILE markers and shell placeholders
function preprocessMessageContent(
  content: MessageBinaryFormat,
): MessageBinaryFormat {
  if (!Array.isArray(content)) return content

  return content.map((row) => {
    if (!Array.isArray(row)) return row

    // Process text content to remove V0_FILE markers and shell placeholders
    const processedRow = row.map((item: unknown) => {
      if (typeof item === 'string') {
        // Remove V0_FILE markers with various patterns
        let processed = item.replace(/\[V0_FILE\][^:]*:file="[^"]*"\n?/g, '')
        processed = processed.replace(/\[V0_FILE\][^\n]*\n?/g, '')

        // Remove shell placeholders with various patterns
        processed = processed.replace(/\.\.\. shell \.\.\./g, '')
        processed = processed.replace(/\.\.\.\s*shell\s*\.\.\./g, '')

        // Remove empty lines that might be left behind
        processed = processed.replace(/\n\s*\n\s*\n/g, '\n\n')
        processed = processed.replace(/^\s*\n+/g, '') // Remove leading empty lines
        processed = processed.replace(/\n+\s*$/g, '') // Remove trailing empty lines
        processed = processed.trim()

        // If the processed string is empty or only whitespace, return empty string
        if (!processed || /^\s*$/.exec(processed)) {
          return ''
        }

        return processed
      }
      return item
    })

    // Type assertion to maintain MessageBinaryFormat structure
    // The first element is always a number (the row type identifier)
    return processedRow as MessageBinaryFormatRow
  }) as MessageBinaryFormat
}

interface MessageRendererProps {
  content: MessageBinaryFormat | string
  messageId?: string
  role: 'user' | 'assistant'
  className?: string
}

export function MessageRenderer({
  content,
  messageId,
  role,
  className,
}: MessageRendererProps) {
  const { data: session } = authClient.useSession()
  const user = session?.user

  const userInitials =
    user?.name
      ?.split(' ')
      .map((name) => name[0])
      .join('')
      .toUpperCase() ?? 'U'
  const aiInitials = 'AI'

  const isUser = role === 'user'

  // Subtle animation variants for professional feel
  const messageVariants = {
    initial: { opacity: 0, y: 4 },
    animate: {
      opacity: 1,
      y: 0,
    },
  }

  // If content is a string (user message or fallback), render it as plain text
  if (typeof content === 'string') {
    return (
      <motion.div
        initial="initial"
        animate="animate"
        variants={messageVariants}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={cn(
          'flex items-end gap-2 w-full',
          isUser ? 'justify-end' : 'justify-start flex-row-reverse',
          className,
        )}
      >
        {/* Avatar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="shrink-0"
        >
          <Avatar
            size="default"
            className={cn(
              'ring-1 ring-border',
              isUser ? 'bg-muted' : 'bg-secondary/50',
            )}
          >
            <AvatarFallback
              className={cn(
                'text-xs font-medium',
                isUser
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-secondary/50 text-secondary-foreground',
              )}
            >
              {isUser ? userInitials : aiInitials}
            </AvatarFallback>
          </Avatar>
        </motion.div>

        {/* Message Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className={cn(
            'rounded-lg px-4 py-3 text-sm',
            'flex flex-col gap-2 overflow-hidden',
            isUser
              ? 'bg-primary text-primary-foreground max-w-[80%]'
              : 'bg-muted text-foreground max-w-full',
          )}
        >
          <p className="leading-relaxed whitespace-pre-wrap">{content}</p>
        </motion.div>
      </motion.div>
    )
  }

  // If content is MessageBinaryFormat (from v0 API), render it using @v0-sdk/react Message component
  const processedContent = preprocessMessageContent(content)

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={messageVariants}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'flex items-end gap-2 w-full',
        isUser ? 'justify-end' : 'justify-start flex-row-reverse',
        className,
      )}
    >
      {/* Avatar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, delay: 0.05 }}
        className="shrink-0"
      >
        <Avatar size="default" className="ring-1 ring-border">
          <AvatarFallback
            className={cn(
              'text-xs font-medium',
              isUser
                ? 'bg-accent text-accent-foreground'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {isUser ? userInitials : aiInitials}
          </AvatarFallback>
        </Avatar>
      </motion.div>

      {/* Message Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className={cn(
          'rounded-lg px-4 py-3 text-sm',
          'flex flex-col gap-2 overflow-hidden',
          isUser
            ? 'bg-accent text-accent-foreground max-w-[80%]'
            : 'bg-accent text-accent-foreground max-w-full',
        )}
      >
        <Message
          content={processedContent}
          messageId={messageId}
          role={role}
          className=""
          components={sharedComponents}
        />
      </motion.div>
    </motion.div>
  )
}
