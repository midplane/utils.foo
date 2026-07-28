import { describe, it, expect } from 'vitest'
import { computePivot } from '../tools/pivot-table/engine/PivotEngine'
import { computeFilteredPivot } from '../tools/pivot-table/engine/filters'
import { findSourceRecords } from '../tools/pivot-table/engine/drilldown'
import { analyzeData } from '../tools/pivot-table/hooks/usePivotData'
import {
  compositeKey,
  flattenKey,
  keyLabel,
  BLANK_KEY,
} from '../tools/pivot-table/engine/sorters'
import {
  datePartField,
  binnedField,
  looksLikeDate,
  derivedFieldInfo,
} from '../tools/pivot-table/engine/grouping'
import {
  flattenRows,
  flattenCols,
  buildColHeaderRows,
  computeRowLabelCells,
} from '../tools/pivot-table/engine/axis'
import type {
  AggregationType,
  DataRecord,
  ValueConfig,
  ShowAs,
  LabelOp,
  MeasureRule,
  NumberFormat,
} from '../tools/pivot-table/types'

const V = (
  aggregation: AggregationType,
  field: string,
  showAs: ShowAs = 'raw'
): ValueConfig[] => [{ id: 'v', field, aggregation, showAs }]
const base = {
  filters: [],
  rowOrder: 'key_asc' as const,
  colOrder: 'key_asc' as const,
  groupings: {},
}

const recs: DataRecord[] = [
  { region: 'A|B', qtr: 'Q1', amt: 10 },
  { region: 'A|B', qtr: 'Q2', amt: 30 },
  { region: 'C', qtr: 'Q1', amt: 60 },
]

describe('delimiter safety', () => {
  it('computes % row correctly when data contains |', () => {
    const r = computePivot(recs, { ...base, rows: ['region'], cols: ['qtr'], values: V('sum', 'amt', 'pctOfRowTotal') })
    const cell = r.cells.get(compositeKey(flattenKey(['A|B']), flattenKey(['Q1'])))!
    expect(cell.values[0]).toBeCloseTo(0.25) // 10 / 40
    expect(cell.formatted[0]).toBe('25.0%')
  })
})

describe('columns-only', () => {
  it('produces values with no row fields', () => {
    const r = computePivot(recs, { ...base, rows: [], cols: ['qtr'], values: V('sum', 'amt') })
    const lines = flattenRows(r.rowRoot, { layout: 'compact', subtotals: 'none', collapsed: new Set(), grandTotal: false, numRowFields: 0 })
    const slots = flattenCols(r.colRoot, { subtotals: 'none', collapsed: new Set(), grandTotal: false, numColFields: 1 })
    expect(lines).toHaveLength(1)
    expect(slots.map(s => s.node.label)).toEqual(['Q1', 'Q2'])
    const v = slots.map(s => r.cells.get(compositeKey('', s.node.flatKey))!.formatted[0])
    expect(v).toEqual(['70', '30'])
  })
})

describe('subtotals', () => {
  const multi: DataRecord[] = [
    { g: 'X', s: 'x1', n: 1 }, { g: 'X', s: 'x2', n: 2 }, { g: 'Y', s: 'y1', n: 4 },
  ]
  it('exact aggregate at every level', () => {
    const r = computePivot(multi, { ...base, rows: ['g', 's'], cols: [], values: V('sum', 'n') })
    expect(r.cells.get(compositeKey(flattenKey(['X']), ''))!.formatted[0]).toBe('3')
    expect(r.cells.get(compositeKey('', ''))!.formatted[0]).toBe('7')
  })
  it('emits subtotal lines bottom', () => {
    const r = computePivot(multi, { ...base, rows: ['g', 's'], cols: [], values: V('sum', 'n') })
    const lines = flattenRows(r.rowRoot, { layout: 'compact', subtotals: 'bottom', collapsed: new Set(), grandTotal: true, numRowFields: 2 })
    expect(lines.map(l => [l.kind, l.label])).toEqual([
      ['group', 'X'], ['leaf', 'x1'], ['leaf', 'x2'], ['subtotal', 'X Total'],
      ['group', 'Y'], ['leaf', 'y1'], ['subtotal', 'Y Total'],
      ['grand', 'Grand Total'],
    ])
  })
  it('collapsing hides children', () => {
    const r = computePivot(multi, { ...base, rows: ['g', 's'], cols: [], values: V('sum', 'n') })
    const lines = flattenRows(r.rowRoot, { layout: 'compact', subtotals: 'bottom', collapsed: new Set([flattenKey(['X'])]), grandTotal: false, numRowFields: 2 })
    expect(lines.map(l => l.label)).toEqual(['X', 'Y', 'y1', 'Y Total'])
    expect(lines[0]!.showsValues).toBe(true)
  })
})

