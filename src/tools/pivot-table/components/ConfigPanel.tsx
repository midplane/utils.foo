import { useState, useCallback, useMemo, useRef, useEffect, useId } from 'react'
import {
  Plus,
  X,
  GripVertical,
  Filter,
  ChevronUp,
  ChevronDown,
  Rows3,
  Columns3,
  CalendarRange,
  Layers,
} from 'lucide-react'
import {
  Alert,
  SectionLabel,
  Tooltip,
} from '../../../components/ui'
import { cn } from '../../../lib/utils'
import { FilterModal } from './FilterModal'
import { GroupingModal } from './GroupingModal'
import { datePartField, binnedField } from '../engine/grouping'
import {
  PivotConfig,
  ValueConfig,
  FilterConfig,
  FieldInfo,
  FieldGrouping,
  AggregationType,
  AGGREGATION_LABELS,
  SHOW_AS_LABELS,
  NUMBER_STYLE_LABELS,
  NumberStyle,
  ROW_AXIS_SHOW_AS,
  COL_AXIS_SHOW_AS,
  ShowAs,
  DUAL_FIELD_AGGREGATIONS,
  ANY_FIELD_AGGREGATIONS,
  autoMetricLabel,
} from '../types'

type Zone = 'available' | 'rows' | 'cols' | 'filters'

const ZONE_LABELS: Record<Exclude<Zone, 'available'>, string> = {
  rows: 'Rows',
  cols: 'Columns',
  filters: 'Filters',
}

// ─── Field Chip ───────────────────────────────────────────────────────────────

interface FieldChipProps {
  field: string
  zone: Zone
  isNumeric?: boolean
  filterCount?: number
  canMoveUp?: boolean
  canMoveDown?: boolean
  onAssign: (zone: Exclude<Zone, 'available'>) => void
  onRemove?: () => void
  onMove?: (direction: -1 | 1) => void
  onOpenFilter?: () => void
  onGroup?: () => void
  isGrouped?: boolean
}

/**
 * A field token that can be dragged *or* operated entirely from the keyboard.
 *
 * The drag-and-drop path is a convenience for mouse users only: HTML5 drag
 * events do not fire on touch devices at all, so the menu is the primary
 * interaction, not a fallback.
 */
