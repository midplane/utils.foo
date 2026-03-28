import { useState, useCallback, useMemo } from 'react'
import { Plus, X, GripVertical } from 'lucide-react'
import { Toggle } from '../../../components/ui/Toggle'
import { FilterModal } from './FilterModal'
import {
  PivotConfig,
  ValueConfig,
  FilterConfig,
  FieldInfo,
  AGGREGATION_LABELS,
  SORT_ORDER_LABELS,
  HEATMAP_LABELS,
  DUAL_FIELD_AGGREGATIONS,
} from '../types'

// ─── Draggable Field Chip ─────────────────────────────────────────────────────

interface FieldChipProps {
  field: string
  isNumeric?: boolean
  onRemove?: () => void
  isDragging?: boolean
}

function FieldChip({ field, isNumeric, onRemove, isDragging }: FieldChipProps) {
  return (
    <span
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', field)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono cursor-grab active:cursor-grabbing select-none transition-all ${
        isDragging
          ? 'opacity-50'
          : 'bg-[var(--color-cream)] border border-[var(--color-border)] hover:border-[var(--color-ink-muted)] shadow-sm'
      }`}
    >
      <GripVertical className="w-3 h-3 text-[var(--color-ink-muted)]" />
      <span>{field}</span>
      {isNumeric && <span className="text-[9px] text-[var(--color-ink-muted)]">#</span>}
      {onRemove && (
        <X
          className="w-3 h-3 text-[var(--color-ink-muted)] hover:text-red-600 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        />
      )}
    </span>
  )
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────

interface DropZoneProps {
  label: string
  fields: string[]
  allFields: FieldInfo[]
  onDrop: (field: string) => void
  onRemove: (field: string) => void
  onReorder?: (fields: string[]) => void
  activeFilters?: Map<string, number>
  onFilterClick?: (field: string) => void
  className?: string
}

function DropZone({
  label,
  fields,
  allFields,
  onDrop,
  onRemove,
  activeFilters,
  onFilterClick,
  className = '',
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const fieldInfoMap = useMemo(
    () => new Map(allFields.map((f) => [f.name, f])),
    [allFields]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const field = e.dataTransfer.getData('text/plain')
      if (field && !fields.includes(field)) {
        onDrop(field)
      }
    },
    [fields, onDrop]
  )

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 min-w-[140px] p-2 rounded-lg border-2 border-dashed transition-colors ${
        isDragOver
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
          : 'border-[var(--color-border)] bg-[var(--color-cream-dark)]/30'
      } ${className}`}
    >
      <div className="text-[10px] font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider mb-2">
        {label}
      </div>
      <div className="flex flex-wrap gap-1 min-h-[28px]">
        {fields.length === 0 ? (
          <span className="text-[10px] text-[var(--color-ink-muted)] italic">
            Drop fields here
          </span>
        ) : (
          fields.map((field) => {
            const info = fieldInfoMap.get(field)
            const filterCount = activeFilters?.get(field)
            return (
              <span key={field} className="relative">
                <FieldChip
                  field={field}
                  isNumeric={info?.isNumeric}
                  onRemove={() => onRemove(field)}
                />
                {filterCount !== undefined && filterCount > 0 && onFilterClick && (
                  <button
                    onClick={() => onFilterClick(field)}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-accent)] text-white text-[9px] font-bold flex items-center justify-center"
                    title={`${filterCount} values filtered`}
                  >
                    {filterCount}
                  </button>
                )}
              </span>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── Inline Value Config ──────────────────────────────────────────────────────

interface ValueConfigInlineProps {
  config: ValueConfig
  fields: string[]
  numericFields: Set<string>
  onUpdate: (config: ValueConfig) => void
  onRemove: () => void
}

function ValueConfigInline({
  config,
  fields,
  numericFields,
  onUpdate,
  onRemove,
}: ValueConfigInlineProps) {
  const isDualField = DUAL_FIELD_AGGREGATIONS.has(config.aggregation)
  const availableFields =
    config.aggregation === 'count' || config.aggregation === 'countUnique'
      ? fields
      : fields.filter((f) => numericFields.has(f))

  const availableFields2 = fields.filter((f) => numericFields.has(f))

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[var(--color-cream)] border border-[var(--color-border)] rounded text-xs shadow-sm">
      <select
        value={config.aggregation}
        onChange={(e) =>
          onUpdate({ ...config, aggregation: e.target.value as ValueConfig['aggregation'] })
        }
        className="bg-transparent text-[10px] font-medium focus:outline-none cursor-pointer"
      >
        {Object.entries(AGGREGATION_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
      <span className="text-[var(--color-ink-muted)]">of</span>
      <select
        value={config.field}
        onChange={(e) => onUpdate({ ...config, field: e.target.value })}
        className="bg-transparent font-mono text-[11px] focus:outline-none cursor-pointer"
      >
        <option value="">—</option>
        {availableFields.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
      {isDualField && (
        <>
          <span className="text-[var(--color-ink-muted)]">/</span>
          <select
            value={config.field2 || ''}
            onChange={(e) => onUpdate({ ...config, field2: e.target.value || undefined })}
            className="bg-transparent font-mono text-[11px] focus:outline-none cursor-pointer"
          >
            <option value="">—</option>
            {availableFields2.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </>
      )}
      <X
        className="w-3 h-3 cursor-pointer hover:text-red-600 text-[var(--color-ink-muted)]"
        onClick={onRemove}
      />
    </span>
  )
}

// ─── Config Panel ─────────────────────────────────────────────────────────────

interface ConfigPanelProps {
  config: PivotConfig
  fields: FieldInfo[]
  onConfigChange: (config: PivotConfig) => void
}

export function ConfigPanel({ config, fields, onConfigChange }: ConfigPanelProps) {
  const [filterModalField, setFilterModalField] = useState<string | null>(null)

  const fieldNames = useMemo(() => fields.map((f) => f.name), [fields])
  const numericFields = useMemo(
    () => new Set(fields.filter((f) => f.isNumeric).map((f) => f.name)),
    [fields]
  )

  // Fields not yet assigned to rows, cols, or filters
  const unassignedFields = useMemo(() => {
    const assigned = new Set([...config.rows, ...config.cols])
    return fieldNames.filter((f) => !assigned.has(f))
  }, [fieldNames, config.rows, config.cols])

  // Active filter counts by field
  const activeFilterCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const f of config.filters) {
      if (f.excludedValues.size > 0) {
        counts.set(f.field, f.excludedValues.size)
      }
    }
    return counts
  }, [config.filters])

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleDropToRows = useCallback(
    (field: string) => {
      // Remove from cols if present
      const newCols = config.cols.filter((f) => f !== field)
      onConfigChange({ ...config, rows: [...config.rows, field], cols: newCols })
    },
    [config, onConfigChange]
  )

  const handleDropToCols = useCallback(
    (field: string) => {
      // Remove from rows if present
      const newRows = config.rows.filter((f) => f !== field)
      onConfigChange({ ...config, cols: [...config.cols, field], rows: newRows })
    },
    [config, onConfigChange]
  )

  const handleRemoveFromRows = useCallback(
    (field: string) => {
      onConfigChange({ ...config, rows: config.rows.filter((f) => f !== field) })
    },
    [config, onConfigChange]
  )

  const handleRemoveFromCols = useCallback(
    (field: string) => {
      onConfigChange({ ...config, cols: config.cols.filter((f) => f !== field) })
    },
    [config, onConfigChange]
  )

  const handleAddValue = useCallback(() => {
    const defaultField = fields.find((f) => f.isNumeric)?.name || fields[0]?.name || ''
    const newValue: ValueConfig = {
      field: defaultField,
      aggregation: numericFields.has(defaultField) ? 'sum' : 'count',
    }
    onConfigChange({ ...config, values: [...config.values, newValue] })
  }, [config, fields, numericFields, onConfigChange])

  const handleUpdateValue = useCallback(
    (index: number, updated: ValueConfig) => {
      const values = [...config.values]
      values[index] = updated
      onConfigChange({ ...config, values })
    },
    [config, onConfigChange]
  )

  const handleRemoveValue = useCallback(
    (index: number) => {
      const values = config.values.filter((_, i) => i !== index)
      onConfigChange({ ...config, values })
    },
    [config, onConfigChange]
  )

  const handleFilterApply = useCallback(
    (field: string, excludedValues: Set<string>) => {
      const existingIndex = config.filters.findIndex((f) => f.field === field)
      let filters: FilterConfig[]

      if (excludedValues.size === 0) {
        filters = config.filters.filter((f) => f.field !== field)
      } else if (existingIndex >= 0) {
        filters = [...config.filters]
        filters[existingIndex] = { field, excludedValues }
      } else {
        filters = [...config.filters, { field, excludedValues }]
      }

      onConfigChange({ ...config, filters })
    },
    [config, onConfigChange]
  )

  const modalFieldInfo = filterModalField ? fields.find((f) => f.name === filterModalField) : null
  const modalExcluded = filterModalField
    ? config.filters.find((f) => f.field === filterModalField)?.excludedValues || new Set<string>()
    : new Set<string>()

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-3 p-3 bg-[var(--color-cream)] border border-[var(--color-border)] rounded-lg text-xs">
        {/* Row 1: Available Fields */}
        <div>
          <div className="text-[10px] font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider mb-2">
            Fields
          </div>
          <div className="flex flex-wrap gap-1.5">
            {unassignedFields.length === 0 ? (
              <span className="text-[10px] text-[var(--color-ink-muted)] italic">
                All fields assigned
              </span>
            ) : (
              unassignedFields.map((field) => {
                const info = fields.find((f) => f.name === field)
                return <FieldChip key={field} field={field} isNumeric={info?.isNumeric} />
              })
            )}
          </div>
        </div>

        {/* Row 2: Drop Zones - Rows, Columns, Filters */}
        <div className="flex gap-3">
          <DropZone
            label="Rows"
            fields={config.rows}
            allFields={fields}
            onDrop={handleDropToRows}
            onRemove={handleRemoveFromRows}
          />
          <DropZone
            label="Columns"
            fields={config.cols}
            allFields={fields}
            onDrop={handleDropToCols}
            onRemove={handleRemoveFromCols}
          />
          <DropZone
            label="Filters"
            fields={[...activeFilterCounts.keys()]}
            allFields={fields}
            onDrop={(field) => setFilterModalField(field)}
            onRemove={(field) => handleFilterApply(field, new Set())}
            activeFilters={activeFilterCounts}
            onFilterClick={setFilterModalField}
          />
        </div>

        {/* Row 3: Values and Options */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--color-border)]">
          {/* Values */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider">
              Values:
            </span>
            {config.values.map((vc, i) => (
              <ValueConfigInline
                key={i}
                config={vc}
                fields={fieldNames}
                numericFields={numericFields}
                onUpdate={(updated) => handleUpdateValue(i, updated)}
                onRemove={() => handleRemoveValue(i)}
              />
            ))}
            <button
              onClick={handleAddValue}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="flex-1" />

          {/* Options */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 cursor-pointer">
              <Toggle
                checked={config.showRowTotals}
                onChange={(e) => onConfigChange({ ...config, showRowTotals: e.target.checked })}
              />
              <span>Row Σ</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <Toggle
                checked={config.showColTotals}
                onChange={(e) => onConfigChange({ ...config, showColTotals: e.target.checked })}
              />
              <span>Col Σ</span>
            </label>

            <label className="flex items-center gap-1 cursor-pointer">
              <span className="text-[var(--color-ink-muted)]">Heatmap:</span>
              <select
                value={config.heatmap}
                onChange={(e) =>
                  onConfigChange({ ...config, heatmap: e.target.value as PivotConfig['heatmap'] })
                }
                className="px-1.5 py-0.5 bg-[var(--color-cream)] border border-[var(--color-border)] rounded text-xs focus:outline-none cursor-pointer"
              >
                {Object.entries(HEATMAP_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-1 cursor-pointer">
              <span className="text-[var(--color-ink-muted)]">Sort:</span>
              <select
                value={config.rowOrder}
                onChange={(e) =>
                  onConfigChange({ ...config, rowOrder: e.target.value as PivotConfig['rowOrder'] })
                }
                className="px-1.5 py-0.5 bg-[var(--color-cream)] border border-[var(--color-border)] rounded text-xs focus:outline-none cursor-pointer"
              >
                {Object.entries(SORT_ORDER_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* Filter Modal */}
      {modalFieldInfo && (
        <FilterModal
          key={modalFieldInfo.name}
          open={filterModalField !== null}
          onClose={() => setFilterModalField(null)}
          fieldName={modalFieldInfo.name}
          allValues={modalFieldInfo.uniqueValues}
          excludedValues={modalExcluded}
          onApply={(excluded) => handleFilterApply(modalFieldInfo.name, excluded)}
        />
      )}
    </>
  )
}
