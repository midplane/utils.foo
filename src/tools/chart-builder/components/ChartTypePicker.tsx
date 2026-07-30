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
 * Nine options in a segmented control monopolised the header and forced the
 * labels down to an unreadable size; as a grid they stay scannable and cost one
 * rail row instead of a full toolbar.
 */
export function ChartTypePicker({
  value, orientation, onChange, onOrientationChange,
}: ChartTypePickerProps) {
  const isBar = value === 'bar' || value === 'stacked-bar'

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-1" role="group" aria-label="Chart type">
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
                'flex flex-col items-center gap-0.5 py-1.5 rounded-md border transition-colors cursor-pointer',
                active
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                  : 'border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-border-dark)] hover:text-[var(--color-ink)]'
              )}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="text-[8px] font-mono leading-none text-center">
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
