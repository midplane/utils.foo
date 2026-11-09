// ─── Pure time-zone logic for the meeting planner ─────────────────────────────

export const MS_PER_HOUR = 3_600_000
const MS_PER_MINUTE = 60_000
const MS_PER_DAY = 86_400_000
const MINUTES_PER_DAY = 1440

export type CellStatus = 'good' | 'partial' | 'bad'

export interface ZoneListEntry {
  iana: string
  label: string
  region: string
}

// ─── Zone identity ────────────────────────────────────────────────────────────

const canonicalCache = new Map<string, string | null>()

/**
 * Returns the identifier that Intl uses for this zone, or null if the zone is not valid.
 * Aliases such as Asia/Calcutta and Asia/Kolkata give the same result.
 */
export function canonicalZone(iana: string): string | null {
  const cached = canonicalCache.get(iana)
  if (cached !== undefined) return cached
  let result: string | null
  try {
    result = new Intl.DateTimeFormat('en-US', { timeZone: iana }).resolvedOptions().timeZone
  } catch {
    result = null
  }
  canonicalCache.set(iana, result)
  return result
}

export function sameZone(a: string, b: string): boolean {
  if (a === b) return true
  const ca = canonicalZone(a)
  return ca !== null && ca === canonicalZone(b)
}

export function findZone<T extends { iana: string }>(list: readonly T[], iana: string): T | undefined {
  return list.find(t => t.iana === iana) ?? list.find(t => sameZone(t.iana, iana))
}

// ─── Wall-clock time in a zone ────────────────────────────────────────────────

const partsFormatters = new Map<string, Intl.DateTimeFormat>()

function partsFormatter(iana: string): Intl.DateTimeFormat {
  let fmt = partsFormatters.get(iana)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: iana,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    })
    partsFormatters.set(iana, fmt)
  }
  return fmt
}

export interface ZoneTime {
  /** Local calendar date as days since 1970-01-01. */
  day: number
  /** Local minutes since midnight (0–1439). */
  minutes: number
}

/** Local date and time of day in `iana` at the instant `ms`. */
export function zoneTimeAt(iana: string, ms: number): ZoneTime {
  const parts = partsFormatter(iana).formatToParts(new Date(ms))
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(p => p.type === type)?.value ?? 0)
  // Some engines write midnight as hour 24 even with hourCycle h23.
  const hour = get('hour') % 24
  return {
    day: Date.UTC(get('year'), get('month') - 1, get('day')) / MS_PER_DAY,
    minutes: hour * 60 + get('minute'),
  }
}

/** UTC offset of `iana` in minutes at the instant `ms` (not at the current time). */
export function offsetMinutesAt(iana: string, ms: number): number {
  const { day, minutes } = zoneTimeAt(iana, ms)
  return day * MINUTES_PER_DAY + minutes - Math.floor(ms / MS_PER_MINUTE)
}

export function zoneAbbrAt(iana: string, ms: number): string {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: iana, timeZoneName: 'short' })
      .formatToParts(new Date(ms)).find(p => p.type === 'timeZoneName')?.value ?? iana
  } catch {
    return iana
  }
}

/** Start of the UTC calendar day that contains `ms`. */
export function utcDayStart(ms: number): number {
  return Math.floor(ms / MS_PER_DAY) * MS_PER_DAY
}

// ─── Formatting ───────────────────────────────────────────────────────────────

/** 480 → "8am", 510 → "8:30am", 1425 → "11:45pm". */
export function formatClock(minutes: number): string {
  const m = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const h = Math.floor(m / 60)
  const min = m % 60
  const ampm = h < 12 ? 'am' : 'pm'
  const display = h % 12 === 0 ? 12 : h % 12
  return min === 0 ? `${display}${ampm}` : `${display}:${String(min).padStart(2, '0')}${ampm}`
}

export function formatClockAt(iana: string, ms: number): string {
  return formatClock(zoneTimeAt(iana, ms).minutes)
}

export function getOffsetLabel(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return m === 0 ? `UTC${sign}${h}` : `UTC${sign}${h}:${String(m).padStart(2, '0')}`
}

/** Calendar days between the local date in `iana` and in `refIana` at the instant `ms`. */
export function dayShift(iana: string, refIana: string, ms: number): number {
  return zoneTimeAt(iana, ms).day - zoneTimeAt(refIana, ms).day
}

export function formatDayShift(shift: number): string {
  if (shift === 0) return ''
  const n = Math.abs(shift)
  return ` (${shift > 0 ? '+' : '-'}${n} day${n === 1 ? '' : 's'})`
}

// ─── Working hours ────────────────────────────────────────────────────────────

/**
 * True when a one-hour slot that starts at local minute `start` is fully inside the
 * working window. When `workStart` is after `workEnd`, the window goes across midnight.
 */
export function isWorkingSlot(start: number, workStart: number, workEnd: number): boolean {
  const ws = workStart * 60
  let we = workEnd * 60
  if (we < ws) we += MINUTES_PER_DAY
  return [start, start + MINUTES_PER_DAY].some(s => s >= ws && s + 60 <= we)
}

export function isWorkingAt(iana: string, ms: number, workStart: number, workEnd: number): boolean {
  return isWorkingSlot(zoneTimeAt(iana, ms).minutes, workStart, workEnd)
}

export function cellStatus(zones: readonly string[], ms: number, workStart: number, workEnd: number): CellStatus {
  if (zones.length === 0) return 'bad'
  const working = zones.filter(iana => isWorkingAt(iana, ms, workStart, workEnd)).length
  if (working === zones.length) return 'good'
  if (working > 0) return 'partial'
  return 'bad'
}

/** Verdict for a selected range of cells. */
export function rangeVerdict(statuses: readonly CellStatus[]): 'all' | 'some' | 'none' {
  if (statuses.length > 0 && statuses.every(s => s === 'good')) return 'all'
  if (statuses.some(s => s !== 'bad')) return 'some'
  return 'none'
}

// ─── Search ───────────────────────────────────────────────────────────────────

/** Lower case, no accents, underscores as spaces: "São_Paulo" → "sao paulo". */
export function normalizeSearch(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/_/g, ' ').toLowerCase().trim()
}

export function searchZones<T extends ZoneListEntry>(
  list: readonly T[],
  query: string,
  isExisting: (iana: string) => boolean,
  limit = 8,
): T[] {
  const q = normalizeSearch(query)
  return list
    .filter(t => !isExisting(t.iana))
    .filter(t => !q || [t.label, t.iana, t.region].some(f => normalizeSearch(f).includes(q)))
    .slice(0, limit)
}

// ─── Copy text ────────────────────────────────────────────────────────────────

export interface CopyZone {
  iana: string
  label: string
}

/** Text for a slot from `startMs` to `endMs`. Day shifts are relative to the first zone. */
export function buildSlotText(zones: readonly CopyZone[], startMs: number, endMs: number): string {
  const hours = Math.round((endMs - startMs) / MS_PER_HOUR)
  const lines: string[] = [`Meeting slot: ${hours}h block`]
  const ref = zones[0]
  for (const tz of zones) {
    const shift = ref ? dayShift(tz.iana, ref.iana, startMs) : 0
    const abbr = zoneAbbrAt(tz.iana, startMs)
    lines.push(`  ${tz.label} (${abbr}): ${formatClockAt(tz.iana, startMs)} – ${formatClockAt(tz.iana, endMs)}${formatDayShift(shift)}`)
  }
  return lines.join('\n')
}
