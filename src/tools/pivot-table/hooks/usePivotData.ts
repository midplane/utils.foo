import { useMemo } from 'react'
import { DataRecord, PivotConfig, PivotResult, FieldInfo } from '../types'
import { PivotEngine } from '../engine/PivotEngine'
import { naturalSort } from '../engine/sorters'

// ─── Analyze Data ─────────────────────────────────────────────────────────────

export function analyzeData(records: DataRecord[]): FieldInfo[] {
  if (records.length === 0) return []

  const firstRecord = records[0]
  if (!firstRecord) return []

  const fieldNames = Object.keys(firstRecord)
  const fieldInfoMap = new Map<string, FieldInfo>()

  // Initialize field info
  for (const name of fieldNames) {
    fieldInfoMap.set(name, {
      name,
      isNumeric: true, // Assume numeric until proven otherwise
      uniqueValues: [],
      valueCount: 0,
    })
  }

  // Track unique values with a Set for performance
  const uniqueSets = new Map<string, Set<string>>()
  for (const name of fieldNames) {
    uniqueSets.set(name, new Set())
  }

  // Single pass through records
  for (const record of records) {
    for (const name of fieldNames) {
      const info = fieldInfoMap.get(name)!
      const uniqueSet = uniqueSets.get(name)!
      const value = record[name]

      // Track unique values (as strings)
      const strValue = String(value ?? 'null')
      uniqueSet.add(strValue)

      // Check if still numeric
      if (info.isNumeric && value !== null && value !== undefined && value !== '') {
        const numValue = typeof value === 'number' ? value : parseFloat(String(value))
        if (isNaN(numValue)) {
          info.isNumeric = false
        }
      }
    }
  }

  // Convert Sets to sorted arrays
  for (const name of fieldNames) {
    const info = fieldInfoMap.get(name)!
    const uniqueSet = uniqueSets.get(name)!
    info.uniqueValues = Array.from(uniqueSet).sort((a, b) => naturalSort(a, b))
    info.valueCount = uniqueSet.size
  }

  return Array.from(fieldInfoMap.values())
}

// ─── Use Pivot Data Hook ──────────────────────────────────────────────────────

export function usePivotData(
  records: DataRecord[],
  config: PivotConfig
): PivotResult {
  return useMemo(() => {
    // Skip computation if no values configured
    if (config.values.length === 0 || (config.rows.length === 0 && config.cols.length === 0)) {
      return {
        rowKeys: [],
        colKeys: [],
        cells: new Map(),
        rowTotals: new Map(),
        colTotals: new Map(),
        grandTotal: { values: [], formatted: [] },
        valueConfigs: config.values,
        isEmpty: true,
      }
    }

    const engine = new PivotEngine(records, config)
    return engine.getResult()
  }, [records, config])
}
