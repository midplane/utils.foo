import { Tool } from './types'

// Import tool components
import EpochConverter from './epoch-converter'
import Base64Tool from './base64'

// Import tool metadata
import { meta as epochConverterMeta } from './epoch-converter/meta'
import { meta as base64Meta } from './base64/meta'

// Registry of all tools
export const tools: Tool[] = [
  {
    ...epochConverterMeta,
    component: EpochConverter,
  },
  {
    ...base64Meta,
    component: Base64Tool,
  },
]

// Helper to get tool by ID
export function getToolById(id: string): Tool | undefined {
  return tools.find((tool) => tool.id === id)
}

// Helper to get tool by path
export function getToolByPath(path: string): Tool | undefined {
  return tools.find((tool) => tool.path === path)
}

// Get all categories
export function getCategories(): string[] {
  return [...new Set(tools.map((tool) => tool.category))]
}

// Search tools by query
export function searchTools(query: string): Tool[] {
  const lowerQuery = query.toLowerCase().trim()
  if (!lowerQuery) return tools

  return tools.filter((tool) => {
    return (
      tool.name.toLowerCase().includes(lowerQuery) ||
      tool.description.toLowerCase().includes(lowerQuery) ||
      tool.category.toLowerCase().includes(lowerQuery) ||
      tool.keywords.some((kw) => kw.toLowerCase().includes(lowerQuery))
    )
  })
}
