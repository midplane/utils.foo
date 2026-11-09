import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TimezonePlanner from '../tools/timezone-planner'
import {
  buildSlotText,
  cellStatus,
  dayShift,
  formatClock,
  formatClockAt,
  isWorkingSlot,
  offsetMinutesAt,
  rangeVerdict,
  sameZone,
  searchZones,
  utcDayStart,
} from '../tools/timezone-planner/planner'

const at = (iso: string) => Date.parse(iso)

afterEach(() => { vi.useRealTimers() })

describe('offsetMinutesAt', () => {
  it('uses the offset at the given instant, not at the current time', () => {
    // US DST ends on 2026-11-01 at 09:00 UTC for Los Angeles
    expect(offsetMinutesAt('America/Los_Angeles', at('2026-11-01T03:00:00Z'))).toBe(-420)
    expect(offsetMinutesAt('America/Los_Angeles', at('2026-11-01T12:00:00Z'))).toBe(-480)
  })

  it('does not depend on the DST rules of the process zone', () => {
    // 02:30 UTC wall time on 2026-03-08 does not exist in Los Angeles local time
    expect(offsetMinutesAt('Asia/Tokyo', at('2026-03-08T02:30:00Z'))).toBe(540)
    expect(offsetMinutesAt('Asia/Tokyo', at('2026-03-08T01:00:00Z'))).toBe(540)
  })

  it('handles half- and quarter-hour zones', () => {
    const t = at('2026-11-09T03:00:00Z')
    expect(offsetMinutesAt('Asia/Kolkata', t)).toBe(330)
    expect(offsetMinutesAt('Asia/Kathmandu', t)).toBe(345)
    expect(offsetMinutesAt('Pacific/Chatham', t)).toBe(825)
    expect(offsetMinutesAt('America/St_Johns', t)).toBe(-210)
  })
})

describe('formatClock', () => {
  it('keeps the minutes of non-whole-hour offsets', () => {
    expect(formatClock(480)).toBe('8am')
    expect(formatClock(510)).toBe('8:30am')
    expect(formatClockAt('Asia/Kolkata', at('2026-11-09T03:00:00Z'))).toBe('8:30am')
    expect(formatClockAt('Asia/Kathmandu', at('2026-11-09T03:00:00Z'))).toBe('8:45am')
    expect(formatClockAt('America/St_Johns', at('2026-11-09T00:00:00Z'))).toBe('8:30pm')
    expect(formatClockAt('UTC', at('2026-11-10T00:00:00Z'))).toBe('12am')
  })
})

describe('working hours', () => {
  it('needs the full one-hour slot inside the window', () => {
    expect(isWorkingSlot(17 * 60 + 30, 9, 18)).toBe(false)
    expect(isWorkingSlot(17 * 60, 9, 18)).toBe(true)
    expect(isWorkingSlot(8 * 60 + 30, 9, 18)).toBe(false)
    expect(isWorkingSlot(9 * 60 + 30, 9, 18)).toBe(true)
  })

  it('supports a window that goes across midnight', () => {
    expect(isWorkingSlot(23 * 60, 22, 6)).toBe(true)
    expect(isWorkingSlot(2 * 60, 22, 6)).toBe(true)
    expect(isWorkingSlot(5 * 60, 22, 6)).toBe(true)
    expect(isWorkingSlot(6 * 60, 22, 6)).toBe(false)
    expect(isWorkingSlot(12 * 60, 22, 6)).toBe(false)
  })

  it('rates cells with the offset of that cell on a DST change day', () => {
    // US DST ends on 2026-11-01 at 09:00 UTC. 01:00Z is 6pm PDT (Oct 31), 16:00Z is 8am PST.
    const la = ['America/Los_Angeles']
    expect(cellStatus(la, at('2026-11-01T01:00:00Z'), 9, 18)).toBe('bad')
    expect(cellStatus(la, at('2026-11-01T16:00:00Z'), 9, 18)).toBe('bad')
    expect(cellStatus(la, at('2026-11-01T17:00:00Z'), 9, 18)).toBe('good')
  })
})

describe('rangeVerdict', () => {
  it('reports a partial overlap when some cells are good and others are bad', () => {
    expect(rangeVerdict(['bad', 'good'])).toBe('some')
    expect(rangeVerdict(['good', 'good'])).toBe('all')
    expect(rangeVerdict(['bad', 'bad'])).toBe('none')
  })
})

