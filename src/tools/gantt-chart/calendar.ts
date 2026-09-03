/**
 * Civil-date arithmetic for the Gantt engine.
 *
 * Dates here are integer *day numbers* — days elapsed since 1970-01-01 — not
 * `Date` objects. A Gantt bar is a span of calendar days with no time of day,
 * and `new Date('2024-03-10')` parses as UTC midnight, which in any negative
 * UTC offset is the 9th locally. Every "my task moved back a day" bug in a
 * Gantt tool traces to that. Integers have no timezone, so the whole scheduler
 * is arithmetic and the conversion to a display string happens once, at the
 * edge.
 */

export const MS_PER_DAY = 86_400_000

/** Weekday index of a day number, 0 = Sunday. */
export function dayOfWeek(day: number): number {
  // 1970-01-01 (day 0) was a Thursday, hence the +4 phase shift.
  return (((day + 4) % 7) + 7) % 7
}

export interface CivilDate {
  year: number
  /** 1-12, not the 0-11 that `Date` uses. */
  month: number
  day: number
}

export function toCivil(day: number): CivilDate {
  const date = new Date(day * MS_PER_DAY)
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

export function fromCivil({ year, month, day }: CivilDate): number {
  return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY)
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Parse `YYYY-MM-DD` to a day number, or null.
 *
 * Rejects out-of-range components rather than letting `Date.UTC` roll them
 * over: "2024-02-31" silently becoming March 2nd is worse than an error the
 * importer can report against the offending row.
 */
export function parseISODate(text: string): number | null {
  const match = ISO_DATE.exec(text.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const value = fromCivil({ year, month, day })
  // Round-trip check catches the rollovers that survive the range test above.
  const back = toCivil(value)
  if (back.year !== year || back.month !== month || back.day !== day) return null
  return value
}

export function formatISODate(day: number): string {
  const { year, month, day: date } = toCivil(day)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${year}-${pad(month)}-${pad(date)}`
}

/** Today as a day number, read from the local clock. */
export function todayDayNumber(now: Date = new Date()): number {
  return fromCivil({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  })
}

// ─── Working calendar ─────────────────────────────────────────────────────────

export interface WorkCalendar {
  /** Indexed by `dayOfWeek`, 0 = Sunday. */
  workdays: readonly boolean[]
  /** Non-working dates as day numbers, on top of the weekly pattern. */
  holidays: ReadonlySet<number>
}

/** Monday to Friday, no holidays. */
export const DEFAULT_CALENDAR: WorkCalendar = {
  workdays: [false, true, true, true, true, true, false],
  holidays: new Set(),
}

/** Every day is a working day — used when a calendar excludes all seven. */
export const CONTINUOUS_CALENDAR: WorkCalendar = {
  workdays: [true, true, true, true, true, true, true],
  holidays: new Set(),
}

/**
 * A calendar that is guaranteed to contain at least one working weekday.
 *
 * Every walk below advances until it lands on a workday, so a calendar with all
 * seven days switched off would spin forever. The UI can reach that state with
 * six clicks, so the guard lives here rather than in the caller.
 */
export function safeCalendar(calendar: WorkCalendar): WorkCalendar {
  return calendar.workdays.some(Boolean) ? calendar : CONTINUOUS_CALENDAR
}

export function isWorkday(calendar: WorkCalendar, day: number): boolean {
  return calendar.workdays[dayOfWeek(day)] === true && !calendar.holidays.has(day)
}

/** The first working day at or after `day`. */
export function nextWorkday(calendar: WorkCalendar, day: number): number {
  const cal = safeCalendar(calendar)
  let cursor = day
  // A full week of weekend plus every holiday in a row is the worst case; the
  // bound stops a pathological holiday list from hanging the tab.
  for (let guard = 0; guard < 4000; guard++) {
    if (isWorkday(cal, cursor)) return cursor
    cursor++
  }
  return cursor
}

/** The last working day at or before `day`. */
export function previousWorkday(calendar: WorkCalendar, day: number): number {
  const cal = safeCalendar(calendar)
  let cursor = day
  for (let guard = 0; guard < 4000; guard++) {
    if (isWorkday(cal, cursor)) return cursor
    cursor--
  }
  return cursor
}

/**
 * Move `count` working days from `day`, which is snapped onto a workday first.
 * `count` of 0 returns that snapped day; negative counts walk backwards.
 */
export function shiftWorkdays(calendar: WorkCalendar, day: number, count: number): number {
  const cal = safeCalendar(calendar)
  let cursor = count >= 0 ? nextWorkday(cal, day) : previousWorkday(cal, day)
  const step = count >= 0 ? 1 : -1
  let remaining = Math.abs(Math.trunc(count))
  while (remaining > 0) {
    cursor += step
    if (isWorkday(cal, cursor)) remaining--
  }
  return cursor
}

/**
 * Working days in the inclusive span `[start, end]`.
 *
 * Inclusive because a task that starts and ends on the same day is one day of
 * work, not zero. Returns 0 when the range is inverted.
 */
export function workdaysBetween(calendar: WorkCalendar, start: number, end: number): number {
  if (end < start) return 0
  const cal = safeCalendar(calendar)
  let count = 0
  for (let cursor = start; cursor <= end; cursor++) {
    if (isWorkday(cal, cursor)) count++
  }
  return count
}

/**
 * The inclusive end date of a task starting at `start` and lasting `duration`
 * working days. A duration of 0 is a milestone and occupies no span.
 */
export function endFromDuration(calendar: WorkCalendar, start: number, duration: number): number {
  if (duration <= 0) return start
  return shiftWorkdays(calendar, start, duration - 1)
}

/** Working-day duration of the inclusive span `[start, end]`, at least 1. */
export function durationFromRange(calendar: WorkCalendar, start: number, end: number): number {
  return Math.max(1, workdaysBetween(calendar, start, end))
}
