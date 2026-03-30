import { describe, it, expect, beforeEach } from 'vitest'
import {
  createAggregator,
  registerAggregator,
  getRegisteredPlugins,
  formatNumber,
  calculatePercentage,
  getAllAggregations,
} from '../engine/aggregators'
import type { Aggregator } from '../types'

// ─── CountAggregator ──────────────────────────────────────────────────────────

describe('count aggregator', () => {
  it('counts each push', () => {
    const a = createAggregator('count')
    a.push('x'); a.push(1); a.push(null)
    expect(a.value()).toBe(3)
  })

  it('starts at 0', () => {
    expect(createAggregator('count').value()).toBe(0)
  })

  it('clone is independent', () => {
    const a = createAggregator('count')
    a.push('x')
    const b = a.clone()
    b.push('y')
    expect(a.value()).toBe(1)
    expect(b.value()).toBe(2)
  })
})

// ─── CountUniqueAggregator ────────────────────────────────────────────────────

describe('countUnique aggregator', () => {
  it('counts unique values', () => {
    const a = createAggregator('countUnique')
    a.push('x'); a.push('x'); a.push('y')
    expect(a.value()).toBe(2)
  })

  it('treats null as a distinct value', () => {
    const a = createAggregator('countUnique')
    a.push(null); a.push(null)
    expect(a.value()).toBe(1)
  })

  it('clone is independent', () => {
    const a = createAggregator('countUnique')
    a.push('a')
    const b = a.clone()
    b.push('b')
    expect(a.value()).toBe(1)
    expect(b.value()).toBe(2)
  })
})

// ─── SumAggregator ────────────────────────────────────────────────────────────

describe('sum aggregator', () => {
  it('returns null when no valid values', () => {
    const a = createAggregator('sum')
    expect(a.value()).toBeNull()
  })

  it('ignores non-numeric strings', () => {
    const a = createAggregator('sum')
    a.push('hello'); a.push(null)
    expect(a.value()).toBeNull()
  })

  it('ignores NaN and Infinity', () => {
    const a = createAggregator('sum')
    a.push(NaN); a.push(Infinity)
    expect(a.value()).toBeNull()
  })

  it('sums numbers', () => {
    const a = createAggregator('sum')
    a.push(1); a.push(2); a.push(3)
    expect(a.value()).toBe(6)
  })

  it('sums numeric strings', () => {
    const a = createAggregator('sum')
    a.push('10'); a.push('20')
    expect(a.value()).toBe(30)
  })

  it('clone is independent', () => {
    const a = createAggregator('sum')
    a.push(5)
    const b = a.clone()
    b.push(10)
    expect(a.value()).toBe(5)
    expect(b.value()).toBe(15)
  })
})

// ─── AverageAggregator ────────────────────────────────────────────────────────

describe('average aggregator', () => {
  it('returns null when empty', () => {
    expect(createAggregator('average').value()).toBeNull()
  })

  it('computes mean correctly', () => {
    const a = createAggregator('average')
    a.push(2); a.push(4); a.push(6)
    expect(a.value()).toBe(4)
  })

  it('handles single value', () => {
    const a = createAggregator('average')
    a.push(7)
    expect(a.value()).toBe(7)
  })

  it('ignores non-numeric values', () => {
    const a = createAggregator('average')
    a.push('bad'); a.push(10)
    expect(a.value()).toBe(10)
  })

  it('Welford stability — large values', () => {
    const a = createAggregator('average')
    // These would overflow naive sum+count with large numbers
    a.push(1e15); a.push(1e15 + 2)
    expect(a.value()).toBeCloseTo(1e15 + 1, 5)
  })
})

// ─── MedianAggregator ─────────────────────────────────────────────────────────

describe('median aggregator', () => {
  it('returns null when empty', () => {
    expect(createAggregator('median').value()).toBeNull()
  })

  it('returns the middle value for odd count', () => {
    const a = createAggregator('median')
    a.push(3); a.push(1); a.push(2)
    expect(a.value()).toBe(2)
  })

  it('averages two middle values for even count', () => {
    const a = createAggregator('median')
    a.push(1); a.push(2); a.push(3); a.push(4)
    expect(a.value()).toBe(2.5)
  })

  it('handles single value', () => {
    const a = createAggregator('median')
    a.push(42)
    expect(a.value()).toBe(42)
  })
})

// ─── MinAggregator / MaxAggregator ────────────────────────────────────────────

describe('min aggregator', () => {
  it('returns null when empty', () => {
    expect(createAggregator('min').value()).toBeNull()
  })

  it('returns the minimum', () => {
    const a = createAggregator('min')
    a.push(5); a.push(1); a.push(3)
    expect(a.value()).toBe(1)
  })

  it('handles negative values', () => {
    const a = createAggregator('min')
    a.push(-5); a.push(-10); a.push(0)
    expect(a.value()).toBe(-10)
  })
})

describe('max aggregator', () => {
  it('returns null when empty', () => {
    expect(createAggregator('max').value()).toBeNull()
  })

  it('returns the maximum', () => {
    const a = createAggregator('max')
    a.push(5); a.push(1); a.push(3)
    expect(a.value()).toBe(5)
  })
})

// ─── StdevAggregator ──────────────────────────────────────────────────────────

