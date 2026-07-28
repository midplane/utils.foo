import { useState, useMemo, useCallback, useRef } from 'react'
import { X, Check, RotateCcw } from 'lucide-react'
import {
  Modal,
  Button,
  Checkbox,
  EmptyState,
  Alert,
  SearchInput,
  Input,
  Select,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../../../components/ui'
import {
  FieldInfo,
  FilterConfig,
  LabelRule,
  MeasureRule,
  LabelOp,
  MeasureOp,
  LABEL_OP_LABELS,
  MEASURE_OP_LABELS,
  MEASURE_RANK_OPS,
  ValueConfig,
  metricLabel,
} from '../types'
import { keyLabel } from '../engine/sorters'

interface FilterModalProps {
  open: boolean
  onClose: () => void
  field: FieldInfo
  filter: FilterConfig | undefined
  /** Metrics available to a value/Top-N rule. */
  valueConfigs: ValueConfig[]
  /** False when the field sits in the Filters zone, where item rules have no axis. */
  onAxis: boolean
  onApply: (filter: FilterConfig) => void
}

export function FilterModal({
  open,
  onClose,
  field,
  filter,
  valueConfigs,
  onAxis,
  onApply,
}: FilterModalProps) {
  // The parent remounts per field, so deriving initial state from props is safe.
  const [excluded, setExcluded] = useState<Set<string>>(
    () => new Set(filter?.excludedValues ?? [])
  )
  const [label, setLabel] = useState<LabelRule>(
    () => filter?.label ?? { op: 'contains', text: '' }
  )
  const [measure, setMeasure] = useState<MeasureRule | null>(() => filter?.measure ?? null)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const filteredValues = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return field.uniqueValues
    return field.uniqueValues.filter((v) => keyLabel(v).toLowerCase().includes(query))
  }, [field.uniqueValues, search])

  const toggle = useCallback((value: string, checked: boolean) => {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (checked) next.delete(value)
      else next.add(value)
      return next
    })
  }, [])

  const setAll = useCallback(
    (include: boolean) => {
      setExcluded((prev) => {
        const next = new Set(prev)
        for (const v of filteredValues) {
          if (include) next.delete(v)
          else next.add(v)
        }
        return next
      })
    },
    [filteredValues]
  )

  const handleApply = () => {
    onApply({
      field: field.name,
      excludedValues: excluded,
      label: label.text.trim() === '' ? undefined : label,
      measure: measure ?? undefined,
    })
    onClose()
  }

  const handleClearAll = () => {
    setExcluded(new Set())
    setLabel({ op: 'contains', text: '' })
    setMeasure(null)
  }

  const selectedCount = field.uniqueValues.length - excluded.size
  const activeRules =
    (excluded.size > 0 ? 1 : 0) +
    (label.text.trim() ? 1 : 0) +
    (measure ? 1 : 0)

  return (
    <Modal open={open} onClose={onClose} title={`Filter: ${field.name}`}>
      <Tabs defaultValue="values">
        <TabsList>
          <TabsTrigger value="values">Values</TabsTrigger>
          <TabsTrigger value="label">Label</TabsTrigger>
          <TabsTrigger value="measure">Top N / Value</TabsTrigger>
        </TabsList>

        {/* ── Checkbox list ─────────────────────────────────────────────── */}
        <TabsContent value="values">
          <div className="space-y-3">
            {field.highCardinality ? (
              <Alert variant="warning" size="sm">
                <span className="font-semibold">{field.name}</span> has more than
                1,000 distinct values, so it cannot be filtered from a list. Use a
                Label or Top N rule instead.
              </Alert>
            ) : (
              <>
                <SearchInput
                  ref={searchRef}
                  value={search}
                  onChange={setSearch}
                  placeholder="Search values…"
                />

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setAll(true)}
                    className="text-[var(--color-accent)] hover:underline cursor-pointer"
                  >
                    Select all
                  </button>
                  <span className="text-[var(--color-ink-muted)]" aria-hidden="true">
                    |
                  </span>
                  <button
                    type="button"
                    onClick={() => setAll(false)}
                    className="text-[var(--color-accent)] hover:underline cursor-pointer"
                  >
                    Select none
                  </button>
                  <span className="ml-auto text-[var(--color-ink-muted)]" aria-live="polite">
                    {selectedCount.toLocaleString()} of{' '}
                    {field.uniqueValues.length.toLocaleString()} selected
                  </span>
                </div>

                <div
                  role="group"
                  aria-label={`Values for ${field.name}`}
                  className="max-h-56 overflow-y-auto border border-[var(--color-border)] rounded-lg divide-y divide-[var(--color-border)]"
                >
                  {filteredValues.length === 0 ? (
                    <EmptyState
                      size="sm"
                      query={search}
                      message="No values match your search"
                      className="px-3"
                    />
                  ) : (
                    filteredValues.map((value) => (
                      <label
                        key={value}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--color-cream-dark)] cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={!excluded.has(value)}
                          onChange={(e) => toggle(value, e.target.checked)}
                        />
                        <span className="text-xs font-mono text-[var(--color-ink)] truncate">
                          {keyLabel(value)}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* ── Label rule ────────────────────────────────────────────────── */}
        <TabsContent value="label">
          <div className="space-y-3">
            <p className="text-xs text-[var(--color-ink-muted)]">
              Keep only items whose label matches.
            </p>
            <div className="flex items-center gap-2">
              <Select
                aria-label="Label condition"
                value={label.op}
                onChange={(e) => setLabel({ ...label, op: e.target.value as LabelOp })}
                options={Object.entries(LABEL_OP_LABELS).map(([value, l]) => ({
                  value,
                  label: l,
                }))}
              />
              <Input
                aria-label="Label text"
                value={label.text}
                placeholder="Text…"
                onChange={(e) => setLabel({ ...label, text: e.target.value })}
              />
            </div>
            {label.text.trim() === '' && (
              <Alert variant="info" size="sm">
                Enter text to activate this rule.
              </Alert>
            )}
          </div>
        </TabsContent>

        {/* ── Measure rule ──────────────────────────────────────────────── */}
        <TabsContent value="measure">
          <div className="space-y-3">
            {!onAxis ? (
              <Alert variant="warning" size="sm">
                Top N and value rules rank a field's items, so{' '}
                <span className="font-semibold">{field.name}</span> has to be in
                Rows or Columns rather than the Filters zone.
              </Alert>
            ) : valueConfigs.length === 0 ? (
              <Alert variant="warning" size="sm">
                Add a value metric first — there is nothing to rank by.
              </Alert>
            ) : (
              <>
                <p className="text-xs text-[var(--color-ink-muted)]">
                  Ranks items by their aggregated value, within each parent group.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    aria-label="Rule type"
                    value={measure?.op ?? 'none'}
                    onChange={(e) => {
                      const op = e.target.value
                      if (op === 'none') return setMeasure(null)
                      setMeasure({
                        op: op as MeasureOp,
                        valueIndex: measure?.valueIndex ?? 0,
                        a: measure?.a ?? (MEASURE_RANK_OPS.has(op as MeasureOp) ? 10 : 0),
                        b: measure?.b,
                      })
                    }}
                    options={[
                      { value: 'none', label: 'No rule' },
                      ...Object.entries(MEASURE_OP_LABELS).map(([value, l]) => ({
                        value,
                        label: l,
                      })),
                    ]}
                  />

                  {measure && (
                    <>
                      <Input
                        type="number"
                        aria-label={MEASURE_RANK_OPS.has(measure.op) ? 'Item count' : 'Threshold'}
                        value={String(measure.a)}
                        onChange={(e) =>
                          setMeasure({ ...measure, a: Number(e.target.value) })
                        }
                      />
                      {measure.op === 'between' && (
                        <>
                          <span className="text-xs text-[var(--color-ink-muted)]">and</span>
                          <Input
                            type="number"
                            aria-label="Upper bound"
                            value={String(measure.b ?? '')}
                            onChange={(e) =>
                              setMeasure({ ...measure, b: Number(e.target.value) })
                            }
                          />
                        </>
                      )}
                    </>
                  )}
                </div>

                {measure && valueConfigs.length > 1 && (
                  <Select
                    label="Ranked by"
                    aria-label="Ranked by metric"
                    value={String(measure.valueIndex)}
                    onChange={(e) =>
                      setMeasure({ ...measure, valueIndex: Number(e.target.value) })
                    }
                    options={valueConfigs.map((vc, i) => ({
                      value: String(i),
                      label: metricLabel(vc),
                    }))}
                  />
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex items-center gap-2 pt-3 mt-3 border-t border-[var(--color-border)]">
        <span className="text-[11px] text-[var(--color-ink-muted)]">
          {activeRules === 0
            ? 'No filters active'
            : `${activeRules} rule${activeRules === 1 ? '' : 's'} active`}
        </span>
        {activeRules > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearAll}>
            <RotateCcw className="w-3 h-3" aria-hidden="true" />
            Clear
          </Button>
        )}
        <div className="flex-1" />
        <Button variant="ghost" onClick={onClose}>
          <X className="w-3.5 h-3.5" aria-hidden="true" />
          Cancel
        </Button>
        <Button onClick={handleApply}>
          <Check className="w-3.5 h-3.5" aria-hidden="true" />
          Apply
        </Button>
      </div>
    </Modal>
  )
}
