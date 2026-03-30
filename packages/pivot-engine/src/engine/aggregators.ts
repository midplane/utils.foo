import {
  Aggregator,
  AggregatorFactory,
  AggregatorPlugin,
  AggregationType,
  AGGREGATION_LABELS,
  DERIVED_AGGREGATIONS,
} from '../types'

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

// ─── Standard Deviation Aggregator (Welford's algorithm) ─────────────────────

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
// Collect raw sums/counts; the engine applies percentage formula using totals

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

// ─── Built-in Factory Map ─────────────────────────────────────────────────────

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

// ─── Plugin Registry ──────────────────────────────────────────────────────────

const pluginRegistry = new Map<string, AggregatorPlugin>()

/**
 * Register a custom aggregation type. Call this once at startup before
 * creating any PivotEngine instances that use the custom type.
 *
 * @example
 * registerAggregator({
 *   type: 'geoMean',
 *   label: 'Geo Mean',
 *   factory: () => { ... },
 *   format: (v) => v?.toFixed(3) ?? '—',
 * })
 */
export function registerAggregator(plugin: AggregatorPlugin): void {
  if (plugin.type in AGGREGATOR_FACTORIES) {
    throw new Error(`[pivot-engine] Cannot override built-in aggregation type: "${plugin.type}"`)
  }
  if (pluginRegistry.has(plugin.type)) {
    console.warn(`[pivot-engine] Aggregator "${plugin.type}" is already registered. Overwriting.`)
  }
  pluginRegistry.set(plugin.type, plugin)
}

/**
 * Returns all registered custom aggregator plugins (does not include built-ins).
 * Useful for populating UI dropdowns with custom aggregation options.
 */
export function getRegisteredPlugins(): ReadonlyMap<string, AggregatorPlugin> {
  return pluginRegistry
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createAggregator(type: AggregationType | string): Aggregator {
  if (Object.prototype.hasOwnProperty.call(AGGREGATOR_FACTORIES, type)) {
    return (AGGREGATOR_FACTORIES as Record<string, AggregatorFactory>)[type]!()
  }
  const plugin = pluginRegistry.get(type)
  if (plugin) return plugin.factory()
  throw new Error(
    `[pivot-engine] Unknown aggregation type: "${type}". Register it with registerAggregator() first.`
  )
}

// ─── Derived Check ────────────────────────────────────────────────────────────

/** Returns true if the aggregation type should be treated as post-hoc derived. */
export function isEffectivelyDerived(type: AggregationType | string): boolean {
  if (DERIVED_AGGREGATIONS.has(type as AggregationType)) return true
  return pluginRegistry.get(type)?.isDerived === true
}

// ─── Label Lookup ─────────────────────────────────────────────────────────────

/** Returns the display label for any aggregation type (built-in or custom). */
export function getAggregationLabel(type: AggregationType | string): string {
  return (
    AGGREGATION_LABELS[type as AggregationType] ??
    pluginRegistry.get(type)?.label ??
    type
  )
}

/**
 * Returns all aggregation options (built-ins + registered plugins) as a flat list,
 * suitable for populating a UI select element.
 */
export function getAllAggregations(): Array<{ type: string; label: string }> {
  const builtIns = Object.entries(AGGREGATION_LABELS).map(([type, label]) => ({ type, label }))
  const customs = Array.from(pluginRegistry.values()).map(({ type, label }) => ({ type, label }))
  return [...builtIns, ...customs]
}

// ─── Number Formatting ────────────────────────────────────────────────────────

export function formatNumber(
  value: number | null,
  aggregationType: AggregationType | string
): string {
  // Check plugin registry first (plugin may handle null its own way)
  const plugin = pluginRegistry.get(aggregationType)
  if (plugin?.format) return plugin.format(value)

  if (value === null) return '—'

  // Percentage types
  if (DERIVED_AGGREGATIONS.has(aggregationType as AggregationType)) {
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

  // Decimal places by aggregation type
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
      // sum, min, max — integer if whole, 2 decimals otherwise
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
