// ─── Aggregation Types ────────────────────────────────────────────────────────

export type AggregationType =
  | 'count'
  | 'countUnique'
  | 'sum'
  | 'average'
  | 'median'
  | 'min'
  | 'max'
  | 'stdev'
  | 'sumOverSum'        // Sum of field1 / Sum of field2
  | 'pctTotal'          // % of grand total
  | 'pctRow'            // % of row total
  | 'pctCol'            // % of column total
  | 'countPctTotal'     // Count as % of grand total
  | 'countPctRow'       // Count as % of row total
  | 'countPctCol'       // Count as % of column total

export const AGGREGATION_LABELS: Record<AggregationType, string> = {
  count: 'Count',
  countUnique: 'Count Unique',
  sum: 'Sum',
  average: 'Average',
  median: 'Median',
  min: 'Min',
  max: 'Max',
  stdev: 'Std Dev',
  sumOverSum: 'Sum/Sum',
  pctTotal: '% Total',
  pctRow: '% Row',
  pctCol: '% Col',
  countPctTotal: 'Count % Total',
  countPctRow: 'Count % Row',
  countPctCol: 'Count % Col',
}

// Aggregations that need a second field
export const DUAL_FIELD_AGGREGATIONS: Set<AggregationType> = new Set(['sumOverSum'])

// Aggregations that are derived (computed from base aggregations + totals)
export const DERIVED_AGGREGATIONS: Set<AggregationType> = new Set([
  'pctTotal', 'pctRow', 'pctCol',
  'countPctTotal', 'countPctRow', 'countPctCol',
])

// ─── Configuration Types ──────────────────────────────────────────────────────

export interface ValueConfig {
  field: string
  field2?: string              // Second field for sumOverSum
  aggregation: AggregationType
}

export interface FilterConfig {
  field: string
  excludedValues: Set<string>
}

export type SortOrder = 'key_asc' | 'key_desc' | 'value_asc' | 'value_desc'

export const SORT_ORDER_LABELS: Record<SortOrder, string> = {
  key_asc: 'A → Z',
  key_desc: 'Z → A',
  value_asc: 'Value ↑',
  value_desc: 'Value ↓',
}

export type HeatmapMode = 'none' | 'full' | 'row' | 'col'

export const HEATMAP_LABELS: Record<HeatmapMode, string> = {
  none: 'None',
  full: 'Full',
  row: 'By Row',
  col: 'By Column',
}

export interface PivotConfig {
  rows: string[]
  cols: string[]
  values: ValueConfig[]
  filters: FilterConfig[]
  rowOrder: SortOrder
  colOrder: SortOrder
  heatmap: HeatmapMode
  showRowTotals: boolean
  showColTotals: boolean
  showGrandTotal: boolean
}

// ─── Data Types ───────────────────────────────────────────────────────────────

export type DataRecord = Record<string, string | number | null>

export interface ParsedData {
  headers: string[]
  records: DataRecord[]
  numericFields: Set<string>
}

// ─── Aggregator Interface ─────────────────────────────────────────────────────

export interface Aggregator {
  push(value: unknown, value2?: unknown): void
  value(): number | null
  clone(): Aggregator
}

export type AggregatorFactory = () => Aggregator

// ─── Pivot Result Types ───────────────────────────────────────────────────────

export interface CellValue {
  values: (number | null)[]      // One per ValueConfig
  formatted: string[]            // Formatted strings
}

export interface PivotResult {
  rowKeys: string[][]            // Unique row key combinations
  colKeys: string[][]            // Unique column key combinations
  cells: Map<string, CellValue>  // flatRowKey|flatColKey -> values
  rowTotals: Map<string, CellValue>
  colTotals: Map<string, CellValue>
  grandTotal: CellValue
  valueConfigs: ValueConfig[]    // For header rendering
  isEmpty: boolean
}

// ─── UI State Types ───────────────────────────────────────────────────────────

export interface FieldInfo {
  name: string
  isNumeric: boolean
  uniqueValues: string[]
  valueCount: number
}
