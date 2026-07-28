import { AxisNode, ShowAs, ValueConfig } from '../types'
import { compositeKey } from './sorters'

/**
 * Applies Excel's "Show Values As" calculations to an aggregated grid.
 *
 * These are deliberately separate from aggregation: the grid is summarised
 * first, then transformed. That is what makes "% of grand total of Average" or
 * "Running total of Count Unique" expressible, none of which is possible when
 * the percentage is baked into the aggregator itself.
 *
 * Order-sensitive calculations - running totals, rank, difference from previous
 * - operate over *siblings* in display order, so they reset at each group
 * boundary exactly as Excel does.
 */
export function applyShowAs(
  values: Map<string, (number | null)[]>,
  rowRoot: AxisNode,
  colRoot: AxisNode,
  valueConfigs: ValueConfig[]
): Map<string, (number | null)[]> {
  if (valueConfigs.every((vc) => vc.showAs === 'raw')) return values

  const rowNodes = collectNodes(rowRoot)
  const colNodes = collectNodes(colRoot)
  const rowGroups = collectSiblingGroups(rowRoot)
  const colGroups = collectSiblingGroups(colRoot)
  const rowParents = collectParents(rowRoot)
  const colParents = collectParents(colRoot)

  const read = (row: AxisNode, col: AxisNode, i: number): number | null =>
    values.get(compositeKey(row.flatKey, col.flatKey))?.[i] ?? null

  // Copy so each metric reads from the untransformed grid.
  const output = new Map<string, (number | null)[]>()
  for (const [key, vals] of values) output.set(key, [...vals])

  const write = (row: AxisNode, col: AxisNode, i: number, value: number | null) => {
    const target = output.get(compositeKey(row.flatKey, col.flatKey))
    if (target) target[i] = value
  }

  valueConfigs.forEach((vc, i) => {
    const { showAs } = vc
    if (showAs === 'raw') return

    switch (showAs) {
      // ── Ratios against a total ────────────────────────────────────────────
      case 'pctOfGrandTotal':
      case 'pctOfRowTotal':
      case 'pctOfColTotal':
      case 'pctOfParentRow':
      case 'pctOfParentCol':
      case 'index': {
        for (const row of rowNodes) {
          const rowParent = rowParents.get(row.flatKey) ?? rowRoot
          for (const col of colNodes) {
            const colParent = colParents.get(col.flatKey) ?? colRoot
            const value = read(row, col, i)
            write(
              row,
              col,
              i,
              ratio(showAs, value, { row, col, rowRoot, colRoot, rowParent, colParent }, read, i)
            )
          }
        }
        break
      }

      // ── Order-sensitive calculations down the rows ────────────────────────
      case 'runningTotalRows':
      case 'pctRunningTotalRows':
      case 'differenceFromPrevRow':
      case 'pctDifferenceFromPrevRow':
      case 'rankSmallestToLargest':
      case 'rankLargestToSmallest': {
        for (const col of colNodes) {
          for (const siblings of rowGroups) {
            applySequence(showAs, siblings, (n) => read(n, col, i), (n, v) =>
              write(n, col, i, v)
            )
          }
        }
        break
      }

      // ── Order-sensitive calculations across the columns ───────────────────
      case 'runningTotalCols': {
        for (const row of rowNodes) {
          for (const siblings of colGroups) {
            applySequence(showAs, siblings, (n) => read(row, n, i), (n, v) =>
              write(row, n, i, v)
            )
          }
        }
        break
      }
    }
  })

  return output
}

// ─── Ratio calculations ───────────────────────────────────────────────────────

interface RatioContext {
  row: AxisNode
  col: AxisNode
  rowRoot: AxisNode
  colRoot: AxisNode
  rowParent: AxisNode
  colParent: AxisNode
}

