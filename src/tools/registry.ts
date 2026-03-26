import { Tool } from './types'

// Import tool components
import EpochConverter from './epoch-converter'
import Base64Tool from './base64'
import HashTool from './hash'
import UrlEncoderTool from './url-encoder'
import JwtDecoderTool from './jwt-decoder'
import UnicodeConverterTool from './unicode-converter'
import CronParserTool from './cron-parser'
import ChmodCalculatorTool from './chmod-calculator'
import ColorPickerTool from './color-picker'
import UuidGeneratorTool from './uuid-generator'
import PasswordGeneratorTool from './password-generator'
import HmacGeneratorTool from './hmac-generator'
import CertificateDecoderTool from './certificate-decoder'
import JsonFormatterTool from './json-formatter'
import DiffViewerTool from './diff-viewer'
import QrGeneratorTool from './qr-generator'
import DataConverterTool from './data-converter'
import TimezonePlannerTool from './timezone-planner'

// Import tool metadata
import { meta as epochConverterMeta } from './epoch-converter/meta'
import { meta as base64Meta } from './base64/meta'
import { meta as hashMeta } from './hash/meta'
import { meta as urlEncoderMeta } from './url-encoder/meta'
import { meta as jwtDecoderMeta } from './jwt-decoder/meta'
import { meta as unicodeConverterMeta } from './unicode-converter/meta'
import { meta as cronParserMeta } from './cron-parser/meta'
import { meta as chmodCalculatorMeta } from './chmod-calculator/meta'
import { meta as colorPickerMeta } from './color-picker/meta'
import { meta as uuidGeneratorMeta } from './uuid-generator/meta'
import { meta as passwordGeneratorMeta } from './password-generator/meta'
import { meta as hmacGeneratorMeta } from './hmac-generator/meta'
import { meta as certificateDecoderMeta } from './certificate-decoder/meta'
import { meta as jsonFormatterMeta } from './json-formatter/meta'
import { meta as diffViewerMeta } from './diff-viewer/meta'
import { meta as qrGeneratorMeta } from './qr-generator/meta'
import { meta as dataConverterMeta } from './data-converter/meta'
import { meta as timezonePlannerMeta } from './timezone-planner/meta'

// Registry of all tools
export const tools: Tool[] = [
  { ...epochConverterMeta,      component: EpochConverter },
  { ...base64Meta,              component: Base64Tool },
  { ...hashMeta,                component: HashTool },
  { ...urlEncoderMeta,          component: UrlEncoderTool },
  { ...jwtDecoderMeta,          component: JwtDecoderTool },
  { ...unicodeConverterMeta,    component: UnicodeConverterTool },
  { ...cronParserMeta,          component: CronParserTool },
  { ...chmodCalculatorMeta,     component: ChmodCalculatorTool },
  { ...colorPickerMeta,         component: ColorPickerTool },
  { ...uuidGeneratorMeta,       component: UuidGeneratorTool },
  { ...passwordGeneratorMeta,   component: PasswordGeneratorTool },
  { ...hmacGeneratorMeta,       component: HmacGeneratorTool },
  { ...certificateDecoderMeta,  component: CertificateDecoderTool },
  { ...jsonFormatterMeta,       component: JsonFormatterTool },
  { ...diffViewerMeta,          component: DiffViewerTool },
  { ...qrGeneratorMeta,         component: QrGeneratorTool },
  { ...dataConverterMeta,       component: DataConverterTool },
  { ...timezonePlannerMeta,     component: TimezonePlannerTool },
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
