export const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
export const DAY_ABBR   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

// Weekday 7 is also Sunday, so the label list has one more entry.
const DOW_LABELS = [...DAY_ABBR, 'Sun']

export interface CronField {
  raw: string
  description: string
  valid: boolean
  error?: string
}

export interface ParsedCron {
  valid: boolean
  error?: string
  description: string
  fields: {
    minute: CronField
    hour: CronField
    dom: CronField
    month: CronField
    dow: CronField
  }
  nextDates: Date[]
}

// ─── Field expansion ──────────────────────────────────────────────────────────

type Expanded =
  | { ok: true; values: Set<number>; description: string }
  | { ok: false; error: string }

function expandField(
  value: string,
  min: number,
  max: number,
  names?: string[],
  nameOffset: number = 0
): Expanded {
  const label = (n: number) => (names ? (names[n - nameOffset] ?? String(n)) : String(n))

  const toNumber = (token: string): number | null => {
    if (/^\d+$/.test(token)) return parseInt(token, 10)
    if (names) {
      const idx = names.findIndex(name => name.toLowerCase() === token.toLowerCase())
      if (idx !== -1) return idx + nameOffset
    }
    return null
  }

  const values = new Set<number>()
  const descriptions: string[] = []

  for (const item of value.split(',')) {
    const slash = item.split('/')
    if (slash.length > 2) return { ok: false, error: `Invalid value "${item}"` }
    const [base = '', stepText] = slash

    let step = 1
    if (stepText !== undefined) {
      if (!/^\d+$/.test(stepText) || parseInt(stepText, 10) < 1) return { ok: false, error: 'Invalid step' }
      step = parseInt(stepText, 10)
    }

    let start: number
    let end: number
    let description: string

    if (base === '*') {
      start = min
      end = max
      description = stepText === undefined ? 'every' : `every ${step} (starting at ${label(min)})`
    } else if (base.includes('-')) {
      const bounds = base.split('-')
      if (bounds.length !== 2) return { ok: false, error: `Invalid range (${min}-${max})` }
      const a = toNumber(bounds[0]!)
      const b = toNumber(bounds[1]!)
      if (a === null || b === null || a < min || b > max || a > b) {
        return { ok: false, error: `Invalid range (${min}-${max})` }
      }
      start = a
      end = b
      description = stepText === undefined
        ? `${label(a)} through ${label(b)}`
        : `every ${step} from ${label(a)} through ${label(b)}`
    } else {
      const n = toNumber(base)
      if (n === null) return { ok: false, error: `Invalid value "${item}"` }
      if (n < min || n > max) return { ok: false, error: `Value out of range (${min}-${max})` }
      start = n
      // "n/step" means from n to the maximum value, every step.
      end = stepText === undefined ? n : max
      description = stepText === undefined ? label(n) : `every ${step} (starting at ${label(n)})`
    }

    for (let v = start; v <= end; v += step) values.add(v)
    descriptions.push(description)
  }

  return { ok: true, values, description: descriptions.join(', ') }
}

export function parseField(
  value: string,
  min: number,
  max: number,
  names?: string[],
  nameOffset: number = 0
): CronField {
  const result = expandField(value, min, max, names, nameOffset)
  if (!result.ok) return { raw: value, description: '', valid: false, error: result.error }
  return { raw: value, description: result.description, valid: true }
}

function fieldNames(min: number, max: number): string[] | undefined {
  if (min === 1 && max === 12) return MONTH_ABBR
  if (max === 7) return DAY_ABBR
  return undefined
}

function fieldValues(expr: string, min: number, max: number): Set<number> | null {
  const names = fieldNames(min, max)
  const result = expandField(expr, min, max, names, names === MONTH_ABBR ? 1 : 0)
  if (!result.ok) return null
  // Weekday 7 is Sunday.
  if (max === 7 && result.values.has(7)) result.values.add(0)
  return result.values
}

export function matchesField(value: number, expr: string, min: number, max: number): boolean {
  return fieldValues(expr, min, max)?.has(value) ?? false
}

// ─── Description ──────────────────────────────────────────────────────────────

function humanMinute(f: CronField) {
  if (f.description === 'every') return 'every minute'
  return `at minute ${f.description}`
}

function humanHour(f: CronField) {
  if (f.description === 'every') return 'every hour'
  return `past hour ${f.description}`
}

function humanDOM(f: CronField) {
  if (f.description === 'every') return null
  return `on day ${f.description} of the month`
}

function humanMonth(f: CronField) {
  if (f.description === 'every') return null
  return `in ${f.description}`
}