describe('blanks', () => {
  it('separates real "null" string from empty', () => {
    const r = computePivot([{ k: 'null', n: 1 }, { k: '', n: 2 }, { k: null, n: 4 }],
      { ...base, rows: ['k'], cols: [], values: V('sum', 'n') })
    const labels = r.rowRoot.children.map(c => c.label)
    expect(labels).toContain('null')
    expect(labels).toContain(BLANK_KEY)
    expect(r.cells.get(compositeKey(flattenKey([BLANK_KEY]), ''))!.formatted[0]).toBe('6')
  })
})

describe('formatting', () => {
  it('uses consistent decimals per metric', () => {
    const r = computePivot([{ g: 'a', n: 1000 }, { g: 'b', n: 8.5 }],
      { ...base, rows: ['g'], cols: [], values: V('sum', 'n') })
    expect(r.cells.get(compositeKey(flattenKey(['a']), ''))!.formatted[0]).toBe('1,000.00')
    expect(r.cells.get(compositeKey(flattenKey(['b']), ''))!.formatted[0]).toBe('8.50')
  })
})

describe('column headers', () => {
  it('spans subtotal columns under their parent', () => {
    const r = computePivot([
      { a: 'P', b: 'p1', n: 1 }, { a: 'P', b: 'p2', n: 2 },
    ], { ...base, rows: [], cols: ['a', 'b'], values: V('sum', 'n') })
    const slots = flattenCols(r.colRoot, { subtotals: 'bottom', collapsed: new Set(), grandTotal: true, numColFields: 2 })
    expect(slots.map(s => s.headerPath.join('>'))).toEqual(['P>p1', 'P>p2', 'P>P Total', 'Grand Total'])
    const rows = buildColHeaderRows(slots)
    expect(rows[0]!.map(c => [c.label, c.colSpan, c.rowSpan])).toEqual([['P', 3, 1], ['Grand Total', 1, 2]])
    expect(rows[1]!.map(c => [c.label, c.colSpan, c.rowSpan])).toEqual([['p1', 1, 1], ['p2', 1, 1], ['P Total', 1, 1]])
  })
})

describe('value sort', () => {
  it('orders by aggregate descending', () => {
    const r = computePivot(recs, { ...base, rowOrder: 'value_desc', rows: ['region'], cols: [], values: V('sum', 'amt') })
    expect(r.rowRoot.children.map(c => c.label)).toEqual(['C', 'A|B'])
  })
})

