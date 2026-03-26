import { ToolMeta } from '../types'
import { BarChart2 } from 'lucide-react'

export const meta: ToolMeta = {
  id: 'chart-builder',
  name: 'Chart Builder',
  description: 'Paste CSV or TSV data and visualize it instantly as a bar or line chart',
  category: 'Visualization',
  keywords: ['chart', 'graph', 'bar', 'line', 'csv', 'tsv', 'visualize', 'plot', 'echarts', 'data'],
  path: '/chart-builder',
  icon: BarChart2,
}
