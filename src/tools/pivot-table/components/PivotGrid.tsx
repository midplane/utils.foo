import { useMemo, useCallback, useState } from 'react'
import { Table2, Copy, Check } from 'lucide-react'
import { Card, CardContent, CardHeader } from '../../../components/ui/Card'
import { PivotResult, PivotConfig, AGGREGATION_LABELS } from '../types'
import { PivotEngine, getHeatmapColor } from '../engine/PivotEngine'
import { flattenKey, compositeKey } from '../engine/sorters'

interface PivotGridProps {
  result: PivotResult
  config: PivotConfig
}

export function PivotGrid({ result, config }: PivotGridProps) {
  const { rowKeys, colKeys, valueConfigs } = result
  const numValues = valueConfigs.length
  const numRowFields = config.rows.length
  const numColFields = config.cols.length

  const [copied, setCopied] = useState(false)

  // ─── Copy as TSV ───────────────────────────────────────────────────────────

  const generateTSV = useCallback((): string => {
    const lines: string[] = []

    // Header row(s)
    const headerRow: string[] = []

    // Row field headers
    for (const field of config.rows) {
      headerRow.push(field)
    }

    // Column headers (with value sub-headers if multiple values)
    if (numColFields > 0) {
      for (const colKey of colKeys) {
        const colLabel = colKey.join(' / ')
        if (numValues > 1) {
          for (const vc of valueConfigs) {
            headerRow.push(`${colLabel} - ${AGGREGATION_LABELS[vc.aggregation]} of ${vc.field}`)
          }
        } else if (numValues === 1) {
          headerRow.push(colLabel)
        } else {
          headerRow.push(colLabel)
        }
      }
      // Row totals header
      if (config.showRowTotals) {
        if (numValues > 1) {
          for (const vc of valueConfigs) {
            headerRow.push(`Total - ${AGGREGATION_LABELS[vc.aggregation]} of ${vc.field}`)
          }
        } else {
          headerRow.push('Total')
        }
      }
    } else {
      // No columns - show value headers directly
      for (const vc of valueConfigs) {
        headerRow.push(`${AGGREGATION_LABELS[vc.aggregation]} of ${vc.field}`)
      }
    }

    lines.push(headerRow.join('\t'))

    // Data rows
    for (const rowKey of rowKeys) {
      const row: string[] = []

      // Row headers
      for (const val of rowKey) {
        row.push(val)
      }

      // Data cells
      if (numColFields > 0) {
        const flatRowKey = flattenKey(rowKey)
        for (const colKey of colKeys) {
          const flatColKey = flattenKey(colKey)
          const cellKey = compositeKey(flatRowKey, flatColKey)
          const cell = result.cells.get(cellKey)

          for (let vi = 0; vi < numValues; vi++) {
            row.push(cell?.formatted[vi] ?? '')
          }
        }
        // Row totals
        if (config.showRowTotals) {
          const rowTotal = result.rowTotals.get(flatRowKey)
          for (let vi = 0; vi < numValues; vi++) {
            row.push(rowTotal?.formatted[vi] ?? '')
          }
        }
      } else {
        // No columns - show aggregated values directly
        const flatRowKey = flattenKey(rowKey)
        const rowTotal = result.rowTotals.get(flatRowKey)
        for (let vi = 0; vi < numValues; vi++) {
          row.push(rowTotal?.formatted[vi] ?? '')
        }
      }

      lines.push(row.join('\t'))
    }

    // Column totals row
    if (config.showColTotals && numColFields > 0) {
      const row: string[] = []

      // "Total" label spanning row fields
      row.push('Total')
      for (let i = 1; i < numRowFields; i++) {
        row.push('')
      }

      for (const colKey of colKeys) {
        const flatColKey = flattenKey(colKey)
        const colTotal = result.colTotals.get(flatColKey)
        for (let vi = 0; vi < numValues; vi++) {
          row.push(colTotal?.formatted[vi] ?? '')
        }
      }

      // Grand total
      if (config.showRowTotals) {
        for (let vi = 0; vi < numValues; vi++) {
          row.push(result.grandTotal.formatted[vi] ?? '')
        }
      }

      lines.push(row.join('\t'))
    }

    // Grand total row (when no columns)
    if (config.showGrandTotal && numColFields === 0) {
      const row: string[] = []
      row.push('Grand Total')
      for (let i = 1; i < numRowFields; i++) {
        row.push('')
      }
      for (let vi = 0; vi < numValues; vi++) {
        row.push(result.grandTotal.formatted[vi] ?? '')
      }
      lines.push(row.join('\t'))
    }

    return lines.join('\n')
  }, [result, config, rowKeys, colKeys, valueConfigs, numValues, numRowFields, numColFields])

  const handleCopy = useCallback(() => {
    const tsv = generateTSV()
    navigator.clipboard.writeText(tsv).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [generateTSV])

  // ─── Heatmap ranges ────────────────────────────────────────────────────────

  const heatmapRanges = useMemo(() => {
    if (config.heatmap === 'none') return null

    const ranges: Map<string, { min: number; max: number } | null> = new Map()

    if (config.heatmap === 'full') {
      for (let vi = 0; vi < numValues; vi++) {
        const range = PivotEngine.getValueRange(result, vi)
        ranges.set(`full-${vi}`, range)
      }
    } else if (config.heatmap === 'row') {
      for (const rowKey of rowKeys) {
        for (let vi = 0; vi < numValues; vi++) {
          const range = PivotEngine.getRowValueRange(result, rowKey, colKeys, vi)
          ranges.set(`${flattenKey(rowKey)}-${vi}`, range)
        }
      }
    } else if (config.heatmap === 'col') {
      for (const colKey of colKeys) {
        for (let vi = 0; vi < numValues; vi++) {
          const range = PivotEngine.getColValueRange(result, colKey, rowKeys, vi)
          ranges.set(`${flattenKey(colKey)}-${vi}`, range)
        }
      }
    }

    return ranges
  }, [config.heatmap, result, rowKeys, colKeys, numValues])

  const getHeatmapBg = (
    rowKey: string[],
    colKey: string[],
    valueIndex: number,
    value: number | null
  ): string | undefined => {
    if (!heatmapRanges || config.heatmap === 'none') return undefined

    let rangeKey: string
    if (config.heatmap === 'full') {
      rangeKey = `full-${valueIndex}`
    } else if (config.heatmap === 'row') {
      rangeKey = `${flattenKey(rowKey)}-${valueIndex}`
    } else {
      rangeKey = `${flattenKey(colKey)}-${valueIndex}`
    }

    const range = heatmapRanges.get(rangeKey)
    return getHeatmapColor(value, range ?? null)
  }

  // ─── Empty state ───────────────────────────────────────────────────────────

  if (result.isEmpty || (rowKeys.length === 0 && colKeys.length === 0 && numValues === 0)) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Table2 className="w-4 h-4 text-[var(--color-ink-muted)]" />
            <span className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider">
              Pivot Table
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--color-ink-muted)] text-center py-8">
            Configure rows, columns, and values above to generate a pivot table.
          </p>
        </CardContent>
      </Card>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Table2 className="w-4 h-4 text-[var(--color-ink-muted)]" />
          <span className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider">
            Pivot Table
          </span>
          <span className="text-[10px] text-[var(--color-ink-muted)] ml-2">
            {rowKeys.length.toLocaleString()} rows × {colKeys.length.toLocaleString()} columns
          </span>
          <div className="flex-1" />
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream-dark)] rounded transition-colors"
            title="Copy as TSV"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-600" />
                <span className="text-green-600">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto border-t border-[var(--color-border)]">
          <table className="w-full text-xs font-mono border-collapse">
            <thead className="bg-[var(--color-cream)]">
              {/* Main header row */}
              <tr>
                {/* Row field headers */}
                {config.rows.map((field, i) => (
                  <th
                    key={`row-field-${i}`}
                    rowSpan={numColFields > 0 && numValues > 1 ? 2 : 1}
                    className="px-3 py-2 text-left font-semibold text-[var(--color-ink-muted)] bg-[var(--color-cream-dark)] border-b border-r border-[var(--color-border)]"
                  >
                    {field}
                  </th>
                ))}

                {/* Column headers */}
                {numColFields > 0 ? (
                  <>
                    {colKeys.map((colKey, colIdx) => (
                      <th
                        key={`col-${colIdx}`}
                        colSpan={numValues > 0 ? numValues : 1}
                        className="px-3 py-2 text-center font-semibold text-[var(--color-ink)] bg-[var(--color-cream-dark)] border-b border-r border-[var(--color-border)] whitespace-nowrap"
                      >
                        {colKey.join(' / ')}
                      </th>
                    ))}
                    {/* Row totals header */}
                    {config.showRowTotals && (
                      <th
                        rowSpan={numValues > 1 ? 2 : 1}
                        colSpan={numValues > 0 ? numValues : 1}
                        className="px-3 py-2 text-center font-semibold text-[var(--color-ink-muted)] bg-[var(--color-cream-dark)] border-b border-[var(--color-border)]"
                      >
                        Total
                      </th>
                    )}
                  </>
                ) : (
                  <>
                    {/* No columns - show value headers directly */}
                    {valueConfigs.map((vc, vi) => (
                      <th
                        key={`val-header-${vi}`}
                        className="px-3 py-2 text-center font-semibold text-[var(--color-ink)] bg-[var(--color-cream-dark)] border-b border-[var(--color-border)] whitespace-nowrap"
                      >
                        {AGGREGATION_LABELS[vc.aggregation]} of {vc.field}
                      </th>
                    ))}
                  </>
                )}
              </tr>

              {/* Value sub-headers (when columns exist and multiple values) */}
              {numColFields > 0 && numValues > 1 && (
                <tr>
                  {colKeys.map((_colKey, colIdx) =>
                    valueConfigs.map((vc, vi) => (
                      <th
                        key={`val-sub-${colIdx}-${vi}`}
                        className="px-2 py-1 text-center text-[10px] font-medium text-[var(--color-ink-muted)] bg-[var(--color-cream)] border-b border-r border-[var(--color-border)] whitespace-nowrap"
                      >
                        {AGGREGATION_LABELS[vc.aggregation]} of {vc.field}
                      </th>
                    ))
                  )}
                </tr>
              )}
            </thead>

            <tbody>
              {/* Data rows */}
              {rowKeys.map((rowKey, rowIdx) => {
                const flatRowKey = flattenKey(rowKey)
                const rowTotal = result.rowTotals.get(flatRowKey)

                return (
                  <tr
                    key={flatRowKey}
                    className={rowIdx % 2 === 1 ? 'bg-[var(--color-cream-dark)]/30' : ''}
                  >
                    {/* Row headers */}
                    {rowKey.map((val, fieldIdx) => (
                      <th
                        key={`row-${rowIdx}-field-${fieldIdx}`}
                        className="px-3 py-2 text-left font-medium text-[var(--color-ink)] bg-[var(--color-cream)] border-r border-b border-[var(--color-border)] whitespace-nowrap"
                      >
                        {val}
                      </th>
                    ))}

                    {/* Data cells */}
                    {numColFields > 0 ? (
                      <>
                        {colKeys.map((colKey, colIdx) => {
                          const flatColKey = flattenKey(colKey)
                          const cellKey = compositeKey(flatRowKey, flatColKey)
                          const cell = result.cells.get(cellKey)

                          return valueConfigs.map((_, vi) => {
                            const value = cell?.values[vi] ?? null
                            const formatted = cell?.formatted[vi] ?? '—'
                            const bg = getHeatmapBg(rowKey, colKey, vi, value)

                            return (
                              <td
                                key={`cell-${colIdx}-${vi}`}
                                className="px-3 py-2 text-right border-r border-b border-[var(--color-border)] tabular-nums"
                                style={{ backgroundColor: bg }}
                              >
                                {formatted}
                              </td>
                            )
                          })
                        })}
                        {/* Row totals */}
                        {config.showRowTotals &&
                          valueConfigs.map((_, vi) => (
                            <td
                              key={`row-total-${vi}`}
                              className="px-3 py-2 text-right font-semibold bg-[var(--color-cream-dark)]/50 border-b border-[var(--color-border)] tabular-nums"
                            >
                              {rowTotal?.formatted[vi] ?? '—'}
                            </td>
                          ))}
                      </>
                    ) : (
                      <>
                        {/* No columns - show aggregated values directly */}
                        {valueConfigs.map((_, vi) => {
                          const value = rowTotal?.values[vi] ?? null
                          const formatted = rowTotal?.formatted[vi] ?? '—'
                          const bg = getHeatmapBg(rowKey, [], vi, value)

                          return (
                            <td
                              key={`val-${vi}`}
                              className="px-3 py-2 text-right border-b border-[var(--color-border)] tabular-nums"
                              style={{ backgroundColor: bg }}
                            >
                              {formatted}
                            </td>
                          )
                        })}
                      </>
                    )}
                  </tr>
                )
              })}

              {/* Column Totals Row */}
              {config.showColTotals && numColFields > 0 && (
                <tr className="bg-[var(--color-cream-dark)]/50 font-semibold">
                  <th
                    colSpan={numRowFields > 0 ? numRowFields : 1}
                    className="px-3 py-2 text-left text-[var(--color-ink-muted)] bg-[var(--color-cream-dark)] border-r border-b border-[var(--color-border)]"
                  >
                    Total
                  </th>
                  {colKeys.map((colKey, colIdx) => {
                    const flatColKey = flattenKey(colKey)
                    const colTotal = result.colTotals.get(flatColKey)

                    return valueConfigs.map((_, vi) => (
                      <td
                        key={`col-total-${colIdx}-${vi}`}
                        className="px-3 py-2 text-right border-r border-b border-[var(--color-border)] tabular-nums"
                      >
                        {colTotal?.formatted[vi] ?? '—'}
                      </td>
                    ))
                  })}
                  {config.showRowTotals &&
                    valueConfigs.map((_, vi) => (
                      <td
                        key={`grand-total-${vi}`}
                        className="px-3 py-2 text-right bg-[var(--color-cream-dark)] border-b border-[var(--color-border)] tabular-nums"
                      >
                        {result.grandTotal.formatted[vi] ?? '—'}
                      </td>
                    ))}
                </tr>
              )}

              {/* Grand total row (when no columns) */}
              {config.showGrandTotal && numColFields === 0 && (
                <tr className="bg-[var(--color-cream-dark)]/50 font-semibold">
                  <th
                    colSpan={numRowFields > 0 ? numRowFields : 1}
                    className="px-3 py-2 text-left text-[var(--color-ink-muted)] bg-[var(--color-cream-dark)] border-r border-b border-[var(--color-border)]"
                  >
                    Grand Total
                  </th>
                  {valueConfigs.map((_, vi) => (
                    <td
                      key={`grand-total-${vi}`}
                      className="px-3 py-2 text-right border-b border-[var(--color-border)] tabular-nums"
                    >
                      {result.grandTotal.formatted[vi] ?? '—'}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
