import { Table2 } from 'lucide-react'
import { ToolHeader } from '../../components/ui/ToolHeader'
import { PivotTable } from '@utils-foo/pivot-react'

export default function PivotTableTool() {
  return (
    <div className="space-y-4 animate-fade-in">
      <ToolHeader icon={<Table2 />} title="Pivot" accentedSuffix="Table" />
      <PivotTable />
    </div>
  )
}