function FieldChip({
  field,
  zone,
  isNumeric,
  filterCount,
  canMoveUp,
  canMoveDown,
  onAssign,
  onRemove,
  onMove,
  onOpenFilter,
  onGroup,
  isGrouped,
}: FieldChipProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const containerRef = useRef<HTMLSpanElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!menuOpen) return

    const handlePointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const targetZones = (['rows', 'cols', 'filters'] as const).filter((z) => z !== zone)

  return (
    <span ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', field)
          e.dataTransfer.effectAllowed = 'move'
        }}
        onClick={() => setMenuOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuOpen ? menuId : undefined}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono select-none transition-all cursor-grab active:cursor-grabbing',
          'bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm',
          'hover:border-[var(--color-ink-muted)]',
          menuOpen && 'border-[var(--color-accent)]'
        )}
      >
        <GripVertical className="w-3 h-3 text-[var(--color-ink-muted)]" aria-hidden="true" />
        <span>{field}</span>
        {isNumeric && (
          <span className="text-[10px] text-[var(--color-ink-muted)]" title="Numeric field">
            #
          </span>
        )}
        {isGrouped && (
          <Layers
            className="w-3 h-3 text-[var(--color-accent)]"
            aria-label="Grouped field"
          />
        )}
        {filterCount !== undefined && filterCount > 0 && (
          <span className="ml-0.5 px-1 rounded-full bg-[var(--color-accent)] text-white text-[10px] font-semibold">
            {filterCount}
          </span>
        )}
      </button>

      {menuOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label={`Actions for ${field}`}
          className="absolute z-30 top-full left-0 mt-1 min-w-[10rem] py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg"
        >
          {targetZones.map((target) => (
            <MenuItem
              key={target}
              onClick={() => {
                onAssign(target)
                setMenuOpen(false)
              }}
            >
              {target === 'rows' && <Rows3 className="w-3 h-3" aria-hidden="true" />}
              {target === 'cols' && <Columns3 className="w-3 h-3" aria-hidden="true" />}
              {target === 'filters' && <Filter className="w-3 h-3" aria-hidden="true" />}
              Move to {ZONE_LABELS[target]}
            </MenuItem>
          ))}

          {onOpenFilter && (
            <MenuItem
              onClick={() => {
                onOpenFilter()
                setMenuOpen(false)
              }}
            >
              <Filter className="w-3 h-3" aria-hidden="true" />
              Edit filter…
            </MenuItem>
          )}

          {onGroup && (
            <MenuItem
              onClick={() => {
                onGroup()
                setMenuOpen(false)
              }}
            >
              <CalendarRange className="w-3 h-3" aria-hidden="true" />
              {isGrouped ? 'Edit grouping…' : 'Group…'}
            </MenuItem>
          )}

          {onMove && (canMoveUp || canMoveDown) && (
            <>
              <div className="my-1 border-t border-[var(--color-border)]" role="separator" />
              <MenuItem disabled={!canMoveUp} onClick={() => onMove(-1)}>
                <ChevronUp className="w-3 h-3" aria-hidden="true" />
                Move earlier
              </MenuItem>
              <MenuItem disabled={!canMoveDown} onClick={() => onMove(1)}>
                <ChevronDown className="w-3 h-3" aria-hidden="true" />
                Move later
              </MenuItem>
            </>
          )}

          {onRemove && (
            <>
              <div className="my-1 border-t border-[var(--color-border)]" role="separator" />
              <MenuItem
                destructive
                onClick={() => {
                  onRemove()
                  setMenuOpen(false)
                }}
              >
                <X className="w-3 h-3" aria-hidden="true" />
                Remove
              </MenuItem>
            </>
          )}
        </div>
      )}
    </span>
  )
}

function MenuItem({
  children,
  onClick,
  disabled,
  destructive,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors cursor-pointer',
        'hover:bg-[var(--color-cream-dark)]',
        destructive && 'text-[var(--color-error-text)]',
        disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent'
      )}
    >
      {children}
    </button>
  )
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────

interface DropZoneProps {
  zone: Exclude<Zone, 'available'>
  label: string
  hint: string
  fields: string[]
  fieldInfo: Map<string, FieldInfo>
  filterCounts?: Map<string, number>
  onDrop: (field: string) => void
  onAssign: (field: string, zone: Exclude<Zone, 'available'>) => void
  onRemove: (field: string) => void
  onMove?: (field: string, direction: -1 | 1) => void
  onOpenFilter?: (field: string) => void
}

