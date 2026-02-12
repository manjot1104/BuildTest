'use client'

import { X, FileCode } from 'lucide-react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { useHighlightCode } from '@/hooks/use-shiki'
import { getLanguageFromFileName } from '@/lib/code-utils'
import { cn } from '@/lib/utils'

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
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <FileCode className="h-10 w-10 opacity-30" />
          <p className="text-sm">Select a file to view its contents</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Tab bar */}
      <div className="flex border-b border-border bg-muted/30 overflow-x-auto">
        {openTabs.map((tab) => (
          <div
            key={tab.path}
            className={cn(
              'group flex items-center gap-1.5 px-3 py-1.5 text-sm border-r border-border cursor-pointer shrink-0',
              tab.path === activeFilePath
                ? 'bg-background text-foreground border-b-2 border-b-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/30',
            )}
            onClick={() => onTabSelect(tab.path)}
          >
            <FileCode className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate max-w-[120px]">{tab.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onTabClose(tab.path)
              }}
              className="ml-1 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-accent transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Code display */}
      <CodeDisplay
        code={fileContent ?? ''}
        fileName={openTabs.find((t) => t.path === activeFilePath)?.name ?? ''}
      />
    </div>
  )
}

function CodeDisplay({ code, fileName }: { code: string; fileName: string }) {
  const language = getLanguageFromFileName(fileName)
  const { html, isLoading } = useHighlightCode(code, language)

  const lines = code.split('\n')

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Loading syntax highlighter...
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="flex min-w-max">
        {/* Line numbers */}
        <div className="sticky left-0 z-10 flex flex-col bg-muted/50 border-r border-border select-none px-3 py-4 text-right">
          {lines.map((_, i) => (
            <span
              key={i}
              className="text-xs leading-6 text-muted-foreground/50 font-mono"
            >
              {i + 1}
            </span>
          ))}
        </div>

        {/* Code content */}
        <div
          className="flex-1 py-4 px-4 overflow-x-auto [&_pre]:!bg-transparent [&_pre]:!m-0 [&_pre]:!p-0 [&_code]:!text-xs [&_code]:!leading-6 [&_code]:font-mono"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
