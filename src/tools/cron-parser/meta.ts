import { ToolMeta } from '../types'
import { CalendarClock } from 'lucide-react'

export const meta: ToolMeta = {
  id: 'cron-parser',
  name: 'Cron Parser',
  description: 'Explain cron expressions in plain English and preview next run times',
  category: 'Developer Tools',
  keywords: ['cron', 'schedule', 'expression', 'parser', 'jobs', 'tasks', 'interval', 'crontab'],
  path: '/cron',
  icon: CalendarClock,
}
