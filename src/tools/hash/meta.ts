import { ToolMeta } from '../types'
import { Fingerprint } from 'lucide-react'

export const meta: ToolMeta = {
  id: 'hash',
  name: 'Hash Generator',
  description: 'Generate MD5, SHA-1, SHA-256, and SHA-512 hashes from text',
  category: 'Encoding',
  keywords: ['hash', 'md5', 'sha1', 'sha256', 'sha512', 'checksum', 'digest', 'crypto'],
  path: '/hash',
  icon: Fingerprint,
}
