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

describe('transform — row alignment', () => {
  it('keeps values on their own row when a date row is dropped', () => {
    // The row with no usable date is skipped. Values must still come from the
    // row that owns each date, not from the row at the same position.
    const d = data(['Date', 'V'], [
      { Date: 'not a date', V: 999 },
      { Date: '2024-01-15', V: 1 },
      { Date: '2024-02-15', V: 2 },
      { Date: '2024-03-15', V: 3 },
      { Date: '2024-04-15', V: 4 },
      { Date: '2024-05-15', V: 5 },
    ])
    const summed = transform(d, cfg({ xCol: 'Date', series: ['V'], aggregation: 'sum', dateBin: 'month' }))
    expect(summed.values.get('V')).toEqual([1, 2, 3, 4, 5])

    const raw = transform(d, cfg({ xCol: 'Date', series: ['V'], dateBin: 'month' }))
    expect(raw.values.get('V')).toEqual([1, 2, 3, 4, 5])
  })

  it('keeps values on their own row when a numeric X row is dropped', () => {
    const d = data(['X', 'Y'], [
      { X: 'bad', Y: 999 },
      { X: 1, Y: 10 }, { X: 2, Y: 20 }, { X: 3, Y: 30 }, { X: 4, Y: 40 }, { X: 5, Y: 50 },
    ])
    const r = transform(d, cfg({ xCol: 'X', series: ['Y'], numericX: true }))
    expect(r.categories).toEqual([1, 2, 3, 4, 5])
    expect(r.values.get('Y')).toEqual([10, 20, 30, 40, 50])
  })
})

describe('transform — date-only strings', () => {
  // Under a negative UTC offset, `new Date('2024-03-01')` is the evening of
  // 29 February in local time. Run with TZ=America/Los_Angeles to see it.
  it('buckets a date-only value on its own calendar day', () => {
    const d = data(['Date', 'V'], [
      { Date: '2024-03-01', V: 1 },
      { Date: '2024-03-10', V: 2 },
    ])
    const days = transform(d, cfg({ xCol: 'Date', series: ['V'], aggregation: 'sum', dateBin: 'day' }))
    expect(days.categories).toEqual([new Date(2024, 2, 1).getTime(), new Date(2024, 2, 10).getTime()])

    const months = transform(d, cfg({ xCol: 'Date', series: ['V'], aggregation: 'sum', dateBin: 'month' }))
    expect(months.categories).toEqual([new Date(2024, 2, 1).getTime()])
    expect(months.values.get('V')).toEqual([3])
  })

  it('puts 1 January in the new year and a Monday in its own week', () => {
    const d = data(['Date', 'V'], [
      { Date: '2024-01-01', V: 1 },
      { Date: '2023-12-31', V: 2 },
    ])
    const years = transform(d, cfg({ xCol: 'Date', series: ['V'], aggregation: 'sum', dateBin: 'year' }))
    expect(years.categories).toEqual([new Date(2023, 0, 1).getTime(), new Date(2024, 0, 1).getTime()])
    expect(years.values.get('V')).toEqual([2, 1])

    // 2024-01-01 is a Monday; 2023-12-31 is the Sunday before it.
    const weeks = transform(d, cfg({ xCol: 'Date', series: ['V'], aggregation: 'sum', dateBin: 'week' }))
    expect(weeks.categories).toEqual([new Date(2023, 11, 25).getTime(), new Date(2024, 0, 1).getTime()])
  })

  it('accepts single-digit month and day parts', () => {
    const d = data(['Date', 'V'], [{ Date: '2024-3-1', V: 1 }, { Date: '2024/3/2', V: 2 }])
    const r = transform(d, cfg({ xCol: 'Date', series: ['V'], aggregation: 'sum', dateBin: 'day' }))
    expect(r.categories).toEqual([new Date(2024, 2, 1).getTime(), new Date(2024, 2, 2).getTime()])
  })
})

