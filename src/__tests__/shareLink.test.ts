import { describe, expect, it } from 'vitest'
import {
  buildShareUrl,
  compress,
  decodeFragment,
  encodeFragment,
  MAX_HASH_LENGTH,
  MAX_PAYLOAD_BYTES,
  ShareLinkError,
  toBase64Url,
} from '../lib/shareLink'

describe('fragment codec', () => {
  it('round-trips JSON, including non-Latin-1 text', async () => {
    const value = { name: '売上 — Ünicode ✓', rows: [1, 2, 3], nested: { ok: true } }
    const hash = await encodeFragment('x', value)
    expect(hash.startsWith('#x=')).toBe(true)
    expect(hash).toMatch(/^#x=[A-Za-z0-9_-]+$/)
    expect(await decodeFragment('x', hash)).toEqual(value)
  })

  it('compresses repetitive data well below its raw size', async () => {
    const csv = 'Region,Sales\n' + Array.from({ length: 2_000 }, (_, i) => `North,${i % 50}`).join('\n')
    const hash = await encodeFragment('x', csv)
    expect(hash.length).toBeLessThan(csv.length / 4)
  })

  it('returns null for hashes belonging to nobody or to another tool', async () => {
    expect(await decodeFragment('x', '')).toBeNull()
    expect(await decodeFragment('x', '#y=abc')).toBeNull()
    // A prefix is not a prefix of a longer one.
    expect(await decodeFragment('x', '#xy=abc')).toBeNull()
  })

  it('rejects corrupt payloads as invalid', async () => {
    for (const hash of ['#x=', '#x=!!', '#x=AAAA', '#x=' + toBase64Url(new TextEncoder().encode('not deflate'))]) {
      await expect(decodeFragment('x', hash)).rejects.toMatchObject({ kind: 'invalid' })
    }
  })

  it('rejects non-JSON content as invalid', async () => {
    const bytes = await compress(new TextEncoder().encode('{not json'), 1_000)
    await expect(decodeFragment('x', '#x=' + toBase64Url(bytes))).rejects.toMatchObject({ kind: 'invalid' })
  })

  it('refuses to produce or read an oversized link', async () => {
    let seed = 7
    const noise = Array.from({ length: 60_000 }, () => (seed = (seed * 48271) % 2147483647).toString(36)).join('')
    await expect(encodeFragment('x', noise)).rejects.toMatchObject({ kind: 'too-large' })
    await expect(decodeFragment('x', '#x=' + 'a'.repeat(MAX_HASH_LENGTH))).rejects.toBeInstanceOf(ShareLinkError)
  })

  it('bounds decompression so a small link cannot expand without limit', async () => {
    const bomb = await compress(new Uint8Array(MAX_PAYLOAD_BYTES + 1), MAX_HASH_LENGTH)
    const hash = '#x=' + toBase64Url(bomb)
    expect(hash.length).toBeLessThan(MAX_HASH_LENGTH)
    await expect(decodeFragment('x', hash)).rejects.toMatchObject({ kind: 'too-large' })
  })
})

describe('buildShareUrl', () => {
  it('replaces query and hash, keeping origin and path', () => {
    expect(buildShareUrl('#x=abc', 'https://utils.foo/pivot-table?q=1#old')).toBe('https://utils.foo/pivot-table#x=abc')
    expect(buildShareUrl('#x=abc', 'https://utils.bar/anything', '/d2')).toBe('https://utils.bar/d2#x=abc')
  })
})
