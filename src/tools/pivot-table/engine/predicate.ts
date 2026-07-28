import { DataRecord, LabelRule, PivotComputeConfig } from '../types'
import { FieldResolver } from './grouping'
import { keyLabel, normalizeKey } from './sorters'

/**
 * The record-level half of the filter set: unticked values and label rules.
 *
 * Shared by aggregation and drill-down so the two can never disagree about
 * which records a cell is built from. Measure rules (Top N, value comparisons)
 * are not here - they act on aggregated axis items, not individual records.
 */
export function buildRecordPredicate(
  config: PivotComputeConfig,
  resolve: FieldResolver
): (record: DataRecord) => boolean {
  const excluded: [string, Set<string>][] = config.filters
    .filter((f) => f.excludedValues.size > 0)
    .map((f) => [f.field, f.excludedValues])

  const labels: [string, LabelRule][] = config.filters
    .filter((f): f is typeof f & { label: LabelRule } =>
      f.label !== undefined && f.label.text.trim() !== ''
    )
    .map((f) => [f.field, f.label])

  if (excluded.length === 0 && labels.length === 0) return () => true

  return (record) => {
    for (const [field, values] of excluded) {
      if (values.has(normalizeKey(resolve(record, field)))) return false
    }
    for (const [field, rule] of labels) {
      if (!matchesLabel(keyLabel(normalizeKey(resolve(record, field))), rule)) return false
    }
    return true
  }
}

export function matchesLabel(label: string, rule: LabelRule): boolean {
  const haystack = label.toLowerCase()
  const needle = rule.text.trim().toLowerCase()
  if (needle === '') return true

  switch (rule.op) {
    case 'contains':
      return haystack.includes(needle)
    case 'notContains':
      return !haystack.includes(needle)
    case 'beginsWith':
      return haystack.startsWith(needle)
    case 'endsWith':
      return haystack.endsWith(needle)
    case 'equals':
      return haystack === needle
    case 'notEquals':
      return haystack !== needle
  }
}
