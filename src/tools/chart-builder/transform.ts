import { createAggregator } from '../pivot-table/engine/aggregators'
import { parseDate, looksLikeDate } from '../pivot-table/engine/grouping'
import type { AggregationType, DataRecord } from '../pivot-table/types'
import { ParsedData, toNumber, isNumericColumn } from './chartData'

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * How the X column is treated.
 * - `category` — discrete labels, evenly spaced
 * - `time`     — real timestamps, spaced by elapsed time
 * - `value`    — numeric, spaced by magnitude (scatter against a numeric X)
 */
export type XKind = 'category' | 'time' | 'value'

/** `none` plots one point per input row, preserving the old behaviour. */
export type Aggregation = AggregationType | 'none'

export type DateBin = 'none' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'

export const DATE_BIN_LABELS: Record<DateBin, string> = {
  none: 'Exact',
  hour: 'Hour',
  day: 'Day',
  week: 'Week',
  month: 'Month',
  quarter: 'Quarter',
  year: 'Year',
}

export type SortMode = 'none' | 'x-asc' | 'x-desc' | 'value-desc' | 'value-asc'

export const SORT_LABELS: Record<SortMode, string> = {
  none: 'Data order',
  'x-asc': 'X ascending',
  'x-desc': 'X descending',
  'value-desc': 'Value, high to low',
  'value-asc': 'Value, low to high',
}

export type FilterOp =
  | 'eq' | 'ne' | 'contains' | 'notContains'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'nonEmpty' | 'isEmpty'

export const FILTER_OP_LABELS: Record<FilterOp, string> = {
  eq: '=', ne: '≠', contains: 'contains', notContains: 'does not contain',
  gt: '>', gte: '≥', lt: '<', lte: '≤',
  nonEmpty: 'is not empty', isEmpty: 'is empty',
}

/** Operators that ignore the value box. */
export const UNARY_OPS: ReadonlySet<FilterOp> = new Set<FilterOp>(['nonEmpty', 'isEmpty'])

export interface FilterRule {
  id: string
  column: string
  op: FilterOp
  value: string
}

export interface TransformConfig {
  xCol: string
  series: string[]
  aggregation: Aggregation
  filters: FilterRule[]
  dateBin: DateBin
  sort: SortMode
  /** Which series a value sort ranks by. Falls back to the first series. */
  sortBy: string
  /** 0 means "keep everything". */
  topN: number
  /** Roll everything beyond topN into a single "Other" category. */
  groupOther: boolean
  /**
   * Treat a numeric X column as a real value axis rather than as labels.
   * Scatter sets this: plotting Hours vs Score against evenly spaced
   * categories would throw away the spacing that makes the plot meaningful.
   */
  numericX: boolean
}

export const DEFAULT_TRANSFORM: TransformConfig = {
  xCol: '',
  series: [],
  aggregation: 'none',
  filters: [],
  dateBin: 'none',
  sort: 'none',
  sortBy: '',
  topN: 0,
  groupOther: false,
  numericX: false,
}

/**
 * Rendering more points than this makes the browser crawl and the chart
 * unreadable long before it becomes slow. Charts are cut off here and the UI
 * says so, rather than appearing to hang.
 */
export const MAX_PLOT_POINTS = 5000

export const OTHER_LABEL = 'Other'

// ─── Result ───────────────────────────────────────────────────────────────────

export interface TransformResult {
  /** X values. Numbers when `xKind` is `time` (epoch ms) or `value`. */
  categories: (string | number)[]
  /** One array of Y values per series, index-aligned with `categories`. */
  values: Map<string, (number | null)[]>
  xKind: XKind
  /** Rows surviving the filters, before grouping. */
  filteredRows: number
  /** Distinct categories before topN and the point cap. */
  totalCategories: number
  /** True when output was cut by topN or MAX_PLOT_POINTS. */
  truncated: boolean
  /** True when rows were collapsed by a group-by. */
  aggregated: boolean
}

export const EMPTY_RESULT: TransformResult = {
  categories: [],
  values: new Map(),
  xKind: 'category',
  filteredRows: 0,
  totalCategories: 0,
  truncated: false,
  aggregated: false,
}

// ─── Filtering ────────────────────────────────────────────────────────────────

