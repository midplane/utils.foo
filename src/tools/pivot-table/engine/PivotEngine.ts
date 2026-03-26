import {
  DataRecord,
  PivotConfig,
  PivotResult,
  CellValue,
  Aggregator,
  ValueConfig,
  SortOrder,
  DERIVED_AGGREGATIONS,
} from '../types'
import { createAggregator, formatNumber, calculatePercentage } from './aggregators'
import {
  flattenKey,
  compositeKey,
  createKeyComparator,
  createValueComparator,
} from './sorters'

// ─── Aggregator Group ─────────────────────────────────────────────────────────
// Holds multiple aggregators (one per ValueConfig)

interface AggregatorGroup {
  aggregators: Aggregator[]
  push(record: DataRecord): void
  getValues(): (number | null)[]
  getRawValues(): (number | null)[]  // For percentage calculations
}

function createAggregatorGroup(valueConfigs: ValueConfig[]): AggregatorGroup {
  const aggregators = valueConfigs.map((vc) => createAggregator(vc.aggregation))

  return {
    aggregators,
    push(record: DataRecord) {
      for (let i = 0; i < valueConfigs.length; i++) {
        const vc = valueConfigs[i]!
        const value = record[vc.field]
        const value2 = vc.field2 ? record[vc.field2] : undefined
        aggregators[i]!.push(value, value2)
      }
    },
    getValues() {
      return aggregators.map((a) => a.value())
    },
    getRawValues() {
      return aggregators.map((a) => a.value())
    },
  }
}

// ─── Pivot Engine ─────────────────────────────────────────────────────────────

export class PivotEngine {
  private records: DataRecord[]
  private config: PivotConfig

  // Aggregation storage (using flat string keys for performance)
  private cells = new Map<string, AggregatorGroup>()
  private rowTotals = new Map<string, AggregatorGroup>()
  private colTotals = new Map<string, AggregatorGroup>()
  private grandTotal: AggregatorGroup

  // Unique keys (stored as arrays, flattened for lookup)
  private rowKeySet = new Map<string, string[]>()
  private colKeySet = new Map<string, string[]>()

  constructor(records: DataRecord[], config: PivotConfig) {
    this.records = records
    this.config = config
    this.grandTotal = createAggregatorGroup(config.values)

    this.processRecords()
  }

  private processRecords(): void {
    const { rows, cols, values, filters } = this.config

    // Build filter lookup for fast checking
    const filterMap = new Map<string, Set<string>>()
    for (const f of filters) {
      if (f.excludedValues.size > 0) {
        filterMap.set(f.field, f.excludedValues)
      }
    }

    // Single pass through all records
    for (const record of this.records) {
      // Check filters
      let excluded = false
      for (const [field, excludedValues] of filterMap) {
        const val = String(record[field] ?? 'null')
        if (excludedValues.has(val)) {
          excluded = true
          break
        }
      }
      if (excluded) continue

      // Build row and column keys
      const rowKey = rows.map((field) => String(record[field] ?? 'null'))
      const colKey = cols.map((field) => String(record[field] ?? 'null'))

      const flatRowKey = flattenKey(rowKey)
      const flatColKey = flattenKey(colKey)
      const cellKey = compositeKey(flatRowKey, flatColKey)

      // Store unique keys
      if (rows.length > 0 && !this.rowKeySet.has(flatRowKey)) {
        this.rowKeySet.set(flatRowKey, rowKey)
      }
      if (cols.length > 0 && !this.colKeySet.has(flatColKey)) {
        this.colKeySet.set(flatColKey, colKey)
      }

      // Update grand total
      this.grandTotal.push(record)

      // Update row totals
      if (rows.length > 0) {
        let rowTotal = this.rowTotals.get(flatRowKey)
        if (!rowTotal) {
          rowTotal = createAggregatorGroup(values)
          this.rowTotals.set(flatRowKey, rowTotal)
        }
        rowTotal.push(record)
      }

      // Update column totals
      if (cols.length > 0) {
        let colTotal = this.colTotals.get(flatColKey)
        if (!colTotal) {
          colTotal = createAggregatorGroup(values)
          this.colTotals.set(flatColKey, colTotal)
        }
        colTotal.push(record)
      }

      // Update cell
      if (rows.length > 0 && cols.length > 0) {
        let cell = this.cells.get(cellKey)
        if (!cell) {
          cell = createAggregatorGroup(values)
          this.cells.set(cellKey, cell)
        }
        cell.push(record)
      }
    }
  }

