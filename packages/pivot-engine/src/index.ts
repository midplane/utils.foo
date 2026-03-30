// ─── Types ────────────────────────────────────────────────────────────────────

export type {
  AggregationType,
  AggregatorFactory,
  Aggregator,
  AggregatorPlugin,
  ValueConfig,
  FilterConfig,
  SortOrder,
  HeatmapMode,
  PivotConfig,
  DataRecord,
  ParsedData,
  CellValue,
  PivotResult,
  FieldInfo,
} from './types'

export {
  AGGREGATION_LABELS,
  DUAL_FIELD_AGGREGATIONS,
  DERIVED_AGGREGATIONS,
  SORT_ORDER_LABELS,
  HEATMAP_LABELS,
} from './types'

// ─── Engine ───────────────────────────────────────────────────────────────────

export { PivotEngine, getHeatmapColor } from './engine/PivotEngine'

// ─── Aggregators ──────────────────────────────────────────────────────────────

export {
  createAggregator,
  registerAggregator,
  getRegisteredPlugins,
  isEffectivelyDerived,
  getAggregationLabel,
  getAllAggregations,
  formatNumber,
  calculatePercentage,
} from './engine/aggregators'

// ─── Sorters ──────────────────────────────────────────────────────────────────

export {
  naturalSort,
  flattenKey,
  expandKey,
  compositeKey,
  createKeyComparator,
  createValueComparator,
} from './engine/sorters'

export type { Comparator } from './engine/sorters'

// ─── Data Analysis ────────────────────────────────────────────────────────────

export { analyzeData } from './engine/analyzeData'
