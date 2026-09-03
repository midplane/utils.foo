import { describe, it, expect } from 'vitest'
import { parseISODate } from '../tools/gantt-chart/calendar'
import {
  buildTimeline,
  dayForX,
  isoWeekNumber,
  startOfWeek,
  xForDay,
} from '../tools/gantt-chart/timeline'

const iso = (text: string) => parseISODate(text) as number

describe('gantt timeline — week maths', () => {
  it('starts weeks on Monday', () => {
    // 2024-03-11 is a Monday, 2024-03-17 the Sunday that closes that week.
    expect(startOfWeek(iso('2024-03-11'))).toBe(iso('2024-03-11'))
    expect(startOfWeek(iso('2024-03-17'))).toBe(iso('2024-03-11'))
    expect(startOfWeek(iso('2024-03-14'))).toBe(iso('2024-03-11'))
  })

  it('numbers ISO weeks, including the year-boundary cases', () => {
    expect(isoWeekNumber(iso('2024-03-11'))).toBe(11)
    expect(isoWeekNumber(iso('2024-01-01'))).toBe(1)
    // A week belongs to the year holding its Thursday, so these late-December
    // and early-January dates land in the neighbouring year's numbering.
    expect(isoWeekNumber(iso('2020-12-28'))).toBe(53)
    expect(isoWeekNumber(iso('2021-01-01'))).toBe(53)
    expect(isoWeekNumber(iso('2024-12-30'))).toBe(1)
  })
})

describe('gantt timeline — scale', () => {
  const timeline = () => buildTimeline(iso('2024-03-11'), iso('2024-04-19'), 'day')

  it('maps days to pixels and back', () => {
    const t = timeline()
    const day = iso('2024-03-20')
    expect(dayForX(t, xForDay(t, day))).toBe(day)
  })

  it('pads either side of the project span', () => {
    const t = timeline()
    expect(t.origin).toBeLessThan(iso('2024-03-11'))
    expect(t.end).toBeGreaterThan(iso('2024-04-19'))
  })

  it('snaps the origin to a Monday at day and week zoom', () => {
    for (const zoom of ['day', 'week'] as const) {
      const t = buildTimeline(iso('2024-03-11'), iso('2024-04-19'), zoom)
      expect(startOfWeek(t.origin)).toBe(t.origin)
    }
  })

  it('covers the full span with both header bands, without gaps', () => {
    for (const zoom of ['day', 'week', 'month', 'quarter'] as const) {
      const t = buildTimeline(iso('2024-03-11'), iso('2025-08-19'), zoom)
      for (const band of [t.upper, t.lower]) {
        expect(band.length).toBeGreaterThan(0)
        expect(band[0]?.x).toBeCloseTo(0, 5)
        const last = band[band.length - 1]
        expect((last?.x ?? 0) + (last?.width ?? 0)).toBeCloseTo(t.width, 5)
        // Each cell must begin exactly where the previous one ended.
        for (let i = 1; i < band.length; i++) {
          const prev = band[i - 1]
          expect(band[i]?.x).toBeCloseTo((prev?.x ?? 0) + (prev?.width ?? 0), 5)
        }
      }
    }
  })

  it('labels the coarse band above the fine one', () => {
    const t = buildTimeline(iso('2024-03-11'), iso('2024-04-19'), 'day')
    expect(t.upper[0]?.label).toMatch(/^[A-Z][a-z]{2} \d{4}$/)
    expect(t.lower[0]?.label).toMatch(/^\d+$/)
    expect(t.upper.length).toBeLessThan(t.lower.length)
  })

  it('gets wider as the zoom gets finer', () => {
    const span = [iso('2024-03-11'), iso('2024-09-19')] as const
    const widths = (['quarter', 'month', 'week', 'day'] as const).map(
      (zoom) => buildTimeline(span[0], span[1], zoom).width
    )
    for (let i = 1; i < widths.length; i++) {
      expect(widths[i]).toBeGreaterThan(widths[i - 1] as number)
    }
  })
})