describe('layout', () => {
  const nested: DataRecord[] = [
    { g: 'Action', s: 'Disney', n: 1 },
    { g: 'Action', s: 'Fox', n: 2 },
    { g: 'Drama', s: 'Fox', n: 4 },
  ]
  const pivot = computePivot(nested, {
    ...base, rows: ['g', 's'], cols: [], values: V('sum', 'n'),
  })
  const opts = { subtotals: 'bottom' as const, grandTotal: false, numRowFields: 2 }

  it('compact adds group header lines that tabular omits', () => {
    const compact = flattenRows(pivot.rowRoot, { ...opts, layout: 'compact', collapsed: new Set() })
    const tabular = flattenRows(pivot.rowRoot, { ...opts, layout: 'tabular', collapsed: new Set() })
    expect(compact.map((l) => l.kind)).toEqual([
      'group', 'leaf', 'leaf', 'subtotal', 'group', 'leaf', 'subtotal',
    ])
    expect(tabular.map((l) => l.kind)).toEqual(['leaf', 'leaf', 'subtotal', 'leaf', 'subtotal'])
  })

  it('every tabular row spans exactly the row-label columns', () => {
    for (const collapsed of [new Set<string>(), new Set([flattenKey(['Action'])])]) {
      const lines = flattenRows(pivot.rowRoot, { ...opts, layout: 'tabular', collapsed })
      const cells = computeRowLabelCells(lines, 2, collapsed)

      // Paint each cell onto an occupancy grid. Every slot must be covered
      // exactly once - a gap shifts the whole table sideways, an overlap means
      // a stray extra header cell.
      const grid: number[][] = lines.map(() => new Array<number>(2).fill(0))
      cells.forEach((row, i) => {
        for (const cell of row) {
          for (let r = i; r < i + cell.rowSpan; r++) {
            for (let c = cell.fieldIndex; c < cell.fieldIndex + cell.colSpan; c++) {
              grid[r]![c]! += 1
            }
          }
        }
      })

      expect(grid).toEqual(lines.map(() => [1, 1]))
    }
  })

  it('tabular exposes a collapse toggle on the merged ancestor cell', () => {
    const lines = flattenRows(pivot.rowRoot, { ...opts, layout: 'tabular', collapsed: new Set() })
    const cells = computeRowLabelCells(lines, 2, new Set())
    const outer = cells[0]!.find((c) => c.fieldIndex === 0)!
    expect(outer.collapsible).toBe(true)
    expect(outer.flatKey).toBe(flattenKey(['Action']))
    // The innermost field has nothing below it to hide.
    expect(cells[0]!.find((c) => c.fieldIndex === 1)!.collapsible).toBe(false)
  })
})

describe('show values as', () => {
  // Two parents so parent-relative and reset-per-group behaviour is exercised.
  const data: DataRecord[] = [
    { g: 'A', s: 'a1', n: 10 },
    { g: 'A', s: 'a2', n: 30 },
    { g: 'B', s: 'b1', n: 60 },
  ]
  const run = (showAs: ShowAs, rows = ['g', 's']) =>
    computePivot(data, { ...base, rows, cols: [], values: V('sum', 'n', showAs) })

  const at = (r: ReturnType<typeof run>, path: string[]) =>
    r.cells.get(compositeKey(flattenKey(path), ''))!

  it('% of grand total', () => {
    const r = run('pctOfGrandTotal')
    expect(at(r, ['A', 'a1']).formatted[0]).toBe('10.0%')
    expect(at(r, ['A']).formatted[0]).toBe('40.0%')
  })

  it('% of parent row total resets per group', () => {
    const r = run('pctOfParentRow')
    // a1 is 10 of A's 40; b1 is all of B.
    expect(at(r, ['A', 'a1']).formatted[0]).toBe('25.0%')
    expect(at(r, ['A', 'a2']).formatted[0]).toBe('75.0%')
    expect(at(r, ['B', 'b1']).formatted[0]).toBe('100.0%')
    // Top-level items are measured against the grand total.
    expect(at(r, ['A']).formatted[0]).toBe('40.0%')
  })

  it('running total accumulates within a group and restarts in the next', () => {
    const r = run('runningTotalRows')
    expect(at(r, ['A', 'a1']).values[0]).toBe(10)
    expect(at(r, ['A', 'a2']).values[0]).toBe(40)
    expect(at(r, ['B', 'b1']).values[0]).toBe(60)
    // The outer level accumulates across its own siblings.
    expect(at(r, ['A']).values[0]).toBe(40)
    expect(at(r, ['B']).values[0]).toBe(100)
  })

  it('difference from previous row leaves the first item blank', () => {
    const r = run('differenceFromPrevRow')
    expect(at(r, ['A', 'a1']).values[0]).toBeNull()
    expect(at(r, ['A', 'a2']).values[0]).toBe(20)
    expect(at(r, ['B', 'b1']).values[0]).toBeNull()
  })

  it('rank uses competition ranking among siblings', () => {
    const tied: DataRecord[] = [
      { g: 'x', n: 5 }, { g: 'y', n: 5 }, { g: 'z', n: 1 },
    ]
    const r = computePivot(tied, {
      ...base, rows: ['g'], cols: [],
      values: V('sum', 'n', 'rankLargestToSmallest'),
    })
    expect(at(r, ['x']).values[0]).toBe(1)
    expect(at(r, ['y']).values[0]).toBe(1)
    expect(at(r, ['z']).values[0]).toBe(3)
  })

  it('is independent of the aggregation used', () => {
    // Running total of an Average is meaningless in the old model, where the
    // percentage was welded to a Sum aggregator.
    const r = computePivot(data, {
      ...base, rows: ['g'], cols: [],
      values: V('average', 'n', 'runningTotalRows'),
    })
    expect(at(r, ['A']).values[0]).toBe(20)
    expect(at(r, ['B']).values[0]).toBe(80)
  })
})

