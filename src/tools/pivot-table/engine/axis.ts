import { AxisNode, LayoutMode, SubtotalPosition } from '../types'
import { flattenKey } from './sorters'

// ─── Row Lines ────────────────────────────────────────────────────────────────

export type RowLineKind = 'group' | 'leaf' | 'subtotal' | 'grand'

/** One rendered body row of the pivot. */
export interface RowLine {
  key: string
  node: AxisNode
  kind: RowLineKind
  /** Depth of `node`; drives indentation in compact layout. */
  depth: number
  label: string
  /** False for a group header whose subtotal is rendered on a separate line. */
  showsValues: boolean
  collapsible: boolean
  collapsed: boolean
}

export interface FlattenRowsOptions {
  layout: LayoutMode
  subtotals: SubtotalPosition
  collapsed: ReadonlySet<string>
  grandTotal: boolean
  /** Number of row fields. Zero means the pivot has no row dimension. */
  numRowFields: number
}

/**
 * Turn the row hierarchy into the flat list of lines the grid renders.
 *
 * Mirrors Excel: an expanded group can show its subtotal above or below its
 * children, a collapsed group shows its subtotal in place of them, and leaves
 * always show their own values.
 */
export function flattenRows(root: AxisNode, options: FlattenRowsOptions): RowLine[] {
  const { layout, subtotals, collapsed, grandTotal, numRowFields } = options
  const lines: RowLine[] = []

  if (numRowFields === 0) {
    // No row dimension: a single unlabelled line carrying the totals.
    lines.push({
      key: 'root',
      node: root,
      kind: 'leaf',
      depth: 0,
      label: '',
      showsValues: true,
      collapsible: false,
      collapsed: false,
    })
    return lines
  }

  const visit = (node: AxisNode) => {
    for (const child of node.children) {
      const isLeaf = child.children.length === 0
      const isCollapsed = collapsed.has(child.flatKey)

      if (isLeaf) {
        lines.push({
          key: child.flatKey,
          node: child,
          kind: 'leaf',
          depth: child.depth,
          label: child.label,
          showsValues: true,
          collapsible: false,
          collapsed: false,
        })
        continue
      }

      if (isCollapsed) {
        // Children are hidden, so the group line stands in for them.
        lines.push({
          key: child.flatKey,
          node: child,
          kind: 'group',
          depth: child.depth,
          label: child.label,
          showsValues: true,
          collapsible: true,
          collapsed: true,
        })
        continue
      }

      // Compact layout always needs a line to carry the group's label. Tabular
      // layout puts that label in its own column via rowSpan, so a header line
      // is only needed when it also carries the subtotal.
      const needsHeaderLine = layout === 'compact' || subtotals === 'top'
      if (needsHeaderLine) {
        lines.push({
          key: `${child.flatKey}\u0000head`,
          node: child,
          kind: subtotals === 'top' ? 'subtotal' : 'group',
          depth: child.depth,
          label: child.label,
          showsValues: subtotals === 'top',
          collapsible: true,
          collapsed: false,
        })
      }

      visit(child)

      if (subtotals === 'bottom') {
        lines.push({
          key: `${child.flatKey}\u0000sub`,
          node: child,
          kind: 'subtotal',
          depth: child.depth,
          label: `${child.label} Total`,
          showsValues: true,
          collapsible: false,
          collapsed: false,
        })
      }
    }
  }

  visit(root)

  if (grandTotal) {
    lines.push({
      key: '\u0000grand',
      node: root,
      kind: 'grand',
      depth: 0,
      label: 'Grand Total',
      showsValues: true,
      collapsible: false,
      collapsed: false,
    })
  }

  return lines
}

// ─── Row Label Spans (tabular layout) ─────────────────────────────────────────

export interface LabelCell {
  label: string
  rowSpan: number
  colSpan: number
  /** Index of the row field column this cell starts at. */
  fieldIndex: number
  /** Flattened key of the node this cell represents. */
  flatKey: string
  /** True when this cell's group has deeper levels that can be hidden. */
  collapsible: boolean
  collapsed: boolean
  line: RowLine
}

/**
 * Work out the merged label cells for tabular layout.
 *
 * Returns one entry per line; a line contributes zero or more `<th>`s. Repeated
 * parent labels are merged with rowSpan rather than restated on every row, and
 * the merged ancestor cell carries that group's collapse toggle - in tabular
 * layout there is no separate group header line to hang it on.
 */
export function computeRowLabelCells(
  lines: RowLine[],
  numRowFields: number,
  collapsed: ReadonlySet<string>
): LabelCell[][] {
  const result: LabelCell[][] = lines.map(() => [])

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!

    // Subtotal and grand-total lines get a single spanning label instead of
    // participating in the merge, matching Excel's "X Total" row.
    if (line.kind === 'subtotal' || line.kind === 'grand') {
      const startField = Math.max(0, line.depth - 1)
      result[i]!.push({
        label: line.label,
        rowSpan: 1,
        colSpan: numRowFields - startField,
        fieldIndex: startField,
        flatKey: line.node.flatKey,
        collapsible: false,
        collapsed: false,
        line,
      })
      continue
    }

    for (let f = 0; f < numRowFields; f++) {
      const path = line.node.path
      if (path.length <= f) break

      // A cell starts here unless the previous line already covers it.
      const prev = lines[i - 1]
      const covered =
        prev !== undefined &&
        prev.kind !== 'subtotal' &&
        prev.kind !== 'grand' &&
        samePrefix(prev.node.path, path, f + 1)
      if (covered) continue

      // Extend downwards over every following line sharing this prefix.
      let rowSpan = 1
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j]!
        if (next.kind === 'subtotal' || next.kind === 'grand') break
        if (!samePrefix(next.node.path, path, f + 1)) break
        rowSpan++
      }

      // A path that stops short of the full depth - a collapsed group - has to
      // stretch across the row-label columns it does not reach, or the row
      // ends up one cell short and the whole table shifts left.
      const colSpan = path.length === f + 1 ? numRowFields - f : 1

      const flatKey = flattenKey(path.slice(0, f + 1))
      result[i]!.push({
        label: path[f]!,
        rowSpan,
        colSpan,
        fieldIndex: f,
        flatKey,
        // Any level above the innermost one has children worth hiding.
        collapsible: f + 1 < numRowFields,
        collapsed: collapsed.has(flatKey),
        line,
      })
    }
  }

  return result
}

