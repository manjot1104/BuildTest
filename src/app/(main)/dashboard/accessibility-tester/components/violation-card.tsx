'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ExternalLink } from 'lucide-react'
import type { AxeViolation } from '@/types/accessibility.types'

const impactColors: Record<string, string> = {
  critical: 'bg-red-600 text-white hover:bg-red-700',
  serious: 'bg-orange-500 text-white hover:bg-orange-600',
  moderate: 'bg-yellow-500 text-white hover:bg-yellow-600',
  minor: 'bg-gray-400 text-white hover:bg-gray-500',
}

interface ViolationCardProps {
  violation: AxeViolation
}

export function ViolationCard({ violation }: ViolationCardProps) {
  const [expanded, setExpanded] = useState(false)
  const displayNodes = violation.nodes.slice(0, 3)
  const remaining = violation.nodes.length - 3

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={impactColors[violation.impact] ?? impactColors.minor}>
          {violation.impact}
        </Badge>
        <code className="text-xs text-muted-foreground">{violation.id}</code>
        {violation.tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="outline" className="text-[10px]">
            {tag}
          </Badge>
        ))}
      </div>

      <p className="text-sm">{violation.description}</p>
      <p className="text-xs text-muted-foreground">{violation.help}</p>

      {violation.nodes.length > 0 && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 px-0 text-xs text-muted-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronDown
              className={`size-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
            {violation.nodes.length} affected element{violation.nodes.length !== 1 ? 's' : ''}
          </Button>

          {expanded && (
            <div className="mt-1 space-y-2">
              {displayNodes.map((node, i) => (
                <div key={i} className="rounded bg-muted p-2 text-xs">
                  <code className="block max-h-20 overflow-auto break-all font-mono">
                    {node.html}
                  </code>
                  {node.failureSummary && (
                    <p className="mt-1 text-muted-foreground">{node.failureSummary}</p>
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

      <a
        href={violation.helpUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        Learn more <ExternalLink className="size-3" />
      </a>
    </div>
  )
}
