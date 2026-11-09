import { describe, expect, it } from 'vitest'
import { formatDate, formatTimestamp, parseDate, parseTimestamp } from '../tools/epoch-converter/convert'

const ok = <T,>(result: { ok: true; value: T } | { ok: false; error: string }): T => {
  if (!result.ok) throw new Error(`Expected ok, got: ${result.error}`)
  return result.value
}

describe('parseTimestamp', () => {
  it.each([
    ['1699900800', 1699900800000, 's'],
    ['1699900800000', 1699900800000, 'ms'],
    ['0', 0, 's'],
    ['  1699900800  ', 1699900800000, 's'],
    ['-1000000000', -1000000000000, 's'],
    ['1699900800.5', 1699900800500, 's'],
    ['1699900800.123', 1699900800123, 's'],
    ['1699900800000.9', 1699900800000, 'ms'],
    ['0001699900800', 1699900800000, 's'],
    ['99999999999', 99999999999, 'ms'],
  ])('reads %j', (input, ms, unit) => {
    expect(ok(parseTimestamp(input))).toEqual({ ms, unit })
  })

  it.each(['1,699,900,800', '1.7e9', '1700000000xyz', 'abc', '-', '1.', '.5', '--1'])(
    'rejects %j',
    (input) => {
      expect(parseTimestamp(input).ok).toBe(false)
    },
  )

  it('rejects more than 13 digits', () => {
    const result = parseTimestamp('1699900800000000')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/Too many digits/)
  })

  it('does not produce negative zero', () => {
    expect(Object.is(ok(parseTimestamp('-0')).ms, 0)).toBe(true)
  })
})

describe('formatTimestamp', () => {
  it('floors to whole seconds, also before 1970', () => {
    expect(formatTimestamp(1699900800999, 's')).toBe('1699900800')
    expect(formatTimestamp(-1500, 's')).toBe('-2')
    expect(formatTimestamp(1699900800999, 'ms')).toBe('1699900800999')
  })
})

describe('formatDate', () => {
  it('formats UTC as ISO 8601 and omits zero milliseconds', () => {
    expect(formatDate(1699900800000, 'utc')).toBe('2023-11-13T18:40:00Z')
    expect(formatDate(1699900800123, 'utc')).toBe('2023-11-13T18:40:00.123Z')
    expect(formatDate(-1000000000000, 'utc')).toBe('1938-04-24T22:13:20Z')
  })

  it('formats local time with an explicit offset that parses back to the same instant', () => {
    for (const ms of [0, 1699900800000, 1699900800123, 1710054000000, -1000000000000]) {
      const text = formatDate(ms, 'local')
      expect(text).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?[+-]\d{2}:\d{2}$/)
      expect(ok(parseDate(text, 'local'))).toBe(ms)
      expect(ok(parseDate(text, 'utc'))).toBe(ms)
      expect(new Date(text).getTime()).toBe(ms)
    }
  })
})

describe('parseDate', () => {
  it('reads an ISO date without an offset in the selected zone', () => {
    expect(ok(parseDate('2023-11-13T12:00:00', 'utc'))).toBe(Date.UTC(2023, 10, 13, 12))
    expect(ok(parseDate('2023-11-13T12:00:00', 'local'))).toBe(new Date(2023, 10, 13, 12).getTime())
  })

  it('reads a date-only ISO string in the selected zone', () => {
    expect(ok(parseDate('2023-11-13', 'utc'))).toBe(Date.UTC(2023, 10, 13))
    expect(ok(parseDate('2023-11-13', 'local'))).toBe(new Date(2023, 10, 13).getTime())
  })

  it('uses an explicit offset whatever the selected zone', () => {
    const expected = Date.UTC(2023, 10, 13, 11, 30)
    for (const zone of ['utc', 'local'] as const) {
      expect(ok(parseDate('2023-11-13T12:00:00+00:30', zone))).toBe(expected)
      expect(ok(parseDate('2023-11-13T12:00:00+0030', zone))).toBe(expected)
      expect(ok(parseDate('2023-11-13T11:30:00Z', zone))).toBe(expected)
      expect(ok(parseDate('2023-11-13 11:30z', zone))).toBe(expected)
    }
  })

  it('keeps fractional seconds to the millisecond', () => {
    expect(ok(parseDate('2023-11-13T12:00:00.123456Z', 'utc'))).toBe(Date.UTC(2023, 10, 13, 12, 0, 0, 123))
    expect(ok(parseDate('2023-11-13T12:00:00.5Z', 'utc'))).toBe(Date.UTC(2023, 10, 13, 12, 0, 0, 500))
  })

  it.each(['2024-02-31', '2023-13-01', '2023-11-13T24:00', '2023-11-13T12:60', '2023-11-13T12:00:00+24:00'])(
    'rejects the impossible value %j',
    (input) => {
      expect(parseDate(input, 'utc').ok).toBe(false)
    },
  )

  it('reads other formats, and reads them as UTC when UTC is selected and there is no zone', () => {
    expect(ok(parseDate('Mon, 13 Nov 2023 12:00:00 GMT', 'local'))).toBe(Date.UTC(2023, 10, 13, 12))
    expect(ok(parseDate('Nov 13 2023 12:00:00', 'utc'))).toBe(Date.UTC(2023, 10, 13, 12))
    expect(ok(parseDate('Nov 13 2023 12:00:00', 'local'))).toBe(new Date(2023, 10, 13, 12).getTime())
  })

  it('rejects text that is not a date', () => {
    expect(parseDate('not a date', 'utc').ok).toBe(false)
  })
})
