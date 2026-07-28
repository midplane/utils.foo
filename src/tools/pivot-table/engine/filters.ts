import {
  AxisExclusions,
  AxisNode,
  DataRecord,
  MeasureRule,
  MEASURE_RANK_OPS,
  PivotComputeConfig,
  PivotResult,
} from '../types'
import { computePivot } from './PivotEngine'
import { compositeKey } from './sorters'

/**
 * Runs the pivot, resolving Excel-style value and Top-N filters.
 *
 * These rules test an item's *aggregated* value, so they cannot be applied
 * while the records are being scanned. The grid is built once to discover which
 * axis items qualify, then rebuilt with the failing items excluded. Rebuilding
 * from the records - rather than pruning the finished tree - keeps totals exact
 * for aggregations that cannot be re-derived from their children, such as
 * Median or Count Unique.
 */
export function computeFilteredPivot(
  records: DataRecord[],
  config: PivotComputeConfig
): PivotResult {
  const measureRules = config.filters.filter(
    (f): f is typeof f & { measure: MeasureRule } => f.measure !== undefined
  )

  if (measureRules.length === 0) return computePivot(records, config)

  // Discovery pass: raw aggregates only. Ranking has to compare the underlying
  // numbers - ranking a "rank" or a running total is meaningless.
  const firstPass = computePivot(records, config, undefined, { raw: true })

  const rows = new Set<string>()
  const cols = new Set<string>()

  for (const filter of measureRules) {
    const rowDepth = config.rows.indexOf(filter.field) + 1
    const colDepth = config.cols.indexOf(filter.field) + 1

    if (rowDepth > 0) {
      collectFailingNodes(
        firstPass.rowRoot,
        rowDepth,
        filter.measure,
        (node) => firstPass.cells.get(compositeKey(node.flatKey, ''))?.values,
        rows
      )
    } else if (colDepth > 0) {
      collectFailingNodes(
        firstPass.colRoot,
        colDepth,
        filter.measure,
        (node) => firstPass.cells.get(compositeKey('', node.flatKey))?.values,
        cols
      )
    }
    // A field that is not on an axis has no items to rank, so its rule is
    // simply inert rather than an error.
  }

  if (rows.size === 0 && cols.size === 0) return computePivot(records, config)

  const exclusions: AxisExclusions = { rows, cols }
  return { ...computePivot(records, config, exclusions), axisExclusions: exclusions }
}

/**
 * Walk to the level the field occupies and test its items.
 *
 * Rules are evaluated *within each parent group*, matching Excel: "Top 3
 * studios" under a Genre hierarchy means the top three per genre, not the top
 * three overall.
 */
function collectFailingNodes(
  root: AxisNode,
  depth: number,
  rule: MeasureRule,
  valuesOf: (node: AxisNode) => (number | null)[] | undefined,
  out: Set<string>
): void {
  const visit = (node: AxisNode, level: number) => {
    if (level === depth - 1) {
      evaluateGroup(node.children, rule, valuesOf, out)
      return
    }
    for (const child of node.children) visit(child, level + 1)
  }

  visit(root, 0)
}

function evaluateGroup(
  siblings: readonly AxisNode[],
  rule: MeasureRule,
  valuesOf: (node: AxisNode) => (number | null)[] | undefined,
  out: Set<string>
): void {
  const entries = siblings.map((node) => ({
    node,
    value: valuesOf(node)?.[rule.valueIndex] ?? null,
  }))

  if (MEASURE_RANK_OPS.has(rule.op)) {
    const count = Math.max(0, Math.trunc(rule.a))
    const ranked = entries
      .filter((e): e is { node: AxisNode; value: number } => e.value !== null)
      .sort((a, b) => (rule.op === 'top' ? b.value - a.value : a.value - b.value))

    // Everything past the cut-off, plus anything with no value at all.
    for (const entry of ranked.slice(count)) out.add(entry.node.flatKey)
    for (const entry of entries) {
      if (entry.value === null) out.add(entry.node.flatKey)
    }
    return
  }

  for (const entry of entries) {
    if (!satisfies(entry.value, rule)) out.add(entry.node.flatKey)
  }
}

function satisfies(value: number | null, rule: MeasureRule): boolean {
  if (value === null) return false

  switch (rule.op) {
    case 'gt':
      return value > rule.a
    case 'gte':
      return value >= rule.a
    case 'lt':
      return value < rule.a
    case 'lte':
      return value <= rule.a
    case 'between': {
      const lower = Math.min(rule.a, rule.b ?? rule.a)
      const upper = Math.max(rule.a, rule.b ?? rule.a)
      return value >= lower && value <= upper
    }
    default:
      return true
  }
}
