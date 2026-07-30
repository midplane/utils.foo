import { describe, it, expect } from 'vitest'
import {
  transform,
  applyFilters,
  bucketDate,
  isDateColumn,
  DEFAULT_TRANSFORM,
  OTHER_LABEL,
  type TransformConfig,
} from '../tools/chart-builder/transform'
import type { ParsedData } from '../tools/chart-builder/chartData'
import type { DataRecord } from '../tools/pivot-table/types'

const data = (columns: string[], rows: DataRecord[]): ParsedData =>
  ({ columns, rows: rows as ParsedData['rows'] })

const cfg = (over: Partial<TransformConfig>): TransformConfig => ({
  ...DEFAULT_TRANSFORM,
  ...over,
})

// Transaction-shaped data: repeated categories, the case the old tool could not handle.
const sales = data(['Region', 'Amount', 'Units'], [
  { Region: 'East', Amount: 100, Units: 1 },
  { Region: 'West', Amount: 200, Units: 2 },
  { Region: 'East', Amount: 300, Units: 3 },
  { Region: 'North', Amount: 50, Units: 4 },
  { Region: 'West', Amount: 400, Units: 5 },
])

describe('transform — aggregation', () => {
  it('without aggregation keeps one point per row, repeats and all', () => {
    const r = transform(sales, cfg({ xCol: 'Region', series: ['Amount'] }))
    expect(r.categories).toEqual(['East', 'West', 'East', 'North', 'West'])
    expect(r.values.get('Amount')).toEqual([100, 200, 300, 50, 400])
    expect(r.aggregated).toBe(false)
  })

  it('sum groups repeated categories', () => {
    const r = transform(sales, cfg({ xCol: 'Region', series: ['Amount'], aggregation: 'sum' }))
    expect(r.categories).toEqual(['East', 'West', 'North'])
    expect(r.values.get('Amount')).toEqual([400, 600, 50])
    expect(r.aggregated).toBe(true)
  })

  it('average, min and max', () => {
    const base = { xCol: 'Region', series: ['Amount'] }
    expect(transform(sales, cfg({ ...base, aggregation: 'average' })).values.get('Amount'))
      .toEqual([200, 300, 50])
    expect(transform(sales, cfg({ ...base, aggregation: 'min' })).values.get('Amount'))
      .toEqual([100, 200, 50])
    expect(transform(sales, cfg({ ...base, aggregation: 'max' })).values.get('Amount'))
      .toEqual([300, 400, 50])
  })

  it('count counts rows per group, not values', () => {
    const r = transform(sales, cfg({ xCol: 'Region', series: ['Amount'], aggregation: 'count' }))
    expect(r.values.get('Amount')).toEqual([2, 2, 1])
  })

  it('aggregates each series independently', () => {
    const r = transform(sales, cfg({ xCol: 'Region', series: ['Amount', 'Units'], aggregation: 'sum' }))
    expect(r.values.get('Amount')).toEqual([400, 600, 50])
    expect(r.values.get('Units')).toEqual([4, 7, 4])
  })

  it('a group with no numeric values yields null, not zero', () => {
    const d = data(['K', 'V'], [{ K: 'a', V: 'n/a' }, { K: 'b', V: 5 }])
    const r = transform(d, cfg({ xCol: 'K', series: ['V'], aggregation: 'sum' }))
    expect(r.values.get('V')).toEqual([null, 5])
  })

  it('coerces currency and percent noise before aggregating', () => {
    const d = data(['K', 'V'], [
      { K: 'a', V: '$1,200' }, { K: 'a', V: '(300)' }, { K: 'b', V: '45%' },
    ])
    const r = transform(d, cfg({ xCol: 'K', series: ['V'], aggregation: 'sum' }))
    expect(r.values.get('V')).toEqual([900, 45])
  })
})

