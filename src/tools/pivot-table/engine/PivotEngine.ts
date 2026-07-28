import {
  DataRecord,
  PivotComputeConfig,
  PivotResult,
  CellValue,
  Aggregator,
  AxisNode,
  ValueConfig,
  SortOrder,
  AxisSortTarget,
  AxisExclusions,
} from '../types'
import { createAggregator, formatNumber, resolveDecimals } from './aggregators'
import { applyShowAs } from './showAs'
import { buildRecordPredicate } from './predicate'
import { createFieldResolver, FieldResolver } from './grouping'
import {
  flattenKey,
  compositeKey,
  createKeyComparator,
  sortKeysByValue,
  normalizeKey,
} from './sorters'

// ─── Aggregator Group ─────────────────────────────────────────────────────────
// Holds one aggregator per ValueConfig, with memoised results.

class AggregatorGroup {
  private aggregators: Aggregator[]
  private cached: (number | null)[] | null = null

  constructor(private valueConfigs: ValueConfig[]) {
    this.aggregators = valueConfigs.map((vc) => createAggregator(vc.aggregation))
  }

  push(record: DataRecord, resolve: FieldResolver): void {
    for (let i = 0; i < this.aggregators.length; i++) {
      const vc = this.valueConfigs[i]!
      this.aggregators[i]!.push(
        resolve(record, vc.field),
        vc.field2 === undefined ? undefined : resolve(record, vc.field2)
      )
    }
  }

  /**
   * Aggregated values, computed at most once.
   *
   * Memoisation matters: totals are read once per cell during result assembly
   * and again while sorting. Recomputing a median or a unique count on every
   * read makes those passes quadratic.
   */
  values(): (number | null)[] {
    if (this.cached === null) {
      this.cached = this.aggregators.map((a) => a.value())
    }
    return this.cached
  }
}

// ─── Mutable tree node used during construction ───────────────────────────────

interface MutableNode extends AxisNode {
  children: MutableNode[]
  childIndex: Map<string, MutableNode>
}

function createNode(path: string[], flatKey: string): MutableNode {
  return {
    path,
    flatKey,
    label: path.length === 0 ? '' : path[path.length - 1]!,
    depth: path.length,
    children: [],
    childIndex: new Map(),
  }
}

// ─── Pivot Computation ────────────────────────────────────────────────────────

export interface ComputeOptions {
  /**
   * Skip "Show Values As" and formatting.
   *
   * Used by the filter pass that only needs raw aggregates to decide which
   * items survive: ranking must compare the underlying numbers, not a derived
   * rank or running total, and the throwaway result is never rendered.
   */
  raw?: boolean
}

export function computePivot(
  records: DataRecord[],
  config: PivotComputeConfig,
  exclusions?: AxisExclusions,
  options?: ComputeOptions
): PivotResult {
  const { rows, cols, values, rowOrder, colOrder } = config
  const resolve = createFieldResolver(config.groupings ?? {})

  const rowRoot = createNode([], '')
  const colRoot = createNode([], '')

  // One aggregate per (row node, column node) pair. Because every prefix of a
  // record's path gets pushed, this single map holds leaf cells, row and column
  // subtotals, row/column grand totals and the overall grand total - all with
  // identical lookup semantics.
  const groups = new Map<string, AggregatorGroup>()

  // Unticked values and label rules are ordinary record predicates. Shared with
  // drill-down so both agree on which records back a cell.
  const keepRecord = buildRecordPredicate(config, resolve)

  const excludedRows = exclusions?.rows
  const excludedCols = exclusions?.cols
  const hasExclusions = (excludedRows?.size ?? 0) > 0 || (excludedCols?.size ?? 0) > 0

  // Scratch buffers reused across records to avoid per-record allocation.
  const rowFlatKeys: string[] = new Array(rows.length + 1)
  const colFlatKeys: string[] = new Array(cols.length + 1)

  let matchedRecords = 0

  for (const record of records) {
    if (!keepRecord(record)) continue

    // Measure rules (Top N, value comparisons) resolve to whole axis items
    // being dropped. Records under them are removed outright so that totals
    // reflect only what is displayed, as Excel does.
    //
    // The probe walk is skipped entirely when nothing can be excluded, which is
    // the overwhelmingly common case - otherwise every record would be walked
    // down both trees twice.
    if (hasExclusions) {
      collectPath(record, rows, rowRoot, rowFlatKeys, resolve, true)
      collectPath(record, cols, colRoot, colFlatKeys, resolve, true)
      if (isExcludedPath(rowFlatKeys, rows.length, excludedRows)) continue
      if (isExcludedPath(colFlatKeys, cols.length, excludedCols)) continue
    }

    matchedRecords++

    // Register the node paths now that the record is known to survive.
    collectPath(record, rows, rowRoot, rowFlatKeys, resolve, false)
    collectPath(record, cols, colRoot, colFlatKeys, resolve, false)

    // Push into every prefix pair, so subtotal intersections are exact
    // aggregates rather than sums of already-aggregated children.
    for (let i = 0; i <= rows.length; i++) {
      const rowFlat = rowFlatKeys[i]!
      for (let j = 0; j <= cols.length; j++) {
        const key = compositeKey(rowFlat, colFlatKeys[j]!)
        let group = groups.get(key)
        if (!group) {
          group = new AggregatorGroup(values)
          groups.set(key, group)
        }
        group.push(record, resolve)
      }
    }
  }

  // ── Order each level of both hierarchies ──────────────────────────────────

  sortTree(rowRoot, rowOrder, config.rowSortBy, (node, target) =>
    groups.get(compositeKey(node.flatKey, target))?.values()
  )
  sortTree(colRoot, colOrder, undefined, (node, target) =>
    groups.get(compositeKey(target, node.flatKey))?.values()
  )

  // ── Apply "Show Values As", then format with per-metric precision ─────────

  const raw = new Map<string, (number | null)[]>()
  for (const [key, group] of groups) raw.set(key, group.values())

  if (options?.raw) {
    const cells = new Map<string, CellValue>()
    for (const [key, vals] of raw) cells.set(key, { values: vals, formatted: [] })
    return {
      rowRoot: toPlain(rowRoot),
      colRoot: toPlain(colRoot),
      cells,
      valueConfigs: values,
      totalRecords: records.length,
      matchedRecords,
    }
  }

  const derived = applyShowAs(raw, rowRoot, colRoot, values)

  // Precision is chosen once per metric across every value it will display, so
  // a column never mixes "1,006" with "8.50" and `tabular-nums` stays aligned.
  const decimals = values.map((vc, i) => {
    const seen: (number | null)[] = []
    for (const vals of derived.values()) seen.push(vals[i] ?? null)
    return resolveDecimals(vc.aggregation, vc.showAs, seen)
  })

  const cells = new Map<string, CellValue>()
  for (const [key, vals] of derived) {
    cells.set(key, {
      values: vals,
      formatted: vals.map((v, i) =>
        formatNumber(v, values[i]!.showAs, decimals[i] ?? 0, values[i]!.format)
      ),
    })
  }

  return {
    rowRoot: toPlain(rowRoot),
    colRoot: toPlain(colRoot),
    cells,
    valueConfigs: values,
    totalRecords: records.length,
    matchedRecords,
  }
}

