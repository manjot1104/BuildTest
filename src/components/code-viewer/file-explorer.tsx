'use client'

import { useState, useMemo } from 'react'
import {
  ChevronRight,
  FileCode,
  File,
  Folder,
  FolderOpen,
  Search,
} from 'lucide-react'
import {
  type FileTreeNodeData,
  getFileIcon,
  getFileIconColor,
} from '@/lib/code-utils'
import { cn } from '@/lib/utils'

/* ---- Shared thin-scrollbar utility ---- */
const thinScrollbar = [
  '[&::-webkit-scrollbar]:w-1.5',
  '[&::-webkit-scrollbar-thumb]:rounded-full',
  '[&::-webkit-scrollbar-thumb]:bg-border',
  '[&::-webkit-scrollbar-track]:bg-transparent',
].join(' ')

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
  const [search, setSearch] = useState('')

  const filteredTree = useMemo(() => {
    if (!search.trim()) return tree
    return filterTree(tree, search.toLowerCase())
  }, [tree, search])

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background border-r border-border">
      {/* Search */}
      <div className="p-2 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              'w-full h-7 pl-7 pr-2 text-xs rounded-md',
              'bg-muted/50 border border-border',
              'text-foreground placeholder:text-muted-foreground/50',
              'focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring',
              'transition-colors',
            )}
          />
        </div>
      </div>

      {/* Tree — native overflow-y-auto instead of Radix ScrollArea so height
          resolves correctly inside resizable panels */}
      <div
        className={cn('flex-1 min-h-0 overflow-y-auto', thinScrollbar)}
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="py-1">
          {filteredTree.length === 0 ? (
            <p className="px-3 py-6 text-xs text-muted-foreground text-center">
              No files found
            </p>
          ) : (
            filteredTree.map((node) => (
              <TreeNode
                key={node.path}
                node={node}
                depth={0}
                activeFilePath={activeFilePath}
                onFileSelect={onFileSelect}
                isSearching={!!search.trim()}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function filterTree(
  nodes: FileTreeNodeData[],
  query: string,
): FileTreeNodeData[] {
  const result: FileTreeNodeData[] = []
  for (const node of nodes) {
    if (node.type === 'file') {
      if (node.name.toLowerCase().includes(query)) {
        result.push(node)
      }
    } else if (node.children) {
      const filteredChildren = filterTree(node.children, query)
      if (filteredChildren.length > 0) {
        result.push({ ...node, children: filteredChildren })
      }
    }
  }
  return result
}

interface TreeNodeProps {
  node: FileTreeNodeData
  depth: number
  activeFilePath: string | null
  onFileSelect: (path: string) => void
  isSearching: boolean
}

function TreeNode({
  node,
  depth,
  activeFilePath,
  onFileSelect,
  isSearching,
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2)
  const isExpanded = isSearching ? true : expanded

  if (node.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'flex items-center gap-1.5 w-full py-[5px] px-2 text-xs',
            'text-muted-foreground hover:text-foreground hover:bg-accent/50',
            'transition-colors',
          )}
          style={{ paddingLeft: depth * 12 + 8 }}
        >
          <ChevronRight
            className={cn(
              'h-3 w-3 shrink-0 transition-transform duration-150',
              isExpanded && 'rotate-90',
            )}
          />
          {isExpanded ? (
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-blue-400" />
          ) : (
            <Folder className="h-3.5 w-3.5 shrink-0 text-blue-400" />
          )}
          <span className="truncate font-medium">{node.name}</span>
        </button>
        {isExpanded && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                activeFilePath={activeFilePath}
                onFileSelect={onFileSelect}
                isSearching={isSearching}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const isActive = activeFilePath === node.path
  const iconColor = getFileIconColor(node.name)
  const iconType = getFileIcon(node.name)

  return (
    <button
      onClick={() => onFileSelect(node.path)}
      className={cn(
        'flex items-center gap-1.5 w-full py-[5px] px-2 text-xs transition-colors',
        isActive
          ? 'bg-accent text-accent-foreground border-l-2 border-l-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
      )}
      style={{
        paddingLeft: isActive
          ? depth * 12 + 6 + 16
          : depth * 12 + 8 + 16,
      }}
    >
      {iconType === 'code' ? (
        <FileCode className={cn('h-3.5 w-3.5 shrink-0', iconColor)} />
      ) : (
        <File className={cn('h-3.5 w-3.5 shrink-0', iconColor)} />
      )}
      <span className="truncate">{node.name}</span>
    </button>
  )
}
