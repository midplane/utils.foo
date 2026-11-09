import { describe, it, expect } from 'vitest'
import { parseField, matchesField, parseCron, computeNextDates } from '../tools/cron-parser/logic'

describe('parseField', () => {
  it('wildcard * → "every"', () => {
    expect(parseField('*', 0, 59).description).toBe('every')
    expect(parseField('*', 0, 59).valid).toBe(true)
  })

  it('single valid number', () => {
    const f = parseField('5', 0, 59)
    expect(f.valid).toBe(true)
    expect(f.description).toBe('5')
  })

  it('single number out of range → invalid', () => {
    expect(parseField('60', 0, 59).valid).toBe(false)
    expect(parseField('-1', 0, 59).valid).toBe(false)
  })

  it('list a,b,c', () => {
    const f = parseField('1,15,30', 0, 59)
    expect(f.valid).toBe(true)
    expect(f.description).toBe('1, 15, 30')
  })

  it('list with out-of-range value → invalid', () => {
    expect(parseField('1,60,30', 0, 59).valid).toBe(false)
  })

  it('range a-b', () => {
    const f = parseField('0-5', 0, 59)
    expect(f.valid).toBe(true)
    expect(f.description).toBe('0 through 5')
  })

  it('inverted range → invalid', () => {
    expect(parseField('5-0', 0, 59).valid).toBe(false)
  })

  it('step */15', () => {
    const f = parseField('*/15', 0, 59)
    expect(f.valid).toBe(true)
    expect(f.description).toContain('15')
  })

  it('step 0/5', () => {
    const f = parseField('0/5', 0, 59)
    expect(f.valid).toBe(true)
    expect(f.description).toContain('5')
  })

  it('step with out-of-range start → invalid', () => {
    expect(parseField('99/5', 0, 59).valid).toBe(false)
  })

  it('named days resolved via names array', () => {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    const f = parseField('Mon', 0, 7, days)
    expect(f.valid).toBe(true)
    expect(f.description).toBe('Mon')
  })
})

describe('matchesField', () => {
  it('* matches any value', () => {
    expect(matchesField(0, '*', 0, 59)).toBe(true)
    expect(matchesField(59, '*', 0, 59)).toBe(true)
  })

  it('exact number matches only itself', () => {
    expect(matchesField(5, '5', 0, 59)).toBe(true)
    expect(matchesField(6, '5', 0, 59)).toBe(false)
  })

  it('list matches members', () => {
    expect(matchesField(1, '1,15,30', 0, 59)).toBe(true)
    expect(matchesField(15, '1,15,30', 0, 59)).toBe(true)
    expect(matchesField(2, '1,15,30', 0, 59)).toBe(false)
  })

  it('range matches values within bounds', () => {
    expect(matchesField(3, '1-5', 0, 59)).toBe(true)
    expect(matchesField(0, '1-5', 0, 59)).toBe(false)
    expect(matchesField(6, '1-5', 0, 59)).toBe(false)
  })

  it('step */15 matches 0, 15, 30, 45', () => {
    expect(matchesField(0, '*/15', 0, 59)).toBe(true)
    expect(matchesField(15, '*/15', 0, 59)).toBe(true)
    expect(matchesField(30, '*/15', 0, 59)).toBe(true)
    expect(matchesField(45, '*/15', 0, 59)).toBe(true)
    expect(matchesField(1, '*/15', 0, 59)).toBe(false)
  })

  it('DOW: 7 is treated as Sunday (0)', () => {
    expect(matchesField(0, '7', 0, 7)).toBe(true)
  })

  it('named month abbreviations', () => {
    expect(matchesField(1, 'Jan', 1, 12)).toBe(true)
    expect(matchesField(12, 'Dec', 1, 12)).toBe(true)
    expect(matchesField(6, 'Jan', 1, 12)).toBe(false)
  })

  it('named day abbreviations', () => {
    expect(matchesField(1, 'Mon', 0, 7)).toBe(true)
    expect(matchesField(5, 'Fri', 0, 7)).toBe(true)
    expect(matchesField(3, 'Mon', 0, 7)).toBe(false)
  })
})

