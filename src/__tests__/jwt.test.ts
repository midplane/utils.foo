import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { decodeJWT, formatTimestamp, isExpired } from '../tools/jwt-decoder/logic'

// Encode a plain object to base64url (no padding)
function b64url(obj: unknown): string {
  const json = JSON.stringify(obj)
  const b64 = btoa(unescape(encodeURIComponent(json)))
  return b64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function makeJWT(header: unknown, payload: unknown, sig = 'sig'): string {
  return `${b64url(header)}.${b64url(payload)}.${sig}`
}

describe('decodeJWT', () => {
  it('decodes a well-formed JWT', () => {
    const token = makeJWT({ alg: 'HS256', typ: 'JWT' }, { sub: '123', name: 'Alice' })
    const result = decodeJWT(token)
    expect(result.header).toMatchObject({ alg: 'HS256', typ: 'JWT' })
    expect(result.payload).toMatchObject({ sub: '123', name: 'Alice' })
    expect(result.signature).toBe('sig')
  })

  it('throws when there are only 2 parts', () => {
    expect(() => decodeJWT('abc.def')).toThrow('must have 3 parts')
  })

  it('throws when there are 4 parts', () => {
    expect(() => decodeJWT('a.b.c.d')).toThrow('must have 3 parts')
  })

  it('throws on invalid base64 in the header', () => {
    expect(() => decodeJWT('!!!.abc.sig')).toThrow()
  })

  it('handles base64url chars: - and _ in payload', () => {
    // Build a payload whose base64url encoding will contain - or _
    // Any payload with non-ASCII chars after encoding will do
    const payload = { data: 'hello+world/test' }
    const token = makeJWT({ alg: 'none' }, payload)
    const result = decodeJWT(token)
    expect(result.payload).toMatchObject(payload)
  })

  it('decodes the well-known Ada Lovelace easter-egg token', () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
      '.eyJzdWIiOiJhZGFfbG92ZWxhY2UiLCJuYW1lIjoiQWRhIExvdmVsYWNlIiwicm9sZSI6ImZpcnN0X3Byb2dyYW1tZXIiLCJpYXQiOi00MDcwOTA4ODAwLCJleHAiOjQxMDI0NDQ4MDAsIm1vdHRvIjoiVGhlIG1vcmUgSSBzdHVkeSwgdGhlIG1vcmUgaW5zYXRpYWJsZSBkbyBJIGZlZWwgbXkgZ2VuaXVzIGZvciBpdCB0byBiZS4ifQ' +
      '.first-programmer-signature'
    const result = decodeJWT(token)
    expect(result.header).toMatchObject({ alg: 'HS256', typ: 'JWT' })
    expect(result.payload.sub).toBe('ada_lovelace')
    expect(result.payload.name).toBe('Ada Lovelace')
  })

  it('preserves numeric claims as numbers', () => {
    const now = Math.floor(Date.now() / 1000)
    const token = makeJWT({ alg: 'HS256' }, { exp: now + 3600, iat: now })
    const result = decodeJWT(token)
    expect(typeof result.payload.exp).toBe('number')
    expect(typeof result.payload.iat).toBe('number')
  })
})

describe('isExpired', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false for a future exp', () => {
    const futureExp = Math.floor(new Date('2025-01-01').getTime() / 1000)
    expect(isExpired(futureExp)).toBe(false)
  })

  it('returns true for a past exp', () => {
    const pastExp = Math.floor(new Date('2023-01-01').getTime() / 1000)
    expect(isExpired(pastExp)).toBe(true)
  })

  it('returns false when exp is a string', () => {
    expect(isExpired('2020-01-01')).toBe(false)
  })

  it('returns false when exp is undefined', () => {
    expect(isExpired(undefined)).toBe(false)
  })
})

describe('formatTimestamp', () => {
  it('returns null for non-numeric input', () => {
    expect(formatTimestamp('not-a-number')).toBeNull()
    expect(formatTimestamp(null)).toBeNull()
    expect(formatTimestamp(undefined)).toBeNull()
  })

  it('returns a non-empty string for a valid Unix timestamp', () => {
    const result = formatTimestamp(1700000000)
    expect(typeof result).toBe('string')
    expect(result!.length).toBeGreaterThan(0)
  })

  it('treats the value as seconds, not milliseconds', () => {
    // 0 seconds = epoch = 1970
    const result = formatTimestamp(0)
    expect(result).toContain('1970')
  })
})
