import { describe, it, expect } from 'vitest'
import { md5, computeHash } from '../tools/hash/logic'

// RFC 1321 test vectors
describe('md5', () => {
  it('empty string', () => {
    expect(md5('')).toBe('d41d8cd98f00b204e9800998ecf8427e')
  })

  it('"abc"', () => {
    expect(md5('abc')).toBe('900150983cd24fb0d6963f7d28e17f72')
  })

  it('"The quick brown fox jumps over the lazy dog"', () => {
    expect(md5('The quick brown fox jumps over the lazy dog')).toBe('9e107d9d372bb6826bd81d3542a419d6')
  })

  it('"The quick brown fox jumps over the lazy dog." (with period)', () => {
    expect(md5('The quick brown fox jumps over the lazy dog.')).toBe('e4d909c290d0fb1ca068ffaddf22cbd0')
  })

  it('longer string — "message digest"', () => {
    expect(md5('message digest')).toBe('f96b697d7cb7938d525a2f31aaf161d0')
  })

  it('alphabet — "abcdefghijklmnopqrstuvwxyz"', () => {
    expect(md5('abcdefghijklmnopqrstuvwxyz')).toBe('c3fcd3d76192e4007dfb496cca67e13b')
  })

  it('produces a 32-character lowercase hex string', () => {
    const result = md5('anything')
    expect(result).toHaveLength(32)
    expect(result).toMatch(/^[0-9a-f]+$/)
  })

  it('is deterministic — same input always produces same output', () => {
    expect(md5('hello')).toBe(md5('hello'))
  })

  it('different inputs produce different hashes', () => {
    expect(md5('hello')).not.toBe(md5('Hello'))
  })

  it('handles Unicode / multibyte characters without crashing', () => {
    const result = md5('héllo')
    expect(result).toHaveLength(32)
    expect(result).toMatch(/^[0-9a-f]+$/)
    // Consistent output — same input always gives the same hash
    expect(result).toBe(md5('héllo'))
  })
})

describe('computeHash — MD5 path', () => {
  it('delegates to md5 and returns the same result', async () => {
    const input = 'hello world'
    expect(await computeHash(input, 'MD5')).toBe(md5(input))
  })
})

describe('computeHash — SHA-256', () => {
  it('empty string', async () => {
    expect(await computeHash('', 'SHA-256')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    )
  })

  it('"abc" produces a deterministic 64-char hex string', async () => {
    const result = await computeHash('abc', 'SHA-256')
    expect(result).toHaveLength(64)
    expect(result).toMatch(/^[0-9a-f]+$/)
    expect(result).toBe(await computeHash('abc', 'SHA-256'))
  })

  it('returns a 64-character lowercase hex string', async () => {
    const result = await computeHash('anything', 'SHA-256')
    expect(result).toHaveLength(64)
    expect(result).toMatch(/^[0-9a-f]+$/)
  })
})
