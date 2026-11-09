import { describe, it, expect } from 'vitest'
import { computePivot } from '../tools/pivot-table/engine/PivotEngine'
import { computeFilteredPivot } from '../tools/pivot-table/engine/filters'
import { analyzeData } from '../tools/pivot-table/hooks/usePivotData'
import { compositeKey, flattenKey, keyLabel, BLANK_KEY } from '../tools/pivot-table/engine/sorters'
import {
  binnedField,
  createFieldResolver,
  datePartField,
  derivedFieldInfo,
  parseDate,
} from '../tools/pivot-table/engine/grouping'
import { flattenCols, flattenRows } from '../tools/pivot-table/engine/axis'
import { parseCsvData } from '../tools/pivot-table/parse'
import { retainValues } from '../tools/pivot-table/configEdits'
import type {
  AggregationType,
  DataRecord,
  PivotConfig,
  ShowAs,
  ValueConfig,
} from '../tools/pivot-table/types'

const V = (aggregation: AggregationType, field: string, showAs: ShowAs = 'raw'): ValueConfig[] => [
  { id: 'v', field, aggregation, showAs },
]
const base = {
  filters: [],
  rowOrder: 'key_asc' as const,
  colOrder: 'key_asc' as const,
  groupings: {},
}

// ─── Dates ────────────────────────────────────────────────────────────────────

describe('date grouping of date-only values', () => {
  const resolve = createFieldResolver({
    d: { kind: 'date', parts: ['year', 'month', 'date', 'dayOfWeek', 'yearQuarter'] },
  })
  const part = (d: string, p: Parameters<typeof datePartField>[1]) =>
    keyLabel(String(resolve({ d }, datePartField('d', p))))

  // Under a negative UTC offset, UTC midnight on 1 January is still 31 December.
  it('keeps the calendar day in every time zone', () => {
    expect(part('2024-01-01', 'year')).toBe('2024')
    expect(part('2024-01-01', 'date')).toBe('2024-01-01')
    expect(part('2024-01-01', 'dayOfWeek')).toBe('Mon')
    expect(part('2024-04-01', 'yearQuarter')).toBe('2024-Q2')
    expect(part('2024-03', 'month')).toBe('Mar')
    expect(part('2024/12/31', 'year')).toBe('2024')
    expect(part('1/1/2024', 'date')).toBe('2024-01-01')
  })

  it('reads a time without a zone as local time', () => {
    const date = parseDate('2024-01-05 10:30')!
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2024, 0, 5, 10])
  })

  it('rejects days that do not exist instead of rolling them over', () => {
    expect(parseDate('2024-02-31')).toBeNull()
    expect(parseDate('2023-02-29')).toBeNull()
    expect(parseDate('2024-13-01')).toBeNull()
    expect(parseDate('02/30/2024')).toBeNull()
    expect(parseDate('2024-02-29')).not.toBeNull()
    expect(part('2024-02-31', 'year')).toBe('(blank)')
  })
})

// ─── Number bins ──────────────────────────────────────────────────────────────

describe('fractional bins', () => {
  it('puts a value on a boundary in the bin that starts there', () => {
    const r = computePivot([{ t: 0.3 }, { t: 0.7 }], {
      ...base,
      groupings: { t: { kind: 'number', binSize: 0.1 } },
      rows: [binnedField('t', 0.1)],
      cols: [],
      values: V('count', 't'),
    })
    expect(r.rowRoot.children.map((c) => keyLabel(c.label))).toEqual(['0.3 – 0.4', '0.7 – 0.8'])
  })
})

// ─── Stale references ─────────────────────────────────────────────────────────

describe('stale metric and column references', () => {
  const data: DataRecord[] = [
    { g: 'C', q: 'Q1', n: 1 },
    { g: 'A', q: 'Q1', n: 2 },
    { g: 'B', q: 'Q1', n: 3 },
  ]

  it('falls back to the row order when the sort column no longer exists', () => {
    const r = computePivot(data, {
      ...base, rows: ['g'], cols: ['q'], values: V('sum', 'n'),
      rowSortBy: { flatKey: flattenKey(['Q9']), valueIndex: 0, descending: true },
    })
    expect(r.rowRoot.children.map((c) => c.label)).toEqual(['A', 'B', 'C'])
  })

  it('falls back to the row order when the sort metric no longer exists', () => {
    const r = computePivot(data, {
      ...base, rows: ['g'], cols: ['q'], values: V('sum', 'n'),
      rowSortBy: { flatKey: flattenKey(['Q1']), valueIndex: 3, descending: true },
    })
    expect(r.rowRoot.children.map((c) => c.label)).toEqual(['A', 'B', 'C'])
  })

  it('ignores a Top N rule whose metric no longer exists', () => {
    const r = computeFilteredPivot(data, {
      ...base, rows: ['g'], cols: [], values: V('sum', 'n'),
      filters: [{ field: 'g', excludedValues: new Set<string>(), measure: { op: 'top', valueIndex: 1, a: 1 } }],
    })
    expect(r.matchedRecords).toBe(3)
  })

  it('moves index references with their metric when a metric is removed', () => {
    const config: PivotConfig = {
      ...base,
      rows: ['g'],
      cols: ['q'],
      values: [
        { id: 'a', field: 'n', aggregation: 'sum', showAs: 'raw' },
        { id: 'b', field: 'n', aggregation: 'count', showAs: 'raw' },
        { id: 'c', field: 'n', aggregation: 'max', showAs: 'raw' },
      ],
      filters: [
        { field: 'g', excludedValues: new Set<string>(), measure: { op: 'top', valueIndex: 2, a: 1 } },
        { field: 'q', excludedValues: new Set<string>(), measure: { op: 'top', valueIndex: 0, a: 1 } },
      ],
      rowSortBy: { flatKey: '', valueIndex: 1, descending: true },
      heatmap: 'none',
      layout: 'compact',
      rowSubtotals: 'none',
      colSubtotals: 'none',
      showRowTotals: true,
      showColTotals: true,
      collapsedRows: [],
      collapsedCols: [],
    }

    const next = retainValues(config, (v) => v.id !== 'a')
    expect(next.values.map((v) => v.id)).toEqual(['b', 'c'])
    expect(next.rowSortBy?.valueIndex).toBe(0)
    expect(next.filters[0]!.measure?.valueIndex).toBe(1)
    // The rule ranked by the removed metric is dropped, not moved to another.
    expect(next.filters[1]!.measure).toBeUndefined()

    const withoutSorted = retainValues(config, (v) => v.id !== 'b')
    expect(withoutSorted.rowSortBy).toBeUndefined()

    expect(retainValues(config, () => true)).toBe(config)
  })
})

