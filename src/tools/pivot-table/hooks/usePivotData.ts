import { useMemo } from 'react'
import {
  DataRecord,
  PivotConfig,
  PivotResult,
  FieldInfo,
  ValueConfig,
  PivotComputeConfig,
} from '../types'
import { computeFilteredPivot } from '../engine/filters'
import { naturalSort, normalizeKey } from '../engine/sorters'
import { toNumber } from '../engine/aggregators'

/** A fresh empty result; never a shared module-level object that could be mutated. */
function emptyResult(values: ValueConfig[]): PivotResult {
  const root = { path: [], flatKey: '', label: '', depth: 0, children: [] }
  return {
    rowRoot: root,
    colRoot: { ...root },
    cells: new Map(),
    valueConfigs: values,
    totalRecords: 0,
    matchedRecords: 0,
  }
}

/**
 * Beyond this many distinct values we stop collecting them. The list only feeds
 * the filter picker, and nobody picks from a hundred thousand checkboxes - but
 * building and natural-sorting that array on every keystroke is very expensive.
 */
const MAX_TRACKED_UNIQUE_VALUES = 1000

/** Papa Parse's overflow bucket for ragged rows; never a real field. */
const PARSED_EXTRA = '__parsed_extra'

// ─── Analyze Data ─────────────────────────────────────────────────────────────

export function analyzeData(records: DataRecord[]): FieldInfo[] {
  if (records.length === 0) return []

  // Ragged CSVs produce records with differing key sets, so take the union
  // rather than trusting the first row.
  const fieldNames: string[] = []
  const seenNames = new Set<string>()
  for (const record of records) {
    for (const name of Object.keys(record)) {
      if (name === PARSED_EXTRA || seenNames.has(name)) continue
      seenNames.add(name)
      fieldNames.push(name)
    }
  }

  const uniqueSets = new Map<string, Set<string>>()
  const overflowed = new Set<string>()
  const sawNumber = new Set<string>()
  const sawNonNumber = new Set<string>()

  for (const name of fieldNames) {
    uniqueSets.set(name, new Set())
  }

  for (const record of records) {
    for (const name of fieldNames) {
      const value = record[name]

      const set = uniqueSets.get(name)!
      if (set.size < MAX_TRACKED_UNIQUE_VALUES) {
        set.add(normalizeKey(value))
      } else {
        overflowed.add(name)
      }

      // Blanks are ignored when deciding whether a field is numeric.
      if (value === null || value === undefined || value === '') continue
      if (isNaN(toNumber(value))) {
        sawNonNumber.add(name)
      } else {
        sawNumber.add(name)
      }
    }
  }

  return fieldNames.map((name) => {
    const set = uniqueSets.get(name)!
    const highCardinality = overflowed.has(name)
    return {
      name,
      // A field is numeric only if it has at least one number and no non-numbers.
      // An all-blank column is not numeric.
      isNumeric: sawNumber.has(name) && !sawNonNumber.has(name),
      uniqueValues: highCardinality
        ? []
        : Array.from(set).sort((a, b) => naturalSort(a, b)),
      valueCount: set.size,
      highCardinality,
    }
  })
}

// ─── Use Pivot Data Hook ──────────────────────────────────────────────────────

export function usePivotData(records: DataRecord[], config: PivotConfig): PivotResult {
  // Depend only on the aggregation-relevant slice of the config, so that purely
  // visual changes - heatmap, layout, subtotals, collapse - never re-aggregate.
  const { rows, cols, values, filters, rowOrder, colOrder, rowSortBy, groupings } = config

  return useMemo(() => {
    if (values.length === 0 || (rows.length === 0 && cols.length === 0)) {
      return emptyResult(values)
    }
    const computeConfig: PivotComputeConfig = {
      rows, cols, values, filters, rowOrder, colOrder, rowSortBy, groupings,
    }
    return computeFilteredPivot(records, computeConfig)
  }, [records, rows, cols, values, filters, rowOrder, colOrder, rowSortBy, groupings])
}
