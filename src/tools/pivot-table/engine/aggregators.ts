import {
  Aggregator,
  AggregatorFactory,
  AggregationType,
  ShowAs,
  PERCENT_SHOW_AS,
  INTEGER_SHOW_AS,
  NumberFormat,
} from '../types'
import { normalizeKey } from './sorters'

/** Rendered in place of a value that cannot be computed. */
export const NO_VALUE = '—'

// ─── Numeric Coercion ─────────────────────────────────────────────────────────

/** Coerce a raw record value to a finite number, or NaN if it isn't one. */
function toNumber(value: unknown): number {
  if (typeof value === 'number') return isFinite(value) ? value : NaN
  if (value === null || value === undefined || value === '') return NaN
  const n = parseFloat(String(value))
  return isFinite(n) ? n : NaN
}

// ─── Count Aggregator ─────────────────────────────────────────────────────────

class CountAggregator implements Aggregator {
  private n = 0

  push(): void {
    this.n++
  }

  value(): number {
    return this.n
  }
}

// ─── Count Unique Aggregator ──────────────────────────────────────────────────

class CountUniqueAggregator implements Aggregator {
  private seen = new Set<string>()

  push(value: unknown): void {
    // Normalise so that 1 and "1" (dynamicTyping produces both in mixed
    // columns) count as the same value, consistent with grouping keys.
    this.seen.add(normalizeKey(value))
  }

  value(): number {
    return this.seen.size
  }
}

// ─── Sum Aggregator ───────────────────────────────────────────────────────────

class SumAggregator implements Aggregator {
  private sum = 0
  private hasValue = false

  push(value: unknown): void {
    const n = toNumber(value)
    if (!isNaN(n)) {
      this.sum += n
      this.hasValue = true
    }
  }

  value(): number | null {
    return this.hasValue ? this.sum : null
  }
}

// ─── Average Aggregator (Welford's online algorithm) ──────────────────────────

class AverageAggregator implements Aggregator {
  private n = 0
  private mean = 0

  push(value: unknown): void {
    const x = toNumber(value)
    if (!isNaN(x)) {
      this.n++
      this.mean += (x - this.mean) / this.n
    }
  }

  value(): number | null {
    return this.n > 0 ? this.mean : null
  }
}

// ─── Median Aggregator ────────────────────────────────────────────────────────

class MedianAggregator implements Aggregator {
  private values: number[] = []
  private cached: number | null = null
  private sorted = false

  push(value: unknown): void {
    const x = toNumber(value)
    if (!isNaN(x)) {
      this.values.push(x)
      this.sorted = false
    }
  }

  value(): number | null {
    if (this.values.length === 0) return null
    if (this.sorted) return this.cached

    // Sort in place - the raw order is never needed again.
    this.values.sort((a, b) => a - b)
    this.sorted = true

    const mid = Math.floor(this.values.length / 2)
    this.cached =
      this.values.length % 2 === 0
        ? (this.values[mid - 1]! + this.values[mid]!) / 2
        : this.values[mid]!

    return this.cached
  }
}

// ─── Min Aggregator ───────────────────────────────────────────────────────────

class MinAggregator implements Aggregator {
  private min: number | null = null

  push(value: unknown): void {
    const x = toNumber(value)
    if (!isNaN(x)) {
      this.min = this.min === null ? x : Math.min(this.min, x)
    }
  }

  value(): number | null {
    return this.min
  }
}

// ─── Max Aggregator ───────────────────────────────────────────────────────────

class MaxAggregator implements Aggregator {
  private max: number | null = null

  push(value: unknown): void {
    const x = toNumber(value)
    if (!isNaN(x)) {
      this.max = this.max === null ? x : Math.max(this.max, x)
    }
  }

  value(): number | null {
    return this.max
  }
}

// ─── Count Numbers Aggregator ─────────────────────────────────────────────────

class CountNumbersAggregator implements Aggregator {
  private n = 0

  push(value: unknown): void {
    if (!isNaN(toNumber(value))) this.n++
  }

  value(): number {
    return this.n
  }
}

// ─── Product Aggregator ───────────────────────────────────────────────────────

class ProductAggregator implements Aggregator {
  private product = 1
  private hasValue = false

  push(value: unknown): void {
    const n = toNumber(value)
    if (!isNaN(n)) {
      this.product *= n
      this.hasValue = true
    }
  }

  value(): number | null {
    return this.hasValue ? this.product : null
  }
}

// ─── Standard Deviation / Variance (Welford's algorithm) ──────────────────────

class MomentAggregator implements Aggregator {
  private n = 0
  private mean = 0
  private m2 = 0 // Sum of squares of differences from the running mean

  constructor(
    private population: boolean,
    private squareRoot: boolean
  ) {}