describe('transform — sorting', () => {
  const base = { xCol: 'Region', series: ['Amount'], aggregation: 'sum' as const }

  it('value descending', () => {
    const r = transform(sales, cfg({ ...base, sort: 'value-desc' }))
    expect(r.categories).toEqual(['West', 'East', 'North'])
    expect(r.values.get('Amount')).toEqual([600, 400, 50])
  })

  it('value ascending', () => {
    const r = transform(sales, cfg({ ...base, sort: 'value-asc' }))
    expect(r.categories).toEqual(['North', 'East', 'West'])
  })

  it('x ascending and descending', () => {
    expect(transform(sales, cfg({ ...base, sort: 'x-asc' })).categories)
      .toEqual(['East', 'North', 'West'])
    expect(transform(sales, cfg({ ...base, sort: 'x-desc' })).categories)
      .toEqual(['West', 'North', 'East'])
  })

  it('sorts by the nominated series, not always the first', () => {
    const d = data(['K', 'A', 'B'], [
      { K: 'x', A: 1, B: 30 }, { K: 'y', A: 2, B: 20 }, { K: 'z', A: 3, B: 10 },
    ])
    const r = transform(d, cfg({
      xCol: 'K', series: ['A', 'B'], aggregation: 'sum', sort: 'value-desc', sortBy: 'B',
    }))
    expect(r.categories).toEqual(['x', 'y', 'z'])
  })

  it('nulls sort last in both directions', () => {
    const d = data(['K', 'V'], [{ K: 'a', V: 5 }, { K: 'b', V: '' }, { K: 'c', V: 9 }])
    expect(transform(d, cfg({ xCol: 'K', series: ['V'], aggregation: 'sum', sort: 'value-desc' })).categories)
      .toEqual(['c', 'a', 'b'])
    expect(transform(d, cfg({ xCol: 'K', series: ['V'], aggregation: 'sum', sort: 'value-asc' })).categories)
      .toEqual(['a', 'c', 'b'])
  })
})

describe('transform — top N', () => {
  const base = { xCol: 'Region', series: ['Amount'], aggregation: 'sum' as const, sort: 'value-desc' as const }

  it('keeps only the top N', () => {
    const r = transform(sales, cfg({ ...base, topN: 2 }))
    expect(r.categories).toEqual(['West', 'East'])
    expect(r.truncated).toBe(true)
    expect(r.totalCategories).toBe(3)
  })

  it('rolls the remainder into Other when asked', () => {
    const r = transform(sales, cfg({ ...base, topN: 2, groupOther: true }))
    expect(r.categories).toEqual(['West', 'East', OTHER_LABEL])
    expect(r.values.get('Amount')).toEqual([600, 400, 50])
  })

  it('topN of 0 keeps everything', () => {
    const r = transform(sales, cfg({ ...base, topN: 0 }))
    expect(r.categories).toHaveLength(3)
    expect(r.truncated).toBe(false)
  })
})

describe('transform — filters', () => {
  it('numeric comparison', () => {
    const r = transform(sales, cfg({
      xCol: 'Region', series: ['Amount'], aggregation: 'sum',
      filters: [{ id: '1', column: 'Amount', op: 'gt', value: '150' }],
    }))
    expect(r.categories).toEqual(['West', 'East'])
    expect(r.values.get('Amount')).toEqual([600, 300])
  })

  it('contains is case-insensitive', () => {
    const rows = applyFilters(sales.rows as DataRecord[], [
      { id: '1', column: 'Region', op: 'contains', value: 'ea' },
    ])
    expect(rows).toHaveLength(2)
  })

  it('rules combine with AND', () => {
    const rows = applyFilters(sales.rows as DataRecord[], [
      { id: '1', column: 'Region', op: 'eq', value: 'West' },
      { id: '2', column: 'Amount', op: 'gte', value: '300' },
    ])
    expect(rows).toHaveLength(1)
  })

  it('an incomplete rule is ignored rather than matching nothing', () => {
    const rows = applyFilters(sales.rows as DataRecord[], [
      { id: '1', column: 'Region', op: 'eq', value: '   ' },
    ])
    expect(rows).toHaveLength(5)
  })

  it('unary operators ignore the value box', () => {
    const d: DataRecord[] = [{ K: 'a' }, { K: '' }, { K: 'c' }]
    expect(applyFilters(d, [{ id: '1', column: 'K', op: 'nonEmpty', value: '' }])).toHaveLength(2)
    expect(applyFilters(d, [{ id: '1', column: 'K', op: 'isEmpty', value: '' }])).toHaveLength(1)
  })
})

