import { describe, it, expect } from 'vitest'
import { parseField, matchesField, parseCron } from '../tools/cron-parser/logic'

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