function matches(rule: FilterRule, raw: unknown): boolean {
  const text = raw === null || raw === undefined ? '' : String(raw).trim()

  switch (rule.op) {
    case 'isEmpty': return text === ''
    case 'nonEmpty': return text !== ''
    case 'contains': return text.toLowerCase().includes(rule.value.trim().toLowerCase())
    case 'notContains': return !text.toLowerCase().includes(rule.value.trim().toLowerCase())
    case 'eq':
    case 'ne': {
      // Compare numerically when both sides are numbers, so "10" matches 10.0
      // rather than failing on string form.
      const a = toNumber(raw)
      const b = toNumber(rule.value)
      const equal =
        a !== null && b !== null ? a === b : text.toLowerCase() === rule.value.trim().toLowerCase()
      return rule.op === 'eq' ? equal : !equal
    }
    default: {
      const a = toNumber(raw)
      const b = toNumber(rule.value)
      if (a === null || b === null) return false
      if (rule.op === 'gt') return a > b
      if (rule.op === 'gte') return a >= b
      if (rule.op === 'lt') return a < b
      return a <= b
    }
  }
}

export function applyFilters(rows: DataRecord[], filters: FilterRule[]): DataRecord[] {
  const active = filters.filter((f) => f.column && (UNARY_OPS.has(f.op) || f.value.trim() !== ''))
  if (active.length === 0) return rows
  return rows.filter((row) => active.every((rule) => matches(rule, row[rule.column])))
}

// ─── Date bucketing ───────────────────────────────────────────────────────────

/** Snap a timestamp to the start of its bucket, in local time. */
export function bucketDate(date: Date, bin: DateBin): number {
  const d = new Date(date.getTime())
  switch (bin) {
    case 'year':    return new Date(d.getFullYear(), 0, 1).getTime()
    case 'quarter': return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1).getTime()
    case 'month':   return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
    case 'week': {
      // ISO-ish: weeks start Monday.
      const day = (d.getDay() + 6) % 7
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day)
      return start.getTime()
    }
    case 'day':     return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    case 'hour':    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).getTime()
    default:        return d.getTime()
  }
}

