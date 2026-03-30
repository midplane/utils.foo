import { describe, it, expect } from 'vitest'
import { PivotEngine, getHeatmapColor } from '../engine/PivotEngine'
import { flattenKey, compositeKey } from '../engine/sorters'
import type { PivotConfig, DataRecord } from '../types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const RECORDS: DataRecord[] = [
  { region: 'North', product: 'A', sales: 100, units: 10 },
  { region: 'North', product: 'B', sales: 200, units: 20 },
  { region: 'South', product: 'A', sales: 150, units: 15 },
  { region: 'South', product: 'B', sales: 300, units: 30 },
]

const BASE_CONFIG: PivotConfig = {
  rows: ['region'],
  cols: ['product'],
  values: [{ field: 'sales', aggregation: 'sum' }],
  filters: [],
  rowOrder: 'key_asc',
  colOrder: 'key_asc',
  heatmap: 'none',
  showRowTotals: true,
  showColTotals: true,
  showGrandTotal: true,
}

function getCell(
  result: ReturnType<PivotEngine['getResult']>,
  rowKey: string[],
  colKey: string[]
): number | null {
  const key = compositeKey(flattenKey(rowKey), flattenKey(colKey))
  return result.cells.get(key)?.values[0] ?? null
}

// ─── Basic 2D Pivot ───────────────────────────────────────────────────────────

describe('PivotEngine — basic 2D pivot', () => {
  const engine = new PivotEngine(RECORDS, BASE_CONFIG)
  const result = engine.getResult()

  it('produces correct rowKeys (sorted ascending)', () => {
    expect(result.rowKeys).toEqual([['North'], ['South']])
  })

  it('produces correct colKeys (sorted ascending)', () => {
    expect(result.colKeys).toEqual([['A'], ['B']])
  })

  it('computes correct cell values', () => {
    expect(getCell(result, ['North'], ['A'])).toBe(100)
    expect(getCell(result, ['North'], ['B'])).toBe(200)
    expect(getCell(result, ['South'], ['A'])).toBe(150)
    expect(getCell(result, ['South'], ['B'])).toBe(300)
  })

  it('computes correct row totals', () => {
    expect(result.rowTotals.get(flattenKey(['North']))?.values[0]).toBe(300)
    expect(result.rowTotals.get(flattenKey(['South']))?.values[0]).toBe(450)
  })

  it('computes correct column totals', () => {
    expect(result.colTotals.get(flattenKey(['A']))?.values[0]).toBe(250)
    expect(result.colTotals.get(flattenKey(['B']))?.values[0]).toBe(500)
  })

  it('computes correct grand total', () => {
    expect(result.grandTotal.values[0]).toBe(750)
  })

  it('isEmpty is false', () => {
    expect(result.isEmpty).toBe(false)
  })
})

// ─── Rows Only ────────────────────────────────────────────────────────────────

describe('PivotEngine — rows only (no cols)', () => {
  const config: PivotConfig = { ...BASE_CONFIG, cols: [] }
  const result = new PivotEngine(RECORDS, config).getResult()

  it('has no colKeys', () => {
    expect(result.colKeys).toEqual([])
  })

  it('has rowTotals populated', () => {
    expect(result.rowTotals.get(flattenKey(['North']))?.values[0]).toBe(300)
  })

  it('cells map is empty', () => {
    expect(result.cells.size).toBe(0)
  })
})

// ─── Cols Only ────────────────────────────────────────────────────────────────

describe('PivotEngine — cols only (no rows)', () => {
  const config: PivotConfig = { ...BASE_CONFIG, rows: [] }
  const result = new PivotEngine(RECORDS, config).getResult()

  it('has no rowKeys', () => {
    expect(result.rowKeys).toEqual([])
  })

  it('has colTotals populated', () => {
    expect(result.colTotals.get(flattenKey(['A']))?.values[0]).toBe(250)
  })

  it('cells map is empty', () => {
    expect(result.cells.size).toBe(0)
  })
})

