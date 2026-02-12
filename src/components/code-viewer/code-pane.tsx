'use client'

import { useState, useCallback } from 'react'
import { X, FileCode, Copy, Check, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useHighlightCode } from '@/hooks/use-shiki'
import { getLanguageFromFileName, getFileIconColor } from '@/lib/code-utils'
import { cn } from '@/lib/utils'

/* ---- Shared thin-scrollbar utility ---- */
const thinScrollbar = [
  '[&::-webkit-scrollbar]:w-1.5',
  '[&::-webkit-scrollbar]:h-1.5',
  '[&::-webkit-scrollbar-thumb]:rounded-full',
  '[&::-webkit-scrollbar-thumb]:bg-border',
  '[&::-webkit-scrollbar-track]:bg-transparent',
].join(' ')

interface OpenTab {
  path: string
  name: string
}

interface CodePaneProps {
  openTabs: OpenTab[]
  activeFilePath: string | null
  fileContent: string | null
  onTabSelect: (path: string) => void
  onTabClose: (path: string) => void
}

export function CodePane({
  openTabs,
  activeFilePath,
  fileContent,
  onTabSelect,
  onTabClose,
}: CodePaneProps) {
  if (openTabs.length === 0 || !activeFilePath) {
    return (
      <div className="h-full flex items-center justify-center bg-background text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-muted/50 flex items-center justify-center">
            <FileCode className="h-6 w-6 opacity-40" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">No file selected</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Choose a file from the explorer to view its contents
            </p>
          </div>
        </div>
      </div>
    )
  }

  const activeTab = openTabs.find((t) => t.path === activeFilePath)

  return (
    <div className="flex flex-col h-full min-w-0 overflow-hidden bg-background">
      {/* Tab bar */}
      <div className="flex border-b border-border shrink-0">
        <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {openTabs.map((tab) => {
            const isActive = tab.path === activeFilePath
            const iconColor = getFileIconColor(tab.name)
            return (
              <button
                key={tab.path}
                className={cn(
                  'group flex items-center gap-1.5 px-3 h-9 text-xs border-r border-border shrink-0 transition-colors',
                  isActive
                    ? 'bg-background text-foreground border-t-2 border-t-primary'
                    : 'bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50',
                )}
                onClick={() => onTabSelect(tab.path)}
              >
                <FileCode
                  className={cn(
                    'h-3.5 w-3.5 shrink-0',
                    isActive ? iconColor : '',
                  )}
                />
                <span className="truncate max-w-[120px]">{tab.name}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    onTabClose(tab.path)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation()
                      onTabClose(tab.path)
                    }
                  }}
                  className={cn(
                    'ml-1 rounded p-0.5 transition-all',
                    'opacity-0 group-hover:opacity-100',
                    'hover:bg-accent',
                  )}
                >
                  <X className="h-3 w-3" />
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Breadcrumb + actions */}
      {activeTab && (
        <div className="flex items-center justify-between px-4 h-8 border-b border-border bg-muted/20 shrink-0">
          <Breadcrumb path={activeFilePath} />
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <Badge
              variant="outline"
              className="text-[10px] h-5 px-1.5 font-mono rounded"
            >
              {getLanguageFromFileName(activeTab.name)}
            </Badge>
            <CopyButton text={fileContent ?? ''} />
          </div>
        </div>
      )}

      {/* Code display — flex-1 + min-h-0 lets it shrink; overflow handled inside */}
      <div className="flex-1 min-h-0">
        <CodeDisplay
          code={fileContent ?? ''}
          fileName={activeTab?.name ?? ''}
        />
      </div>
    </div>
  )
}

function Breadcrumb({ path }: { path: string }) {
  if (!path) return null
  const parts = path.split('/')
  return (
    <div className="flex items-center gap-0.5 text-xs text-muted-foreground overflow-hidden min-w-0 flex-1">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-0.5 shrink-0">
          {i > 0 && (
            <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />
          )}
          <span
            className={cn(
              'truncate',
              i === parts.length - 1 && 'text-foreground font-medium',
            )}
          >
            {part}
          </span>
        </span>
      ))}
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }, [text])

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0"
      onClick={() => void handleCopy()}
      title="Copy file contents"
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  )
}

function CodeDisplay({ code, fileName }: { code: string; fileName: string }) {
  const language = getLanguageFromFileName(fileName)
  const { html, isLoading } = useHighlightCode(code, language)
  const lines = code.split('\n')
  const lineNumberWidth = String(lines.length).length

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Loading syntax highlighter...</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn('h-full overflow-auto', thinScrollbar)}
      style={{ scrollbarWidth: 'thin' }}
    >
      <div className="flex min-w-max">
        {/* Line numbers */}
        <div className="sticky left-0 z-10 flex flex-col bg-muted/30 border-r border-border select-none py-3 text-right">
          {lines.map((_, i) => (
            <span
              key={i}
              className="px-3 text-[11px] leading-5 text-muted-foreground/40 font-mono tabular-nums"
              style={{ minWidth: `${lineNumberWidth + 2}ch` }}
            >
              {i + 1}
            </span>
          ))}
        </div>

        {/* Code content */}
        <div
          className={cn(
            'flex-1 py-3 px-4',
            '[&_pre]:!bg-transparent [&_pre]:!m-0 [&_pre]:!p-0',
            '[&_code]:!text-[13px] [&_code]:!leading-5 [&_code]:font-mono',
          )}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}
