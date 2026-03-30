import Papa from 'papaparse'
import { analyzeData } from '@utils-foo/pivot-engine'
import type { DataRecord, FieldInfo } from '@utils-foo/pivot-engine'

export interface ParseResult {
  records: DataRecord[]
  fields: FieldInfo[]
  error: string
}

export function parseCsvData(csvText: string): ParseResult {
  if (!csvText.trim()) {
    return { records: [], fields: [], error: '' }
  }

  const result = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  })

  if (result.errors.length > 0) {
    return {
      records: [],
      fields: [],
      error: result.errors[0]?.message ?? 'CSV parse error',
    }
  }

  if (result.data.length === 0) {
    return { records: [], fields: [], error: 'No data found in CSV' }
  }

  const records = result.data as DataRecord[]
  const fields = analyzeData(records)

  return { records, fields, error: '' }
}