describe('aggregations', () => {
  const data: DataRecord[] = [
    { g: 'a', n: 2, t: 'x' }, { g: 'a', n: 4, t: 'x' }, { g: 'a', n: null, t: 'y' },
  ]
  const agg = (aggregation: AggregationType) =>
    computePivot(data, { ...base, rows: ['g'], cols: [], values: V(aggregation, 'n') })
      .cells.get(compositeKey(flattenKey(['a']), ''))!.values[0]

  it('counts rows, numbers and distinct values separately', () => {
    expect(agg('count')).toBe(3)
    expect(agg('countNumbers')).toBe(2)
    expect(agg('countUnique')).toBe(3) // 2, 4, blank
  })

  it('computes product and both variance conventions', () => {
    expect(agg('product')).toBe(8)
    expect(agg('variance')).toBe(2)      // sample: ((2-3)^2+(4-3)^2)/1
    expect(agg('variancep')).toBe(1)     // population: /2
    expect(agg('stdev')).toBeCloseTo(Math.SQRT2)
    expect(agg('stdevp')).toBe(1)
  })
})

describe('field grouping', () => {
  const sales: DataRecord[] = [
    { when: '2023-01-15', amt: 10 },
    { when: '2023-03-02', amt: 20 },
    { when: '2023-07-04', amt: 30 },
    { when: '2024-01-09', amt: 40 },
  ]

  it('derives date parts as separate virtual fields', () => {
    const groupings = { when: { kind: 'date' as const, parts: ['year' as const, 'quarter' as const] } }
    const r = computePivot(sales, {
      ...base,
      groupings,
      rows: [datePartField('when', 'year')],
      cols: [datePartField('when', 'quarter')],
      values: V('sum', 'amt'),
    })

    expect(r.rowRoot.children.map((c) => c.label)).toEqual(['2023', '2024'])
    expect(r.colRoot.children.map((c) => c.label)).toEqual(['Q1', 'Q2', 'Q3'].filter((q) => q !== 'Q2'))
    // 2023 Q1 = Jan 10 + Mar 20
    expect(
      r.cells.get(compositeKey(flattenKey(['2023']), flattenKey(['Q1'])))!.values[0]
    ).toBe(30)
  })

  it('orders months chronologically, not alphabetically', () => {
    const groupings = { when: { kind: 'date' as const, parts: ['month' as const] } }
    const r = computePivot(sales, {
      ...base, groupings, rows: [datePartField('when', 'month')], cols: [], values: V('sum', 'amt'),
    })
    // Alphabetically this would be Jan, Jul, Mar.
    expect(r.rowRoot.children.map((c) => keyLabel(c.label))).toEqual(['Jan', 'Mar', 'Jul'])
  })

  it('buckets numbers into fixed-size bins ordered numerically', () => {
    const nums: DataRecord[] = [{ n: 4 }, { n: 12 }, { n: 25 }, { n: 104 }]
    const r = computePivot(nums, {
      ...base,
      groupings: { n: { kind: 'number', binSize: 10 } },
      rows: [binnedField('n', 10)],
      cols: [],
      values: V('count', 'n'),
    })
    expect(r.rowRoot.children.map((c) => keyLabel(c.label))).toEqual([
      '0 – 10', '10 – 20', '20 – 30', '100 – 110',
    ])
  })

  it('leaves unparseable values as blanks instead of guessing', () => {
    const messy: DataRecord[] = [{ when: 'not a date', amt: 1 }, { when: '2023-01-01', amt: 2 }]
    const r = computePivot(messy, {
      ...base,
      groupings: { when: { kind: 'date', parts: ['year'] } },
      rows: [datePartField('when', 'year')],
      cols: [],
      values: V('sum', 'amt'),
    })
    const labels = r.rowRoot.children.map((c) => c.label)
    expect(labels).toContain(BLANK_KEY)
    expect(labels).toContain('2023')
  })
})