function humanDOW(f: CronField) {
  if (f.description === 'every') return null
  return `on ${f.description}`
}

// Cron rule: when the day-of-month and the day-of-week fields are both
// restricted (they do not start with "*"), a day matches if EITHER field matches.
function daysAreOred(domExpr: string, dowExpr: string): boolean {
  return !domExpr.startsWith('*') && !dowExpr.startsWith('*')
}

// ─── Next runs ────────────────────────────────────────────────────────────────

// Search limit. It is sufficiently long to find five Feb 29 runs, and it stops
// impossible schedules such as "0 0 31 2 *".
const SEARCH_DAYS = 366 * 30

export function computeNextDates(
  parts: [string,string,string,string,string],
  count: number,
  from: Date = new Date()
): Date[] {
  const [mExpr, hExpr, domExpr, monthExpr, dowExpr] = parts
  const minutes = fieldValues(mExpr, 0, 59)
  const hours   = fieldValues(hExpr, 0, 23)
  const doms    = fieldValues(domExpr, 1, 31)
  const months  = fieldValues(monthExpr, 1, 12)
  const dows    = fieldValues(dowExpr, 0, 7)
  if (!minutes || !hours || !doms || !months || !dows) return []

  const sortedHours   = [...hours].sort((a, b) => a - b)
  const sortedMinutes = [...minutes].sort((a, b) => a - b)
  const ored = daysAreOred(domExpr, dowExpr)

  // The first possible run is the start of the next minute.
  const earliest = Math.floor(from.getTime() / 60000) * 60000 + 60000
  const startDay = new Date(earliest)

  const results: Date[] = []
  for (let i = 0; i < SEARCH_DAYS && results.length < count; i++) {
    const day = new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate() + i)
    const year = day.getFullYear()
    const month = day.getMonth()
    const date = day.getDate()

    if (!months.has(month + 1)) continue
    const domMatch = doms.has(date)
    const dowMatch = dows.has(day.getDay())
    if (ored ? !(domMatch || dowMatch) : !(domMatch && dowMatch)) continue

    for (const h of sortedHours) {
      for (const m of sortedMinutes) {
        const candidate = new Date(year, month, date, h, m)
        // Skip local times that do not exist (the gap at a DST change).
        if (candidate.getDate() !== date || candidate.getHours() !== h || candidate.getMinutes() !== m) continue
        if (candidate.getTime() < earliest) continue
        results.push(candidate)
        if (results.length >= count) return results
      }
    }
  }
  return results
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export function parseCron(expr: string, from: Date = new Date()): ParsedCron {
  const parts = expr.trim().split(/\s+/)

  if (parts.length !== 5) {
    return {
      valid: false,
      error: 'A cron expression must have exactly 5 fields: minute hour day month weekday',
      description: '',
      fields: {
        minute: { raw: '', description: '', valid: false },
        hour:   { raw: '', description: '', valid: false },
        dom:    { raw: '', description: '', valid: false },
        month:  { raw: '', description: '', valid: false },
        dow:    { raw: '', description: '', valid: false },
      },
      nextDates: [],
    }
  }

  const [m, h, dom, month, dow] = parts as [string,string,string,string,string]

  const fields = {
    minute: parseField(m,    0, 59),
    hour:   parseField(h,    0, 23),
    dom:    parseField(dom,  1, 31),
    month:  parseField(month, 1, 12, MONTH_ABBR, 1),
    dow:    parseField(dow,   0,  7, DOW_LABELS, 0),
  }

  const invalid = Object.entries(fields).find(([, f]) => !f.valid)
  if (invalid) {
    return {
      valid: false,
      error: `Invalid ${invalid[0]} field: ${invalid[1].error}`,
      description: '',
      fields,
      nextDates: [],
    }
  }

  const segments: string[] = []
  segments.push(humanMinute(fields.minute))
  segments.push(humanHour(fields.hour))
  const domStr  = humanDOM(fields.dom)
  const monthStr = humanMonth(fields.month)
  const dowStr  = humanDOW(fields.dow)
  if (domStr && dowStr && daysAreOred(dom, dow)) {
    segments.push(`${domStr} or ${dowStr}`)
    if (monthStr) segments.push(monthStr)
  } else {
    if (domStr)   segments.push(domStr)
    if (monthStr) segments.push(monthStr)
    if (dowStr)   segments.push(dowStr)
  }
  const description = segments.join(', ')

  const nextDates = computeNextDates(parts as [string,string,string,string,string], 5, from)

  return { valid: true, description, fields, nextDates }
}
