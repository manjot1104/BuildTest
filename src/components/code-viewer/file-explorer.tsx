'use client'

import { useState } from 'react'
import { ChevronRight, FileCode, File, Folder } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { type FileTreeNodeData, getFileIcon } from '@/lib/code-utils'
import { cn } from '@/lib/utils'

interface FileExplorerProps {
  tree: FileTreeNodeData[]
  activeFilePath: string | null
  onFileSelect: (path: string) => void
}

export function FileExplorer({
  tree,
  activeFilePath,
  onFileSelect,
}: FileExplorerProps) {
  return (
    <div className="flex flex-col h-full border-r border-border bg-muted/30">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
        Files
      </div>
      <ScrollArea className="flex-1">
        <div className="py-1">
          {tree.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              depth={0}
              activeFilePath={activeFilePath}
              onFileSelect={onFileSelect}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

interface TreeNodeProps {
  node: FileTreeNodeData
  depth: number
  activeFilePath: string | null
  onFileSelect: (path: string) => void
}

function TreeNode({ node, depth, activeFilePath, onFileSelect }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2)

  if (node.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'flex items-center gap-1 w-full py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors',
          )}
          style={{ paddingLeft: depth * 12 + 8 }}
        >
          <ChevronRight
            className={cn(
              'h-3.5 w-3.5 shrink-0 transition-transform',
              expanded && 'rotate-90',
            )}
          />
          <Folder className="h-4 w-4 shrink-0 text-blue-400" />
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                activeFilePath={activeFilePath}
                onFileSelect={onFileSelect}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const isActive = activeFilePath === node.path
  const iconType = getFileIcon(node.name)

  return (
    <button
      onClick={() => onFileSelect(node.path)}
      className={cn(
        'flex items-center gap-1 w-full py-1 text-sm transition-colors',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
      )}
      style={{ paddingLeft: depth * 12 + 8 + 14 }}
    >
      {iconType === 'code' ? (
        <FileCode className="h-4 w-4 shrink-0" />
      ) : (
        <File className="h-4 w-4 shrink-0" />
      )}
      <span className="truncate">{node.name}</span>
    </button>
  )
}
