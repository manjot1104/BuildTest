export interface FileTreeNodeData {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileTreeNodeData[]
  content?: string
}

/**
 * Converts a flat list of files into a hierarchical tree structure.
 * Sorts folders-first, then alphabetically within each level.
 */
export function buildFileTree(
  files: Array<{ name: string; content: string }>,
): FileTreeNodeData[] {
  const root: FileTreeNodeData[] = []

  for (const file of files) {
    const parts = file.name.split('/')
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!
      const isFile = i === parts.length - 1
      const path = parts.slice(0, i + 1).join('/')

      const existing = current.find((n) => n.name === part)

      if (existing) {
        if (!isFile && existing.children) {
          current = existing.children
        }
      } else {
        const node: FileTreeNodeData = isFile
          ? { name: part, path, type: 'file', content: file.content }
          : { name: part, path, type: 'folder', children: [] }

        current.push(node)

        if (!isFile && node.children) {
          current = node.children
        }
      }
    }
  }

  sortTree(root)
  return root
}

function sortTree(nodes: FileTreeNodeData[]) {
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  for (const node of nodes) {
    if (node.children) sortTree(node.children)
  }
}

const LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  json: 'json',
  css: 'css',
  html: 'html',
  md: 'markdown',
  mdx: 'mdx',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  xml: 'xml',
  svg: 'xml',
  sh: 'bash',
  bash: 'bash',
  py: 'python',
  rs: 'rust',
  go: 'go',
  sql: 'sql',
  graphql: 'graphql',
  gql: 'graphql',
  env: 'bash',
}

/**
 * Returns the shiki language identifier for a given file name.
 */
export function getLanguageFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''

  // Handle dotfiles
  if (fileName === '.gitignore' || fileName === '.env' || fileName.startsWith('.env.'))
    return 'bash'
  if (fileName === 'Dockerfile') return 'dockerfile'

  return LANGUAGE_MAP[ext] ?? 'text'
}

/**
 * Returns an icon variant string for a file type.
 * 'code' for code files, 'file' for everything else.
 */
export function getFileIcon(fileName: string): 'code' | 'file' {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  const codeExtensions = new Set([
    'ts', 'tsx', 'js', 'jsx', 'css', 'html', 'json', 'md', 'mdx',
    'py', 'rs', 'go', 'sql', 'yaml', 'yml', 'toml', 'xml', 'svg',
    'sh', 'bash', 'graphql', 'gql',
  ])
  return codeExtensions.has(ext) ? 'code' : 'file'
}

/**
 * Returns a Tailwind text-color class for a file's icon based on extension.
 */
export function getFileIconColor(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  const colorMap: Record<string, string> = {
    ts: 'text-blue-400',
    tsx: 'text-blue-400',
    js: 'text-yellow-400',
    jsx: 'text-yellow-400',
    json: 'text-yellow-500/80',
    css: 'text-purple-400',
    html: 'text-orange-400',
    md: 'text-sky-400',
    mdx: 'text-sky-400',
    py: 'text-green-400',
    rs: 'text-orange-500',
    go: 'text-cyan-400',
    sql: 'text-pink-400',
    yaml: 'text-red-400',
    yml: 'text-red-400',
    toml: 'text-gray-400',
    xml: 'text-orange-400',
    svg: 'text-orange-400',
    sh: 'text-green-400',
    bash: 'text-green-400',
    graphql: 'text-pink-500',
    gql: 'text-pink-500',
  }
  return colorMap[ext] ?? 'text-muted-foreground'
}
