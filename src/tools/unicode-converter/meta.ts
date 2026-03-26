import { ToolMeta } from '../types'
import { Languages } from 'lucide-react'

export const meta: ToolMeta = {
  id: 'unicode-converter',
  name: 'Unicode Converter',
  description: 'Convert between Unicode, hex, decimal, and characters',
  category: 'Encoding',
  keywords: ['unicode', 'hex', 'decimal', 'character', 'codepoint', 'utf8', 'utf16', 'ascii', 'emoji'],
  path: '/unicode',
  icon: Languages,
}
