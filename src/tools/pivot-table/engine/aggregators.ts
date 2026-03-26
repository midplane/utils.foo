import { Aggregator, AggregatorFactory, AggregationType, DERIVED_AGGREGATIONS } from '../types'

// ─── Count Aggregator ─────────────────────────────────────────────────────────

class CountAggregator implements Aggregator {
  private n = 0

  push(_value: unknown): void {
    this.n++
  }

  value(): number {
    return this.n
  }

  clone(): Aggregator {
    const a = new CountAggregator()
    a.n = this.n
    return a
  }
}

// ─── Count Unique Aggregator ──────────────────────────────────────────────────

class CountUniqueAggregator implements Aggregator {
  private seen = new Set<unknown>()

  push(value: unknown): void {
    this.seen.add(value)
  }

  value(): number {
    return this.seen.size
  }

  clone(): Aggregator {
    const a = new CountUniqueAggregator()
    a.seen = new Set(this.seen)
    return a
  }
}

// ─── Sum Aggregator ───────────────────────────────────────────────────────────

class SumAggregator implements Aggregator {
  private sum = 0
  private hasValue = false

  push(value: unknown): void {
    const n = typeof value === 'number' ? value : parseFloat(String(value))
    if (!isNaN(n) && isFinite(n)) {
      this.sum += n
      this.hasValue = true
    }
  }

  value(): number | null {
    return this.hasValue ? this.sum : null
  }

  clone(): Aggregator {
    const a = new SumAggregator()
    a.sum = this.sum
    a.hasValue = this.hasValue
    return a
  }
}

// ─── Average Aggregator (Welford's online algorithm) ──────────────────────────

class AverageAggregator implements Aggregator {
  private n = 0
  private mean = 0

  push(value: unknown): void {
    const x = typeof value === 'number' ? value : parseFloat(String(value))
    if (!isNaN(x) && isFinite(x)) {
      this.n++
      this.mean += (x - this.mean) / this.n
    }
  }

  value(): number | null {
    return this.n > 0 ? this.mean : null
  }

  clone(): Aggregator {
    const a = new AverageAggregator()
    a.n = this.n
    a.mean = this.mean
    return a
  }
}

// ─── Median Aggregator ────────────────────────────────────────────────────────

class MedianAggregator implements Aggregator {
  private values: number[] = []

  push(value: unknown): void {
    const x = typeof value === 'number' ? value : parseFloat(String(value))
    if (!isNaN(x) && isFinite(x)) {
      this.values.push(x)
    }
  }

  value(): number | null {
    if (this.values.length === 0) return null
    const sorted = [...this.values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1]! + sorted[mid]!) / 2
    }
    return sorted[mid]!
  }

  clone(): Aggregator {
    const a = new MedianAggregator()
    a.values = [...this.values]
    return a
  }
}

// ─── Min Aggregator ───────────────────────────────────────────────────────────

class MinAggregator implements Aggregator {
  private min: number | null = null

  push(value: unknown): void {
    const x = typeof value === 'number' ? value : parseFloat(String(value))
    if (!isNaN(x) && isFinite(x)) {
      this.min = this.min === null ? x : Math.min(this.min, x)
    }
  }

  value(): number | null {
    return this.min
  }

  clone(): Aggregator {
    const a = new MinAggregator()
    a.min = this.min
    return a
  }
}

// ─── Max Aggregator ───────────────────────────────────────────────────────────

class MaxAggregator implements Aggregator {
  private max: number | null = null

  push(value: unknown): void {
    const x = typeof value === 'number' ? value : parseFloat(String(value))
    if (!isNaN(x) && isFinite(x)) {
      this.max = this.max === null ? x : Math.max(this.max, x)
    }
  }

  value(): number | null {
    return this.max
  }

  clone(): Aggregator {
    const a = new MaxAggregator()
    a.max = this.max
    return a
  }
}

// ─── Standard Deviation Aggregator (Welford's algorithm) ──────────────────────

class StdevAggregator implements Aggregator {
  private n = 0
  private mean = 0
  private m2 = 0  // Sum of squares of differences from mean

  push(value: unknown): void {
    const x = typeof value === 'number' ? value : parseFloat(String(value))
    if (!isNaN(x) && isFinite(x)) {
      this.n++
      const delta = x - this.mean
      this.mean += delta / this.n
      const delta2 = x - this.mean
      this.m2 += delta * delta2
    }
  }