describe('sort by column', () => {
  const data: DataRecord[] = [
    { g: 'A', q: 'Q1', n: 1 }, { g: 'A', q: 'Q2', n: 90 },
    { g: 'B', q: 'Q1', n: 50 }, { g: 'B', q: 'Q2', n: 5 },
  ]

  it('orders rows by one column rather than by the row total', () => {
    const byQ1 = computePivot(data, {
      ...base, rows: ['g'], cols: ['q'], values: V('sum', 'n'),
      rowSortBy: { flatKey: flattenKey(['Q1']), valueIndex: 0, descending: true },
    })
    // B leads on Q1 (50 vs 1) even though A has the larger overall total.
    expect(byQ1.rowRoot.children.map((c) => c.label)).toEqual(['B', 'A'])

    const byQ2 = computePivot(data, {
      ...base, rows: ['g'], cols: ['q'], values: V('sum', 'n'),
      rowSortBy: { flatKey: flattenKey(['Q2']), valueIndex: 0, descending: true },
    })
    expect(byQ2.rowRoot.children.map((c) => c.label)).toEqual(['A', 'B'])
  })

  it('honours the ascending direction', () => {
    const r = computePivot(data, {
      ...base, rows: ['g'], cols: ['q'], values: V('sum', 'n'),
      rowSortBy: { flatKey: flattenKey(['Q1']), valueIndex: 0, descending: false },
    })
    expect(r.rowRoot.children.map((c) => c.label)).toEqual(['A', 'B'])
  })

  it('sorts by the grand total column when the target is the root', () => {
    const r = computePivot(data, {
      ...base, rows: ['g'], cols: ['q'], values: V('sum', 'n'),
      rowSortBy: { flatKey: '', valueIndex: 0, descending: true },
    })
    // A totals 91, B totals 55.
    expect(r.rowRoot.children.map((c) => c.label)).toEqual(['A', 'B'])
  })
})

describe('date detection', () => {
  it('does not mistake ordinary numbers for epoch timestamps', () => {
    // Ratings, budgets and runtimes would all parse as dates if bare numbers
    // were treated as epochs, silently offering to group them by year.
    const numbers: DataRecord[] = [{ rating: 9.0 }, { rating: 8.8 }, { rating: 7.4 }]
    expect(looksLikeDate(numbers, 'rating')).toBe(false)

    const budgets: DataRecord[] = [{ b: 185 }, { b: 1006 }, { b: 152 }]
    expect(looksLikeDate(budgets, 'b')).toBe(false)
  })

  it('does not mistake year-like or decade-like text for dates', () => {
    expect(looksLikeDate([{ d: '2000s' }, { d: '1990s' }], 'd')).toBe(false)
    expect(looksLikeDate([{ y: '1977' }, { y: '1984' }], 'y')).toBe(false)
  })

  it('accepts ISO dates and genuine epoch magnitudes', () => {
    expect(looksLikeDate([{ d: '2023-01-15' }, { d: '2024-11-07' }], 'd')).toBe(true)
    expect(looksLikeDate([{ d: 1700000000 }, { d: 1600000000 }], 'd')).toBe(true)
  })
})

