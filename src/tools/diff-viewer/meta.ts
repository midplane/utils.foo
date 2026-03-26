import { ToolMeta } from '../types'
import { GitCompare } from 'lucide-react'

export const meta: ToolMeta = {
  id: 'diff-viewer',
  name: 'Diff Viewer',
  description: 'Compare two pieces of text and highlight the differences line by line',
  category: 'Formatting',
  keywords: ['diff', 'compare', 'difference', 'text', 'patch', 'changes', 'delta'],
  path: '/diff',
  icon: GitCompare,
}