  // ─── Sorting ──────────────────────────────────────────────────────────────────

  private sortKeys(
    keys: string[][],
    order: SortOrder,
    totalsMap: Map<string, AggregatorGroup>
  ): string[][] {
    if (keys.length === 0) return keys

    const isDescending = order === 'key_desc' || order === 'value_desc'
    const isValueSort = order === 'value_asc' || order === 'value_desc'

    if (isValueSort) {
      // Sort by first aggregated value
      const valueGetter = (key: string[]): number | null => {
        const flatKey = flattenKey(key)
        const group = totalsMap.get(flatKey)
        if (!group) return null
        const values = group.getValues()
        return values[0] ?? null
      }
      return [...keys].sort(createValueComparator(valueGetter, isDescending))
    } else {
      return [...keys].sort(createKeyComparator(isDescending))
    }
  }

  // ─── Derived Value Calculation ────────────────────────────────────────────────

  private computeDerivedValues(
    rawValues: (number | null)[],
    rowTotalValues: (number | null)[] | null,
    colTotalValues: (number | null)[] | null,
    grandTotalValues: (number | null)[]
  ): (number | null)[] {
    const { values } = this.config
    
    return rawValues.map((raw, i) => {
      const agg = values[i]!.aggregation
      
      if (!DERIVED_AGGREGATIONS.has(agg)) {
        return raw
      }

      // Determine which total to use based on aggregation type
      switch (agg) {
        case 'pctTotal':
        case 'countPctTotal':
          return calculatePercentage(raw, grandTotalValues[i] ?? null)
        case 'pctRow':
        case 'countPctRow':
          return calculatePercentage(raw, rowTotalValues?.[i] ?? grandTotalValues[i] ?? null)
        case 'pctCol':
        case 'countPctCol':
          return calculatePercentage(raw, colTotalValues?.[i] ?? grandTotalValues[i] ?? null)
        default:
          return raw
      }
    })
  }

  // ─── Result Generation ────────────────────────────────────────────────────────

  getResult(): PivotResult {
    const { values, rowOrder, colOrder } = this.config

    // Get sorted keys
    const rowKeys = this.sortKeys(
      Array.from(this.rowKeySet.values()),
      rowOrder,
      this.rowTotals
    )
    const colKeys = this.sortKeys(
      Array.from(this.colKeySet.values()),
      colOrder,
      this.colTotals
    )

    // Get grand total raw values for percentage calculations
    const grandTotalRaw = this.grandTotal.getRawValues()

    // Build cells map with derived calculations
    const cells = new Map<string, CellValue>()
    for (const [key, group] of this.cells) {
      // Parse the composite key to get row and col totals
      const [flatRowKey, flatColKey] = key.split('|')
      const rowTotalRaw = flatRowKey ? this.rowTotals.get(flatRowKey)?.getRawValues() ?? null : null
      const colTotalRaw = flatColKey ? this.colTotals.get(flatColKey)?.getRawValues() ?? null : null
      
      const rawValues = group.getRawValues()
      const computedValues = this.computeDerivedValues(rawValues, rowTotalRaw, colTotalRaw, grandTotalRaw)
      
      cells.set(key, {
        values: computedValues,
        formatted: computedValues.map((v, i) => formatNumber(v, values[i]!.aggregation)),
      })
    }

    // Build row totals (for % row, the row total should show 100%)
    const rowTotalsResult = new Map<string, CellValue>()
    for (const [key, group] of this.rowTotals) {
      const rawValues = group.getRawValues()
      const computedValues = this.computeDerivedValues(rawValues, rawValues, null, grandTotalRaw)
      
      rowTotalsResult.set(key, {
        values: computedValues,
        formatted: computedValues.map((v, i) => formatNumber(v, values[i]!.aggregation)),
      })
    }

    // Build column totals (for % col, the col total should show 100%)
    const colTotalsResult = new Map<string, CellValue>()
    for (const [key, group] of this.colTotals) {
      const rawValues = group.getRawValues()
      const computedValues = this.computeDerivedValues(rawValues, null, rawValues, grandTotalRaw)
      
      colTotalsResult.set(key, {
        values: computedValues,
        formatted: computedValues.map((v, i) => formatNumber(v, values[i]!.aggregation)),
      })
    }

    // Grand total
    const grandTotalComputed = this.computeDerivedValues(grandTotalRaw, grandTotalRaw, grandTotalRaw, grandTotalRaw)
    const grandTotal: CellValue = {
      values: grandTotalComputed,
      formatted: grandTotalComputed.map((v, i) => formatNumber(v, values[i]!.aggregation)),
    }

    return {
      rowKeys,
      colKeys,
      cells,
      rowTotals: rowTotalsResult,
      colTotals: colTotalsResult,
      grandTotal,
      valueConfigs: values,
      isEmpty:
        rowKeys.length === 0 &&
        colKeys.length === 0 &&
        this.records.length === 0,
    }
  }

