import { ToolMeta } from '../types'
import { Ticket } from 'lucide-react'

export const meta: ToolMeta = {
  id: 'jwt-decoder',
  name: 'JWT Decoder',
  description: 'Parse and inspect JSON Web Tokens',
  category: 'Encoding',
  keywords: ['jwt', 'json', 'web', 'token', 'decode', 'parse', 'auth', 'authentication', 'bearer'],
  path: '/jwt',
  icon: Ticket,
}
