import { ToolMeta } from '../types'
import { Clock } from 'lucide-react'

export const meta: ToolMeta = {
  id: 'epoch',
  name: 'Epoch Converter',
  description: 'Convert Unix timestamps to human-readable dates and vice versa',
  category: 'Time',
  keywords: ['unix', 'timestamp', 'date', 'time', 'epoch', 'milliseconds', 'seconds'],
  path: '/epoch',
  icon: Clock,
}
