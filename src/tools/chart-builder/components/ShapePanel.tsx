import { SectionLabel } from '../../../components/ui/SectionLabel'
import { AGGREGATION_LABELS } from '../../pivot-table/types'
import type { AggregationType } from '../../pivot-table/types'
import {
  DATE_BIN_LABELS,
  SORT_LABELS,
  type Aggregation,
  type DateBin,
  type SortMode,
  type TransformConfig,
} from '../transform'

interface ShapePanelProps {
  columns: string[]
  activeSeries: string[]
  config: TransformConfig
  /** True when the chosen X column parses as dates. */
  xIsDate: boolean
  onChange: (patch: Partial<TransformConfig>) => void
}

/**
 * Aggregations offered here.
 *
 * The pivot engine supports more (product, variance, the moment family), but
 * they are near-useless on a chart axis and would bury the four people
 * actually reach for.
 */
const AGGREGATIONS: Aggregation[] = [
  'none', 'sum', 'average', 'median', 'count', 'countUnique', 'min', 'max',
]

const DATE_BINS: DateBin[] = ['none', 'hour', 'day', 'week', 'month', 'quarter', 'year']
const SORTS: SortMode[] = ['none', 'x-asc', 'x-desc', 'value-desc', 'value-asc']

const inputClass =
  'w-full text-[11px] font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1 text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-accent)]'
const selectClass = `${inputClass} cursor-pointer`

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <SectionLabel>{label}</SectionLabel>
      {children}
      {hint && <p className="text-[10px] font-mono text-[var(--color-ink-muted)]">{hint}</p>}
    </div>
  )
}

export function ShapePanel({ columns, activeSeries, config, xIsDate, onChange }: ShapePanelProps) {
  const aggregating = config.aggregation !== 'none'
  const valueSorted = config.sort === 'value-desc' || config.sort === 'value-asc'

  return (
    <div className="space-y-2.5">
      <Field label="X axis">
        <select
          aria-label="X axis column"
          value={config.xCol}
          onChange={(e) => onChange({ xCol: e.target.value })}
          className={selectClass}
        >
          {columns.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </Field>

      <Field
        label="Summarise by"
        hint={aggregating ? undefined : 'One point per row'}
      >
        <select
          aria-label="Aggregation"
          value={config.aggregation}
          onChange={(e) => onChange({ aggregation: e.target.value as Aggregation })}
          className={selectClass}
        >
          {AGGREGATIONS.map((a) => (
            <option key={a} value={a}>
              {a === 'none' ? 'No grouping' : AGGREGATION_LABELS[a as AggregationType]}
            </option>
          ))}
        </select>
      </Field>

      {xIsDate && (
        <Field
          label="Group dates by"
          hint={config.dateBin === 'none' ? 'Treated as labels' : 'Real time axis'}
        >
          <select
            aria-label="Date bucket"
            value={config.dateBin}
            onChange={(e) => onChange({ dateBin: e.target.value as DateBin })}
            className={selectClass}
          >
            {DATE_BINS.map((b) => (
              <option key={b} value={b}>{DATE_BIN_LABELS[b]}</option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Sort">
        <select
          aria-label="Sort order"
          value={config.sort}
          onChange={(e) => onChange({ sort: e.target.value as SortMode })}
          className={selectClass}
        >
          {SORTS.map((s) => (
            <option key={s} value={s}>{SORT_LABELS[s]}</option>
          ))}
        </select>
      </Field>

      {valueSorted && activeSeries.length > 1 && (
        <Field label="Sort by series">
          <select
            aria-label="Sort by series"
            value={config.sortBy || activeSeries[0]}
            onChange={(e) => onChange({ sortBy: e.target.value })}
            className={selectClass}
          >
            {activeSeries.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
      )}

      <div className="grid grid-cols-2 gap-2">
      <Field label="Top N" hint={config.topN > 0 ? undefined : 'Showing all'}>
        <input
          aria-label="Top N"
          value={config.topN === 0 ? '' : String(config.topN)}
          onChange={(e) => {
            const raw = e.target.value.trim()
            const n = raw === '' ? 0 : Math.max(0, Math.floor(Number(raw) || 0))
            onChange({ topN: n })
          }}
          placeholder="all"
          inputMode="numeric"
          className={inputClass}
        />
      </Field>

      {config.topN > 0 && (
        <Field label="Remainder">
          <label className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--color-ink-light)] cursor-pointer">
            <input
              type="checkbox"
              checked={config.groupOther}
              onChange={(e) => onChange({ groupOther: e.target.checked })}
              className="accent-[var(--color-accent)] cursor-pointer"
            />
            “Other”
          </label>
        </Field>
      )}
      </div>
    </div>
  )
}
