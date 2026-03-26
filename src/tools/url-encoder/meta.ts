import { ToolMeta } from '../types'
import { Link2 } from 'lucide-react'

export const meta: ToolMeta = {
  id: 'url-encoder',
  name: 'URL Encoder/Decoder',
  description: 'Encode or decode URL-safe strings',
  category: 'Encoding',
  keywords: ['url', 'encode', 'decode', 'percent', 'uri', 'escape', 'unescape', 'query'],
  path: '/url',
  icon: Link2,
}
