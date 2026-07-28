// ─── Summarize By ─────────────────────────────────────────────────────────────
// How raw records are reduced to a single number. Mirrors Excel's
// "Summarize Values By" list.

export type AggregationType =
  | 'count'
  | 'countNumbers'
  | 'countUnique'
  | 'sum'
  | 'average'
  | 'median'
  | 'min'
  | 'max'
  | 'product'
  | 'stdev'          // Sample standard deviation (n-1)
  | 'stdevp'         // Population standard deviation (n)
  | 'variance'       // Sample variance
  | 'variancep'      // Population variance
  | 'sumOverSum'     // Sum of field1 / Sum of field2

export const AGGREGATION_LABELS: Record<AggregationType, string> = {
  count: 'Count',
  countNumbers: 'Count Numbers',
  countUnique: 'Count Unique',
  sum: 'Sum',
  average: 'Average',
  median: 'Median',
  min: 'Min',
  max: 'Max',
  product: 'Product',
  stdev: 'StdDev',
  stdevp: 'StdDevp',
  variance: 'Var',
  variancep: 'Varp',
  sumOverSum: 'Sum/Sum',
}

/** Aggregations that need a second field. */
export const DUAL_FIELD_AGGREGATIONS: Set<AggregationType> = new Set(['sumOverSum'])

/** Aggregations that work on any field type; everything else requires numbers. */
export const ANY_FIELD_AGGREGATIONS: Set<AggregationType> = new Set([
  'count',
  'countUnique',
])

// ─── Show Values As ───────────────────────────────────────────────────────────
// A post-processing pass applied to the aggregated grid. Excel keeps this
// separate from the aggregation, which is what makes "% of grand total of
// Average" or "Running total of Count" expressible.

export type ShowAs =
  | 'raw'
  | 'pctOfGrandTotal'
  | 'pctOfRowTotal'
  | 'pctOfColTotal'
  | 'pctOfParentRow'
  | 'pctOfParentCol'
  | 'runningTotalRows'
  | 'runningTotalCols'
  | 'pctRunningTotalRows'
  | 'differenceFromPrevRow'
  | 'pctDifferenceFromPrevRow'
  | 'rankSmallestToLargest'
  | 'rankLargestToSmallest'
  | 'index'

export const SHOW_AS_LABELS: Record<ShowAs, string> = {
  raw: 'No Calculation',
  pctOfGrandTotal: '% of Grand Total',
  pctOfRowTotal: '% of Row Total',
  pctOfColTotal: '% of Column Total',
  pctOfParentRow: '% of Parent Row Total',
  pctOfParentCol: '% of Parent Column Total',
  runningTotalRows: 'Running Total (down rows)',
  runningTotalCols: 'Running Total (across columns)',
  pctRunningTotalRows: '% Running Total (down rows)',
  differenceFromPrevRow: 'Difference From Previous Row',
  pctDifferenceFromPrevRow: '% Difference From Previous Row',
  rankSmallestToLargest: 'Rank Smallest to Largest',
  rankLargestToSmallest: 'Rank Largest to Smallest',
  index: 'Index',
}

/** Calculations rendered as a percentage. */
export const PERCENT_SHOW_AS: Set<ShowAs> = new Set([
  'pctOfGrandTotal',
  'pctOfRowTotal',
  'pctOfColTotal',
  'pctOfParentRow',
  'pctOfParentCol',
  'pctRunningTotalRows',
  'pctDifferenceFromPrevRow',
])

/** Calculations that always produce a whole number. */
export const INTEGER_SHOW_AS: Set<ShowAs> = new Set([
  'rankSmallestToLargest',
  'rankLargestToSmallest',
])


// ─── Configuration Types ──────────────────────────────────────────────────────

export type NumberStyle = 'auto' | 'plain' | 'thousands' | 'currency' | 'percent'

export const NUMBER_STYLE_LABELS: Record<NumberStyle, string> = {
  auto: 'Auto',
  plain: 'Plain',
  thousands: 'Thousands',
  currency: 'Currency',
  percent: 'Percent',
}

/** Per-metric display format, mirroring Excel's Number Format dialog. */
export interface NumberFormat {
  style: NumberStyle
  /** Fixed decimal places; omitted means "decide from the data". */
  decimals?: number
  /** ISO 4217 code, only meaningful for the currency style. */
  currency?: string
}

