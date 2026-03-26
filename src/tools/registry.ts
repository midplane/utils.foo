import { Tool } from './types'

// Import tool components
import EpochConverter from './epoch-converter'
import Base64Tool from './base64'
import HashTool from './hash'
import UrlEncoderTool from './url-encoder'
import JwtDecoderTool from './jwt-decoder'
import UnicodeConverterTool from './unicode-converter'

// Import tool metadata
import { meta as epochConverterMeta } from './epoch-converter/meta'
import { meta as base64Meta } from './base64/meta'
import { meta as hashMeta } from './hash/meta'
import { meta as urlEncoderMeta } from './url-encoder/meta'
import { meta as jwtDecoderMeta } from './jwt-decoder/meta'
import { meta as unicodeConverterMeta } from './unicode-converter/meta'

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
  {
    ...hashMeta,
    component: HashTool,
  },
  {
    ...urlEncoderMeta,
    component: UrlEncoderTool,
  },
  {
    ...jwtDecoderMeta,
    component: JwtDecoderTool,
  },
  {
    ...unicodeConverterMeta,
    component: UnicodeConverterTool,
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
