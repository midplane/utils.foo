import { Plus, Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { SectionLabel } from '../../../components/ui/SectionLabel'
import {
  FILTER_OP_LABELS,
  UNARY_OPS,
  type FilterOp,
  type FilterRule,
} from '../transform'

interface FilterEditorProps {
  columns: string[]
  filters: FilterRule[]
  matchedRows: number
  totalRows: number
  onChange: (filters: FilterRule[]) => void
}

const OPS = Object.keys(FILTER_OP_LABELS) as FilterOp[]

const selectClass =
  'text-[11px] font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-1 text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer'

export function FilterEditor({
  columns, filters, matchedRows, totalRows, onChange,
}: FilterEditorProps) {
  const add = () => {
    onChange([
      ...filters,
      // crypto.randomUUID is not available on every target; index-free ids just
      // need to be unique within this list.
      { id: `${Date.now()}-${filters.length}`, column: columns[0] ?? '', op: 'eq', value: '' },
    ])
  }

  const update = (id: string, patch: Partial<FilterRule>) => {
    onChange(filters.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }

  const remove = (id: string) => onChange(filters.filter((f) => f.id !== id))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <SectionLabel>Filters</SectionLabel>
        <div className="flex items-center gap-2">
          {filters.length > 0 && (
            <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">
              {matchedRows} of {totalRows} rows
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={add} className="gap-1 text-[10px] h-6 px-1.5">
            <Plus className="w-3 h-3" />
            Add
          </Button>
        </div>
      </div>

      {filters.length === 0 ? (
        <p className="text-[10px] font-mono text-[var(--color-ink-muted)]">
          No filters — all rows are charted.
        </p>
      ) : (
        <div className="space-y-1.5">
          {filters.map((rule) => (
            <div key={rule.id} className="flex items-center gap-1">
              <select
                aria-label="Filter column"
                value={rule.column}
                onChange={(e) => update(rule.id, { column: e.target.value })}
                className={`${selectClass} flex-1 min-w-0`}
              >
                {columns.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                aria-label="Filter operator"
                value={rule.op}
                onChange={(e) => update(rule.id, { op: e.target.value as FilterOp })}
                className={selectClass}
              >
                {OPS.map((op) => (
                  <option key={op} value={op}>{FILTER_OP_LABELS[op]}</option>
                ))}
              </select>

              {!UNARY_OPS.has(rule.op) && (
                <input
                  aria-label="Filter value"
                  value={rule.value}
                  onChange={(e) => update(rule.id, { value: e.target.value })}
                  placeholder="value"
                  className="flex-1 min-w-0 text-[11px] font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-1 text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              )}

              <button
                type="button"
                aria-label="Remove filter"
                onClick={() => remove(rule.id)}
                className="p-1 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-error-text)] hover:bg-[var(--color-cream-dark)] cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