// ─── Empty Records ────────────────────────────────────────────────────────────

describe('PivotEngine — empty records', () => {
  const result = new PivotEngine([], BASE_CONFIG).getResult()

  it('isEmpty is true', () => {
    expect(result.isEmpty).toBe(true)
  })

  it('has no rowKeys or colKeys', () => {
    expect(result.rowKeys).toEqual([])
    expect(result.colKeys).toEqual([])
  })
})

// ─── Multiple Values ──────────────────────────────────────────────────────────

describe('PivotEngine — multiple value configs', () => {
  const config: PivotConfig = {
    ...BASE_CONFIG,
    values: [
      { field: 'sales', aggregation: 'sum' },
      { field: 'units', aggregation: 'sum' },
    ],
  }
  const result = new PivotEngine(RECORDS, config).getResult()

  it('produces two values per cell', () => {
    const cell = result.cells.get(compositeKey(flattenKey(['North']), flattenKey(['A'])))
    expect(cell?.values).toHaveLength(2)
    expect(cell?.values[0]).toBe(100)
    expect(cell?.values[1]).toBe(10)
  })

  it('grand total has two values', () => {
    expect(result.grandTotal.values[0]).toBe(750)
    expect(result.grandTotal.values[1]).toBe(75)
  })
})

// ─── Filters ──────────────────────────────────────────────────────────────────

describe('PivotEngine — filters', () => {
  const config: PivotConfig = {
    ...BASE_CONFIG,
    filters: [{ field: 'region', excludedValues: new Set(['South']) }],
  }
  const result = new PivotEngine(RECORDS, config).getResult()

  it('excludes South rows', () => {
    expect(result.rowKeys).toEqual([['North']])
  })

  it('adjusts grand total', () => {
    expect(result.grandTotal.values[0]).toBe(300) // only North
  })

  it('excludes South cells', () => {
    expect(getCell(result, ['South'], ['A'])).toBeNull()
  })
})

// ─── Sort Orders ──────────────────────────────────────────────────────────────

describe('PivotEngine — sort orders', () => {
  it('key_desc sorts rows Z→A', () => {
    const config: PivotConfig = { ...BASE_CONFIG, rowOrder: 'key_desc' }
    const result = new PivotEngine(RECORDS, config).getResult()
    expect(result.rowKeys[0]).toEqual(['South'])
    expect(result.rowKeys[1]).toEqual(['North'])
  })

  it('value_desc sorts rows by descending total', () => {
    const config: PivotConfig = { ...BASE_CONFIG, rowOrder: 'value_desc' }
    const result = new PivotEngine(RECORDS, config).getResult()
    // South total=450, North total=300 → South first when descending
    expect(result.rowKeys[0]).toEqual(['South'])
  })

  it('value_asc sorts rows by ascending total', () => {
    const config: PivotConfig = { ...BASE_CONFIG, rowOrder: 'value_asc' }
    const result = new PivotEngine(RECORDS, config).getResult()
    expect(result.rowKeys[0]).toEqual(['North'])
  })
})

// ─── Derived Aggregations (pct) ───────────────────────────────────────────────

describe('PivotEngine — pctTotal', () => {
  const config: PivotConfig = {
    ...BASE_CONFIG,
    values: [{ field: 'sales', aggregation: 'pctTotal' }],
  }
  const result = new PivotEngine(RECORDS, config).getResult()

  it('cell values are fractions summing to 1', () => {
    const sum = Array.from(result.cells.values())
      .reduce((acc, cell) => acc + (cell.values[0] ?? 0), 0)
    expect(sum).toBeCloseTo(1.0, 5)
  })

  it('grand total shows 1.0 (100%)', () => {
    expect(result.grandTotal.values[0]).toBeCloseTo(1.0, 5)
  })

  it('cells are formatted as percentages', () => {
    // North/A = 100/750
    const cell = result.cells.get(compositeKey(flattenKey(['North']), flattenKey(['A'])))
    expect(cell?.formatted[0]).toMatch(/%$/)
  })
})