  value(): number | null {
    if (this.n < 2) return null
    // Sample standard deviation (n-1 denominator)
    return Math.sqrt(this.m2 / (this.n - 1))
  }

  clone(): Aggregator {
    const a = new StdevAggregator()
    a.n = this.n
    a.mean = this.mean
    a.m2 = this.m2
    return a
  }
}

// ─── Sum Over Sum Aggregator ──────────────────────────────────────────────────

class SumOverSumAggregator implements Aggregator {
  private sum1 = 0
  private sum2 = 0
  private hasValue = false

  push(value: unknown, value2?: unknown): void {
    const n1 = typeof value === 'number' ? value : parseFloat(String(value))
    const n2 = typeof value2 === 'number' ? value2 : parseFloat(String(value2))
    if (!isNaN(n1) && isFinite(n1)) {
      this.sum1 += n1
      this.hasValue = true
    }
    if (!isNaN(n2) && isFinite(n2)) {
      this.sum2 += n2
    }
  }

  value(): number | null {
    if (!this.hasValue || this.sum2 === 0) return null
    return this.sum1 / this.sum2
  }

  clone(): Aggregator {
    const a = new SumOverSumAggregator()
    a.sum1 = this.sum1
    a.sum2 = this.sum2
    a.hasValue = this.hasValue
    return a
  }
}

// ─── Derived Aggregators (% of total/row/col) ─────────────────────────────────
// These use Sum internally but format as percentage after totals are known

class DerivedSumAggregator implements Aggregator {
  private sum = 0
  private hasValue = false

  push(value: unknown): void {
    const n = typeof value === 'number' ? value : parseFloat(String(value))
    if (!isNaN(n) && isFinite(n)) {
      this.sum += n
      this.hasValue = true
    }
  }

  value(): number | null {
    return this.hasValue ? this.sum : null
  }

  clone(): Aggregator {
    const a = new DerivedSumAggregator()
    a.sum = this.sum
    a.hasValue = this.hasValue
    return a
  }
}

class DerivedCountAggregator implements Aggregator {
  private n = 0

  push(_value: unknown): void {
    this.n++
  }

  value(): number {
    return this.n
  }

  clone(): Aggregator {
    const a = new DerivedCountAggregator()
    a.n = this.n
    return a
  }
}

// ─── Factory Map ──────────────────────────────────────────────────────────────

const AGGREGATOR_FACTORIES: Record<AggregationType, AggregatorFactory> = {
  count: () => new CountAggregator(),
  countUnique: () => new CountUniqueAggregator(),
  sum: () => new SumAggregator(),
  average: () => new AverageAggregator(),
  median: () => new MedianAggregator(),
  min: () => new MinAggregator(),
  max: () => new MaxAggregator(),
  stdev: () => new StdevAggregator(),
  sumOverSum: () => new SumOverSumAggregator(),
  // Derived aggregations use sum/count internally
  pctTotal: () => new DerivedSumAggregator(),
  pctRow: () => new DerivedSumAggregator(),
  pctCol: () => new DerivedSumAggregator(),
  countPctTotal: () => new DerivedCountAggregator(),
  countPctRow: () => new DerivedCountAggregator(),
  countPctCol: () => new DerivedCountAggregator(),
}

export function createAggregator(type: AggregationType): Aggregator {
  return AGGREGATOR_FACTORIES[type]()
}

// ─── Number Formatting (US format) ────────────────────────────────────────────

export function formatNumber(
  value: number | null,
  aggregationType: AggregationType
): string {
  if (value === null) return '—'

  // Percentage types
  if (DERIVED_AGGREGATIONS.has(aggregationType)) {
    return (value * 100).toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }) + '%'
  }

  // Ratio type
  if (aggregationType === 'sumOverSum') {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  // Determine decimal places based on aggregation type
  let decimals: number
  switch (aggregationType) {
    case 'count':
    case 'countUnique':
      decimals = 0
      break
    case 'average':
    case 'median':
    case 'stdev':
      decimals = 2
      break
    default:
      // For sum, min, max - use up to 2 decimals only if needed
      decimals = Number.isInteger(value) ? 0 : 2
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

// ─── Percentage Calculation Helper ────────────────────────────────────────────

export function calculatePercentage(
  cellValue: number | null,
  totalValue: number | null
): number | null {
  if (cellValue === null || totalValue === null || totalValue === 0) return null
  return cellValue / totalValue
}
