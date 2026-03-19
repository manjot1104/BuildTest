'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ExternalLink, Code2 } from 'lucide-react'
import type { AxeViolation } from '@/types/accessibility.types'
import { cn } from '@/lib/utils'

const impactStyles: Record<string, string> = {
  critical: 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/50',
  serious: 'text-orange-700 bg-orange-50 dark:text-orange-400 dark:bg-orange-950/50',
  moderate: 'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/50',
  minor: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800',
}

const impactBorder: Record<string, string> = {
  critical: 'border-red-200 dark:border-red-900/50',
  serious: 'border-orange-200 dark:border-orange-900/50',
  moderate: 'border-amber-200 dark:border-amber-900/50',
  minor: 'border-border',
}

interface ViolationCardProps {
  violation: AxeViolation
}

export function ViolationCard({ violation }: ViolationCardProps) {
  const [expanded, setExpanded] = useState(false)
  const displayNodes = violation.nodes.slice(0, 3)
  const remaining = violation.nodes.length - 3

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4 shadow-sm space-y-2.5',
        'transition-all duration-200 hover:shadow-md',
        impactBorder[violation.impact] ?? impactBorder.minor,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize',
            impactStyles[violation.impact] ?? impactStyles.minor,
          )}
        >
          {violation.impact}
        </span>
        <code className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground font-mono">
          {violation.id}
        </code>
        {violation.tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="secondary" className="rounded-md text-[10px] font-mono px-1.5 py-0">
            {tag}
          </Badge>
        ))}
      </div>

      <p className="text-sm leading-relaxed">{violation.description}</p>
      {violation.help && (
        <p className="text-xs leading-relaxed text-muted-foreground">{violation.help}</p>
      )}

      {violation.nodes.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            <Code2 className="size-3" />
            <ChevronDown
              className={cn('size-3 transition-transform duration-300 ease-out', expanded && 'rotate-180')}
            />
            {violation.nodes.length} affected element{violation.nodes.length !== 1 ? 's' : ''}
          </button>

          {expanded && (
            <div className="mt-2.5 space-y-2">
              {displayNodes.map((node, i) => (
                <div key={i} className="rounded-lg border bg-muted/40 p-3">
                  <code className="block max-h-20 overflow-auto break-all text-xs text-foreground/80 leading-relaxed">
                    {node.html}
                  </code>
                  {node.failureSummary && (
                    <p className="mt-2 text-xs text-muted-foreground">{node.failureSummary}</p>
                  )}
                </div>
              ))}
              {remaining > 0 && (
                <p className="text-xs text-muted-foreground">
                  ...and {remaining} more element{remaining !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {violation.helpUrl && (
        <a
          href={violation.helpUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary transition-colors duration-150 hover:text-primary/80 hover:underline"
        >
          Learn more <ExternalLink className="size-3" />
        </a>
      )}
    </div>
  )
}
