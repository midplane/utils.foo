import { ToolMeta } from '../types'
import { BarChart2 } from 'lucide-react'

export const meta: ToolMeta = {
  id: 'chart-builder',
  name: 'Chart Builder',
  description: 'Load CSV or TSV data, aggregate and filter it, and chart it as bar, line, area, scatter or pie',
  category: 'Visualization',
  keywords: ['chart', 'graph', 'bar', 'line', 'area', 'pie', 'donut', 'scatter', 'csv', 'tsv', 'visualize', 'plot', 'echarts', 'data', 'aggregate', 'group by', 'time series'],
  path: '/chart-builder',
  icon: BarChart2,
  wide: true,
}
