import { DataRecord, FieldGrouping, DatePart, FieldInfo } from '../types'
import { orderedKey, normalizeKey, naturalSort, BLANK_KEY } from './sorters'
import { toNumber } from './aggregators'

// ─── Date part definitions ────────────────────────────────────────────────────

export const DATE_PART_LABELS: Record<DatePart, string> = {
  year: 'Years',
  quarter: 'Quarters',
  month: 'Months',
  yearMonth: 'Year-Month',
  yearQuarter: 'Year-Quarter',
  date: 'Days',
  dayOfWeek: 'Weekday',
  hour: 'Hours',
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Epoch ranges narrow enough that an ordinary measurement cannot fall inside.
// Seconds: 2001-09-09 to 5138. Millis: 2001-09-09 to 5138.
const EPOCH_SECONDS_MIN = 1e9
const EPOCH_SECONDS_MAX = 1e11
const EPOCH_MILLIS_MIN = 1e12
const EPOCH_MILLIS_MAX = 1e14

/** Kept in step with analyzeData's cap. */
const MAX_TRACKED_UNIQUE_VALUES = 1000

// ─── Virtual field naming ─────────────────────────────────────────────────────

/**
 * Name of the virtual field produced by grouping `field` by `part`.
 *
 * Grouping produces additional fields rather than replacing the original, which
 * is what lets you put Years on columns and Months on rows simultaneously - the
 * main reason Excel's date grouping is useful.
 */
export function datePartField(field: string, part: DatePart): string {
  return `${field} (${DATE_PART_LABELS[part]})`
}

export function binnedField(field: string, size: number): string {
  return `${field} (bins of ${size})`
}

// ─── Value derivation ─────────────────────────────────────────────────────────

/** Parse a cell into a Date, accepting ISO strings, epoch numbers and Date. */
export function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value

  if (typeof value === 'number') {
    // Bare numbers are almost never dates. Treating them as epochs would make
    // every numeric column - ratings, budgets, runtimes - look like a date, so
    // only accept magnitudes that can plausibly *only* be a timestamp.
    const millis =
      value >= EPOCH_SECONDS_MIN && value < EPOCH_SECONDS_MAX
        ? value * 1000
        : value >= EPOCH_MILLIS_MIN && value < EPOCH_MILLIS_MAX
          ? value
          : null
    if (millis === null) return null
    const date = new Date(millis)
    return isNaN(date.getTime()) ? null : date
  }

  const text = String(value).trim()
  // Require a date-like shape. `new Date("Action")` is Invalid Date on modern
  // engines, but "5" or "2020" would silently parse and mis-group real data.
  if (!/^\d{4}[-/]\d{1,2}([-/]\d{1,2})?([ T].*)?$/.test(text) && !/^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(text)) {
    return null
  }
  const date = new Date(text)
  return isNaN(date.getTime()) ? null : date
}

function datePartValue(date: Date, part: DatePart): string {
  const year = date.getFullYear()
  const month = date.getMonth()
  const quarter = Math.floor(month / 3) + 1

  switch (part) {
    case 'year':
      return String(year)
    case 'quarter':
      return `Q${quarter}`
    case 'month':
      // Ordered so Jan precedes Feb rather than Apr preceding Aug.
      return orderedKey(month, MONTH_NAMES[month]!)
    case 'yearQuarter':
      return `${year}-Q${quarter}`
    case 'yearMonth':
      return orderedKey(year * 12 + month, `${MONTH_NAMES[month]} ${year}`)
    case 'date':
      return `${year}-${pad(month + 1)}-${pad(date.getDate())}`
    case 'dayOfWeek':
      return orderedKey(date.getDay(), WEEKDAY_NAMES[date.getDay()]!)
    case 'hour':
      return orderedKey(date.getHours(), `${pad(date.getHours())}:00`)
  }
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Bucket a number into a half-open bin, labelled by its range. */
function binValue(value: unknown, size: number): string {
  const num = toNumber(value)
  if (isNaN(num) || size <= 0) return BLANK_KEY

  const lower = Math.floor(num / size) * size
  const upper = lower + size
  return orderedKey(lower, `${trim(lower)} – ${trim(upper)}`)
}

function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(4)))
}