/** Whether a column should drive a time axis. */
export function isDateColumn(column: string, rows: DataRecord[]): boolean {
  if (!column) return false
  return looksLikeDate(rows as Parameters<typeof looksLikeDate>[0], column)
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

/** Group key for a raw X value. Numbers and strings must not collide. */
function categoryKey(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

/**
 * Turn parsed rows into chart-ready series.
 *
 * Order matters: filter, then derive the X value (including date bucketing),
 * then aggregate, then sort, then cut to topN. Sorting before aggregating would
 * rank raw rows rather than groups, and cutting before sorting would keep an
 * arbitrary subset.
 */
export function transform(data: ParsedData, config: TransformConfig): TransformResult {
  const { xCol, series, aggregation, filters, dateBin, sort, sortBy, topN, groupOther, numericX } = config

  if (!xCol || series.length === 0 || data.rows.length === 0) return EMPTY_RESULT

  const rows = applyFilters(data.rows as DataRecord[], filters)
  if (rows.length === 0) return { ...EMPTY_RESULT, filteredRows: 0 }

  const dateLike = isDateColumn(xCol, rows)
  const useTime = dateLike && dateBin !== 'none'
  const useValue = !useTime && numericX && isNumericColumn(xCol, rows as ParsedData['rows'])

  // ── Derive the X value for each row ───────────────────────────────────────
  type Entry = { key: string; x: string | number; order: number }
  const entries: Entry[] = []

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i]![xCol]
    if (useTime) {
      const parsed = parseDate(raw)
      if (parsed === null) continue // a row without a usable date cannot sit on a time axis
      const stamp = bucketDate(parsed, dateBin)
      entries.push({ key: String(stamp), x: stamp, order: stamp })
    } else if (useValue) {
      const n = toNumber(raw)
      // A single junk row is dropped rather than snapped to 0, which would
      // stack points on the axis and misrepresent the data.
      if (n === null) continue
      entries.push({ key: String(n), x: n, order: n })
    } else {
      const key = categoryKey(raw)
      entries.push({ key, x: key, order: i })
    }
  }

  const aggregated = aggregation !== 'none'

  // ── Group ─────────────────────────────────────────────────────────────────
  // Insertion-ordered so "data order" remains meaningful without a sort.
  const groups = new Map<string, { x: string | number; order: number; rowIndexes: number[] }>()

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!
    // Without aggregation every row is its own point, so the key must be unique.
    const key = aggregated ? entry.key : `${entry.key}\u0000${i}`
    const existing = groups.get(key)
    if (existing) existing.rowIndexes.push(i)
    else groups.set(key, { x: entry.x, order: entry.order, rowIndexes: [i] })
  }

  // ── Aggregate ─────────────────────────────────────────────────────────────
  const columnValues = new Map<string, (number | null)[]>()

  for (const col of series) {
    const out: (number | null)[] = []
    for (const group of groups.values()) {
      if (!aggregated) {
        const row = rows[group.rowIndexes[0]!]!
        out.push(toNumber(row[col]))
        continue
      }
      // Count works on any value; every other aggregation needs numbers, so
      // coerce first — the aggregators' own parser rejects "$1,200" and "45%".
      const agg = createAggregator(aggregation as AggregationType)
      let pushed = 0
      for (const idx of group.rowIndexes) {
        const raw = rows[idx]![col]
        if (aggregation === 'count') {
          if (raw !== null && raw !== undefined && String(raw).trim() !== '') { agg.push(raw); pushed++ }
        } else if (aggregation === 'countUnique') {
          agg.push(raw); pushed++
        } else {
          const n = toNumber(raw)
          if (n !== null) { agg.push(n); pushed++ }
        }
      }
      out.push(pushed === 0 ? null : agg.value())
    }
    columnValues.set(col, out)
  }

  // ── Sort ──────────────────────────────────────────────────────────────────
  let order = [...groups.values()].map((g, i) => ({ ...g, index: i }))
  const rankColumn = series.includes(sortBy) ? sortBy : series[0]!
  const ranks = columnValues.get(rankColumn) ?? []

  const compareX = (a: typeof order[number], b: typeof order[number]) => {
    if (typeof a.x === 'number' && typeof b.x === 'number') return a.x - b.x
    return String(a.x).localeCompare(String(b.x), undefined, { numeric: true })
  }

  if (sort === 'x-asc') order.sort(compareX)
  else if (sort === 'x-desc') order.sort((a, b) => compareX(b, a))
  else if (sort === 'value-desc' || sort === 'value-asc') {
    const dir = sort === 'value-desc' ? -1 : 1
    order.sort((a, b) => {
      // Nulls sort last regardless of direction — a gap is not "the smallest".
      const av = ranks[a.index] ?? null
      const bv = ranks[b.index] ?? null
      if (av === null && bv === null) return 0
      if (av === null) return 1
      if (bv === null) return -1
      return (av - bv) * dir
    })
  } else if (useTime) {
    // A time axis is meaningless out of chronological order.
    order.sort(compareX)
  }

  const totalCategories = order.length

  // ── Top N (+ Other) ───────────────────────────────────────────────────────
  let otherRow: { x: string; sums: Map<string, number | null> } | null = null

  if (topN > 0 && order.length > topN) {
    const kept = order.slice(0, topN)
    const rest = order.slice(topN)

    if (groupOther && !useTime) {
      const sums = new Map<string, number | null>()
      for (const col of series) {
        const vals = columnValues.get(col) ?? []
        let total: number | null = null
        for (const g of rest) {
          const v = vals[g.index] ?? null
          if (v !== null) total = (total ?? 0) + v
        }
        sums.set(col, total)
      }
      otherRow = { x: OTHER_LABEL, sums }
    }
    order = kept
  }

  // ── Point cap ─────────────────────────────────────────────────────────────
  const capped = order.length > MAX_PLOT_POINTS
  if (capped) order = order.slice(0, MAX_PLOT_POINTS)

  // ── Emit ──────────────────────────────────────────────────────────────────
  const categories: (string | number)[] = order.map((g) => g.x)
  const values = new Map<string, (number | null)[]>()
  for (const col of series) {
    const src = columnValues.get(col) ?? []
    const out = order.map((g) => src[g.index] ?? null)
    if (otherRow) out.push(otherRow.sums.get(col) ?? null)
    values.set(col, out)
  }
  if (otherRow) categories.push(otherRow.x)

  return {
    categories,
    values,
    xKind: useTime ? 'time' : useValue ? 'value' : 'category',
    filteredRows: rows.length,
    totalCategories,
    truncated: capped || (topN > 0 && totalCategories > topN),
    aggregated,
  }
}
