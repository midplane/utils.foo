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
}

export interface Tool extends ToolMeta {
  component: ComponentType
}