// ─── Labels and Show Values As ────────────────────────────────────────────────

describe('subtotal labels', () => {
  it('shows a blank group as (blank) in its subtotal', () => {
    const r = computePivot([{ g: null, s: 'x', n: 1 }], {
      ...base, rows: ['g', 's'], cols: ['g', 's'], values: V('sum', 'n'),
    })
    const lines = flattenRows(r.rowRoot, {
      layout: 'compact', subtotals: 'bottom', collapsed: new Set(), grandTotal: false, numRowFields: 2,
    })
    expect(lines[lines.length - 1]!.label).toBe('(blank) Total')

    const slots = flattenCols(r.colRoot, {
      subtotals: 'bottom', collapsed: new Set(), grandTotal: false, numColFields: 2,
    })
    const subtotal = slots[slots.length - 1]!
    expect(subtotal.headerPath).toEqual([BLANK_KEY, '(blank) Total'])
  })
})

describe('grand total row under ordered calculations', () => {
  const data: DataRecord[] = [{ g: 'A', n: 1 }, { g: 'B', n: 2 }, { g: 'C', n: 3 }]
  const grand = (showAs: ShowAs) =>
    computePivot(data, { ...base, rows: ['g'], cols: [], values: V('sum', 'n', showAs) })
      .cells.get(compositeKey('', ''))!

  it('does not show the raw total as a rank, difference or percentage', () => {
    for (const showAs of [
      'rankLargestToSmallest',
      'rankSmallestToLargest',
      'pctRunningTotalRows',
      'differenceFromPrevRow',
      'pctDifferenceFromPrevRow',
    ] as ShowAs[]) {
      expect(grand(showAs).values[0]).toBeNull()
    }
  })

  it('keeps the total under a plain running total', () => {
    expect(grand('runningTotalRows').values[0]).toBe(6)
  })
})

// ─── Import ───────────────────────────────────────────────────────────────────

describe('CSV import', () => {
  it('keeps ISO timestamps as the text in the file', () => {
    const { records } = parseCsvData('when,n\n2024-01-05T10:00:00Z,1\n')
    expect(records[0]!.when).toBe('2024-01-05T10:00:00Z')
    expect(records[0]!.n).toBe(1)
  })

  it('types numbers and blanks as before', () => {
    const { records, fields } = parseCsvData('a,b,c\n1.5,,x\n-2,3,TRUE\n')
    expect(records).toEqual([
      { a: 1.5, b: null, c: 'x' },
      { a: -2, b: 3, c: 'TRUE' },
    ])
    expect(fields.find((f) => f.name === 'a')!.isNumeric).toBe(true)
  })

  it('keeps an empty first header in TSV', () => {
    const { records, fields } = parseCsvData('\tSales\tProfit\nEast\t10\t2\n')
    expect(fields.map((f) => f.name)).toEqual(['', 'Sales', 'Profit'])
    expect(records[0]).toEqual({ '': 'East', Sales: 10, Profit: 2 })
  })

  it('ignores blank lines at the start and end', () => {
    const { records, warning } = parseCsvData('\n\na,b\n1,2\n\n  \n')
    expect(records).toEqual([{ a: 1, b: 2 }])
    expect(warning).toBe('')
  })
})

describe('listable cardinality', () => {
  it('lists a field with exactly the maximum number of distinct values', () => {
    const records: DataRecord[] = Array.from({ length: 2000 }, (_, i) => ({ k: i % 1000 }))
    const [info] = analyzeData(records)
    expect(info!.highCardinality).toBe(false)
    expect(info!.uniqueValues).toHaveLength(1000)

    const [derived] = derivedFieldInfo(analyzeData(records), { k: { kind: 'number', binSize: 1 } }, records)
    expect(derived!.highCardinality).toBe(false)
    expect(derived!.uniqueValues).toHaveLength(1000)
  })
})
