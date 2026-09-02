/**
 * Maps day numbers onto x pixels and builds the two-row date header.
 *
 * The header is always two bands — a coarse one over a fine one — because a
 * single row of dates stops being readable the moment a project spans more than
 * a few weeks: "12" means nothing without the month sitting above it.
 */

import { CivilDate, dayOfWeek, formatISODate, fromCivil, toCivil } from './calendar'

export const ZOOM_LEVELS = ['day', 'week', 'month', 'quarter'] as const
export type ZoomLevel = (typeof ZOOM_LEVELS)[number]

export const ZOOM_LABELS: Record<ZoomLevel, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  quarter: 'Quarter',
}

/** Pixels per calendar day at each zoom. */
export const DAY_WIDTH: Record<ZoomLevel, number> = {
  day: 34,
  week: 13,
  month: 4.6,
  quarter: 1.7,
}

/** Days of breathing room drawn either side of the project span. */
const PADDING_DAYS: Record<ZoomLevel, number> = {
  day: 2,
  week: 5,
  month: 14,
  quarter: 45,
}

export interface TimelineBand {
  key: string
  label: string
  /** Left edge in pixels, and width of the band. */
  x: number
  width: number
  /** First day covered, for hit-testing and the today marker. */
  day: number
}

export interface Timeline {
  zoom: ZoomLevel
  /** First and last day rendered, inclusive. */
  origin: number
  end: number
  dayWidth: number
  width: number
  upper: TimelineBand[]
  lower: TimelineBand[]
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** The Monday on or before `day`. */
export function startOfWeek(day: number): number {
  const weekday = dayOfWeek(day)
  // dayOfWeek is 0 = Sunday, so Sunday belongs to the week that began 6 days ago.
  return day - (weekday === 0 ? 6 : weekday - 1)
}

function startOfMonth(day: number): number {
  const { year, month } = toCivil(day)
  return fromCivil({ year, month, day: 1 })
}

function addMonths(civil: CivilDate, count: number): CivilDate {
  const zeroBased = civil.month - 1 + count
  return {
    year: civil.year + Math.floor(zeroBased / 12),
    month: ((zeroBased % 12) + 12) % 12 + 1,
    day: 1,
  }
}

function startOfQuarter(day: number): number {
  const { year, month } = toCivil(day)
  return fromCivil({ year, month: month - ((month - 1) % 3), day: 1 })
}

/** ISO-8601 week number, so week labels agree with the rest of the world. */
export function isoWeekNumber(day: number): number {
  // The Thursday of this week decides which year — and therefore which week
  // numbering — the week belongs to.
  const thursday = startOfWeek(day) + 3
  const { year } = toCivil(thursday)
  const jan4 = fromCivil({ year, month: 1, day: 4 })
  return Math.floor((thursday - startOfWeek(jan4)) / 7) + 1
}

export function buildTimeline(projectStart: number, projectEnd: number, zoom: ZoomLevel): Timeline {
  const padding = PADDING_DAYS[zoom]
  const dayWidth = DAY_WIDTH[zoom]

  // Snapping the origin to a period boundary keeps the first header cell full
  // width; starting mid-month left a stub cell whose label did not fit.
  const rawStart = projectStart - padding
  const origin =
    zoom === 'day' || zoom === 'week'
      ? startOfWeek(rawStart)
      : zoom === 'month'
        ? startOfMonth(rawStart)
        : startOfQuarter(rawStart)
  const end = projectEnd + padding

  const totalDays = Math.max(1, end - origin + 1)
  const width = totalDays * dayWidth
  const xFor = (day: number) => (day - origin) * dayWidth

  const upper: TimelineBand[] = []
  const lower: TimelineBand[] = []

  if (zoom === 'day' || zoom === 'week') {
    // Upper: months. Lower: individual days, or weeks once days get narrow.
    let cursor = startOfMonth(origin)
    while (cursor <= end) {
      const civil = toCivil(cursor)
      const next = fromCivil(addMonths(civil, 1))
      const from = Math.max(cursor, origin)
      upper.push({
        key: `m${cursor}`,
        label: `${MONTH_SHORT[civil.month - 1]} ${civil.year}`,
        x: xFor(from),
        width: (Math.min(next, end + 1) - from) * dayWidth,
        day: from,
      })
      cursor = next
    }

    if (zoom === 'day') {
      for (let day = origin; day <= end; day++) {
        lower.push({
          key: `d${day}`,
          label: String(toCivil(day).day),
          x: xFor(day),
          width: dayWidth,
          day,
        })
      }
    } else {
      for (let day = startOfWeek(origin); day <= end; day += 7) {
        const from = Math.max(day, origin)
        lower.push({
          key: `w${day}`,
          label: `W${isoWeekNumber(day)}`,
          x: xFor(from),
          width: (Math.min(day + 7, end + 1) - from) * dayWidth,
          day: from,
        })
      }
    }
  } else if (zoom === 'month') {
    let cursor = startOfQuarter(origin)
    while (cursor <= end) {
      const civil = toCivil(cursor)
      const next = fromCivil(addMonths(civil, 3))
      const from = Math.max(cursor, origin)
      upper.push({
        key: `q${cursor}`,
        label: `Q${Math.floor((civil.month - 1) / 3) + 1} ${civil.year}`,
        x: xFor(from),
        width: (Math.min(next, end + 1) - from) * dayWidth,
        day: from,
      })
      cursor = next
    }
    let month = startOfMonth(origin)
    while (month <= end) {
      const civil = toCivil(month)
      const next = fromCivil(addMonths(civil, 1))
      const from = Math.max(month, origin)
      lower.push({
        key: `m${month}`,
        label: MONTH_SHORT[civil.month - 1] ?? '',
        x: xFor(from),
        width: (Math.min(next, end + 1) - from) * dayWidth,
        day: from,
      })
      month = next
    }
  } else {
    let year = toCivil(origin).year
    while (fromCivil({ year, month: 1, day: 1 }) <= end) {
      const from = Math.max(fromCivil({ year, month: 1, day: 1 }), origin)
      const next = fromCivil({ year: year + 1, month: 1, day: 1 })
      upper.push({
        key: `y${year}`,
        label: String(year),
        x: xFor(from),
        width: (Math.min(next, end + 1) - from) * dayWidth,
        day: from,
      })
      year++
    }
    let quarter = startOfQuarter(origin)
    while (quarter <= end) {
      const civil = toCivil(quarter)
      const next = fromCivil(addMonths(civil, 3))
      const from = Math.max(quarter, origin)
      lower.push({
        key: `q${quarter}`,
        label: `Q${Math.floor((civil.month - 1) / 3) + 1}`,
        x: xFor(from),
        width: (Math.min(next, end + 1) - from) * dayWidth,
        day: from,
      })
      quarter = next
    }
  }

  return { zoom, origin, end, dayWidth, width, upper, lower }
}

/** Pixel offset of a day's left edge. */
export function xForDay(timeline: Timeline, day: number): number {
  return (day - timeline.origin) * timeline.dayWidth
}

/** The day under a pixel offset, rounded to the nearest day boundary. */
export function dayForX(timeline: Timeline, x: number): number {
  return timeline.origin + Math.round(x / timeline.dayWidth)
}

/** The day containing a pixel offset, for hover read-outs. */
export function dayAtX(timeline: Timeline, x: number): number {
  return timeline.origin + Math.floor(x / timeline.dayWidth)
}

export function formatDayLabel(day: number): string {
  const { year, month, day: date } = toCivil(day)
  return `${date} ${MONTH_SHORT[month - 1]} ${year}`
}

export { formatISODate }
