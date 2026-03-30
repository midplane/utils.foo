import { DataRecord, FieldInfo } from '../types'
import { naturalSort } from './sorters'

/**
 * Analyzes an array of records and returns field metadata:
 * - whether the field is numeric
 * - sorted list of unique values
 * - total unique value count
 *
 * Single pass through records — O(n * fields).
 */
export function analyzeData(records: DataRecord[]): FieldInfo[] {
  if (records.length === 0) return []

  const firstRecord = records[0]
  if (!firstRecord) return []

  const fieldNames = Object.keys(firstRecord)
  const fieldInfoMap = new Map<string, FieldInfo>()

  for (const name of fieldNames) {
    fieldInfoMap.set(name, {
      name,
      isNumeric: true, // Assume numeric until proven otherwise
      uniqueValues: [],
      valueCount: 0,
    })
  }

  const uniqueSets = new Map<string, Set<string>>()
  for (const name of fieldNames) {
    uniqueSets.set(name, new Set())
  }

  for (const record of records) {
    for (const name of fieldNames) {
      const info = fieldInfoMap.get(name)!
      const uniqueSet = uniqueSets.get(name)!
      const value = record[name]

      uniqueSet.add(String(value ?? 'null'))

      if (info.isNumeric && value !== null && value !== undefined && value !== '') {
        const numValue = typeof value === 'number' ? value : parseFloat(String(value))
        if (isNaN(numValue)) {
          info.isNumeric = false
        }
      }
    }
  }

  for (const name of fieldNames) {
    const info = fieldInfoMap.get(name)!
    const uniqueSet = uniqueSets.get(name)!
    info.uniqueValues = Array.from(uniqueSet).sort((a, b) => naturalSort(a, b))
    info.valueCount = uniqueSet.size
  }

  return Array.from(fieldInfoMap.values())
}
