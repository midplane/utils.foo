import { PivotConfig, ValueConfig } from './types'

/**
 * Keep only the metrics that `keep` accepts.
 *
 * A column sort target and a Top N or value rule refer to a metric by its
 * index. When an earlier metric is removed, those indexes move with their
 * metric. A reference to a removed metric is dropped, because otherwise it
 * points at a different metric or at nothing.
 */
export function retainValues(
  config: PivotConfig,
  keep: (value: ValueConfig) => boolean
): PivotConfig {
  const remap = new Map<number, number>()
  const values: ValueConfig[] = []
  config.values.forEach((value, index) => {
    if (!keep(value)) return
    remap.set(index, values.length)
    values.push(value)
  })

  if (values.length === config.values.length) return config

  const sortIndex = config.rowSortBy ? remap.get(config.rowSortBy.valueIndex) : undefined

  return {
    ...config,
    values,
    rowSortBy:
      config.rowSortBy && sortIndex !== undefined
        ? { ...config.rowSortBy, valueIndex: sortIndex }
        : undefined,
    filters: config.filters.map((filter) => {
      if (!filter.measure) return filter
      const index = remap.get(filter.measure.valueIndex)
      return {
        ...filter,
        measure: index === undefined ? undefined : { ...filter.measure, valueIndex: index },
      }
    }),
  }
}