describe('parseCron', () => {
  it('rejects expressions that do not have exactly 5 fields', () => {
    expect(parseCron('* * * *').valid).toBe(false)
    expect(parseCron('* * * * * *').valid).toBe(false)
    expect(parseCron('').valid).toBe(false)
  })

  it('"* * * * *" — every minute', () => {
    const r = parseCron('* * * * *')
    expect(r.valid).toBe(true)
    expect(r.description).toContain('every minute')
    expect(r.description).toContain('every hour')
  })

  it('"0 * * * *" — every hour at :00', () => {
    const r = parseCron('0 * * * *')
    expect(r.valid).toBe(true)
    expect(r.description).toContain('at minute 0')
    expect(r.description).toContain('every hour')
  })

  it('"0 9 * * 1" — weekday field described', () => {
    const r = parseCron('0 9 * * 1')
    expect(r.valid).toBe(true)
    expect(r.description).toContain('9')
    expect(r.description).toContain('Mon')
  })

  it('"0 0 1 * *" — day-of-month field described', () => {
    const r = parseCron('0 0 1 * *')
    expect(r.valid).toBe(true)
    expect(r.description).toContain('day 1')
  })

  it('"0 12 * * *" — noon', () => {
    const r = parseCron('0 12 * * *')
    expect(r.valid).toBe(true)
    expect(r.description).toContain('12')
  })

  it('"60 * * * *" — invalid minute', () => {
    const r = parseCron('60 * * * *')
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/minute/i)
  })

  it('"0 24 * * *" — invalid hour', () => {
    const r = parseCron('0 24 * * *')
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/hour/i)
  })

  it('named day "Mon" in DOW field is valid', () => {
    expect(parseCron('0 9 * * Mon').valid).toBe(true)
  })

  it('named month "Jan" in month field is valid', () => {
    expect(parseCron('0 0 1 Jan *').valid).toBe(true)
  })

  it('numeric month is valid', () => {
    expect(parseCron('0 0 1 1 *').valid).toBe(true)
  })

  it('provides fields object with each parsed field', () => {
    const r = parseCron('*/5 2 * * *')
    expect(r.fields.minute.valid).toBe(true)
    expect(r.fields.hour.valid).toBe(true)
    expect(r.fields.hour.description).toBe('2')
  })

  it('returns nextDates for a valid expression', () => {
    const r = parseCron('* * * * *')
    expect(r.nextDates.length).toBe(5)
    r.nextDates.forEach(d => expect(d).toBeInstanceOf(Date))
  })

  it('returns no nextDates for invalid expressions', () => {
    expect(parseCron('99 * * * *').nextDates).toHaveLength(0)
  })
})

// ─── Regression tests ─────────────────────────────────────────────────────────

// All dates use local-time constructors, so the tests pass in all time zones.
const FROM = new Date(2026, 10, 9, 10, 15, 30) // Mon 2026-11-09 10:15:30

const local = (d: Date) =>
  `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`

describe('field syntax', () => {
  it('range with step a-b/n', () => {
    expect(parseField('1-10/3', 0, 59).valid).toBe(true)
    expect([0, 1, 2, 4, 7, 10, 13].map(v => matchesField(v, '1-10/3', 0, 59)))
      .toEqual([false, true, false, true, true, true, false])
  })

  it('list that contains ranges and steps', () => {
    const f = parseField('1-3,10,*/20', 0, 59)
    expect(f.valid).toBe(true)
    expect(f.description).toBe('1 through 3, 10, every 20 (starting at 0)')
    expect([2, 10, 40, 11].map(v => matchesField(v, '1-3,10,*/20', 0, 59)))
      .toEqual([true, true, true, false])
  })

  it('rejects malformed values', () => {
    for (const bad of ['5abc', '1.5', '1-2-3', '1,,2', '1,', '*/0', '1/2/3', '*/x', 'monday']) {
      expect(parseField(bad, 0, 59, ['Mon']).valid, bad).toBe(false)
    }
  })

  it('names are case-insensitive and work in ranges', () => {
    expect(parseCron('0 0 * jan-MAR mon-fri').valid).toBe(true)
    expect(matchesField(3, 'JAN-mar', 1, 12)).toBe(true)
    expect(matchesField(4, 'jan-mar', 1, 12)).toBe(false)
  })

  it('weekday 7 is Sunday in ranges and lists', () => {
    expect(matchesField(0, '5-7', 0, 7)).toBe(true)
    expect(matchesField(0, '1,7', 0, 7)).toBe(true)
    expect(parseCron('0 9 * * 5-7').description).toContain('Fri through Sun')
  })
})

