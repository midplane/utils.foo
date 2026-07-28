import { useMemo, useCallback, useState } from 'react'
import { Table2, ChevronRight, ChevronDown, Download, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react'
import {
  Alert,
  Button,
  CopyButton,
  EmptyState,
  ExpandableCard,
  ExpandableCardHeader,
  ExpandableCardContent,
  ExpandToggleButton,
  ExpandHint,
  useExpandable,
} from '../../../components/ui'
import { cn } from '../../../lib/utils'
import { PivotResult, PivotConfig, DataRecord, metricLabel } from '../types'
import { DrillDownModal, DrillTarget } from './DrillDownModal'
import { DisplayOptions } from './DisplayOptions'
import { compositeKey, keyLabel } from '../engine/sorters'
import { NO_VALUE } from '../engine/aggregators'
import { escapeCsv, escapeTsv } from '../engine/export'
import {
  flattenRows,
  flattenCols,
  buildColHeaderRows,
  computeRowLabelCells,

  ColSlot,
  RowLine,
} from '../engine/axis'
import { Heatmap } from '../engine/heatmap'

/**
 * Rows rendered before we stop and ask. A pivot this tall is almost always a
 * mis-configured dimension, and rendering it janks the tab for seconds.
 */
const ROW_RENDER_LIMIT = 500

/**
 * Past this many data columns the table can no longer give each one a readable
 * width, since it fits itself to the container rather than scrolling sideways.
 */
const WIDE_COLUMN_THRESHOLD = 20

interface PivotGridProps {
  result: PivotResult
  config: PivotConfig
  onConfigChange: (config: PivotConfig) => void
  /** Source records, used for drill-down. */
  records: DataRecord[]
  /** Source column names, in file order. */
  sourceColumns: string[]
}

export function PivotGrid({
  result,
  config,
  onConfigChange,
  records,
  sourceColumns,
}: PivotGridProps) {
  const { valueConfigs } = result
  const numValues = valueConfigs.length
  const numRowFields = config.rows.length
  const numColFields = config.cols.length
  const isCompact = config.layout === 'compact'

  const { expanded, setExpanded } = useExpandable()
  const [showAllFor, setShowAllFor] = useState<RowLine[] | null>(null)
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null)

  // ─── Visible structure ─────────────────────────────────────────────────────

  const collapsedRows = useMemo(
    () => new Set(config.collapsedRows),
    [config.collapsedRows]
  )
  const collapsedCols = useMemo(
    () => new Set(config.collapsedCols),
    [config.collapsedCols]
  )

  const lines = useMemo(
    () =>
      flattenRows(result.rowRoot, {
        layout: config.layout,
        subtotals: config.rowSubtotals,
        collapsed: collapsedRows,
        grandTotal: config.showColTotals,
        numRowFields,
      }),
    [result.rowRoot, config.layout, config.rowSubtotals, collapsedRows, config.showColTotals, numRowFields]
  )

  const slots = useMemo(
    () =>
      flattenCols(result.colRoot, {
        subtotals: config.colSubtotals,
        collapsed: collapsedCols,
        grandTotal: config.showRowTotals,
        numColFields,
      }),
    [result.colRoot, config.colSubtotals, collapsedCols, config.showRowTotals, numColFields]
  )

  const headerRows = useMemo(() => buildColHeaderRows(slots), [slots])

  // The override is tied to the exact row set it was granted for, so changing a
  // field silently revokes it - "show all" on a 600-row pivot must not go on to
  // render 50,000 rows after a field swap.
  const visibleLines =
    showAllFor === lines ? lines : lines.slice(0, ROW_RENDER_LIMIT)
  const truncated = lines.length - visibleLines.length
  const dataColumns = slots.length * numValues

  const labelCells = useMemo(
    () => (isCompact ? null : computeRowLabelCells(visibleLines, numRowFields, collapsedRows)),
    [isCompact, visibleLines, numRowFields, collapsedRows]
  )

  const heatmap = useMemo(
    () => Heatmap.build(result.cells, visibleLines, slots, config.heatmap, numValues),
    [result.cells, visibleLines, slots, config.heatmap, numValues]
  )


  // ─── Collapse toggles ──────────────────────────────────────────────────────

  const toggleRow = useCallback(
    (flatKey: string) => {
      const next = config.collapsedRows.includes(flatKey)
        ? config.collapsedRows.filter((k) => k !== flatKey)
        : [...config.collapsedRows, flatKey]
      onConfigChange({ ...config, collapsedRows: next })
    },
    [config, onConfigChange]
  )

  const toggleCol = useCallback(
    (flatKey: string) => {
      const next = config.collapsedCols.includes(flatKey)
        ? config.collapsedCols.filter((k) => k !== flatKey)
        : [...config.collapsedCols, flatKey]
      onConfigChange({ ...config, collapsedCols: next })
    },
    [config, onConfigChange]
  )

  // ─── Sorting by a specific column ──────────────────────────────────────────

  /**
   * Cycle a column through descending → ascending → off, matching Excel's
   * repeated-click behaviour on a value column.
   */
  const sortByColumn = useCallback(
    (slot: ColSlot, valueIndex: number) => {
      const current = config.rowSortBy
      const isActive =
        current?.flatKey === slot.node.flatKey && current.valueIndex === valueIndex

      const next =
        !isActive
          ? { flatKey: slot.node.flatKey, valueIndex, descending: true }
          : current.descending
            ? { flatKey: slot.node.flatKey, valueIndex, descending: false }
            : undefined

      onConfigChange({ ...config, rowSortBy: next })
    },
    [config, onConfigChange]
  )

  const sortStateFor = useCallback(
    (slot: ColSlot, valueIndex: number): 'asc' | 'desc' | undefined => {
      const current = config.rowSortBy
      if (current?.flatKey !== slot.node.flatKey || current.valueIndex !== valueIndex) {
        return undefined
      }
      return current.descending ? 'desc' : 'asc'
    },
    [config.rowSortBy]
  )

  // ─── Export ────────────────────────────────────────────────────────────────

  const buildMatrix = useCallback((): string[][] => {
    const rows: string[][] = []
    const labelColumns = isCompact ? 1 : Math.max(1, numRowFields)

    // Header: one line per column-header row, then the value names if needed.
    const columnLabel = (slot: ColSlot) =>
      slot.headerPath.map(keyLabel).join(' / ') || 'Total'

    const header: string[] = []
    for (let i = 0; i < labelColumns; i++) {
      header.push(isCompact ? config.rows.join(' / ') : config.rows[i] ?? '')
    }
    for (const slot of slots) {
      for (const vc of valueConfigs) {
        const metric = metricLabel(vc)
        const label = numColFields === 0 ? metric : columnLabel(slot)
        header.push(numValues > 1 && numColFields > 0 ? `${label} - ${metric}` : label)
      }
    }
    rows.push(header)

    for (const line of lines) {
      const row: string[] = []
      if (isCompact) {
        // Preserve hierarchy with indentation, as the label column is merged.
        row.push('  '.repeat(Math.max(0, line.depth - 1)) + keyLabel(line.label))
      } else {
        for (let f = 0; f < labelColumns; f++) {
          if (line.kind === 'subtotal' || line.kind === 'grand') {
            row.push(f === Math.max(0, line.depth - 1) ? keyLabel(line.label) : '')
          } else {
            row.push(keyLabel(line.node.path[f] ?? ''))
          }
        }
      }

      for (const slot of slots) {
        const cell = line.showsValues
          ? result.cells.get(compositeKey(line.node.flatKey, slot.node.flatKey))
          : undefined
        for (let vi = 0; vi < numValues; vi++) {
          row.push(cell?.formatted[vi] ?? '')
        }
      }
      rows.push(row)
    }

    return rows
  }, [lines, slots, result.cells, valueConfigs, numValues, numColFields, numRowFields, isCompact, config.rows])

  // Built on demand: eagerly joining every line x slot into one string on each
  // render produced megabytes of work whenever an unrelated display option
  // changed, for a Copy the user may never click.
  const buildTsv = useCallback(
    () => buildMatrix().map((row) => row.map(escapeTsv).join('\t')).join('\n'),
    [buildMatrix]
  )

  const handleCellClick = useCallback(
    (event: React.MouseEvent<HTMLTableSectionElement>) => {
      const cell = (event.target as HTMLElement).closest('td')
      const lineIdx = cell?.dataset.line
      const slotIdx = cell?.dataset.slot
      if (lineIdx === undefined || slotIdx === undefined) return

      const line = visibleLines[Number(lineIdx)]
      const slot = slots[Number(slotIdx)]
      if (!line || !slot) return

      setDrillTarget({
        rowPath: line.node.path,
        colPath: slot.node.path,
        rowLabel: line.node.path.map(keyLabel).join(' / '),
        colLabel: slot.node.path.map(keyLabel).join(' / '),
        formatted:
          result.cells.get(compositeKey(line.node.flatKey, slot.node.flatKey))
            ?.formatted[0] ?? NO_VALUE,
      })
    },
    [visibleLines, slots, result.cells]
  )

  const handleDownloadCsv = useCallback(() => {
    const csv = buildMatrix().map((row) => row.map(escapeCsv).join(',')).join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'pivot-table.csv'
    link.click()
    URL.revokeObjectURL(url)
  }, [buildMatrix])

  // ─── Empty states ──────────────────────────────────────────────────────────

  if (numValues === 0 || (numRowFields === 0 && numColFields === 0)) {
    return (
      <GridShell>
        <EmptyState message="Add a value metric and at least one row or column field to build a pivot table." />
      </GridShell>
    )
  }

  if (result.matchedRecords === 0) {
    return (
      <GridShell>
        <Alert variant="warning" size="sm">
          {result.totalRecords === 0
            ? 'The source data has no rows.'
            : `All ${result.totalRecords.toLocaleString()} rows were removed by the active filters.`}
        </Alert>
      </GridShell>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const totalHeaderRows = Math.max(1, headerRows.length + (needsValueRow(numColFields, numValues) ? 1 : 0))
  const cornerColSpan = isCompact ? 1 : Math.max(1, numRowFields)

  return (
    <ExpandableCard expanded={expanded} onExpandedChange={setExpanded}>
      <ExpandableCardHeader className="flex items-center gap-2">
        <Table2 className="w-4 h-4 text-[var(--color-ink-muted)]" />
        <span className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider">
          Pivot Table
        </span>
        <span className="text-[11px] text-[var(--color-ink-muted)]">
          {lines.length.toLocaleString()} rows × {slots.length.toLocaleString()} columns
          {result.matchedRecords < result.totalRecords && (
            <> · {result.matchedRecords.toLocaleString()} of {result.totalRecords.toLocaleString()} records</>
          )}
        </span>
        <div className="flex-1" />
        <DisplayOptions config={config} onConfigChange={onConfigChange} />
        <Button variant="secondary" size="sm" onClick={handleDownloadCsv} className="gap-1">
          <Download className="w-3 h-3" />
          CSV
        </Button>
        <CopyButton text={buildTsv} />
        <ExpandToggleButton />
      </ExpandableCardHeader>

      <ExpandableCardContent className="p-0">
        {/* No scroll container: the table sizes to its content and the page
            scrolls. `w-full` lets columns compress to fit before the card is
            forced to overflow. */}
        <div className="border-t border-[var(--color-border)]">
          <table className="w-full text-xs font-mono border-collapse">
            <caption className="sr-only">
              Pivot table of {config.rows.join(', ') || 'no row fields'} by{' '}
              {config.cols.join(', ') || 'no column fields'}
            </caption>

            <thead
              className={cn(
                'sticky z-20',
                // When the card is expanded it becomes its own scroll
                // container, so the header pins to the card rather than
                // sitting below the app header.
                expanded ? 'top-0' : 'top-[var(--app-header-height)]',
                // Collapsed borders do not travel with a sticky element, so a
                // shadow keeps the header visually separated while scrolling.
                'shadow-[0_1px_0_0_var(--color-border)]'
              )}
            >
              {/* First header row carries the corner cells alongside the top
                  level of column headers. */}
              <tr>
                {isCompact ? (
                  <th
                    scope="col"
                    rowSpan={totalHeaderRows}
                    colSpan={cornerColSpan}
                    className={cn(HEADER_BASE, 'text-left')}
                  >
                    {config.rows.join(' / ')}
                  </th>
                ) : (
                  Array.from({ length: cornerColSpan }, (_, i) => (
                    <th
                      key={`corner-${i}`}
                      scope="col"
                      rowSpan={totalHeaderRows}
                      className={cn(HEADER_BASE, 'text-left')}
                    >
                      {config.rows[i] ?? ''}
                    </th>
                  ))
                )}

                {headerRows[0]?.map((cell) => (
                  <th
                    key={cell.key}
                    scope={cell.colSpan > 1 ? 'colgroup' : 'col'}
                    colSpan={cell.colSpan * numValues}
                    rowSpan={cell.rowSpan}
                    aria-sort={ariaSort(cell.terminal && numValues === 1 ? sortStateFor(cell.slot, 0) : undefined)}
                    className={cn(HEADER_BASE, 'text-center')}
                  >
                    <HeaderLabel
                      cell={cell}
                      onToggle={toggleCol}
                      sortState={cell.terminal && numValues === 1 ? sortStateFor(cell.slot, 0) : undefined}
                      onSort={
                        cell.terminal && numValues === 1
                          ? () => sortByColumn(cell.slot, 0)
                          : undefined
                      }
                    />
                  </th>
                ))}

                {/* No column fields: the value names are the only headers. */}
                {numColFields === 0 &&
                  valueConfigs.map((vc, vi) => (
                    <th
                      key={`v-${vc.id}`}
                      scope="col"
                      aria-sort={ariaSort(sortStateFor(slots[0]!, vi))}
                      className={cn(HEADER_BASE, 'text-right')}
                    >
                      <SortButton
                        label={metricLabel(vc)}
                        state={sortStateFor(slots[0]!, vi)}
                        onClick={() => sortByColumn(slots[0]!, vi)}
                      />
                    </th>
                  ))}
              </tr>

              {headerRows.slice(1).map((row, depth) => (
                <tr key={`hdr-${depth + 1}`}>
                  {row.map((cell) => (
                    <th
                      key={cell.key}
                      scope={cell.colSpan > 1 ? 'colgroup' : 'col'}
                      colSpan={cell.colSpan * numValues}
                      rowSpan={cell.rowSpan}
                      className={cn(HEADER_BASE, 'text-center')}
                    >
                      <HeaderLabel cell={cell} onToggle={toggleCol} />
                    </th>
                  ))}
                </tr>
              ))}

              {/* Metric names, repeated under every column group. */}
              {numColFields > 0 && numValues > 1 && (
                <tr>
                  {slots.map((slot) =>
                    valueConfigs.map((vc, vi) => (
                      <th
                        key={`${slot.key}-${vc.id}`}
                        scope="col"
                        aria-sort={ariaSort(sortStateFor(slot, vi))}
                        className={cn(HEADER_BASE, 'text-right text-[11px] font-medium')}
                      >
                        <SortButton
                          label={metricLabel(vc)}
                          state={sortStateFor(slot, vi)}
                          onClick={() => sortByColumn(slot, vi)}
                        />
                      </th>
                    ))
                  )}
                </tr>
              )}
            </thead>

            {/* One delegated handler rather than a button per cell: a 500x20
                grid would otherwise put 10,000 identically-named buttons into
                the tab order, which no keyboard or screen-reader user can get
                past. */}
            <tbody onClick={handleCellClick}>
              {visibleLines.map((line, lineIdx) => (
                <tr
                  key={line.key}
                  className={cn(
                    line.kind === 'subtotal' && 'bg-[var(--color-cream-dark)]/60 font-semibold',
                    line.kind === 'grand' &&
                      'bg-[var(--color-cream-dark)] font-semibold border-t-2 border-[var(--color-border)]',
                    line.kind === 'leaf' && lineIdx % 2 === 1 && 'bg-[var(--color-cream-dark)]/25'
                  )}
                >
                  {isCompact ? (
                    <th scope="row" className={ROW_HEADER_BASE}>
                      <CollapseLabel
                        text={keyLabel(line.label)}
                        indent={line.kind === 'grand' ? 0 : Math.max(0, line.depth - 1)}
                        collapsible={line.collapsible}
                        collapsed={line.collapsed}
                        onToggle={() => toggleRow(line.node.flatKey)}
                      />
                    </th>
                  ) : (
                    labelCells?.[lineIdx]?.map((cell) => (
                      <th
                        key={`${line.key}-${cell.fieldIndex}`}
                        scope="row"
                        rowSpan={cell.rowSpan}
                        colSpan={cell.colSpan}
                        className={cn(ROW_HEADER_BASE, 'align-top')}
                      >
                        <CollapseLabel
                          text={keyLabel(cell.label)}
                          indent={0}
                          collapsible={cell.collapsible}
                          collapsed={cell.collapsed}
                          onToggle={() => toggleRow(cell.flatKey)}
                        />
                      </th>
                    ))
                  )}

                  {slots.map((slot, slotIdx) => {
                    const cell = line.showsValues
                      ? result.cells.get(compositeKey(line.node.flatKey, slot.node.flatKey))
                      : undefined
                    const isTotalColumn = slot.kind !== 'leaf'

                    return valueConfigs.map((vc, vi) => {
                      const value = cell?.values[vi] ?? null
                      const background =
                        line.kind === 'leaf' && !isTotalColumn && slot.kind === 'leaf'
                          ? heatmap?.background(line.key, slot.key, vi, value)
                          : undefined

                      return (
                        <td
                          key={`${slot.key}-${vc.id}`}
                          data-line={line.showsValues ? lineIdx : undefined}
                          data-slot={line.showsValues ? slotIdx : undefined}
                          title={line.showsValues ? 'Click to show source rows' : undefined}
                          className={cn(
                            'px-3 py-1.5 text-right border-b border-r border-[var(--color-border)] tabular-nums',
                            line.showsValues &&
                              'cursor-pointer hover:text-[var(--color-accent)]',
                            isTotalColumn && 'bg-[var(--color-cream-dark)]/60 font-semibold'
                          )}
                          style={background ? { backgroundColor: background } : undefined}
                        >
                          {line.showsValues ? cell?.formatted[vi] ?? NO_VALUE : ''}
                        </td>
                      )
                    })
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {truncated > 0 && (
          <div className="flex items-center gap-3 p-3 border-t border-[var(--color-border)]">
            <Alert variant="info" size="sm" className="flex-1">
              Showing the first {ROW_RENDER_LIMIT.toLocaleString()} of{' '}
              {lines.length.toLocaleString()} rows. Collapsing groups or adding a
              filter usually works better than rendering them all.
            </Alert>
            <Button variant="secondary" size="sm" onClick={() => setShowAllFor(lines)}>
              Show all
            </Button>
          </div>
        )}

        {dataColumns > WIDE_COLUMN_THRESHOLD && (
          <div className="p-3 border-t border-[var(--color-border)]">
            <Alert variant="info" size="sm">
              {dataColumns.toLocaleString()} data columns are competing for the
              available width. Collapse a column group, or move a column field to
              Rows, to make the values readable.
            </Alert>
          </div>
        )}

        <ExpandHint />
      </ExpandableCardContent>

      {drillTarget && (
        <DrillDownModal
          open
          onClose={() => setDrillTarget(null)}
          target={drillTarget}
          records={records}
          config={config}
          columns={sourceColumns}
          exclusions={result.axisExclusions}
        />
      )}
    </ExpandableCard>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const HEADER_BASE =
  'px-3 py-1.5 font-semibold text-[var(--color-ink)] bg-[var(--color-cream-dark)] border-b border-r border-[var(--color-border)]'

// Labels wrap rather than forcing the table wider than its container.
const ROW_HEADER_BASE =
  'px-3 py-1.5 text-left font-medium text-[var(--color-ink)] border-r border-b border-[var(--color-border)]'

function CollapseLabel({
  text,
  indent,
  collapsible,
  collapsed,
  onToggle,
}: {
  text: string
  indent: number
  collapsible: boolean
  collapsed: boolean
  onToggle: () => void
}) {
  const padding = indent > 0 ? { paddingLeft: `${indent * 0.875}rem` } : undefined

  if (!collapsible) {
    return <span style={padding}>{text}</span>
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${text}`}
      className="inline-flex items-center gap-0.5 hover:text-[var(--color-accent)] transition-colors cursor-pointer"
      style={padding}
    >
      {collapsed ? (
        <ChevronRight className="w-3 h-3 shrink-0" aria-hidden="true" />
      ) : (
        <ChevronDown className="w-3 h-3 shrink-0" aria-hidden="true" />
      )}
      {text}
    </button>
  )
}

function HeaderLabel({
  cell,
  onToggle,
  sortState,
  onSort,
}: {
  cell: {
    label: string
    collapsible: boolean
    collapsed: boolean
    toggleKey: string
    slot: ColSlot
  }
  onToggle: (flatKey: string) => void
  sortState?: SortState
  onSort?: () => void
}) {
  const text = keyLabel(cell.label)

  if (!cell.collapsible) {
    return onSort ? (
      <SortButton label={text} state={sortState} onClick={onSort} />
    ) : (
      <>{text}</>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onToggle(cell.toggleKey)}
      aria-expanded={!cell.collapsed}
      aria-label={`${cell.collapsed ? 'Expand' : 'Collapse'} ${text}`}
      className="inline-flex items-center gap-0.5 hover:text-[var(--color-accent)] transition-colors cursor-pointer"
    >
      {cell.collapsed ? (
        <ChevronRight className="w-3 h-3 shrink-0" aria-hidden="true" />
      ) : (
        <ChevronDown className="w-3 h-3 shrink-0" aria-hidden="true" />
      )}
      {text}
    </button>
  )
}

function GridShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-cream)] border-b border-[var(--color-border)]">
        <Table2 className="w-4 h-4 text-[var(--color-ink-muted)]" />
        <span className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider">
          Pivot Table
        </span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function needsValueRow(numColFields: number, numValues: number): boolean {
  return numColFields === 0 || numValues > 1
}


// ─── Sorting affordances ──────────────────────────────────────────────────────

type SortState = 'asc' | 'desc' | undefined

/**
 * A column heading that sorts the rows by that column's values, cycling
 * descending → ascending → off. The neutral icon only appears on hover so the
 * header does not look cluttered by default.
 */
function SortButton({
  label,
  state,
  onClick,
}: {
  label: string
  state: SortState
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Sort rows by ${label}`}
      className={cn(
        'group inline-flex items-center gap-1 hover:text-[var(--color-accent)] transition-colors cursor-pointer',
        state && 'text-[var(--color-accent)]'
      )}
    >
      <span>{label}</span>
      {state === 'desc' ? (
        <ArrowDown className="w-3 h-3 shrink-0" aria-hidden="true" />
      ) : state === 'asc' ? (
        <ArrowUp className="w-3 h-3 shrink-0" aria-hidden="true" />
      ) : (
        <ChevronsUpDown
          className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity"
          aria-hidden="true"
        />
      )}
    </button>
  )
}

function ariaSort(state: SortState): 'ascending' | 'descending' | undefined {
  if (state === 'asc') return 'ascending'
  if (state === 'desc') return 'descending'
  return undefined
}