export interface ValueConfig {
  id: string                   // Stable identity for React keys and reordering
  field: string
  field2?: string              // Second field for sumOverSum
  aggregation: AggregationType
  showAs: ShowAs
  format?: NumberFormat
  /**
   * Overrides the generated header, as Excel's custom caption does.
   *
   * The generated name is unavoidably verbose - "Sum/Sum of Profit / Sales" -
   * and it repeats under every column group, so a short name like "Margin" is
   * often the difference between a readable header and three wrapped lines.
   */
  caption?: string
}

// ─── Filters ──────────────────────────────────────────────────────────────────

export type LabelOp =
  | 'contains'
  | 'notContains'
  | 'beginsWith'
  | 'endsWith'
  | 'equals'
  | 'notEquals'

export const LABEL_OP_LABELS: Record<LabelOp, string> = {
  contains: 'contains',
  notContains: 'does not contain',
  beginsWith: 'begins with',
  endsWith: 'ends with',
  equals: 'equals',
  notEquals: 'does not equal',
}

/** Matches on the item's own label, so it needs no aggregation. */
export interface LabelRule {
  op: LabelOp
  text: string
}

export type MeasureOp = 'top' | 'bottom' | 'gt' | 'gte' | 'lt' | 'lte' | 'between'

export const MEASURE_OP_LABELS: Record<MeasureOp, string> = {
  top: 'Top N',
  bottom: 'Bottom N',
  gt: 'is greater than',
  gte: 'is greater than or equal to',
  lt: 'is less than',
  lte: 'is less than or equal to',
  between: 'is between',
}

export const MEASURE_RANK_OPS: Set<MeasureOp> = new Set(['top', 'bottom'])

/**
 * Matches on an item's *aggregated* value, so it can only be resolved after a
 * first aggregation pass. Excel's "Top 10" and "Value Filters" both land here.
 */
export interface MeasureRule {
  op: MeasureOp
  /** Which metric to test. */
  valueIndex: number
  /** Item count for top/bottom, otherwise the comparison threshold. */
  a: number
  /** Upper bound, used only by `between`. */
  b?: number
}

export interface FilterConfig {
  field: string
  excludedValues: Set<string>
  label?: LabelRule
  measure?: MeasureRule
}

/** Node flat keys to drop from an axis, resolved from measure rules. */
export interface AxisExclusions {
  rows: ReadonlySet<string>
  cols: ReadonlySet<string>
}

export type SortOrder = 'key_asc' | 'key_desc' | 'value_asc' | 'value_desc'

export const SORT_ORDER_LABELS: Record<SortOrder, string> = {
  key_asc: 'A → Z',
  key_desc: 'Z → A',
  value_asc: 'Value ↑',
  value_desc: 'Value ↓',
}

/**
 * Sort an axis by the values in one specific column (or row) rather than by a
 * global order. This is what Excel does when you sort on a column heading:
 * "order genres by their 2010s box office", which a single global SortOrder
 * cannot express.
 */
export interface AxisSortTarget {
  /** Flattened key of the opposing-axis node whose values are compared. */
  flatKey: string
  /** Index into `values` - which metric to compare. */
  valueIndex: number
  descending: boolean
}

// ─── Field Grouping ───────────────────────────────────────────────────────────

export type DatePart =
  | 'year'
  | 'quarter'
  | 'month'
  | 'yearQuarter'
  | 'yearMonth'
  | 'date'
  | 'dayOfWeek'
  | 'hour'

export const DATE_PART_ORDER: DatePart[] = [
  'year', 'yearQuarter', 'yearMonth', 'quarter', 'month', 'date', 'dayOfWeek', 'hour',
]

export type FieldGrouping =
  | { kind: 'date'; parts: DatePart[] }
  | { kind: 'number'; binSize: number }

export type HeatmapMode = 'none' | 'full' | 'row' | 'col'

export const HEATMAP_LABELS: Record<HeatmapMode, string> = {
  none: 'None',
  full: 'Full',
  row: 'By Row',
  col: 'By Column',
}

/** Excel's report layouts. Compact indents all row fields into one column. */
export type LayoutMode = 'compact' | 'tabular'

export const LAYOUT_LABELS: Record<LayoutMode, string> = {
  compact: 'Compact',
  tabular: 'Tabular',
}

/** Where a group's subtotal line appears relative to its children. */
export type SubtotalPosition = 'none' | 'top' | 'bottom'

export const SUBTOTAL_LABELS: Record<SubtotalPosition, string> = {
  none: 'Off',
  top: 'Top',
  bottom: 'Bottom',
}