// ─── Field resolver ───────────────────────────────────────────────────────────

export type FieldResolver = (record: DataRecord, field: string) => unknown

interface DerivedField {
  base: string
  derive: (value: unknown) => string
}

/**
 * Build a resolver that transparently serves both real and grouped fields.
 *
 * Derived values are computed on read rather than materialised into the record
 * set, so grouping a 100k-row file costs nothing until the field is actually
 * placed on an axis.
 */
export function createFieldResolver(
  groupings: Record<string, FieldGrouping>
): FieldResolver {
  const derived = new Map<string, DerivedField>()

  for (const [base, grouping] of Object.entries(groupings)) {
    if (grouping.kind === 'date') {
      for (const part of grouping.parts) {
        derived.set(datePartField(base, part), {
          base,
          derive: (value) => {
            const date = parseDate(value)
            return date === null ? BLANK_KEY : datePartValue(date, part)
          },
        })
      }
    } else if (grouping.kind === 'number' && grouping.binSize > 0) {
      derived.set(binnedField(base, grouping.binSize), {
        base,
        derive: (value) => binValue(value, grouping.binSize),
      })
    }
  }

  if (derived.size === 0) {
    return (record, field) => record[field]
  }

  return (record, field) => {
    const spec = derived.get(field)
    if (!spec) return record[field]
    const raw = record[spec.base]
    return raw === null || raw === undefined || raw === '' ? BLANK_KEY : spec.derive(raw)
  }
}

/** Virtual FieldInfo entries for every configured grouping. */
export function derivedFieldInfo(
  fields: FieldInfo[],
  groupings: Record<string, FieldGrouping>,
  records: DataRecord[]
): FieldInfo[] {
  const resolver = createFieldResolver(groupings)
  const out: FieldInfo[] = []

  const add = (name: string) => {
    const unique = new Set<string>()
    let overflowed = false

    for (const record of records) {
      if (unique.size >= MAX_TRACKED_UNIQUE_VALUES) {
        overflowed = true
        break
      }
      unique.add(normalizeKey(resolver(record, name)))
    }

    out.push({
      name,
      isNumeric: false,
      // Matching analyzeData: an unlistable field must say so, or the filter
      // picker renders a list it wrongly believes is complete.
      uniqueValues: overflowed ? [] : Array.from(unique).sort((a, b) => naturalSort(a, b)),
      valueCount: unique.size,
      highCardinality: overflowed,
    })
  }

  for (const [base, grouping] of Object.entries(groupings)) {
    if (!fields.some((f) => f.name === base)) continue

    if (grouping.kind === 'date') {
      for (const part of grouping.parts) add(datePartField(base, part))
    } else if (grouping.kind === 'number' && grouping.binSize > 0) {
      add(binnedField(base, grouping.binSize))
    }
  }

  return out
}

/**
 * Whether a field looks like it holds dates, using a sample rather than the
 * whole column so this stays cheap on large files.
 */
export function looksLikeDate(records: DataRecord[], field: string): boolean {
  let checked = 0
  let parsed = 0

  for (const record of records) {
    const value = record[field]
    if (value === null || value === undefined || value === '') continue
    checked++
    if (parseDate(value) !== null) parsed++
    if (checked >= 50) break
  }

  return checked > 0 && parsed / checked >= 0.8
}

/** Names of every virtual field the given groupings produce. */
export function derivedFieldNames(groupings: Record<string, FieldGrouping>): string[] {
  const out: string[] = []
  for (const [base, grouping] of Object.entries(groupings)) {
    if (grouping.kind === 'date') {
      for (const part of grouping.parts) out.push(datePartField(base, part))
    } else if (grouping.kind === 'number' && grouping.binSize > 0) {
      out.push(binnedField(base, grouping.binSize))
    }
  }
  return out
}
