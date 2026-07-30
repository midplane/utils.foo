import {
  BarChart2,
  BarChartHorizontal,
  ChartColumnStacked,
  LineChart,
  AreaChart,
  Layers,
  ScatterChart,
  PieChart,
  Donut,
  ChartNoAxesCombined,
} from 'lucide-react'
import { cn } from '../../../lib/utils'
import { CHART_TYPE_LABELS, type ChartType, type Orientation } from '../chartOption'

interface ChartTypePickerProps {
  value: ChartType
  orientation: Orientation
  onChange: (type: ChartType) => void
  onOrientationChange: (orientation: Orientation) => void
}

const ICONS: Record<ChartType, typeof BarChart2> = {
  bar: BarChart2,
  'stacked-bar': ChartColumnStacked,
  line: LineChart,
  area: AreaChart,
  'stacked-area': Layers,
  scatter: ScatterChart,
  pie: PieChart,
  donut: Donut,
  combo: ChartNoAxesCombined,
}

const TYPES = Object.keys(CHART_TYPE_LABELS) as ChartType[]

/**
 * Chart type as an icon grid.
 *
 * Deliberately not a dropdown: this is the most exploratory control in the
 * tool - flipping bar to line to area to see which reads best - and a select
 * costs a click per attempt while hiding the options behind recall. Three
 * columns rather than five, so the labels stay legible in a 300px rail.
 */
export function ChartTypePicker({
  value, orientation, onChange, onOrientationChange,
}: ChartTypePickerProps) {
  const isBar = value === 'bar' || value === 'stacked-bar'

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1" role="group" aria-label="Chart type">
        {TYPES.map((type) => {
          const Icon = ICONS[type]
          const active = value === type
          return (
            <button
              key={type}
              type="button"
              onClick={() => onChange(type)}
              aria-pressed={active}
              title={CHART_TYPE_LABELS[type]}
              className={cn(
                'flex flex-col items-center gap-1 py-2 rounded-md border transition-colors cursor-pointer',
                active
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                  : 'border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-border-dark)] hover:text-[var(--color-ink)]'
              )}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              <span className="text-[10px] font-mono leading-tight text-center">
                {CHART_TYPE_LABELS[type]}
              </span>
            </button>
          )
        })}
      </div>

      {isBar && (
        <div className="flex gap-1" role="group" aria-label="Orientation">
          {(['vertical', 'horizontal'] as Orientation[]).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => onOrientationChange(o)}
              aria-pressed={orientation === o}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-1 py-1 rounded-md border text-[10px] font-mono capitalize transition-colors cursor-pointer',
                orientation === o
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-border-dark)]'
              )}
            >
              {o === 'vertical'
                ? <BarChart2 className="w-3 h-3" aria-hidden="true" />
                : <BarChartHorizontal className="w-3 h-3" aria-hidden="true" />}
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
