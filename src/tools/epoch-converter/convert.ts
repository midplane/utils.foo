import { MS_PER_DAY, parseISODate, toCivil } from '../gantt-chart/calendar'

export type Unit = 's' | 'ms'
export type Zone = 'local' | 'utc'

export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

// ─── Timestamp ───────────────────────────────────────────────────────────────

const TIMESTAMP = /^-?(\d+)(?:\.(\d+))?$/

/**
 * Parse a Unix timestamp to milliseconds.
 *
 * The unit comes from the count of significant integer digits: up to 10 is
 * seconds, 11 to 13 is milliseconds. The sign, leading zeros and a decimal
 * part do not count, so `-1000000000` and `1699900800.5` stay in seconds.
 * The value is read from the string, not through `parseInt`, so trailing text
 * or separators cause an error instead of a silently truncated number.
 */
export function parseTimestamp(text: string): Result<{ ms: number; unit: Unit }> {
  const trimmed = text.trim()
  const match = TIMESTAMP.exec(trimmed)
  if (!match) {
    return { ok: false, error: 'Enter digits only, for example 1699900800. You can use a minus sign and a decimal point.' }
  }
  const whole = match[1] ?? ''
  const fraction = match[2] ?? ''
  const digits = whole.replace(/^0+/, '').length
  if (digits > 13) {
    return { ok: false, error: 'Too many digits. Use seconds (up to 10 digits) or milliseconds (11 to 13 digits).' }
  }
  const unit: Unit = digits > 10 ? 'ms' : 's'
  // Integer arithmetic on the digit strings: `1699900800.123 * 1000` in floating
  // point is 1699900800122.9998, which truncates to the wrong millisecond.
  const magnitude = unit === 's'
    ? Number(whole) * 1000 + Number(fraction.slice(0, 3).padEnd(3, '0'))
    : Number(whole)
  const ms = trimmed.startsWith('-') && magnitude !== 0 ? -magnitude : magnitude
  return { ok: true, value: { ms, unit } }
}

export function formatTimestamp(ms: number, unit: Unit): string {
  return String(unit === 'ms' ? ms : Math.floor(ms / 1000))
}

// ─── Date ────────────────────────────────────────────────────────────────────

const pad = (n: number, width = 2) => String(n).padStart(width, '0')

/**
 * Format as ISO 8601 with an explicit offset, for example
 * `2023-11-13T12:00:00Z` or `2023-11-13T13:00:00+01:00`.
 *
 * The output must parse back to the same instant. `toLocaleString()` does not:
 * `03/11/2026` in en-GB is 3 November, but `new Date()` reads it as 11 March.
 * Milliseconds are shown only when they are not zero.
 */
export function formatDate(ms: number, zone: Zone): string {
  const d = new Date(ms)
  const utc = zone === 'utc'
  const year = utc ? d.getUTCFullYear() : d.getFullYear()
  const month = (utc ? d.getUTCMonth() : d.getMonth()) + 1
  const day = utc ? d.getUTCDate() : d.getDate()
  const hours = utc ? d.getUTCHours() : d.getHours()
  const minutes = utc ? d.getUTCMinutes() : d.getMinutes()
  const seconds = utc ? d.getUTCSeconds() : d.getSeconds()
  const millis = utc ? d.getUTCMilliseconds() : d.getMilliseconds()

  const yearText = year >= 0 && year <= 9999
    ? pad(year, 4)
    : `${year < 0 ? '-' : '+'}${pad(Math.abs(year), 6)}`
  const time = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}${millis ? `.${pad(millis, 3)}` : ''}`

  let offset = 'Z'
  if (!utc) {
    const total = Math.round(-d.getTimezoneOffset())
    const abs = Math.abs(total)
    offset = `${total < 0 ? '-' : '+'}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  }
  return `${yearText}-${pad(month)}-${pad(day)}T${time}${offset}`
}

const ISO_DATE_TIME =
  /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:[.,](\d+))?)?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/i

// A zone designator in a non-ISO string, for example "GMT", "+0100" or "PST".
const HAS_ZONE = /(?:\b(?:Z|UTC|GMT|[ECMP][SD]T)\b|[+-]\d{2}:?\d{2}\s*(?:\([^)]*\))?\s*$)/i

const DATE_HELP = 'Use ISO 8601, for example 2023-11-13T12:00:00.'

/**
 * Parse a date to milliseconds.
 *
 * A date with no offset is read in the selected zone. `new Date()` alone does
 * not do this: it reads `2023-11-13T12:00:00` as local time but `2023-11-13`
 * as UTC, whatever the user selected.
 */
export function parseDate(text: string, zone: Zone): Result<number> {
  const trimmed = text.trim()
  const iso = ISO_DATE_TIME.exec(trimmed)
  if (iso) return parseIso(iso, zone)

  const parsed = new Date(trimmed)
  if (isNaN(parsed.getTime())) return { ok: false, error: `Cannot read this date. ${DATE_HELP}` }
  if (zone === 'local' || HAS_ZONE.test(trimmed)) return { ok: true, value: parsed.getTime() }

  // No zone in the text, so `Date` used local time. Read the same wall-clock
  // fields again as UTC. `setUTCFullYear` keeps years 0-99 literal, which
  // `Date.UTC` does not.
  const utc = new Date(0)
  utc.setUTCFullYear(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  utc.setUTCHours(parsed.getHours(), parsed.getMinutes(), parsed.getSeconds(), parsed.getMilliseconds())
  return { ok: true, value: utc.getTime() }
}

function parseIso(match: RegExpExecArray, zone: Zone): Result<number> {
  const dayNumber = parseISODate(match[1] ?? '')
  if (dayNumber === null) return { ok: false, error: `This date does not exist. ${DATE_HELP}` }

  const hours = Number(match[2] ?? 0)
  const minutes = Number(match[3] ?? 0)
  const seconds = Number(match[4] ?? 0)
  const millis = Number((match[5] ?? '').slice(0, 3).padEnd(3, '0'))
  if (hours > 23 || minutes > 59 || seconds > 59) {
    return { ok: false, error: `This time does not exist. ${DATE_HELP}` }
  }
  const timeOfDay = ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis

  const designator = match[6]
  if (designator || zone === 'utc') {
    let offsetMinutes = 0
    if (designator && designator.toUpperCase() !== 'Z') {
      const digits = designator.slice(1).replace(':', '')
      const offsetHours = Number(digits.slice(0, 2))
      const offsetMins = Number(digits.slice(2) || 0)
      if (offsetHours > 23 || offsetMins > 59) {
        return { ok: false, error: `This UTC offset does not exist. ${DATE_HELP}` }
      }
      offsetMinutes = (designator.startsWith('-') ? -1 : 1) * (offsetHours * 60 + offsetMins)
    }
    return { ok: true, value: dayNumber * MS_PER_DAY + timeOfDay - offsetMinutes * 60_000 }
  }

  const { year, month, day } = toCivil(dayNumber)
  return { ok: true, value: new Date(year, month - 1, day, hours, minutes, seconds, millis).getTime() }
}

/** A long, readable form of the date, so that the user can check the result. */
export function describeDate(ms: number, zone: Zone): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeStyle: 'long',
    timeZone: zone === 'utc' ? 'UTC' : undefined,
  }).format(ms)
}
