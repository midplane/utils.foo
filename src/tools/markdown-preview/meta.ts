import { ToolMeta } from '../types'
import { FileText } from 'lucide-react'

export const meta: ToolMeta = {
  id: 'markdown-preview',
  name: 'Markdown Preview',
  description: 'Write Markdown and see a live rendered preview side-by-side — supports GFM tables, code blocks, and task lists',
  category: 'Text',
  keywords: ['markdown', 'preview', 'render', 'md', 'gfm', 'table', 'code block', 'commonmark', 'html'],
  path: '/markdown',
  icon: FileText,
}