  // ─── Heatmap Utilities ────────────────────────────────────────────────────────

  static getValueRange(
    result: PivotResult,
    valueIndex: number
  ): { min: number; max: number } | null {
    let min = Infinity
    let max = -Infinity
    let hasValues = false

    for (const cell of result.cells.values()) {
      const val = cell.values[valueIndex]
      if (val !== null && val !== undefined && isFinite(val)) {
        min = Math.min(min, val)
        max = Math.max(max, val)
        hasValues = true
      }
    }

    return hasValues ? { min, max } : null
  }

  static getRowValueRange(
    result: PivotResult,
    rowKey: string[],
    colKeys: string[][],
    valueIndex: number
  ): { min: number; max: number } | null {
    const flatRowKey = flattenKey(rowKey)
    let min = Infinity
    let max = -Infinity
    let hasValues = false

    for (const colKey of colKeys) {
      const flatColKey = flattenKey(colKey)
      const cellKey = compositeKey(flatRowKey, flatColKey)
      const cell = result.cells.get(cellKey)
      if (cell) {
        const val = cell.values[valueIndex]
        if (val !== null && val !== undefined && isFinite(val)) {
          min = Math.min(min, val)
          max = Math.max(max, val)
          hasValues = true
        }
      }
    }

    return hasValues ? { min, max } : null
  }

  static getColValueRange(
    result: PivotResult,
    colKey: string[],
    rowKeys: string[][],
    valueIndex: number
  ): { min: number; max: number } | null {
    const flatColKey = flattenKey(colKey)
    let min = Infinity
    let max = -Infinity
    let hasValues = false

    for (const rowKey of rowKeys) {
      const flatRowKey = flattenKey(rowKey)
      const cellKey = compositeKey(flatRowKey, flatColKey)
      const cell = result.cells.get(cellKey)
      if (cell) {
        const val = cell.values[valueIndex]
        if (val !== null && val !== undefined && isFinite(val)) {
          min = Math.min(min, val)
          max = Math.max(max, val)
          hasValues = true
        }
      }
    }

    return hasValues ? { min, max } : null
  }
}

// ─── Heatmap Color Calculation ────────────────────────────────────────────────

export function getHeatmapColor(
  value: number | null,
  range: { min: number; max: number } | null
): string | undefined {
  if (value === null || range === null) return undefined
  if (range.max === range.min) return 'rgba(59, 130, 246, 0.3)' // Single value

  const ratio = (value - range.min) / (range.max - range.min)
  // Use blue color scale (matches accent color)
  const alpha = 0.1 + ratio * 0.5
  return `rgba(59, 130, 246, ${alpha.toFixed(2)})`
}
