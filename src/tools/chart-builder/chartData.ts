import Papa from 'papaparse'

export interface ParsedData {
  columns: string[]
  rows: Record<string, string | number | null>[]
}

export const EMPTY_DATA: ParsedData = { columns: [], rows: [] }

// ─── Parsing ──────────────────────────────────────────────────────────────────

export function parseInput(raw: string): { data: ParsedData; error: string } {
  if (!raw.trim()) return { data: EMPTY_DATA, error: '' }

  const result = Papa.parse<Record<string, string>>(raw.trim(), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    delimiter: '', // auto-detect CSV vs TSV
  })

  if (result.errors.length > 0 && result.data.length === 0) {
    return { data: EMPTY_DATA, error: result.errors[0]!.message }
  }

  const columns = result.meta.fields ?? []
  if (columns.length === 0) {
    return {
      data: EMPTY_DATA,
      error: 'No columns detected. Make sure your data has a header row.',
    }
  }

  return {
    data: { columns, rows: result.data as ParsedData['rows'] },
    error: '',
  }
}

// ─── Numeric coercion ─────────────────────────────────────────────────────────

/** Currency symbols, thousands separators and percent signs seen in real exports. */
const NUMERIC_NOISE = /[\s,_'$£€¥%]/g

/**
 * Coerce a cell to a number, or null when it genuinely isn't one.
 *
 * Real CSVs contain "1,200", "$99" and "45%". Papa's dynamicTyping leaves those
 * as strings, and rejecting them meant an entire column silently disappeared
 * from the Series list.
 *
 * Returns null rather than 0 for anything unparseable: plotting a missing
 * February as a bar crashing to zero misrepresents the data, whereas null
 * renders as a genuine gap.
 */
export function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return isFinite(value) ? value : null
  if (value === null || value === undefined) return null

  const text = String(value).trim()
  if (text === '') return null

  // Parenthesised negatives, as accounting exports write them.
  const negated = /^\((.*)\)$/.exec(text)
  const body = (negated ? negated[1]! : text).replace(NUMERIC_NOISE, '')
  if (body === '' || body === '-' || body === '.') return null

  const n = Number(body)
  if (!isFinite(n)) return null
  return negated ? -n : n
}

/** Fraction of non-blank values that must parse for a column to count as numeric. */
const NUMERIC_THRESHOLD = 0.8

/**
 * Whether a column can be plotted as a measure.
 *
 * Tolerates a minority of junk values - a stray "N/A" should not disqualify a
 * column - but requires at least one real number, so an entirely blank column
 * is not vacuously numeric and charted as a flat zero line.
 */
export function isNumericColumn(
  column: string,
  rows: ParsedData['rows']
): boolean {
  let nonBlank = 0
  let parsed = 0

  for (const row of rows) {
    const value = row[column]
    if (value === null || value === undefined || value === '') continue
    nonBlank++
    if (toNumber(value) !== null) parsed++
  }

  return parsed > 0 && parsed / nonBlank >= NUMERIC_THRESHOLD
}

export function numericColumns(data: ParsedData, exclude: string): string[] {
  return data.columns.filter((c) => c !== exclude && isNumericColumn(c, data.rows))
}

// ─── Selection ────────────────────────────────────────────────────────────────

export interface Selection {
  xCol: string
  series: string[]
}

/** Identity of a column set, used to decide whether a saved selection still applies. */
export function columnsKey(columns: string[]): string {
  // \u0000 cannot occur in a header, so this cannot collide the way join('|') could.
  return columns.join('\u0000')
}

/**
 * Work out the effective X column and series.
 *
 * `saved` is only honoured when it belongs to the current column set, and its
 * series are always intersected with the columns that are actually numeric now.
 * Without that intersection a column that was numeric in one dataset but
 * textual in the next stayed selected, invisible in the chip list yet still
 * charted as zeros.
 */
export function resolveSelection(
  data: ParsedData,
  saved: (Selection & { key: string }) | null
): Selection & { numeric: string[] } {
  const applies = saved !== null && saved.key === columnsKey(data.columns)

  const xCol =
    applies && data.columns.includes(saved.xCol) ? saved.xCol : data.columns[0] ?? ''

  const numeric = numericColumns(data, xCol)

  // Keep chip order and series order identical, so colours line up.
  const series = applies
    ? numeric.filter((c) => saved.series.includes(c))
    : numeric

  return { xCol, series, numeric }
}
