import { AxisExclusions, DataRecord, PivotComputeConfig } from '../types'
import { createFieldResolver } from './grouping'
import { buildRecordPredicate } from './predicate'
import { flattenKey, normalizeKey } from './sorters'

/**
 * Find the source records behind a single pivot cell.
 *
 * Equivalent to Excel's double-click drill-down. Recomputed on demand from the
 * record set rather than retained per cell during aggregation, which would cost
 * memory proportional to the whole dataset on every pivot.
 */
export function findSourceRecords(
  records: DataRecord[],
  config: PivotComputeConfig,
  rowPath: readonly string[],
  colPath: readonly string[],
  limit: number,
  exclusions?: AxisExclusions
): { rows: DataRecord[]; total: number } {
  const resolve = createFieldResolver(config.groupings ?? {})
  const keepRecord = buildRecordPredicate(config, resolve)

  // A subtotal or grand-total cell has a shorter path than the axis is deep;
  // only the levels it actually pins are constrained.
  const constraints: [string, string][] = []
  rowPath.forEach((value, i) => {
    const field = config.rows[i]
    if (field !== undefined) constraints.push([field, value])
  })
  colPath.forEach((value, i) => {
    const field = config.cols[i]
    if (field !== undefined) constraints.push([field, value])
  })

  const rows: DataRecord[] = []
  let total = 0

  for (const record of records) {
    if (!keepRecord(record)) continue

    let matches = true
    for (const [field, value] of constraints) {
      if (normalizeKey(resolve(record, field)) !== value) {
        matches = false
        break
      }
    }
    if (!matches) continue

    // Items removed by a Top N or value rule are gone from the pivot entirely,
    // so their records must not surface here either.
    if (isAxisExcluded(record, config.rows, resolve, exclusions?.rows)) continue
    if (isAxisExcluded(record, config.cols, resolve, exclusions?.cols)) continue

    total++
    if (rows.length < limit) rows.push(record)
  }

  return { rows, total }
}

function isAxisExcluded(
  record: DataRecord,
  fields: readonly string[],
  resolve: (record: DataRecord, field: string) => unknown,
  excluded: ReadonlySet<string> | undefined
): boolean {
  if (!excluded || excluded.size === 0) return false

  const path: string[] = []
  for (const field of fields) {
    path.push(normalizeKey(resolve(record, field)))
    if (excluded.has(flattenKey(path))) return true
  }
  return false
}