export interface PivotConfig {
  rows: string[]
  cols: string[]
  values: ValueConfig[]
  filters: FilterConfig[]
  rowOrder: SortOrder
  colOrder: SortOrder
  /** When set, overrides `rowOrder` and sorts rows by one column's values. */
  rowSortBy?: AxisSortTarget
  /** Date and numeric groupings, keyed by source field name. */
  groupings: Record<string, FieldGrouping>
  heatmap: HeatmapMode
  layout: LayoutMode
  rowSubtotals: SubtotalPosition
  colSubtotals: SubtotalPosition
  showRowTotals: boolean
  showColTotals: boolean
  /** Flattened keys of collapsed row groups. Purely presentational. */
  collapsedRows: string[]
  /** Flattened keys of collapsed column groups. Purely presentational. */
  collapsedCols: string[]
}

/**
 * The subset of the config that affects aggregation.
 *
 * Presentational settings - heatmap, layout, subtotal placement, totals
 * visibility and collapse state - are excluded so that changing them never
 * triggers a re-aggregation of the source records.
 */
export type PivotComputeConfig = Pick<
  PivotConfig,
  | 'rows'
  | 'cols'
  | 'values'
  | 'filters'
  | 'rowOrder'
  | 'colOrder'
  | 'rowSortBy'
  | 'groupings'
>

// ─── Data Types ───────────────────────────────────────────────────────────────

export type DataRecord = Record<string, string | number | null>

// ─── Aggregator Interface ─────────────────────────────────────────────────────

export interface Aggregator {
  push(value: unknown, value2?: unknown): void
  value(): number | null
}

export type AggregatorFactory = () => Aggregator

// ─── Axis Tree ────────────────────────────────────────────────────────────────

/**
 * A node in the row or column hierarchy.
 *
 * The root node has an empty path and represents "everything"; its aggregate is
 * the grand total. Every intermediate node carries its own subtotal, so a
 * subtotal is never re-derived from its children.
 */
export interface AxisNode {
  /** Full path of field values from the root, e.g. ['Action', '2010s']. */
  path: string[]
  /** `path` joined with the key delimiter. Identifies the node's aggregate. */
  flatKey: string
  /** The last segment of `path`; '' for the root. */
  label: string
  /** Number of segments in `path`. Root is 0. */
  depth: number
  children: AxisNode[]
}

// ─── Pivot Result Types ───────────────────────────────────────────────────────

export interface CellValue {
  values: (number | null)[]      // One per ValueConfig
  formatted: string[]            // Formatted strings
}

export interface PivotResult {
  /** Root of the row hierarchy. Children are the top-level row groups. */
  rowRoot: AxisNode
  /** Root of the column hierarchy. */
  colRoot: AxisNode
  /**
   * Aggregates for every (row node, column node) pair, including subtotal and
   * grand-total intersections. Keyed by `compositeKey(rowFlatKey, colFlatKey)`.
   */
  cells: Map<string, CellValue>
  valueConfigs: ValueConfig[]
  totalRecords: number           // Records before filtering
  matchedRecords: number         // Records surviving filters
  /** Axis items removed by measure rules, needed to keep drill-down in step. */
  axisExclusions?: AxisExclusions
}


// ─── UI State Types ───────────────────────────────────────────────────────────

export interface FieldInfo {
  name: string
  isNumeric: boolean
  uniqueValues: string[]
  valueCount: number
  /** True when the field has more distinct values than we are willing to list. */
  highCardinality: boolean
}

// ─── Labels ───────────────────────────────────────────────────────────────────

/** The name generated from a metric's definition, ignoring any custom caption. */
export function autoMetricLabel(value: ValueConfig): string {
  const base = `${AGGREGATION_LABELS[value.aggregation]} of ${value.field}${
    value.field2 ? ` / ${value.field2}` : ''
  }`
  return value.showAs === 'raw' ? base : `${base} — ${SHOW_AS_LABELS[value.showAs]}`
}

/** How a metric is labelled in headers and exports. */
export function metricLabel(value: ValueConfig): string {
  const caption = value.caption?.trim()
  return caption ? caption : autoMetricLabel(value)
}

/** Calculations that walk down the row axis and therefore require row fields. */
export const ROW_AXIS_SHOW_AS: Set<ShowAs> = new Set([
  'runningTotalRows',
  'pctRunningTotalRows',
  'differenceFromPrevRow',
  'pctDifferenceFromPrevRow',
  'rankSmallestToLargest',
  'rankLargestToSmallest',
  'pctOfParentRow',
])

/** Calculations that walk across the column axis. */
export const COL_AXIS_SHOW_AS: Set<ShowAs> = new Set([
  'runningTotalCols',
  'pctOfParentCol',
])