describe('zone search and identity', () => {
  const list = [
    { iana: 'America/Sao_Paulo', label: 'São Paulo', region: 'Americas' },
    { iana: 'America/Bogota', label: 'Bogotá', region: 'Americas' },
    { iana: 'Asia/Kolkata', label: 'Mumbai / Delhi', region: 'Asia' },
  ]

  it('matches names without accents', () => {
    expect(searchZones(list, 'sao paulo', () => false).map(t => t.iana)).toEqual(['America/Sao_Paulo'])
    expect(searchZones(list, 'BOGOTA', () => false).map(t => t.iana)).toEqual(['America/Bogota'])
  })

  it('treats zone aliases as the same zone', () => {
    expect(sameZone('Asia/Calcutta', 'Asia/Kolkata')).toBe(true)
    expect(sameZone('Europe/Kiev', 'Europe/Kyiv')).toBe(true)
    expect(sameZone('Asia/Kolkata', 'Asia/Colombo')).toBe(false)
    expect(sameZone('Not/AZone', 'Also/NotAZone')).toBe(false)
    const existing = ['Asia/Calcutta']
    const hits = searchZones(list, 'mumbai', iana => existing.some(e => sameZone(e, iana)))
    expect(hits).toEqual([])
  })
})

describe('slot text', () => {
  it('shows minutes and marks zones that are on another date', () => {
    const start = at('2026-11-10T01:00:00Z')
    const text = buildSlotText(
      [
        { iana: 'America/Los_Angeles', label: 'Los Angeles' },
        { iana: 'Asia/Kolkata', label: 'Mumbai / Delhi' },
        { iana: 'Asia/Tokyo', label: 'Tokyo' },
      ],
      start,
      start + 3_600_000,
    )
    expect(text).toBe([
      'Meeting slot: 1h block',
      '  Los Angeles (PST): 5pm – 6pm',
      '  Mumbai / Delhi (GMT+5:30): 6:30am – 7:30am (+1 day)',
      '  Tokyo (GMT+9): 10am – 11am (+1 day)',
    ].join('\n'))
    expect(dayShift('America/Los_Angeles', 'Asia/Tokyo', start)).toBe(-1)
  })

  it('takes the UTC day of the instant', () => {
    expect(utcDayStart(at('2026-11-09T23:59:00Z'))).toBe(at('2026-11-09T00:00:00Z'))
  })
})

describe('TimezonePlanner', () => {
  const rowClock = (container: HTMLElement) => container.textContent?.match(/\d{1,2}:\d\d\s?[AP]M/)?.[0]

  it('updates the clock in each row as minutes pass', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    vi.setSystemTime(new Date('2026-11-09T10:05:00Z'))
    const { container } = render(<TimezonePlanner />)
    const before = rowClock(container)
    act(() => { vi.advanceTimersByTime(5 * 60_000) })
    expect(rowClock(container)).not.toBe(before)
    const expected = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date())
    expect(rowClock(container)).toBe(expected)
  })

  it('says "Partial overlap" when part of the selection is in work hours', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    vi.setSystemTime(new Date('2026-11-09T10:05:00Z'))
    const { container } = render(<TimezonePlanner />)
    const offset = offsetMinutesAt(Intl.DateTimeFormat().resolvedOptions().timeZone, Date.now())
    // UTC hour of the cell whose local start is 8:00 or later, and the next cell
    const first = (((8 * 60 - offset) / 60) % 24 + 24) % 24
    const cells = container.querySelectorAll('.cursor-pointer.relative.flex-1')
    const a = cells[Math.ceil(first) % 24]!
    const b = cells[(Math.ceil(first) + 1) % 24]!
    fireEvent.mouseDown(a)
    fireEvent.mouseEnter(b)
    fireEvent.mouseUp(b)
    expect(screen.getByText('Partial overlap')).toBeTruthy()
  })

  it('finds a city when the query has no accents', () => {
    render(<TimezonePlanner />)
    const input = screen.getByPlaceholderText('Add timezone…')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'sao paulo' } })
    expect(screen.getByText('São Paulo')).toBeTruthy()
  })
})