describe('PivotEngine — pctRow', () => {
  const config: PivotConfig = {
    ...BASE_CONFIG,
    values: [{ field: 'sales', aggregation: 'pctRow' }],
  }
  const result = new PivotEngine(RECORDS, config).getResult()

  it('each row sums to 1.0', () => {
    for (const rowKey of result.rowKeys) {
      const rowSum = result.colKeys.reduce((acc, colKey) => {
        const cell = result.cells.get(compositeKey(flattenKey(rowKey), flattenKey(colKey)))
        return acc + (cell?.values[0] ?? 0)
      }, 0)
      expect(rowSum).toBeCloseTo(1.0, 5)
    }
  })

  it('row total shows 1.0', () => {
    for (const rowKey of result.rowKeys) {
      const rowTotal = result.rowTotals.get(flattenKey(rowKey))
      expect(rowTotal?.values[0]).toBeCloseTo(1.0, 5)
    }
  })
})

describe('PivotEngine — pctCol', () => {
  const config: PivotConfig = {
    ...BASE_CONFIG,
    values: [{ field: 'sales', aggregation: 'pctCol' }],
  }
  const result = new PivotEngine(RECORDS, config).getResult()

  it('each column sums to 1.0', () => {
    for (const colKey of result.colKeys) {
      const colSum = result.rowKeys.reduce((acc, rowKey) => {
        const cell = result.cells.get(compositeKey(flattenKey(rowKey), flattenKey(colKey)))
        return acc + (cell?.values[0] ?? 0)
      }, 0)
      expect(colSum).toBeCloseTo(1.0, 5)
    }
  })
})

// ─── Heatmap Utilities ────────────────────────────────────────────────────────

describe('PivotEngine.getValueRange', () => {
  const result = new PivotEngine(RECORDS, BASE_CONFIG).getResult()

  it('returns correct min and max across all cells', () => {
    const range = PivotEngine.getValueRange(result, 0)
    expect(range?.min).toBe(100)
    expect(range?.max).toBe(300)
  })
})

describe('PivotEngine.getRowValueRange', () => {
  const result = new PivotEngine(RECORDS, BASE_CONFIG).getResult()

  it('returns correct range within a row', () => {
    const range = PivotEngine.getRowValueRange(result, ['North'], result.colKeys, 0)
    expect(range?.min).toBe(100)
    expect(range?.max).toBe(200)
  })
})

describe('PivotEngine.getColValueRange', () => {
  const result = new PivotEngine(RECORDS, BASE_CONFIG).getResult()

  it('returns correct range within a column', () => {
    const range = PivotEngine.getColValueRange(result, ['A'], result.rowKeys, 0)
    expect(range?.min).toBe(100)
    expect(range?.max).toBe(150)
  })
})

// ─── getHeatmapColor ──────────────────────────────────────────────────────────

describe('getHeatmapColor', () => {
  it('returns undefined for null value', () => {
    expect(getHeatmapColor(null, { min: 0, max: 100 })).toBeUndefined()
  })

  it('returns undefined for null range', () => {
    expect(getHeatmapColor(50, null)).toBeUndefined()
  })

  it('returns single-value color when min === max', () => {
    expect(getHeatmapColor(5, { min: 5, max: 5 })).toBe('rgba(59, 130, 246, 0.3)')
  })

  it('returns low alpha for minimum value', () => {
    const color = getHeatmapColor(0, { min: 0, max: 100 })
    expect(color).toBe('rgba(59, 130, 246, 0.10)')
  })

  it('returns high alpha for maximum value', () => {
    const color = getHeatmapColor(100, { min: 0, max: 100 })
    expect(color).toBe('rgba(59, 130, 246, 0.60)')
  })
})
