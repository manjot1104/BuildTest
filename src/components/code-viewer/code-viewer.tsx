'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Code2, X, PanelLeftClose, PanelLeft, Download } from 'lucide-react'
import { FileExplorer } from './file-explorer'
import { CodePane } from './code-pane'
import { buildFileTree, type FileTreeNodeData } from '@/lib/code-utils'
import { cn } from '@/lib/utils'

/* -------------------- Constants -------------------- */

const MIN_SIDEBAR_PX = 200
const MAX_SIDEBAR_PX = 480
const DEFAULT_SIDEBAR_PX = 280
const MAX_SIDEBAR_RATIO = 0.4 // never exceed 40% of container

/* -------------------- Types -------------------- */

interface CodeViewerDialogProps {
  files: Array<{ name: string; content: string }>
  open: boolean
  onOpenChange: (open: boolean) => void
}

/* -------------------- Helpers -------------------- */

function findFileContent(
  tree: FileTreeNodeData[],
  path: string,
): string | null {
  for (const node of tree) {
    if (node.type === 'file' && node.path === path) return node.content ?? null
    if (node.children) {
      const found = findFileContent(node.children, path)
      if (found !== null) return found
    }
  }
  return null
}

function findDefaultFile(files: Array<{ name: string }>): string | null {
  const preferred = files.find((f) => f.name.endsWith('app/page.tsx'))
  if (preferred) return preferred.name
  const tsx = files.find((f) => f.name.endsWith('.tsx'))
  if (tsx) return tsx.name
  return files[0]?.name ?? null
}

/* -------------------- ZIP Download -------------------- */

async function downloadZip(files: Array<{ name: string; content: string }>) {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  for (const file of files) {
    zip.file(file.name, file.content)
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'source-code.zip'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* -------------------- Component -------------------- */

export function CodeViewerDialog({
  files,
  open,
  onOpenChange,
}: CodeViewerDialogProps) {
  const tree = useMemo(() => buildFileTree(files), [files])
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null)
  const [openTabs, setOpenTabs] = useState<
    Array<{ path: string; name: string }>
  >([])
  const [showSidebar, setShowSidebar] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_PX)

  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)

  // Reset and auto-open default file when files change
  useEffect(() => {
    if (files.length === 0) {
      setActiveFilePath(null)
      setOpenTabs([])
      return
    }
    const defaultPath = findDefaultFile(files)
    if (defaultPath) {
      const name = defaultPath.split('/').pop() ?? defaultPath
      setActiveFilePath(defaultPath)
      setOpenTabs([{ path: defaultPath, name }])
    }
  }, [files])

  const handleFileSelect = useCallback(
    (path: string) => {
      setActiveFilePath(path)
      if (!openTabs.some((t) => t.path === path)) {
        const name = path.split('/').pop() ?? path
        setOpenTabs((prev) => [...prev, { path, name }])
      }
    },
    [openTabs],
  )

  const handleTabClose = useCallback(
    (path: string) => {
      setOpenTabs((prev) => {
        const next = prev.filter((t) => t.path !== path)
        if (activeFilePath === path) {
          setActiveFilePath(next[next.length - 1]?.path ?? null)
        }
        return next
      })
    },
    [activeFilePath],
  )

  /* ---------- Custom drag-to-resize ---------- */

  const handleDividerPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      isDraggingRef.current = true
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const handlePointerMove = (ev: PointerEvent) => {
        if (!isDraggingRef.current || !containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const x = ev.clientX - rect.left
        const maxPx = Math.min(MAX_SIDEBAR_PX, rect.width * MAX_SIDEBAR_RATIO)
        setSidebarWidth(Math.min(Math.max(x, MIN_SIDEBAR_PX), maxPx))
      }

      const handlePointerUp = () => {
        isDraggingRef.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        document.removeEventListener('pointermove', handlePointerMove)
        document.removeEventListener('pointerup', handlePointerUp)
      }

      document.addEventListener('pointermove', handlePointerMove)
      document.addEventListener('pointerup', handlePointerUp)
    },
    [],
  )

  const fileContent = activeFilePath
    ? findFileContent(tree, activeFilePath)
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
        className="sm:max-w-[95vw] h-[90vh] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col"
      >
        <DialogTitle className="sr-only">Source Code</DialogTitle>

        {/* -------- Header bar -------- */}
        <div className="flex items-center justify-between px-4 h-12 shrink-0 border-b border-border bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Source Code</span>
            </div>
            <Badge
              variant="secondary"
              className="text-[11px] px-1.5 py-0 h-5"
            >
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => void downloadZip(files)}
              title="Download as ZIP"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download ZIP</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setShowSidebar(!showSidebar)}
              title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
            >
              {showSidebar ? (
                <PanelLeftClose className="h-3.5 w-3.5" />
              ) : (
                <PanelLeft className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* -------- Body -------- */}
        <div className="flex-1 min-h-0 relative">
          <div ref={containerRef} className="absolute inset-0 flex">
            {/* Sidebar */}
            {showSidebar && (
              <>
                <div
                  style={{ width: sidebarWidth }}
                  className="shrink-0 h-full overflow-hidden"
                >
                  <FileExplorer
                    tree={tree}
                    activeFilePath={activeFilePath}
                    onFileSelect={handleFileSelect}
                  />
                </div>

                {/* Drag divider */}
                <div
                  onPointerDown={handleDividerPointerDown}
                  className={cn(
                    'w-[6px] shrink-0 cursor-col-resize touch-none select-none',
                    'relative group transition-colors',
                    'bg-transparent hover:bg-muted',
                  )}
                >
                  {/* Visible line */}
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border group-hover:w-[2px] group-hover:bg-primary/40 transition-all" />
                  {/* Grip dots */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-[3px] opacity-0 group-hover:opacity-100 transition-opacity">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-[3px] h-[3px] rounded-full bg-muted-foreground/40"
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Code pane */}
            <div className="flex-1 min-w-0 h-full overflow-hidden">
              <CodePane
                openTabs={openTabs}
                activeFilePath={activeFilePath}
                fileContent={fileContent}
                onTabSelect={setActiveFilePath}
                onTabClose={handleTabClose}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
