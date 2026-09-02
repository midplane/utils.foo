import { ToolMeta } from '../types'
import { GanttChartSquare } from 'lucide-react'

export const meta: ToolMeta = {
  id: 'gantt-chart',
  name: 'Gantt Chart Builder',
  description:
    'Plan a project on a timeline — drag tasks, link them, and see the critical path, then export it',
  category: 'Visualization',
  keywords: [
    'gantt', 'chart', 'project', 'plan', 'planning', 'timeline', 'schedule', 'roadmap',
    'task', 'milestone', 'dependency', 'critical path', 'slack', 'float', 'wbs',
    'waterfall', 'sprint', 'pert', 'work breakdown', 'project management', 'deadline',
  ],
  path: '/gantt',
  icon: GanttChartSquare,
  wide: true,
}
