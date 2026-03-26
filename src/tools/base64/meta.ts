import { ToolMeta } from '../types'
import { Binary } from 'lucide-react'

export const meta: ToolMeta = {
  id: 'base64',
  name: 'Base64 Encoder/Decoder',
  description: 'Encode text to Base64 or decode Base64 to text',
  category: 'Encoding',
  keywords: ['base64', 'encode', 'decode', 'encoding', 'text', 'binary'],
  path: '/base64',
  icon: Binary,
}
