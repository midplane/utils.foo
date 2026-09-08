import { ComponentType } from 'react'
import { LucideIcon } from 'lucide-react'

export interface ToolMeta {
  id: string
  name: string
  description: string
  category: string
  keywords: string[]
  path: string
  icon: LucideIcon
  /**
   * Opt into a wider content column. Use for split-pane or canvas-style tools
   * (side-by-side editors, diagrams) that benefit from horizontal space.
   * Use 'xl' for a 1,600px column with the normal page gutters.
   * Defaults to the standard narrow column.
   */
  wide?: boolean | 'xl'
}

export interface Tool extends ToolMeta {
  component: ComponentType
}