describe('transform — dates', () => {
  const ts = data(['Date', 'V'], [
    { Date: '2024-01-05', V: 1 },
    { Date: '2024-01-20', V: 2 },
    { Date: '2024-02-03', V: 4 },
    { Date: '2024-02-27', V: 8 },
  ])

  it('detects a date column', () => {
    expect(isDateColumn('Date', ts.rows as DataRecord[])).toBe(true)
    expect(isDateColumn('V', ts.rows as DataRecord[])).toBe(false)
  })

  it('buckets by month and emits epoch millis on a time axis', () => {
    const r = transform(ts, cfg({ xCol: 'Date', series: ['V'], aggregation: 'sum', dateBin: 'month' }))
    expect(r.xKind).toBe('time')
    expect(r.categories).toEqual([
      new Date(2024, 0, 1).getTime(),
      new Date(2024, 1, 1).getTime(),
    ])
    expect(r.values.get('V')).toEqual([3, 12])
  })

  it('year bucketing collapses the whole range', () => {
    const r = transform(ts, cfg({ xCol: 'Date', series: ['V'], aggregation: 'sum', dateBin: 'year' }))
    expect(r.categories).toEqual([new Date(2024, 0, 1).getTime()])
    expect(r.values.get('V')).toEqual([15])
  })

  it('a time axis is always chronological even without an explicit sort', () => {
    const shuffled = data(['Date', 'V'], [
      { Date: '2024-03-01', V: 3 },
      { Date: '2024-01-01', V: 1 },
      { Date: '2024-02-01', V: 2 },
    ])
    const r = transform(shuffled, cfg({ xCol: 'Date', series: ['V'], aggregation: 'sum', dateBin: 'month' }))
    expect(r.values.get('V')).toEqual([1, 2, 3])
  })

  it('dateBin none leaves the column as ordinary categories', () => {
    const r = transform(ts, cfg({ xCol: 'Date', series: ['V'], aggregation: 'sum', dateBin: 'none' }))
    expect(r.xKind).toBe('category')
    expect(r.categories).toEqual(['2024-01-05', '2024-01-20', '2024-02-03', '2024-02-27'])
  })

  it('weeks start on Monday', () => {
    const wednesday = new Date(2024, 0, 3)
    expect(bucketDate(wednesday, 'week')).toBe(new Date(2024, 0, 1).getTime())
    const sunday = new Date(2024, 0, 7)
    expect(bucketDate(sunday, 'week')).toBe(new Date(2024, 0, 1).getTime())
  })

  it('quarters snap to Jan/Apr/Jul/Oct', () => {
    expect(bucketDate(new Date(2024, 4, 15), 'quarter')).toBe(new Date(2024, 3, 1).getTime())
    expect(bucketDate(new Date(2024, 11, 31), 'quarter')).toBe(new Date(2024, 9, 1).getTime())
  })
})

describe('transform — guards', () => {
  it('no series yields the empty result', () => {
    expect(transform(sales, cfg({ xCol: 'Region', series: [] })).categories).toEqual([])
  })

  it('filters excluding everything yield no categories', () => {
    const r = transform(sales, cfg({
      xCol: 'Region', series: ['Amount'],
      filters: [{ id: '1', column: 'Region', op: 'eq', value: 'Nowhere' }],
    }))
    expect(r.categories).toEqual([])
    expect(r.filteredRows).toBe(0)
  })
})