function samePrefix(a: string[], b: string[], length: number): boolean {
  if (a.length < length || b.length < length) return false
  for (let i = 0; i < length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

// ─── Column Slots ─────────────────────────────────────────────────────────────

export type ColSlotKind = 'leaf' | 'subtotal' | 'grand'

/** One rendered data column (repeated once per value metric). */
export interface ColSlot {
  key: string
  node: AxisNode
  kind: ColSlotKind
  /**
   * Labels down the header rows. A slot that terminates early - a collapsed
   * group, a subtotal, or the grand total - has a shorter path and its final
   * header cell spans the remaining header rows.
   */
  headerPath: string[]
  collapsible: boolean
  collapsed: boolean
}

export interface FlattenColsOptions {
  subtotals: SubtotalPosition
  collapsed: ReadonlySet<string>
  grandTotal: boolean
  numColFields: number
}

export function flattenCols(root: AxisNode, options: FlattenColsOptions): ColSlot[] {
  const { subtotals, collapsed, grandTotal, numColFields } = options
  const slots: ColSlot[] = []

  if (numColFields === 0) {
    slots.push({
      key: 'root',
      node: root,
      kind: 'leaf',
      headerPath: [],
      collapsible: false,
      collapsed: false,
    })
    return slots
  }

  const visit = (node: AxisNode) => {
    for (const child of node.children) {
      const isLeaf = child.children.length === 0
      const isCollapsed = collapsed.has(child.flatKey)

      if (isLeaf || isCollapsed) {
        slots.push({
          key: child.flatKey,
          node: child,
          kind: 'leaf',
          headerPath: child.path,
          collapsible: !isLeaf,
          collapsed: isCollapsed,
        })
        continue
      }

      if (subtotals === 'top') {
        slots.push(subtotalSlot(child))
      }
      visit(child)
      if (subtotals === 'bottom') {
        slots.push(subtotalSlot(child))
      }
    }
  }

  visit(root)

  if (grandTotal) {
    slots.push({
      key: '\u0000grand',
      node: root,
      kind: 'grand',
      headerPath: ['Grand Total'],
      collapsible: false,
      collapsed: false,
    })
  }

  return slots
}

function subtotalSlot(node: AxisNode): ColSlot {
  return {
    key: `${node.flatKey}\u0000sub`,
    node,
    kind: 'subtotal',
    headerPath: [...node.path, `${node.label} Total`],
    collapsible: true,
    collapsed: false,
  }
}

// ─── Column Header Rows ───────────────────────────────────────────────────────

export interface HeaderCell {
  key: string
  label: string
  colSpan: number
  rowSpan: number
  /** Present when this cell corresponds to a collapsible group. */
  slot: ColSlot
  /** Flat key of the group this cell's toggle applies to. */
  toggleKey: string
  collapsible: boolean
  collapsed: boolean
  /**
   * True when this cell maps to exactly one column slot, i.e. it is the deepest
   * header for that slot. Only terminal cells can carry a sort control, since a
   * spanning cell covers several columns.
   */
  terminal: boolean
}

/**
 * Build the column header rows from the ordered slot list.
 *
 * At header row `d`, consecutive slots sharing the same first `d + 1` labels
 * merge into one cell. A slot whose header path ends at `d` spans the remaining
 * header rows downwards.
 */
export function buildColHeaderRows(slots: ColSlot[]): HeaderCell[][] {
  const maxDepth = slots.reduce((max, s) => Math.max(max, s.headerPath.length), 0)
  if (maxDepth === 0) return []

  const rows: HeaderCell[][] = []

  for (let d = 0; d < maxDepth; d++) {
    const row: HeaderCell[] = []
    let i = 0

    while (i < slots.length) {
      const slot = slots[i]!
      // Shorter paths were already covered by a cell spanning down from above.
      if (slot.headerPath.length <= d) {
        i++
        continue
      }

      let j = i + 1
      while (j < slots.length) {
        const next = slots[j]!
        if (next.headerPath.length <= d) break
        if (!samePrefix(next.headerPath, slot.headerPath, d + 1)) break
        j++
      }

      const terminal = slot.headerPath.length === d + 1

      // Collapsibility belongs to the *group* this cell spans, not to the first
      // slot inside it. Deriving it from the slot meant an expanded group never
      // offered a toggle, because an expanded group contributes no slot of its
      // own - only its children do.
      const hasDeeper = slots.slice(i, j).some((s) => s.headerPath.length > d + 1)
      const isCollapsedGroup = j - i === 1 && slot.collapsed

      row.push({
        key: `${d}\u0000${slot.key}`,
        label: slot.headerPath[d]!,
        colSpan: j - i,
        rowSpan: terminal ? maxDepth - d : 1,
        slot,
        toggleKey: flattenKey(slot.node.path.slice(0, d + 1)),
        collapsible: hasDeeper || isCollapsedGroup,
        collapsed: isCollapsedGroup,
        terminal,
      })

      i = j
    }

    rows.push(row)
  }

  return rows
}