describe('label filters', () => {
  const data: DataRecord[] = [
    { g: 'Action', n: 1 }, { g: 'Animation', n: 2 }, { g: 'Drama', n: 4 },
  ]
  const withLabel = (op: LabelOp, text: string) =>
    computeFilteredPivot(data, {
      ...base, rows: ['g'], cols: [], values: V('sum', 'n'),
      filters: [{ field: 'g', excludedValues: new Set<string>(), label: { op, text } }],
    })

  it('keeps only matching items', () => {
    expect(withLabel('beginsWith', 'A').rowRoot.children.map((c) => c.label))
      .toEqual(['Action', 'Animation'])
    expect(withLabel('contains', 'ram').rowRoot.children.map((c) => c.label))
      .toEqual(['Drama'])
    expect(withLabel('notContains', 'a').rowRoot.children.map((c) => c.label))
      .toEqual([])
  })

  it('removes filtered records from the totals', () => {
    const r = withLabel('equals', 'Drama')
    expect(r.cells.get(compositeKey('', ''))!.values[0]).toBe(4)
    expect(r.matchedRecords).toBe(1)
  })

  it('is inert when the text is empty', () => {
    expect(withLabel('contains', '').rowRoot.children).toHaveLength(3)
  })
})

describe('top-N and value filters', () => {
  const data: DataRecord[] = [
    { g: 'a', n: 10 }, { g: 'b', n: 50 }, { g: 'c', n: 30 }, { g: 'd', n: 5 },
  ]
  const withMeasure = (measure: MeasureRule, rows = ['g']) =>
    computeFilteredPivot(data, {
      ...base, rows, cols: [], values: V('sum', 'n'),
      filters: [{ field: 'g', excludedValues: new Set<string>(), measure }],
    })

  it('keeps the top N items by value', () => {
    const r = withMeasure({ op: 'top', valueIndex: 0, a: 2 })
    expect(new Set(r.rowRoot.children.map((c) => c.label))).toEqual(new Set(['b', 'c']))
  })

  it('keeps the bottom N items', () => {
    const r = withMeasure({ op: 'bottom', valueIndex: 0, a: 2 })
    expect(new Set(r.rowRoot.children.map((c) => c.label))).toEqual(new Set(['a', 'd']))
  })

  it('recomputes the grand total from the surviving records', () => {
    // Excel's Top N removes the items entirely, so the total is 50 + 30, not 95.
    const r = withMeasure({ op: 'top', valueIndex: 0, a: 2 })
    expect(r.cells.get(compositeKey('', ''))!.values[0]).toBe(80)
    expect(r.matchedRecords).toBe(2)
  })

  it('applies threshold comparisons', () => {
    expect(
      new Set(withMeasure({ op: 'gte', valueIndex: 0, a: 30 }).rowRoot.children.map((c) => c.label))
    ).toEqual(new Set(['b', 'c']))
    expect(
      new Set(
        withMeasure({ op: 'between', valueIndex: 0, a: 10, b: 30 }).rowRoot.children.map((c) => c.label)
      )
    ).toEqual(new Set(['a', 'c']))
  })

  it('ranks within each parent group, not globally', () => {
    const nested: DataRecord[] = [
      { outer: 'X', g: 'a', n: 1 }, { outer: 'X', g: 'b', n: 2 },
      { outer: 'Y', g: 'c', n: 100 }, { outer: 'Y', g: 'd', n: 200 },
    ]
    const r = computeFilteredPivot(nested, {
      ...base, rows: ['outer', 'g'], cols: [], values: V('sum', 'n'),
      filters: [{ field: 'g', excludedValues: new Set<string>(), measure: { op: 'top', valueIndex: 0, a: 1 } }],
    })
    // Globally the top 1 would be 'd' only; per-group it is 'b' and 'd'.
    const leaves = r.rowRoot.children.flatMap((c) => c.children.map((g) => g.label))
    expect(new Set(leaves)).toEqual(new Set(['b', 'd']))
  })
})