describe('transform — Other bucket', () => {
  const d = data(['K', 'V'], [
    { K: 'a', V: 100 }, { K: 'a', V: 100 },
    { K: 'b', V: 50 },
    { K: 'c', V: 10 }, { K: 'c', V: 30 },
    { K: 'd', V: 20 },
  ])
  const base = { xCol: 'K', series: ['V'], sort: 'value-desc' as const, topN: 2, groupOther: true }

  it('averages the remaining rows rather than adding up their averages', () => {
    const r = transform(d, cfg({ ...base, aggregation: 'average' }))
    expect(r.categories).toEqual(['a', 'b', OTHER_LABEL])
    // c: 10, 30 and d: 20, so the remainder averages to 20, not 20 + 20.
    expect(r.values.get('V')).toEqual([100, 50, 20])
  })

  it('takes the max of the remaining rows', () => {
    const r = transform(d, cfg({ ...base, aggregation: 'max' }))
    expect(r.values.get('V')).toEqual([100, 50, 30])
  })

  it('still sums for sum and count', () => {
    expect(transform(d, cfg({ ...base, aggregation: 'sum' })).values.get('V')).toEqual([200, 50, 60])
    const counts = transform(d, cfg({ ...base, aggregation: 'count', sort: 'none' }))
    expect(counts.categories).toEqual(['a', 'b', OTHER_LABEL])
    expect(counts.values.get('V')).toEqual([2, 1, 3])
  })

  it('counts distinct values across the remainder once', () => {
    const u = data(['K', 'V'], [
      { K: 'a', V: 1 }, { K: 'a', V: 2 }, { K: 'a', V: 3 },
      { K: 'b', V: 7 },
      { K: 'c', V: 7 },
    ])
    const r = transform(u, cfg({ ...base, topN: 1, aggregation: 'countUnique' }))
    expect(r.values.get('V')).toEqual([3, 1])
  })

  it('adds no Other category to a numeric X axis', () => {
    const n = data(['X', 'Y'], [{ X: 1, Y: 5 }, { X: 2, Y: 4 }, { X: 3, Y: 3 }])
    const r = transform(n, cfg({ xCol: 'X', series: ['Y'], numericX: true, topN: 2, groupOther: true }))
    expect(r.xKind).toBe('value')
    expect(r.categories).toEqual([1, 2])
  })
})

describe('transform — counts and blanks', () => {
  it('count unique ignores blank cells', () => {
    const d = data(['K', 'V'], [
      { K: 'a', V: 1 }, { K: 'a', V: '' }, { K: 'a', V: null }, { K: 'a', V: 1 }, { K: 'a', V: 2 },
    ])
    const r = transform(d, cfg({ xCol: 'K', series: ['V'], aggregation: 'countUnique' }))
    expect(r.values.get('V')).toEqual([2])
  })

  it('a group with only blank cells counts as 0, not as a gap', () => {
    const d = data(['K', 'V'], [{ K: 'a', V: 1 }, { K: 'b', V: '' }])
    expect(transform(d, cfg({ xCol: 'K', series: ['V'], aggregation: 'count' })).values.get('V'))
      .toEqual([1, 0])
    expect(transform(d, cfg({ xCol: 'K', series: ['V'], aggregation: 'countUnique' })).values.get('V'))
      .toEqual([1, 0])
  })

  it('average and median skip blank cells instead of reading them as 0', () => {
    const d = data(['K', 'V'], [{ K: 'a', V: 10 }, { K: 'a', V: '' }, { K: 'a', V: '-' }, { K: 'a', V: 20 }])
    expect(transform(d, cfg({ xCol: 'K', series: ['V'], aggregation: 'average' })).values.get('V')).toEqual([15])
    expect(transform(d, cfg({ xCol: 'K', series: ['V'], aggregation: 'median' })).values.get('V')).toEqual([15])
  })
})

describe('transform — time axis with a value sort', () => {
  it('ranks by value but plots the kept buckets in date order', () => {
    // Lines connect points in data order. A value order on a time axis made
    // the line jump back and forth in time.
    const d = data(['Date', 'V'], [
      { Date: '2024-01-10', V: 5 },
      { Date: '2024-02-10', V: 1 },
      { Date: '2024-03-10', V: 9 },
      { Date: '2024-04-10', V: 7 },
    ])
    const r = transform(d, cfg({
      xCol: 'Date', series: ['V'], aggregation: 'sum', dateBin: 'month', sort: 'value-desc', topN: 3,
    }))
    expect(r.categories).toEqual([
      new Date(2024, 0, 1).getTime(),
      new Date(2024, 2, 1).getTime(),
      new Date(2024, 3, 1).getTime(),
    ])
    expect(r.values.get('V')).toEqual([5, 9, 7])
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
