import { ToolMeta } from '../types'
import { KeyRound } from 'lucide-react'

export const meta: ToolMeta = {
  id: 'hmac-generator',
  name: 'HMAC Generator',
  description: 'Generate HMAC-SHA256 and HMAC-SHA512 message authentication codes with a secret key',
  category: 'Crypto / Security',
  keywords: ['hmac', 'sha256', 'sha512', 'mac', 'message authentication', 'secret', 'signature', 'hash'],
  path: '/hmac',
  icon: KeyRound,
}
