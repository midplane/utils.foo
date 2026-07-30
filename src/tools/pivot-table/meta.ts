import { ToolMeta } from '../types'
import { Table2 } from 'lucide-react'

export const meta: ToolMeta = {
  id: 'pivot-table',
  name: 'Pivot Table',
  description: 'Excel-style pivot table for CSV data — subtotals, grouping, running totals, Top-N filters and drill-down',
  category: 'Data',
  keywords: ['pivot', 'table', 'csv', 'excel', 'aggregate', 'group', 'subtotal', 'summarize', 'data', 'analysis', 'heatmap', 'filter', 'sort', 'drill down'],
  path: '/pivot',
  icon: Table2,
}