describe('drill-down', () => {
  const data: DataRecord[] = [
    { g: 'A', q: 'Q1', n: 1 }, { g: 'A', q: 'Q2', n: 2 }, { g: 'B', q: 'Q1', n: 4 },
  ]
  const cfg = { ...base, rows: ['g'], cols: ['q'], values: V('sum', 'n') }

  it('returns the records behind a leaf cell', () => {
    const { rows, total } = findSourceRecords(data, cfg, ['A'], ['Q1'], 100)
    expect(total).toBe(1)
    expect(rows[0]!.n).toBe(1)
  })

  it('treats a shorter path as a subtotal and matches the whole group', () => {
    const { total } = findSourceRecords(data, cfg, ['A'], [], 100)
    expect(total).toBe(2)
  })

  it('returns every record for the grand total cell', () => {
    expect(findSourceRecords(data, cfg, [], [], 100).total).toBe(3)
  })

  it('caps the returned rows but still reports the true count', () => {
    const { rows, total } = findSourceRecords(data, cfg, [], [], 2)
    expect(rows).toHaveLength(2)
    expect(total).toBe(3)
  })
})

describe('number formats', () => {
  const data: DataRecord[] = [{ g: 'a', n: 1234.5 }]
  const formatted = (format: NumberFormat | undefined) =>
    computePivot(data, {
      ...base, rows: ['g'], cols: [],
      values: [{ id: 'v', field: 'n', aggregation: 'sum', showAs: 'raw', format }],
    }).cells.get(compositeKey(flattenKey(['a']), ''))!.formatted[0]

  it('applies currency, compact and plain styles', () => {
    expect(formatted({ style: 'currency', decimals: 2 })).toBe('$1,234.50')
    expect(formatted({ style: 'thousands' })).toBe('1.2K')
    expect(formatted({ style: 'plain', decimals: 0 })).toBe('1235')
  })

  it('honours an explicit decimal override', () => {
    expect(formatted({ style: 'auto', decimals: 3 })).toBe('1,234.500')
  })

  it('falls back to the automatic per-column precision', () => {
    expect(formatted(undefined)).toBe('1,234.50')
  })
})

