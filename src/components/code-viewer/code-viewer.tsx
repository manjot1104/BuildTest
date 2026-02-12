'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { FileExplorer } from './file-explorer'
import { CodePane } from './code-pane'
import { buildFileTree, type FileTreeNodeData } from '@/lib/code-utils'

interface CodeViewerProps {
  files: Array<{ name: string; content: string }>
}

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
  // Prefer app/page.tsx
  const preferred = files.find((f) => f.name.endsWith('app/page.tsx'))
  if (preferred) return preferred.name

  // Then first .tsx file
  const tsx = files.find((f) => f.name.endsWith('.tsx'))
  if (tsx) return tsx.name

  // Then first file
  return files[0]?.name ?? null
}

export function CodeViewer({ files }: CodeViewerProps) {
  const tree = useMemo(() => buildFileTree(files), [files])

  const [activeFilePath, setActiveFilePath] = useState<string | null>(null)
  const [openTabs, setOpenTabs] = useState<
    Array<{ path: string; name: string }>
  >([])

  // Auto-open a default file
  useEffect(() => {
    if (files.length > 0 && openTabs.length === 0) {
      const defaultPath = findDefaultFile(files)
      if (defaultPath) {
        const name = defaultPath.split('/').pop() ?? defaultPath
        setActiveFilePath(defaultPath)
        setOpenTabs([{ path: defaultPath, name }])
      }
    }
  }, [files, openTabs.length])

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

  const fileContent = activeFilePath
    ? findFileContent(tree, activeFilePath)
    : null

  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">No source files available</p>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <div className="w-56 shrink-0">
        <FileExplorer
          tree={tree}
          activeFilePath={activeFilePath}
          onFileSelect={handleFileSelect}
        />
      </div>
      <CodePane
        openTabs={openTabs}
        activeFilePath={activeFilePath}
        fileContent={fileContent}
        onTabSelect={setActiveFilePath}
        onTabClose={handleTabClose}
      />
    </div>
  )
}
