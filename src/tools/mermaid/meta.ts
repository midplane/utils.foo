import { ToolMeta } from '../types'
import { GitBranch } from 'lucide-react'

export const meta: ToolMeta = {
  id: 'mermaid',
  name: 'Mermaid Diagrams',
  description: 'Write Mermaid diagram code and see a live beautiful SVG preview — flowcharts, sequence, state, class, ER, and XY charts',
  category: 'Text',
  keywords: ['mermaid', 'diagram', 'flowchart', 'sequence', 'state', 'class', 'er', 'graph', 'svg', 'chart', 'visualize'],
  path: '/mermaid',
  icon: GitBranch,
}