describe('regressions', () => {
  it('top-N ranks raw aggregates, not the derived Show Values As output', () => {
    // Ranking a "rank" kept the two *worst* items, because the discovery pass
    // read values that applyShowAs had already transformed.
    const data: DataRecord[] = [
      { g: 'a', n: 10 }, { g: 'b', n: 50 }, { g: 'c', n: 30 }, { g: 'd', n: 5 },
    ]
    for (const showAs of ['rankLargestToSmallest', 'runningTotalRows', 'pctOfGrandTotal'] as ShowAs[]) {
      const r = computeFilteredPivot(data, {
        ...base, rows: ['g'], cols: [],
        values: [{ id: 'v', field: 'n', aggregation: 'sum', showAs }],
        filters: [{
          field: 'g', excludedValues: new Set<string>(),
          measure: { op: 'top', valueIndex: 0, a: 2 },
        }],
      })
      expect(new Set(r.rowRoot.children.map((c) => c.label))).toEqual(new Set(['b', 'c']))
    }
  })

  it('offers a collapse toggle on expanded column groups at every subtotal setting', () => {
    const data: DataRecord[] = [{ a: 'P', b: 'p1', n: 1 }, { a: 'P', b: 'p2', n: 2 }]
    const r = computePivot(data, { ...base, rows: [], cols: ['a', 'b'], values: V('sum', 'n') })

    for (const subtotals of ['none', 'bottom', 'top'] as const) {
      const slots = flattenCols(r.colRoot, {
        subtotals, collapsed: new Set(), grandTotal: false, numColFields: 2,
      })
      const toggles = buildColHeaderRows(slots).flat().filter((c) => c.collapsible)
      expect(toggles.length).toBeGreaterThan(0)
      // The toggle must target the group itself, not whichever slot came first.
      expect(toggles[0]!.toggleKey).toBe(flattenKey(['P']))
    }
  })

  it('keeps drill-down in step with label and measure filters', () => {
    const data: DataRecord[] = [
      { g: 'Action', n: 1 }, { g: 'Drama', n: 2 }, { g: 'Comedy', n: 40 },
    ]
    const labelled = {
      ...base, rows: ['g'], cols: [], values: V('sum', 'n'),
      filters: [{
        field: 'g', excludedValues: new Set<string>(),
        label: { op: 'equals' as const, text: 'Drama' },
      }],
    }
    expect(findSourceRecords(data, labelled, [], [], 100).total).toBe(
      computeFilteredPivot(data, labelled).matchedRecords
    )

    const ranked = {
      ...base, rows: ['g'], cols: [], values: V('sum', 'n'),
      filters: [{
        field: 'g', excludedValues: new Set<string>(),
        measure: { op: 'top' as const, valueIndex: 0, a: 1 },
      }],
    }
    const result = computeFilteredPivot(data, ranked)
    expect(
      findSourceRecords(data, ranked, [], [], 100, result.axisExclusions).total
    ).toBe(result.matchedRecords)
  })

  it('orders negative and fractional bins numerically', () => {
    const cold: DataRecord[] = [{ t: -55 }, { t: -12 }, { t: 5 }]
    const r = computePivot(cold, {
      ...base, groupings: { t: { kind: 'number', binSize: 10 } },
      rows: [binnedField('t', 10)], cols: [], values: V('count', 't'),
    })
    expect(r.rowRoot.children.map((c) => keyLabel(c.label))).toEqual([
      '-60 – -50', '-20 – -10', '0 – 10',
    ])

    const fine: DataRecord[] = [{ t: 1.1 }, { t: 1.6 }, { t: 2.1 }]
    const f = computePivot(fine, {
      ...base, groupings: { t: { kind: 'number', binSize: 0.5 } },
      rows: [binnedField('t', 0.5)], cols: [], values: V('count', 't'),
    })
    expect(f.rowRoot.children.map((c) => keyLabel(c.label))).toEqual([
      '1 – 1.5', '1.5 – 2', '2 – 2.5',
    ])
  })

  it('flags grouped fields that exceed the listable cardinality', () => {
    const many: DataRecord[] = Array.from({ length: 3000 }, (_, i) => ({ n: i }))
    const derived = derivedFieldInfo(
      analyzeData(many), { n: { kind: 'number', binSize: 1 } }, many
    )
    expect(derived[0]!.highCardinality).toBe(true)
    expect(derived[0]!.uniqueValues).toEqual([])
  })

  it('applies percent scaling under every number format style', () => {
    const data: DataRecord[] = [{ g: 'a', n: 25 }, { g: 'b', n: 75 }]
    const render = (style: NumberFormat['style']) =>
      computePivot(data, {
        ...base, rows: ['g'], cols: [],
        values: [{
          id: 'v', field: 'n', aggregation: 'sum',
          showAs: 'pctOfGrandTotal', format: { style, decimals: 1 },
        }],
      }).cells.get(compositeKey(flattenKey(['a']), ''))!.formatted[0]

    // 25 of 100 is 25%, whatever the style - previously "plain" rendered "0.3".
    expect(render('plain')).toBe('25.0%')
    expect(render('auto')).toBe('25.0%')
  })
})