describe('computeNextDates', () => {
  it('ORs day-of-month and day-of-week when both are restricted', () => {
    const r = parseCron('0 0 13 * 5', FROM)
    expect(r.description).toContain('on day 13 of the month or on Fri')
    expect(r.nextDates.map(local)).toEqual([
      '2026-11-13 0:00', // Friday the 13th
      '2026-11-20 0:00',
      '2026-11-27 0:00',
      '2026-12-4 0:00',
      '2026-12-11 0:00',
    ])
    expect(parseCron('0 0 1 * 1', FROM).nextDates.map(local)).toContain('2026-12-1 0:00') // a Tuesday
  })

  it('ANDs the day fields when one starts with *', () => {
    const r = parseCron('0 0 */2 * 1', FROM)
    r.nextDates.forEach(d => {
      expect(d.getDay()).toBe(1)
      expect(d.getDate() % 2).toBe(1)
    })
    expect(r.nextDates).toHaveLength(5)
  })

  it('finds five runs for a yearly schedule', () => {
    expect(computeNextDates(['0', '0', '1', '1', '*'], 5, FROM).map(local))
      .toEqual(['2027-1-1 0:00', '2028-1-1 0:00', '2029-1-1 0:00', '2030-1-1 0:00', '2031-1-1 0:00'])
  })

  it('finds Feb 29 only in leap years', () => {
    expect(parseCron('0 0 29 2 *', FROM).nextDates.map(local))
      .toEqual(['2028-2-29 0:00', '2032-2-29 0:00', '2036-2-29 0:00', '2040-2-29 0:00', '2044-2-29 0:00'])
  })

  it('returns no runs for an impossible schedule, and does not hang', () => {
    const start = Date.now()
    expect(parseCron('0 0 31 2 *', FROM).nextDates).toEqual([])
    expect(parseCron('0 0 30 2 *', FROM).nextDates).toEqual([])
    expect(Date.now() - start).toBeLessThan(1000)
  })

  it('skips months that do not have day 31', () => {
    expect(parseCron('0 12 31 * *', FROM).nextDates.map(local))
      .toEqual(['2026-12-31 12:00', '2027-1-31 12:00', '2027-3-31 12:00', '2027-5-31 12:00', '2027-7-31 12:00'])
  })

  it('starts at the next minute', () => {
    expect(local(parseCron('* * * * *', FROM).nextDates[0]!)).toBe('2026-11-9 10:16')
    expect(local(parseCron('15 10 * * *', FROM).nextDates[0]!)).toBe('2026-11-10 10:15')
  })

  it('gives unique, ascending runs at the requested local time across DST changes', () => {
    // These ranges include the US and EU DST changes in March and October/November.
    for (const from of [new Date(2026, 2, 1), new Date(2026, 9, 20)]) {
      const r = parseCron('30 1,2 * * *', from)
      expect(r.nextDates.length).toBe(5)
      r.nextDates.forEach((d, i) => {
        expect([1, 2]).toContain(d.getHours())
        expect(d.getMinutes()).toBe(30)
        if (i > 0) expect(d.getTime()).toBeGreaterThan(r.nextDates[i - 1]!.getTime())
      })
    }
  })
})
