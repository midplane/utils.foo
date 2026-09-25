import { describe, it, expect, beforeEach } from 'vitest'
import {
  encodeState,
  decodeState,
  writeHandoff,
  consumeHandoff,
  isChartHash,
  type ShareState,
} from '../tools/chart-builder/shareState'
import { DEFAULT_TRANSFORM } from '../tools/chart-builder/transform'
import { DEFAULT_COSMETICS } from '../tools/chart-builder/chartOption'

const state = (over: Partial<ShareState> = {}): ShareState => ({
  v: 1,
  transform: { ...DEFAULT_TRANSFORM, xCol: 'Month', series: ['Revenue'], aggregation: 'sum' },
  cosmetics: { ...DEFAULT_COSMETICS, title: 'Quarterly revenue' },
  chartType: 'bar',
  orientation: 'vertical',
  styles: { Revenue: { axis: 'right', color: '#ff0000' } },
  ...over,
})

/** Pseudo-random, so it does not compress its way under the link limit. */
function incompressibleCsv(rows: number): string {
  let seed = 1
  const next = () => (seed = (seed * 48271) % 2147483647).toString(36)
  return 'x,y\n' + Array.from({ length: rows }, () => `${next()},${next()}`).join('\n')
}

/** A link in the original uncompressed format. */
function legacyHash(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  return '#c=' + btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

describe('share state round-trip', () => {
  it('survives encode then decode', async () => {
    const original = state({ data: 'Month,Revenue\nJan,1' })
    const decoded = await decodeState((await encodeState(original)).hash)
    expect(decoded).toEqual(original)
  })

  it('writes compressed links', async () => {
    const { hash } = await encodeState(state())
    expect(hash.startsWith('#cz=')).toBe(true)
  })

  it('preserves non-Latin-1 text', async () => {
    const original = state({
      cosmetics: { ...DEFAULT_COSMETICS, title: '売上 — Ünicode ✓ Ωmega' },
      data: 'Città,Valore\nMilano,42',
    })
    const decoded = await decodeState((await encodeState(original)).hash)
    expect(decoded!.cosmetics.title).toBe('売上 — Ünicode ✓ Ωmega')
    expect(decoded!.data).toBe('Città,Valore\nMilano,42')
  })

  it('fits repetitive data that the old uncompressed format had to drop', async () => {
    const regular = 'x,y\n' + Array.from({ length: 5_000 }, (_, i) => `${i},${i % 7}`).join('\n')
    expect(legacyHash(state({ data: regular })).length).toBeGreaterThan(12_000)
    const { dataOmitted } = await encodeState(state({ data: regular }))
    expect(dataOmitted).toBe(false)
  })

  it('drops the data when the link would be too long, keeping the settings', async () => {
    const { hash, dataOmitted } = await encodeState(state({ data: incompressibleCsv(20_000) }))

    expect(dataOmitted).toBe(true)
    const decoded = await decodeState(hash)
    expect(decoded!.data).toBeUndefined()
    // The configuration still made it across.
    expect(decoded!.transform.xCol).toBe('Month')
    expect(decoded!.cosmetics.title).toBe('Quarterly revenue')
    expect(decoded!.styles.Revenue?.axis).toBe('right')
  })

  it('keeps small data inline', async () => {
    expect((await encodeState(state({ data: 'a,b\n1,2' }))).dataOmitted).toBe(false)
  })
})

describe('sample references', () => {
  const huge = incompressibleCsv(20_000)

  it('carries the sample id instead of its rows', async () => {
    const { hash, dataOmitted } = await encodeState(state({ data: huge, sampleId: 'sales-by-category' }))

    expect(dataOmitted).toBe(false)
    expect(hash.length).toBeLessThan(1000)

    const decoded = (await decodeState(hash))!
    expect(decoded.sampleId).toBe('sales-by-category')
    expect(decoded.data).toBeUndefined()
    // The configuration still travels intact.
    expect(decoded.transform.aggregation).toBe('sum')
  })

  it('still drops oversized data when there is no sample to point at', async () => {
    const { dataOmitted } = await encodeState(state({ data: huge }))
    expect(dataOmitted).toBe(true)
  })
})

describe('legacy links', () => {
  it('still opens links in the original uncompressed format', async () => {
    const original = state({ data: 'Città,Valore\nMilano,42' })
    expect(isChartHash(legacyHash(original))).toBe(true)
    expect(await decodeState(legacyHash(original))).toEqual(original)
  })
})

describe('share state rejection', () => {
  it('ignores a hash that is not ours', async () => {
    expect(await decodeState('#something-else')).toBeNull()
    expect(await decodeState('')).toBeNull()
    expect(isChartHash('#p=abc')).toBe(false)
  })

  it('ignores corrupt payloads rather than throwing', async () => {
    expect(await decodeState('#c=not-valid-base64!!')).toBeNull()
    expect(await decodeState('#c=' + btoa('{"nope":true}'))).toBeNull()
    expect(await decodeState('#cz=not-valid!!')).toBeNull()
    expect(await decodeState('#cz=AAAA')).toBeNull()
  })

  it('ignores a future version', async () => {
    expect(await decodeState(legacyHash({ ...state(), v: 2 }))).toBeNull()
  })
})

describe('pivot handoff', () => {
  beforeEach(() => sessionStorage.clear())

  it('round-trips through session storage', () => {
    writeHandoff({ csv: 'a,b\n1,2', source: 'Pivot Table' })
    expect(consumeHandoff()).toEqual({ csv: 'a,b\n1,2', source: 'Pivot Table' })
  })

  it('is consumed exactly once, so a reload does not resurrect it', () => {
    writeHandoff({ csv: 'a,b\n1,2', source: 'Pivot Table' })
    expect(consumeHandoff()).not.toBeNull()
    expect(consumeHandoff()).toBeNull()
  })

  it('returns null when nothing was handed over', () => {
    expect(consumeHandoff()).toBeNull()
  })
})