function DropZone({
  zone,
  label,
  hint,
  fields,
  fieldInfo,
  filterCounts,
  onDrop,
  onAssign,
  onRemove,
  onMove,
  onOpenFilter,
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver(false)
        const field = e.dataTransfer.getData('text/plain')
        if (field) onDrop(field)
      }}
      className={cn(
        'flex-1 min-w-[160px] p-2 rounded-lg border-2 border-dashed transition-colors',
        isDragOver
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
          : 'border-[var(--color-border)] bg-[var(--color-cream-dark)]/30'
      )}
    >
      <SectionLabel className="block mb-2">{label}</SectionLabel>
      <div className="flex flex-wrap gap-1 min-h-[28px]">
        {fields.length === 0 ? (
          <span className="text-[11px] text-[var(--color-ink-muted)] italic">{hint}</span>
        ) : (
          fields.map((field, index) => (
            <FieldChip
              key={field}
              field={field}
              zone={zone}
              isNumeric={fieldInfo.get(field)?.isNumeric}
              filterCount={filterCounts?.get(field)}
              canMoveUp={index > 0}
              canMoveDown={index < fields.length - 1}
              onAssign={(target) => onAssign(field, target)}
              onRemove={() => onRemove(field)}
              onMove={onMove ? (direction) => onMove(field, direction) : undefined}
              onOpenFilter={onOpenFilter ? () => onOpenFilter(field) : undefined}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ─── Inline Value Config ──────────────────────────────────────────────────────

interface ValueConfigInlineProps {
  config: ValueConfig
  fields: FieldInfo[]
  onUpdate: (config: ValueConfig) => void
  onRemove: () => void
}

function ValueConfigInline({ config, fields, onUpdate, onRemove }: ValueConfigInlineProps) {
  const isDualField = DUAL_FIELD_AGGREGATIONS.has(config.aggregation)
  const acceptsAnyField = ANY_FIELD_AGGREGATIONS.has(config.aggregation)

  const fieldOptions = acceptsAnyField ? fields : fields.filter((f) => f.isNumeric)
  const numericOptions = fields.filter((f) => f.isNumeric)

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-xs shadow-sm">
      <input
        value={config.caption ?? ''}
        aria-label="Metric name"
        title="Rename this metric"
        placeholder={autoMetricLabel(config)}
        onChange={(e) =>
          onUpdate({ ...config, caption: e.target.value.trim() ? e.target.value : undefined })
        }
        className={cn(
          'w-28 px-1 py-0.5 bg-transparent rounded text-[11px] truncate',
          'border border-transparent hover:border-[var(--color-border)]',
          'focus:outline-none focus:border-[var(--color-accent)]',
          'placeholder:text-[var(--color-ink-muted)] placeholder:italic',
          config.caption && 'font-semibold text-[var(--color-accent)]'
        )}
      />
      <span className="text-[var(--color-ink-muted)]" aria-hidden="true">
        =
      </span>
      <select
        value={config.aggregation}
        aria-label="Aggregation"
        onChange={(e) =>
          onUpdate({ ...config, aggregation: e.target.value as AggregationType })
        }
        className={BARE_SELECT}
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
        aria-label="Field"
        onChange={(e) => onUpdate({ ...config, field: e.target.value })}
        className={cn(BARE_SELECT, 'font-mono')}
      >
        <option value="">—</option>
        {fieldOptions.map((f) => (
          <option key={f.name} value={f.name}>
            {f.name}
          </option>
        ))}
      </select>

      {isDualField && (
        <>
          <span className="text-[var(--color-ink-muted)]">/</span>
          <select
            value={config.field2 ?? ''}
            aria-label="Denominator field"
            onChange={(e) => onUpdate({ ...config, field2: e.target.value || undefined })}
            className={cn(BARE_SELECT, 'font-mono')}
          >
            <option value="">—</option>
            {numericOptions.map((f) => (
              <option key={f.name} value={f.name}>
                {f.name}
              </option>
            ))}
          </select>
        </>
      )}

      <span className="text-[var(--color-ink-muted)]" aria-hidden="true">
        ·
      </span>
      <select
        value={config.showAs}
        aria-label="Show values as"
        onChange={(e) => onUpdate({ ...config, showAs: e.target.value as ShowAs })}
        className={cn(BARE_SELECT, config.showAs !== 'raw' && 'text-[var(--color-accent)]')}
        title="Show values as"
      >
        {Object.entries(SHOW_AS_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>

      <span className="text-[var(--color-ink-muted)]" aria-hidden="true">
        ·
      </span>
      <select
        value={config.format?.style ?? 'auto'}
        aria-label="Number format"
        title="Number format"
        onChange={(e) => {
          const style = e.target.value as NumberStyle
          onUpdate({
            ...config,
            format: style === 'auto' ? undefined : { ...config.format, style },
          })
        }}
        className={cn(BARE_SELECT, config.format && 'text-[var(--color-accent)]')}
      >
        {Object.entries(NUMBER_STYLE_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
      {config.format && (
        <select
          value={config.format.decimals ?? 'auto'}
          aria-label="Decimal places"
          title="Decimal places"
          onChange={(e) =>
            onUpdate({
              ...config,
              format: {
                ...config.format!,
                decimals: e.target.value === 'auto' ? undefined : Number(e.target.value),
              },
            })
          }
          className={BARE_SELECT}
        >
          <option value="auto">auto</option>
          {[0, 1, 2, 3, 4].map((d) => (
            <option key={d} value={d}>
              {d} dp
            </option>
          ))}
        </select>
      )}

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${AGGREGATION_LABELS[config.aggregation]} of ${config.field}`}
        className="p-0.5 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-error-text)] hover:bg-[var(--color-error-bg)] transition-colors cursor-pointer"
      >
        <X className="w-3 h-3" aria-hidden="true" />
      </button>
    </span>
  )
}
const BARE_SELECT =
  'bg-transparent text-[11px] font-medium rounded cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]'

// ─── Config Panel ─────────────────────────────────────────────────────────────

interface ConfigPanelProps {
  config: PivotConfig
  fields: FieldInfo[]
  /** Source columns that can be grouped, and the kind of grouping they support. */
  groupableFields: Map<string, 'date' | 'number'>
  onConfigChange: (config: PivotConfig) => void
}

export function ConfigPanel({
  config,
  fields,
  groupableFields,
  onConfigChange,
}: ConfigPanelProps) {
  const [filterModalField, setFilterModalField] = useState<string | null>(null)
  const [groupingField, setGroupingField] = useState<string | null>(null)

  const fieldInfo = useMemo(() => new Map(fields.map((f) => [f.name, f])), [fields])

  const filterFields = useMemo(() => config.filters.map((f) => f.field), [config.filters])

  // A chip shows a badge when *any* kind of rule is active, not just when
  // values have been unticked.
  const filterCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const f of config.filters) {
      const rules =
        (f.excludedValues.size > 0 ? 1 : 0) +
        (f.label?.text.trim() ? 1 : 0) +
        (f.measure ? 1 : 0)
      counts.set(f.field, rules)
    }
    return counts
  }, [config.filters])

  const unassignedFields = useMemo(() => {
    const assigned = new Set([...config.rows, ...config.cols, ...filterFields])
    return fields.filter((f) => !assigned.has(f.name))
  }, [fields, config.rows, config.cols, filterFields])

  // ─── Config mutation ───────────────────────────────────────────────────────
  // Every mutation funnels through one updater. Note this does not give the
  // handlers stable identities - `update` closes over `config` - it just keeps
  // the mutation logic in one place.

  const update = useCallback(
    (mutate: (current: PivotConfig) => PivotConfig) => {
      onConfigChange(mutate(config))
    },
    [config, onConfigChange]
  )

  const assign = useCallback(
    (field: string, zone: Exclude<Zone, 'available'>) => {
      update((current) => {
        const next: PivotConfig = {
          ...current,
          rows: current.rows.filter((f) => f !== field),
          cols: current.cols.filter((f) => f !== field),
          filters: current.filters.filter((f) => f.field !== field),
        }

        if (zone === 'rows') next.rows = [...next.rows, field]
        if (zone === 'cols') next.cols = [...next.cols, field]
        if (zone === 'filters') {
          const existing = current.filters.find((f) => f.field === field)
          next.filters = [
            ...next.filters,
            existing ?? { field, excludedValues: new Set<string>() },
          ]
        }

        // Collapse keys and sort targets are built from the old field order,
        // so a stale target would silently sort by nothing.
        return {
          ...next,
          collapsedRows: [],
          collapsedCols: [],
          rowSortBy: undefined,
        }
      })

      if (zone === 'filters') setFilterModalField(field)
    },
    [update]
  )

  const remove = useCallback(
    (field: string) => {
      update((current) => ({
        ...current,
        rows: current.rows.filter((f) => f !== field),
        cols: current.cols.filter((f) => f !== field),
        filters: current.filters.filter((f) => f.field !== field),
        collapsedRows: [],
        collapsedCols: [],
        rowSortBy: undefined,
      }))
    },
    [update]
  )

  const move = useCallback(
    (zone: 'rows' | 'cols', field: string, direction: -1 | 1) => {
      update((current) => {
        const list = [...current[zone]]
        const from = list.indexOf(field)
        const to = from + direction
        if (from < 0 || to < 0 || to >= list.length) return current
        ;[list[from], list[to]] = [list[to]!, list[from]!]
        return { ...current, [zone]: list, collapsedRows: [], collapsedCols: [] }
      })
    },
    [update]
  )

  const addValue = useCallback(() => {
    update((current) => {
      const preferred = fields.find((f) => f.isNumeric) ?? fields[0]
      if (!preferred) return current
      return {
        ...current,
        values: [
          ...current.values,
          {
            id: newValueId(),
            field: preferred.name,
            aggregation: preferred.isNumeric ? 'sum' : 'count',
            showAs: 'raw',
          },
        ],
      }
    })
  }, [update, fields])

  const applyFilter = useCallback(
    (filter: FilterConfig) => {
      update((current) => {
        const filters: FilterConfig[] = current.filters.some((f) => f.field === filter.field)
          ? current.filters.map((f) => (f.field === filter.field ? filter : f))
          : [...current.filters, filter]
        // Item filters change which rows exist, so a saved column-sort target
        // or collapse key may no longer resolve.
        return { ...current, filters, collapsedRows: [], collapsedCols: [] }
      })
    },
    [update]
  )

  const setGrouping = useCallback(
    (field: string, grouping: FieldGrouping | null) => {
      update((current) => {
        const groupings = { ...current.groupings }
        const removedFields = new Set<string>()

        // Fields derived from the previous grouping stop existing, so anything
        // referencing them has to be cleaned up.
        const previous = current.groupings[field]
        if (previous?.kind === 'date') {
          for (const part of previous.parts) removedFields.add(datePartField(field, part))
        } else if (previous?.kind === 'number') {
          removedFields.add(binnedField(field, previous.binSize))
        }

        if (grouping === null) delete groupings[field]
        else groupings[field] = grouping

        // Keep any derived field that survives the new grouping.
        if (grouping?.kind === 'date') {
          for (const part of grouping.parts) removedFields.delete(datePartField(field, part))
        } else if (grouping?.kind === 'number') {
          removedFields.delete(binnedField(field, grouping.binSize))
        }

        return {
          ...current,
          groupings,
          rows: current.rows.filter((f) => !removedFields.has(f)),
          cols: current.cols.filter((f) => !removedFields.has(f)),
          filters: current.filters.filter((f) => !removedFields.has(f.field)),
          collapsedRows: [],
          collapsedCols: [],
          rowSortBy: undefined,
        }
      })
    },
    [update]
  )

  // ─── Validation ────────────────────────────────────────────────────────────

  const problems = useMemo(() => {
    const messages: string[] = []
    for (const vc of config.values) {
      const label = AGGREGATION_LABELS[vc.aggregation]
      if (!vc.field) {
        messages.push(`"${label}" has no field selected.`)
      } else if (DUAL_FIELD_AGGREGATIONS.has(vc.aggregation) && !vc.field2) {
        messages.push(`"${label} of ${vc.field}" needs a denominator field.`)
      }

      // Ordered calculations have nothing to run along without that axis.
      if (ROW_AXIS_SHOW_AS.has(vc.showAs) && config.rows.length === 0) {
        messages.push(`"${SHOW_AS_LABELS[vc.showAs]}" needs at least one Rows field.`)
      }
      if (COL_AXIS_SHOW_AS.has(vc.showAs) && config.cols.length === 0) {
        messages.push(`"${SHOW_AS_LABELS[vc.showAs]}" needs at least one Columns field.`)
      }
    }
    if (config.values.length === 0) {
      messages.push('Add at least one value metric.')
    }
    if (config.rows.length === 0 && config.cols.length === 0) {
      messages.push('Add at least one field to Rows or Columns.')
    }
    return messages
  }, [config.values, config.rows, config.cols])

  const modalField = filterModalField ? fieldInfo.get(filterModalField) : undefined


  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-3 p-3 bg-[var(--color-cream)] border border-[var(--color-border)] rounded-lg text-xs">
        {/* Available fields */}
        <div>
          <SectionLabel className="block mb-2">Fields</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {unassignedFields.length === 0 ? (
              <span className="text-[11px] text-[var(--color-ink-muted)] italic">
                All fields assigned
              </span>
            ) : (
              unassignedFields.map((field) => (
                <FieldChip
                  key={field.name}
                  field={field.name}
                  zone="available"
                  isNumeric={field.isNumeric}
                  isGrouped={config.groupings[field.name] !== undefined}
                  onAssign={(zone) => assign(field.name, zone)}
                  onGroup={
                    groupableFields.has(field.name)
                      ? () => setGroupingField(field.name)
                      : undefined
                  }
                />
              ))
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--color-ink-muted)]">
            Click a field for options, or drag it into a zone below. Date and
            numeric fields can be grouped into years, months or buckets.
          </p>
        </div>

        {/* Zones */}
        <div className="flex flex-wrap gap-3">
          <DropZone
            zone="rows"
            label="Rows"
            hint="Drop or click a field"
            fields={config.rows}
            fieldInfo={fieldInfo}
            filterCounts={filterCounts}
            onOpenFilter={setFilterModalField}
            onDrop={(field) => assign(field, 'rows')}
            onAssign={assign}
            onRemove={remove}
            onMove={(field, direction) => move('rows', field, direction)}
          />
          <DropZone
            zone="cols"
            label="Columns"
            hint="Drop or click a field"
            fields={config.cols}
            fieldInfo={fieldInfo}
            filterCounts={filterCounts}
            onOpenFilter={setFilterModalField}
            onDrop={(field) => assign(field, 'cols')}
            onAssign={assign}
            onRemove={remove}
            onMove={(field, direction) => move('cols', field, direction)}
          />
          <DropZone
            zone="filters"
            label="Filters"
            hint="Drop or click a field"
            fields={filterFields}
            fieldInfo={fieldInfo}
            filterCounts={filterCounts}
            onDrop={(field) => assign(field, 'filters')}
            onAssign={assign}
            onRemove={remove}
            onOpenFilter={setFilterModalField}
          />
        </div>

        {/* Values */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--color-border)]">
          <SectionLabel>Values</SectionLabel>
          {config.values.map((vc) => (
            <ValueConfigInline
              key={vc.id}
              config={vc}
              fields={fields}
              onUpdate={(updated) =>
                update((current) => ({
                  ...current,
                  values: current.values.map((v) => (v.id === vc.id ? updated : v)),
                }))
              }
              onRemove={() =>
                update((current) => ({
                  ...current,
                  values: current.values.filter((v) => v.id !== vc.id),
                }))
              }
            />
          ))}
          <Tooltip content="Add value metric">
            <button
              type="button"
              onClick={addValue}
              aria-label="Add value metric"
              className="inline-flex items-center gap-0.5 px-1.5 py-1 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" aria-hidden="true" />
            </button>
          </Tooltip>
        </div>


        {problems.length > 0 && (
          <Alert variant="warning" size="sm">
            {problems.length === 1 ? (
              problems[0]
            ) : (
              <ul className="list-disc pl-4 space-y-0.5">
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            )}
          </Alert>
        )}
      </div>

      {groupingField && groupableFields.has(groupingField) && (
        <GroupingModal
          key={groupingField}
          open
          onClose={() => setGroupingField(null)}
          field={groupingField}
          kind={groupableFields.get(groupingField)!}
          grouping={config.groupings[groupingField]}
          onApply={(grouping) => setGrouping(groupingField, grouping)}
        />
      )}

      {modalField && (
        <FilterModal
          key={modalField.name}
          open
          onClose={() => setFilterModalField(null)}
          field={modalField}
          filter={config.filters.find((f) => f.field === modalField.name)}
          valueConfigs={config.values}
          onAxis={
            config.rows.includes(modalField.name) || config.cols.includes(modalField.name)
          }
          onApply={applyFilter}
        />
      )}
    </>
  )
}


/**
 * `crypto.randomUUID` is unavailable on insecure origins, which includes
 * http://<lan-ip>:5173 during development.
 */
let valueIdCounter = 0
function newValueId(): string {
  valueIdCounter += 1
  return `v${valueIdCounter}-${Date.now().toString(36)}`
}