/**
 * Walk a record's field values down the tree, creating nodes as needed, and
 * write the flattened key of every prefix into `out` (index 0 is the root).
 */
function collectPath(
  record: DataRecord,
  fields: string[],
  root: MutableNode,
  out: string[],
  resolve: FieldResolver,
  keysOnly: boolean
): void {
  out[0] = ''
  let node = root
  const path: string[] = []

  for (let i = 0; i < fields.length; i++) {
    const segment = normalizeKey(resolve(record, fields[i]!))
    path.push(segment)

    let child = node.childIndex.get(segment)
    if (!child) {
      // `keysOnly` computes the flattened keys without materialising nodes, so
      // a record that is about to be filtered out never creates an axis item.
      if (keysOnly) {
        out[i + 1] = flattenKey(path)
        for (let j = i + 1; j < fields.length; j++) {
          path.push(normalizeKey(resolve(record, fields[j]!)))
          out[j + 1] = flattenKey(path)
        }
        return
      }
      child = createNode([...path], flattenKey(path))
      node.childIndex.set(segment, child)
      node.children.push(child)
    }
    node = child
    out[i + 1] = child.flatKey
  }
}

function isExcludedPath(
  flatKeys: string[],
  depth: number,
  excluded: ReadonlySet<string> | undefined
): boolean {
  if (!excluded || excluded.size === 0) return false
  for (let i = 1; i <= depth; i++) {
    if (excluded.has(flatKeys[i]!)) return true
  }
  return false
}


// ─── Sorting ──────────────────────────────────────────────────────────────────

function sortTree(
  root: MutableNode,
  order: SortOrder,
  sortBy: AxisSortTarget | undefined,
  valuesOf: (node: MutableNode, opposingKey: string) => (number | null)[] | undefined
): void {
  // An explicit column target wins over the global order, matching Excel's
  // "sort on this column" behaviour.
  const descending = sortBy ? sortBy.descending : order === 'key_desc' || order === 'value_desc'
  const byValue = sortBy !== undefined || order === 'value_asc' || order === 'value_desc'

  // Without a target, "sort by value" means the node's own grand total, which
  // lives at the opposing axis root.
  const opposingKey = sortBy?.flatKey ?? ''
  const valueIndex = sortBy?.valueIndex ?? 0
  const keyComparator = createKeyComparator(descending)

  const visit = (node: MutableNode) => {
    if (node.children.length > 1) {
      if (byValue) {
        // `sortKeysByValue` reads each value exactly once instead of
        // O(n log n) times from inside a comparator.
        const byFlatKey = new Map(node.children.map((c) => [c.flatKey, c]))
        const ordered = sortKeysByValue(
          node.children.map((c) => c.path),
          (path) => valuesOf(byFlatKey.get(flattenKey(path))!, opposingKey)?.[valueIndex] ?? null,
          descending
        )
        node.children = ordered.map((path) => byFlatKey.get(flattenKey(path))!)
      } else {
        node.children.sort((a, b) => keyComparator(a.path, b.path))
      }
    }
    for (const child of node.children) visit(child)
  }

  visit(root)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Drop the construction-only child index so the result is a plain AxisNode. */
function toPlain(node: MutableNode): AxisNode {
  return {
    path: node.path,
    flatKey: node.flatKey,
    label: node.label,
    depth: node.depth,
    children: node.children.map(toPlain),
  }
}
