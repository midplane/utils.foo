import Papa from 'papaparse'
import { analyzeData } from './hooks/usePivotData'
import { DataRecord, FieldInfo } from './types'

export interface ParseResult {
  records: DataRecord[]
  fields: FieldInfo[]
  error: string
  warning: string
}

const EMPTY_PARSE: ParseResult = { records: [], fields: [], error: '', warning: '' }

// Same numeric shape and range that Papa Parse's dynamicTyping accepts.
const NUMERIC = /^\s*-?(\d+\.?|\.\d+|\d+\.\d+)([eE][-+]?\d+)?\s*$/
const MAX_SAFE = 2 ** 53

/**
 * Convert a cell to a number or null, else keep the text.
 *
 * Papa Parse's own dynamicTyping also turns ISO timestamps such as
 * "2024-01-05T10:00:00Z" into Date objects. A Date then shows as
 * "Fri Jan 05 2024 02:00:00 GMT-0800 (…)" in row labels, filters and
 * drill-down, so this keeps the text that is in the file.
 */
function typeCell(value: unknown): unknown {
  if (typeof value !== 'string') return value
  if (value === '') return null
  if (NUMERIC.test(value)) {
    const n = parseFloat(value)
    if (n > -MAX_SAFE && n < MAX_SAFE) return n
  }
  return value
}

/** Remove blank lines at the start and end, but keep tabs and spaces in data lines. */
function trimBlankLines(text: string): string {
  // `trim()` also removed the tab in front of an empty first TSV header,
  // which moved every header one column to the left.
  return text.replace(/^(?:[ \t]*\r?\n)+/, '').replace(/(?:\r?\n[ \t]*)+$/, '')
}

export function parseCsvData(csvText: string): ParseResult {
  if (!csvText.trim()) return EMPTY_PARSE

  const result = Papa.parse<Record<string, unknown>>(trimBlankLines(csvText), {
    header: true,
    skipEmptyLines: true,
  })

  // Papa reports ragged rows and delimiter guesses as row-level errors. Those
  // are recoverable - discarding an otherwise valid file because one line has
  // an extra comma is far worse than showing the data with a warning.
  const fatal = result.errors.find(
    (e) => e.type === 'Delimiter' || e.type === 'Quotes'
  )
  if (fatal) {
    return { ...EMPTY_PARSE, error: fatal.message || 'Could not parse the CSV.' }
  }

  if (result.data.length === 0) {
    return { ...EMPTY_PARSE, error: 'No data rows found.' }
  }

  for (const row of result.data) {
    for (const key of Object.keys(row)) row[key] = typeCell(row[key])
  }

  const records = result.data as DataRecord[]
  const warning =
    result.errors.length > 0
      ? `${result.errors.length.toLocaleString()} row${result.errors.length === 1 ? '' : 's'} had a formatting problem and may be incomplete.`
      : ''

  return { records, fields: analyzeData(records), error: '', warning }
}
