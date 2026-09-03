import { describe, it, expect } from 'vitest'
import {
  DEFAULT_CALENDAR,
  CONTINUOUS_CALENDAR,
  dayOfWeek,
  durationFromRange,
  endFromDuration,
  formatISODate,
  isWorkday,
  nextWorkday,
  parseISODate,
  previousWorkday,
  safeCalendar,
  shiftWorkdays,
  workdaysBetween,
} from '../tools/gantt-chart/calendar'

const iso = (text: string) => parseISODate(text) as number

describe('gantt calendar — parsing', () => {
  it('round-trips an ISO date', () => {
    expect(formatISODate(iso('2024-03-10'))).toBe('2024-03-10')
    expect(formatISODate(iso('1999-12-31'))).toBe('1999-12-31')
  })

  it('is timezone-free: the same string always maps to the same integer', () => {
    // The whole point of day numbers. A UTC-parsed Date would shift this date
    // to the 9th anywhere west of Greenwich.
    expect(iso('2024-03-10')).toBe(iso('2024-03-10'))
    expect(iso('2024-03-11') - iso('2024-03-10')).toBe(1)
  })

  it('rejects dates that do not exist rather than rolling them over', () => {
    expect(parseISODate('2024-02-31')).toBeNull()
    expect(parseISODate('2023-02-29')).toBeNull()
    expect(parseISODate('2024-13-01')).toBeNull()
    expect(parseISODate('2024-00-10')).toBeNull()
  })

  it('accepts a real leap day', () => {
    expect(formatISODate(iso('2024-02-29'))).toBe('2024-02-29')
  })

  it('rejects malformed input', () => {
    expect(parseISODate('')).toBeNull()
    expect(parseISODate('10/03/2024')).toBeNull()
    expect(parseISODate('2024-3-1')).toBeNull()
    expect(parseISODate('nonsense')).toBeNull()
  })

  it('knows the weekday', () => {
    // 2024-03-10 was a Sunday.
    expect(dayOfWeek(iso('2024-03-10'))).toBe(0)
    expect(dayOfWeek(iso('2024-03-11'))).toBe(1)
    expect(dayOfWeek(iso('2024-03-16'))).toBe(6)
  })
})

describe('gantt calendar — working days', () => {
  it('treats weekends as non-working by default', () => {
    expect(isWorkday(DEFAULT_CALENDAR, iso('2024-03-08'))).toBe(true)
    expect(isWorkday(DEFAULT_CALENDAR, iso('2024-03-09'))).toBe(false)
    expect(isWorkday(DEFAULT_CALENDAR, iso('2024-03-10'))).toBe(false)
  })

  it('skips a weekend when advancing', () => {
    // Friday + 1 working day is the following Monday.
    expect(formatISODate(shiftWorkdays(DEFAULT_CALENDAR, iso('2024-03-08'), 1))).toBe('2024-03-11')
  })

  it('snaps a non-working start onto a working day', () => {
    expect(formatISODate(nextWorkday(DEFAULT_CALENDAR, iso('2024-03-09')))).toBe('2024-03-11')
    expect(formatISODate(previousWorkday(DEFAULT_CALENDAR, iso('2024-03-09')))).toBe('2024-03-08')
  })

  it('walks backwards for a negative count', () => {
    expect(formatISODate(shiftWorkdays(DEFAULT_CALENDAR, iso('2024-03-11'), -1))).toBe('2024-03-08')
  })

  it('honours holidays on top of the weekly pattern', () => {
    const calendar = { workdays: DEFAULT_CALENDAR.workdays, holidays: new Set([iso('2024-03-11')]) }
    expect(isWorkday(calendar, iso('2024-03-11'))).toBe(false)
    expect(formatISODate(shiftWorkdays(calendar, iso('2024-03-08'), 1))).toBe('2024-03-12')
  })

  it('counts an inclusive span, so a one-day task is one day', () => {
    expect(workdaysBetween(DEFAULT_CALENDAR, iso('2024-03-11'), iso('2024-03-11'))).toBe(1)
    expect(workdaysBetween(DEFAULT_CALENDAR, iso('2024-03-11'), iso('2024-03-15'))).toBe(5)
    // Spanning the weekend adds no working days.
    expect(workdaysBetween(DEFAULT_CALENDAR, iso('2024-03-11'), iso('2024-03-17'))).toBe(5)
  })

  it('returns zero for an inverted range', () => {
    expect(workdaysBetween(DEFAULT_CALENDAR, iso('2024-03-15'), iso('2024-03-11'))).toBe(0)
  })

  it('derives an end date from a duration', () => {
    // A 5-day task starting Monday ends Friday, not the following Monday.
    expect(formatISODate(endFromDuration(DEFAULT_CALENDAR, iso('2024-03-11'), 5))).toBe('2024-03-15')
    expect(formatISODate(endFromDuration(DEFAULT_CALENDAR, iso('2024-03-11'), 1))).toBe('2024-03-11')
  })

  it('gives a zero-duration milestone no span', () => {
    expect(formatISODate(endFromDuration(DEFAULT_CALENDAR, iso('2024-03-11'), 0))).toBe('2024-03-11')
  })

  it('derives a duration from a range, round-tripping with endFromDuration', () => {
    const start = iso('2024-03-11')
    for (const duration of [1, 3, 5, 8, 20]) {
      const end = endFromDuration(DEFAULT_CALENDAR, start, duration)
      expect(durationFromRange(DEFAULT_CALENDAR, start, end)).toBe(duration)
    }
  })

  it('counts every day when the calendar is continuous', () => {
    expect(workdaysBetween(CONTINUOUS_CALENDAR, iso('2024-03-11'), iso('2024-03-17'))).toBe(7)
  })

  it('falls back to a continuous calendar when no weekday is working', () => {
    // Reachable in the UI by switching all seven off; every walk below would
    // otherwise never terminate.
    const empty = { workdays: [false, false, false, false, false, false, false], holidays: new Set<number>() }
    expect(safeCalendar(empty)).toBe(CONTINUOUS_CALENDAR)
    expect(formatISODate(shiftWorkdays(empty, iso('2024-03-11'), 3))).toBe('2024-03-14')
  })
})
