import { ToolMeta } from '../types'
import { LockKeyhole } from 'lucide-react'

export const meta: ToolMeta = {
  id: 'password-generator',
  name: 'Password Generator',
  description: 'Generate secure random passwords with configurable length and character sets',
  category: 'Crypto / Security',
  keywords: ['password', 'random', 'secure', 'entropy', 'generator', 'passphrase', 'credentials'],
  path: '/password',
  icon: LockKeyhole,
}
