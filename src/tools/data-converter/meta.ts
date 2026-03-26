import { ToolMeta } from '../types'
import { ArrowLeftRight } from 'lucide-react'

export const meta: ToolMeta = {
  id: 'data-converter',
  name: 'Data Converter',
  description: 'Convert between JSON, YAML, TOML, CSV, and XML instantly',
  category: 'Formatting',
  keywords: ['json', 'yaml', 'toml', 'csv', 'xml', 'convert', 'transform', 'format', 'data'],
  path: '/convert',
  icon: ArrowLeftRight,
}
