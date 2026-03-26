import { ComponentType } from 'react'

export interface ToolMeta {
  id: string
  name: string
  description: string
  category: string
  keywords: string[]
  path: string
}

export interface Tool extends ToolMeta {
  component: ComponentType
}
