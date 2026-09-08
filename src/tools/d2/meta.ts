import { Workflow } from 'lucide-react'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  id: 'd2',
  name: 'D2 Diagrams',
  description: 'Turn D2 language into SVG or ASCII diagrams with a live preview, TALA, Dagre and ELK layouts, and export',
  category: 'Text',
  keywords: ['d2', 'diagram', 'tala', 'dagre', 'elk', 'architecture', 'flowchart', 'sequence', 'graph', 'svg', 'ascii', 'unicode', 'text art'],
  path: '/d2',
  icon: Workflow,
  wide: 'xl',
}