function ratio(
  showAs: ShowAs,
  value: number | null,
  ctx: RatioContext,
  read: (r: AxisNode, c: AxisNode, i: number) => number | null,
  i: number
): number | null {
  if (value === null) return null

  const { row, col, rowRoot, colRoot, rowParent, colParent } = ctx

  switch (showAs) {
    case 'pctOfGrandTotal':
      return divide(value, read(rowRoot, colRoot, i))
    case 'pctOfRowTotal':
      return divide(value, read(row, colRoot, i))
    case 'pctOfColTotal':
      return divide(value, read(rowRoot, col, i))
    case 'pctOfParentRow':
      // The top level's parent is the grand total, matching Excel.
      return divide(value, read(rowParent, col, i))
    case 'pctOfParentCol':
      return divide(value, read(row, colParent, i))
    case 'index': {
      // Excel's Index: (cell x grand) / (row total x column total). Values
      // above 1 mean the cell is over-represented relative to its margins.
      const grand = read(rowRoot, colRoot, i)
      const rowTotal = read(row, colRoot, i)
      const colTotal = read(rowRoot, col, i)
      if (grand === null || rowTotal === null || colTotal === null) return null
      const denominator = rowTotal * colTotal
      return denominator === 0 ? null : (value * grand) / denominator
    }
    default:
      return value
  }
}

function divide(value: number, total: number | null): number | null {
  if (total === null) return null
  if (total === 0) return value === 0 ? 0 : null
  return value / total
}

// ─── Sequence calculations ────────────────────────────────────────────────────

function applySequence(
  showAs: ShowAs,
  siblings: AxisNode[],
  read: (node: AxisNode) => number | null,
  write: (node: AxisNode, value: number | null) => void
): void {
  const raw = siblings.map(read)

  switch (showAs) {
    case 'runningTotalRows':
    case 'runningTotalCols': {
      let total: number | null = null
      raw.forEach((value, k) => {
        if (value !== null) total = (total ?? 0) + value
        write(siblings[k]!, total)
      })
      break
    }

    case 'pctRunningTotalRows': {
      const grandTotal = raw.reduce<number>((sum, v) => sum + (v ?? 0), 0)
      let total: number | null = null
      raw.forEach((value, k) => {
        if (value !== null) total = (total ?? 0) + value
        write(siblings[k]!, total === null || grandTotal === 0 ? null : total / grandTotal)
      })
      break
    }

    case 'differenceFromPrevRow': {
      raw.forEach((value, k) => {
        const previous = k === 0 ? null : raw[k - 1]!
        // The first item has nothing to compare against, as in Excel.
        write(siblings[k]!, value === null || previous === null ? null : value - previous)
      })
      break
    }

    case 'pctDifferenceFromPrevRow': {
      raw.forEach((value, k) => {
        const previous = k === 0 ? null : raw[k - 1]!
        if (value === null || previous === null || previous === 0) {
          write(siblings[k]!, null)
        } else {
          write(siblings[k]!, (value - previous) / previous)
        }
      })
      break
    }

    case 'rankSmallestToLargest':
    case 'rankLargestToSmallest': {
      const descending = showAs === 'rankLargestToSmallest'
      const ordered = raw
        .map((value, k) => ({ value, k }))
        .filter((entry): entry is { value: number; k: number } => entry.value !== null)
        .sort((a, b) => (descending ? b.value - a.value : a.value - b.value))

      // Competition ranking: equal values share a rank, and the next distinct
      // value skips ahead. This is what Excel reports.
      let rank = 0
      let previousValue: number | null = null
      ordered.forEach((entry, position) => {
        if (previousValue === null || entry.value !== previousValue) {
          rank = position + 1
          previousValue = entry.value
        }
        write(siblings[entry.k]!, rank)
      })
      break
    }
  }
}

// ─── Tree traversal helpers ───────────────────────────────────────────────────

function collectNodes(root: AxisNode): AxisNode[] {
  const out: AxisNode[] = []
  const visit = (node: AxisNode) => {
    out.push(node)
    for (const child of node.children) visit(child)
  }
  visit(root)
  return out
}

/** Every set of siblings in the tree, each already in display order. */
function collectSiblingGroups(root: AxisNode): AxisNode[][] {
  const out: AxisNode[][] = []
  const visit = (node: AxisNode) => {
    if (node.children.length > 0) out.push(node.children)
    for (const child of node.children) visit(child)
  }
  visit(root)
  return out
}

/**
 * Parent lookup by flat key. Held externally rather than as a `parent` field so
 * that AxisNode stays an acyclic, structurally-comparable plain object.
 */
function collectParents(root: AxisNode): Map<string, AxisNode> {
  const out = new Map<string, AxisNode>()
  const visit = (node: AxisNode) => {
    for (const child of node.children) {
      out.set(child.flatKey, node)
      visit(child)
    }
  }
  visit(root)
  return out
}