describe('stdev aggregator', () => {
  it('returns null for 0 values', () => {
    expect(createAggregator('stdev').value()).toBeNull()
  })

  it('returns null for 1 value', () => {
    const a = createAggregator('stdev')
    a.push(5)
    expect(a.value()).toBeNull()
  })

  it('computes sample stdev correctly', () => {
    const a = createAggregator('stdev')
    // Dataset: 2, 4, 4, 4, 5, 5, 7, 9 → sample stdev = sqrt(32/7) ≈ 2.138
    ;[2, 4, 4, 4, 5, 5, 7, 9].forEach((v) => a.push(v))
    expect(a.value()).toBeCloseTo(Math.sqrt(32 / 7), 5)
  })
})

// ─── SumOverSumAggregator ─────────────────────────────────────────────────────

describe('sumOverSum aggregator', () => {
  it('returns null when nothing pushed', () => {
    expect(createAggregator('sumOverSum').value()).toBeNull()
  })

  it('returns null when sum2 is 0', () => {
    const a = createAggregator('sumOverSum')
    a.push(10, 0)
    expect(a.value()).toBeNull()
  })

  it('computes ratio correctly', () => {
    const a = createAggregator('sumOverSum')
    a.push(10, 2); a.push(20, 8)
    // sum1=30, sum2=10 → 30/10 = 3
    expect(a.value()).toBe(3)
  })
})

// ─── Plugin API ───────────────────────────────────────────────────────────────

describe('registerAggregator plugin API', () => {
  beforeEach(() => {
    // Clear any plugins registered in previous test runs
    // (the registry is module-level state, but since tests run
    // in the same process, we use unique names to avoid conflicts)
  })

  it('registers and creates a custom aggregator', () => {
    registerAggregator({
      type: '__test_double__',
      label: 'Double',
      factory: () => {
        let sum = 0
        const agg: Aggregator = {
          push(v: unknown) { sum += Number(v) * 2 },
          value() { return sum },
          clone() {
            const s = sum
            return {
              push(v: unknown) { sum += Number(v) * 2 },
              value() { return s },
              clone() { return agg.clone() },
            }
          },
        }
        return agg
      },
    })

    const a = createAggregator('__test_double__')
    a.push(5)
    expect(a.value()).toBe(10)
  })

  it('throws when trying to override a built-in type', () => {
    expect(() =>
      registerAggregator({ type: 'sum', label: 'Bad', factory: () => createAggregator('count') })
    ).toThrow('[pivot-engine] Cannot override built-in aggregation type: "sum"')
  })

  it('throws createAggregator for completely unknown type', () => {
    expect(() => createAggregator('__nonexistent_xyz__')).toThrow(
      '[pivot-engine] Unknown aggregation type: "__nonexistent_xyz__"'
    )
  })

  it('getRegisteredPlugins returns registered plugin', () => {
    registerAggregator({
      type: '__test_registry_check__',
      label: 'Registry Check',
      factory: () => createAggregator('count'),
    })
    const plugins = getRegisteredPlugins()
    expect(plugins.has('__test_registry_check__')).toBe(true)
  })

  it('getAllAggregations includes built-ins and custom plugins', () => {
    const all = getAllAggregations()
    const types = all.map((a) => a.type)
    expect(types).toContain('sum')
    expect(types).toContain('count')
    expect(types).toContain('__test_double__')
  })
})

// ─── formatNumber ─────────────────────────────────────────────────────────────

describe('formatNumber', () => {
  it('returns — for null', () => {
    expect(formatNumber(null, 'sum')).toBe('—')
  })

  it('formats count/countUnique as integer', () => {
    expect(formatNumber(42, 'count')).toBe('42')
    expect(formatNumber(42, 'countUnique')).toBe('42')
  })

  it('formats average/median/stdev with 2 decimals', () => {
    expect(formatNumber(3.14159, 'average')).toBe('3.14')
    expect(formatNumber(3.14159, 'median')).toBe('3.14')
    expect(formatNumber(3.14159, 'stdev')).toBe('3.14')
  })

  it('formats sum/min/max as integer when whole', () => {
    expect(formatNumber(100, 'sum')).toBe('100')
    expect(formatNumber(100, 'min')).toBe('100')
    expect(formatNumber(100, 'max')).toBe('100')
  })

  it('formats sum/min/max with 2 decimals when fractional', () => {
    expect(formatNumber(3.5, 'sum')).toBe('3.50')
  })

  it('formats sumOverSum with 2 decimals', () => {
    expect(formatNumber(1.5, 'sumOverSum')).toBe('1.50')
  })

  it('formats pct types as percentage', () => {
    expect(formatNumber(0.5, 'pctTotal')).toBe('50.0%')
    expect(formatNumber(1.0, 'pctRow')).toBe('100.0%')
    expect(formatNumber(0.333, 'pctCol')).toBe('33.3%')
  })

  it('uses custom plugin formatter when registered', () => {
    registerAggregator({
      type: '__test_fmt__',
      label: 'Fmt',
      factory: () => createAggregator('count'),
      format: (v) => v === null ? 'null' : `$${v.toFixed(0)}`,
    })
    expect(formatNumber(42, '__test_fmt__')).toBe('$42')
    expect(formatNumber(null, '__test_fmt__')).toBe('null')
  })
})

// ─── calculatePercentage ──────────────────────────────────────────────────────

describe('calculatePercentage', () => {
  it('returns cellValue / totalValue', () => {
    expect(calculatePercentage(25, 100)).toBe(0.25)
  })

  it('returns null when totalValue is 0', () => {
    expect(calculatePercentage(5, 0)).toBeNull()
  })

  it('returns null when cellValue is null', () => {
    expect(calculatePercentage(null, 100)).toBeNull()
  })

  it('returns null when totalValue is null', () => {
    expect(calculatePercentage(50, null)).toBeNull()
  })
})
