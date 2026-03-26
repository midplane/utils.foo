import { ToolMeta } from '../types'
import { FileLock2 } from 'lucide-react'

export const meta: ToolMeta = {
  id: 'chmod-calculator',
  name: 'Chmod Calculator',
  description: 'Convert Unix file permissions between symbolic, octal, and rwx formats',
  category: 'Developer Tools',
  keywords: ['chmod', 'permissions', 'unix', 'linux', 'octal', 'rwx', 'file', 'mode'],
  path: '/chmod',
  icon: FileLock2,
}
