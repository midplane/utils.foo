import { lazy } from 'react'
import { Tool } from './types'

// Lazily loaded tool components — each tool is its own async chunk
const EpochConverter        = lazy(() => import('./epoch-converter'))
const Base64Tool            = lazy(() => import('./base64'))
const HashTool              = lazy(() => import('./hash'))
const UrlEncoderTool        = lazy(() => import('./url-encoder'))
const JwtDecoderTool        = lazy(() => import('./jwt-decoder'))
const UnicodeConverterTool  = lazy(() => import('./unicode-converter'))
const CronParserTool        = lazy(() => import('./cron-parser'))
const ChmodCalculatorTool   = lazy(() => import('./chmod-calculator'))
const ColorPickerTool       = lazy(() => import('./color-picker'))
const UuidGeneratorTool     = lazy(() => import('./uuid-generator'))
const PasswordGeneratorTool = lazy(() => import('./password-generator'))
const HmacGeneratorTool     = lazy(() => import('./hmac-generator'))
const CertificateDecoderTool = lazy(() => import('./certificate-decoder'))
const JsonFormatterTool     = lazy(() => import('./json-formatter'))
const DiffViewerTool        = lazy(() => import('./diff-viewer'))
const QrGeneratorTool       = lazy(() => import('./qr-generator'))
const DataConverterTool     = lazy(() => import('./data-converter'))
const TimezonePlannerTool   = lazy(() => import('./timezone-planner'))
const HttpStatusCodesTool   = lazy(() => import('./http-status-codes'))
const CountryCodesTool      = lazy(() => import('./country-codes'))
const CurrencyCodesTool     = lazy(() => import('./currency-codes'))
const ChartBuilderTool      = lazy(() => import('./chart-builder'))
const DnsLookupTool         = lazy(() => import('./dns-lookup'))
const MarkdownPreviewTool   = lazy(() => import('./markdown-preview'))
const MarkdownTableTool     = lazy(() => import('./markdown-table'))
const MermaidTool           = lazy(() => import('./mermaid'))
const LogoGeneratorTool     = lazy(() => import('./logo-generator'))
const PivotTableTool        = lazy(() => import('./pivot-table'))
const FormulaVisualizerTool = lazy(() => import('./formula-visualizer'))

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
import { meta as httpStatusCodesMeta } from './http-status-codes/meta'
import { meta as countryCodesMeta } from './country-codes/meta'
import { meta as currencyCodesMeta } from './currency-codes/meta'
import { meta as chartBuilderMeta } from './chart-builder/meta'
import { meta as dnsLookupMeta } from './dns-lookup/meta'
import { meta as markdownPreviewMeta } from './markdown-preview/meta'
import { meta as markdownTableMeta } from './markdown-table/meta'
import { meta as mermaidMeta } from './mermaid/meta'
import { meta as logoGeneratorMeta } from './logo-generator/meta'
import { meta as pivotTableMeta } from './pivot-table/meta'
import { meta as formulaVisualizerMeta } from './formula-visualizer/meta'

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
  { ...httpStatusCodesMeta,     component: HttpStatusCodesTool },
  { ...countryCodesMeta,        component: CountryCodesTool },
  { ...currencyCodesMeta,       component: CurrencyCodesTool },
  { ...chartBuilderMeta,        component: ChartBuilderTool },
  { ...dnsLookupMeta,           component: DnsLookupTool },
  { ...markdownPreviewMeta,     component: MarkdownPreviewTool },
  { ...markdownTableMeta,       component: MarkdownTableTool },
  { ...mermaidMeta,             component: MermaidTool },
  { ...logoGeneratorMeta,       component: LogoGeneratorTool },
  { ...pivotTableMeta,          component: PivotTableTool },
  { ...formulaVisualizerMeta,   component: FormulaVisualizerTool },
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
