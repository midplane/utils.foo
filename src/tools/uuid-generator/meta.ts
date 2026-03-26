import { ToolMeta } from '../types'
import { Dices } from 'lucide-react'

export const meta: ToolMeta = {
  id: 'uuid-generator',
  name: 'UUID Generator',
  description: 'Generate UUID v4 (random), v5 (namespace+name), and v7 (time-based) identifiers',
  category: 'Crypto / Security',
  keywords: ['uuid', 'guid', 'random', 'v4', 'v5', 'v7', 'unique', 'identifier', 'namespace'],
  path: '/uuid',
  icon: Dices,
}