  push(value: unknown): void {
    const x = toNumber(value)
    if (!isNaN(x)) {
      this.n++
      const delta = x - this.mean
      this.mean += delta / this.n
      this.m2 += delta * (x - this.mean)
    }
  }

  value(): number | null {
    // A sample statistic needs at least two observations; a population one
    // is defined for a single value.
    const divisor = this.population ? this.n : this.n - 1
    if (divisor <= 0) return null
    const variance = this.m2 / divisor
    return this.squareRoot ? Math.sqrt(variance) : variance
  }
}

// ─── Sum Over Sum Aggregator ──────────────────────────────────────────────────

class SumOverSumAggregator implements Aggregator {
  private sum1 = 0
  private sum2 = 0
  private hasValue = false

  push(value: unknown, value2?: unknown): void {
    const n1 = toNumber(value)
    const n2 = toNumber(value2)
    if (!isNaN(n1)) {
      this.sum1 += n1
      this.hasValue = true
    }
    if (!isNaN(n2)) {
      this.sum2 += n2
    }
  }

  value(): number | null {
    if (!this.hasValue || this.sum2 === 0) return null
    return this.sum1 / this.sum2
  }
}

// ─── Factory Map ──────────────────────────────────────────────────────────────

const AGGREGATOR_FACTORIES: Record<AggregationType, AggregatorFactory> = {
  count: () => new CountAggregator(),
  countNumbers: () => new CountNumbersAggregator(),
  countUnique: () => new CountUniqueAggregator(),
  sum: () => new SumAggregator(),
  average: () => new AverageAggregator(),
  median: () => new MedianAggregator(),
  min: () => new MinAggregator(),
  max: () => new MaxAggregator(),
  product: () => new ProductAggregator(),
  stdev: () => new MomentAggregator(false, true),
  stdevp: () => new MomentAggregator(true, true),
  variance: () => new MomentAggregator(false, false),
  variancep: () => new MomentAggregator(true, false),
  sumOverSum: () => new SumOverSumAggregator(),
}

export function createAggregator(type: AggregationType): Aggregator {
  return AGGREGATOR_FACTORIES[type]()
}

// ─── Number Formatting (US format) ────────────────────────────────────────────

/**
 * Decide how many decimal places a whole column should use.
 *
 * Deciding per-cell (as opposed to per-column) produces ragged output like
 * `1,006` next to `8.50`, which breaks `tabular-nums` alignment.
 */
export function resolveDecimals(
  aggregationType: AggregationType,
  showAs: ShowAs,
  values: readonly (number | null)[]
): number {
  if (PERCENT_SHOW_AS.has(showAs)) return 1
  if (INTEGER_SHOW_AS.has(showAs)) return 0
  if (showAs === 'index') return 2

  if (aggregationType === 'sumOverSum') return 2

  switch (aggregationType) {
    case 'count':
    case 'countNumbers':
    case 'countUnique':
      // A running total or difference of counts is still a whole number.
      return 0
    case 'average':
    case 'median':
    case 'stdev':
    case 'stdevp':
    case 'variance':
    case 'variancep':
      return 2
    default: {
      // sum / min / max / product: only show decimals if a value needs them.
      for (const v of values) {
        if (v !== null && !Number.isInteger(v)) return 2
      }
      return 0
    }
  }
}

export function formatNumber(
  value: number | null,
  showAs: ShowAs,
  decimals: number,
  format?: NumberFormat
): string {
  if (value === null || !isFinite(value)) return NO_VALUE

  const style = format?.style ?? 'auto'
  const places = format?.decimals ?? decimals

  // Scale once, up front. A percentage Show Values As stores a ratio, so every
  // style has to agree about it - otherwise "% of Grand Total" shown as Plain
  // rendered 0.25 as "0.3".
  const isPercent = PERCENT_SHOW_AS.has(showAs) || style === 'percent'
  const scaled = isPercent ? value * 100 : value
  const suffix = isPercent ? '%' : ''

  switch (style) {
    case 'currency':
      return (
        scaled.toLocaleString('en-US', {
          style: 'currency',
          currency: format?.currency || 'USD',
          minimumFractionDigits: places,
          maximumFractionDigits: places,
        }) + suffix
      )

    case 'thousands':
      return (
        scaled.toLocaleString('en-US', {
          notation: 'compact',
          maximumFractionDigits: format?.decimals ?? 1,
        }) + suffix
      )

    case 'plain':
      return (
        scaled.toLocaleString('en-US', {
          useGrouping: false,
          minimumFractionDigits: places,
          maximumFractionDigits: places,
        }) + suffix
      )

    default:
      return (
        scaled.toLocaleString('en-US', {
          minimumFractionDigits: places,
          maximumFractionDigits: places,
        }) + suffix
      )
  }
}
