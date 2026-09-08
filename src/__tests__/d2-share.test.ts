// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createShareUrl, decodeState, DEFAULT_STATE, encodeState, MAX_HASH_LENGTH, type ShareState } from '../tools/d2/shareState'

async function uncheckedHash(value: unknown, format: CompressionFormat = 'gzip'): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  const compressed = await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream(format))).arrayBuffer()
  return '#d2=' + btoa(String.fromCharCode(...new Uint8Array(compressed))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

describe('D2 share links', () => {
  it('keeps existing gzip share links working', async () => {
    const original: ShareState = { ...DEFAULT_STATE, code: 'legacy -> diagram', layout: 'dagre', sketch: true, isDark: true, zoom: 1.25 }
    expect(await decodeState(await uncheckedHash(original))).toEqual(original)
  })

  it('makes default-state links substantially shorter without losing state', async () => {
    const tiny = { ...DEFAULT_STATE, code: 'x -> y' }
    const hash = await encodeState(tiny)
    expect(hash.length).toBeLessThanOrEqual(23)
    expect(hash.length).toBeLessThan((await uncheckedHash(tiny)).length / 4)
    expect(await decodeState(hash)).toEqual(tiny)
  })

  it('decodes compact links against fixed wire defaults', async () => {
    expect(await decodeState(await uncheckedHash([2, ''], 'deflate-raw'))).toEqual({
      v: 1, code: '', layout: 'tala', theme: '0', sketch: false,
      renderer: 'svg', asciiMode: 'standard', view: 'split', zoom: 1, expanded: false, isDark: false,
    })
  })

  it.each(Array.from({ length: 32 }, (_, flags) => flags))('preserves independent boolean settings for flags %i', async flags => {
    const state: ShareState = {
      ...DEFAULT_STATE, sketch: Boolean(flags & 1), renderer: flags & 2 ? 'ascii' : 'svg',
      asciiMode: flags & 4 ? 'extended' : 'standard', expanded: Boolean(flags & 8), isDark: Boolean(flags & 16),
    }
    expect(await decodeState(await encodeState(state))).toEqual(state)
  })

  it('round-trips the source and every diagram and view setting', async () => {
    const original: ShareState = {
      ...DEFAULT_STATE, code: '日本語: "Café ☕ & <script>"\n日本語 -> 世界',
      layout: 'elk', theme: '200', sketch: true, renderer: 'ascii',
      asciiMode: 'extended', view: 'preview', zoom: 2.5, expanded: true, isDark: true,
    }
    expect(await decodeState(await encodeState(original))).toEqual(original)
  })

  it('preserves empty source and false settings without replacing them with defaults', async () => {
    const original: ShareState = { ...DEFAULT_STATE, code: '', view: 'editor', zoom: 0.5 }
    expect(await decodeState(await encodeState(original))).toEqual(original)
  })

  it('compresses large repetitive diagrams without dropping any source', async () => {
    const original = { ...DEFAULT_STATE, code: 'a -> b: a repeated connection label\n'.repeat(4000) }
    const hash = await encodeState(original)
    expect(hash.length).toBeLessThan(3000)
    expect(await decodeState(hash)).toEqual(original)
  })

  it('carries state only in the fragment on the D2 route', async () => {
    const link = new URL(await createShareUrl(DEFAULT_STATE, 'https://utils.foo/d2?old=value#old'))
    expect(link.origin).toBe('https://utils.foo')
    expect(link.pathname).toBe('/d2')
    expect(link.search).toBe('')
    expect(await decodeState(link.hash)).toEqual(DEFAULT_STATE)
  })

  it('ignores unrelated or empty fragments', async () => {
    expect(await decodeState('')).toBeNull()
    expect(await decodeState('#unrelated')).toBeNull()
  })

  it.each(['#d2=', '#d2=!!!', '#d2=aaaa', '#d2=Y29ycnVwdA'])('reports a damaged link: %s', async hash => {
    await expect(decodeState(hash)).rejects.toThrow('invalid')
  })

  it.each([
    { v: 2 }, { code: null }, { layout: ['tala'] }, { theme: '9999' },
    { renderer: 'html' }, { sketch: 'false' }, { asciiMode: 'other' },
    { view: 'other' }, { zoom: 100 }, { zoom: null }, { expanded: 'yes' },
    { isDark: null }, { renderer: 'ascii', layout: 'dagre' },
  ])('rejects unsupported or malformed settings: %j', async invalid => {
    await expect(decodeState(await uncheckedHash({ ...DEFAULT_STATE, ...invalid }))).rejects.toThrow('invalid')
  })

  it('rejects oversized sources instead of returning a partial link', async () => {
    await expect(encodeState({ ...DEFAULT_STATE, code: 'x'.repeat(1_000_001) })).rejects.toThrow('too large')
  })

  it('bounds both encoded and decompressed input', async () => {
    await expect(decodeState('#d2=' + 'a'.repeat(MAX_HASH_LENGTH))).rejects.toThrow('too large')
    const bomb = await uncheckedHash({ ...DEFAULT_STATE, code: 'x'.repeat(1_000_001) })
    await expect(decodeState(bomb)).rejects.toThrow('invalid')
    const rawBomb = await uncheckedHash([2, 'x'.repeat(1_000_001)], 'deflate-raw')
    await expect(decodeState(rawBomb)).rejects.toThrow('invalid')
  })

  it.each([
    [3, 'x'], [2], [2, null], [2, 'x', null], [2, 'x', []], [2, 'x', {}, 'extra'],
    [2, 'x', { l: 3 }], [2, 'x', { t: '200' }], [2, 'x', { w: 3 }],
    [2, 'x', { z: null }], [2, 'x', { z: 100 }], [2, 'x', { f: -1 }],
    [2, 'x', { f: 32 }], [2, 'x', { f: 1.5 }], [2, 'x', { f: '1' }],
    [2, 'x', { l: 1, f: 2 }], [2, 'x', { unknown: true }],
  ].map(value => ({ value })))('rejects malformed compact payloads: $value', async ({ value }) => {
    await expect(decodeState(await uncheckedHash(value, 'deflate-raw'))).rejects.toThrow('invalid')
  })
})
