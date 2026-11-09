import { describe, it, expect, beforeEach } from 'vitest'
import {
  encodeState,
  decodeState,
  writeHandoff,
  consumeHandoff,
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

describe('share state round-trip', () => {
  it('survives encode then decode', () => {
    const original = state({ data: 'Month,Revenue\nJan,1' })
    const decoded = decodeState(encodeState(original).hash)
    expect(decoded).toEqual(original)
  })

  it('preserves non-Latin-1 text', () => {
    // btoa alone throws on these, so the encoder has to go through UTF-8 bytes.
    const original = state({
      cosmetics: { ...DEFAULT_COSMETICS, title: '売上 — Ünicode ✓ Ωmega' },
      data: 'Città,Valore\nMilano,42',
    })
    const decoded = decodeState(encodeState(original).hash)
    expect(decoded!.cosmetics.title).toBe('売上 — Ünicode ✓ Ωmega')
    expect(decoded!.data).toBe('Città,Valore\nMilano,42')
  })

  it('drops the data when the link would be too long, keeping the settings', () => {
    const huge = 'x,y\n' + Array.from({ length: 20_000 }, (_, i) => `${i},${i}`).join('\n')
    const { hash, dataOmitted } = encodeState(state({ data: huge }))

    expect(dataOmitted).toBe(true)
    const decoded = decodeState(hash)
    expect(decoded!.data).toBeUndefined()
    // The configuration still made it across.
    expect(decoded!.transform.xCol).toBe('Month')
    expect(decoded!.cosmetics.title).toBe('Quarterly revenue')
    expect(decoded!.styles.Revenue?.axis).toBe('right')
  })

  it('keeps small data inline', () => {
    expect(encodeState(state({ data: 'a,b\n1,2' })).dataOmitted).toBe(false)
  })
})

describe('sample references', () => {
  // The sales sample encodes to ~87 KB inline; its id costs a dozen characters.
  const huge = 'x,y\n' + Array.from({ length: 20_000 }, (_, i) => `${i},${i}`).join('\n')

  it('carries the sample id instead of its rows', () => {
    const { hash, dataOmitted } = encodeState(state({ data: huge, sampleId: 'sales-by-category' }))

    expect(dataOmitted).toBe(false)
    expect(hash.length).toBeLessThan(1000)

    const decoded = decodeState(hash)!
    expect(decoded.sampleId).toBe('sales-by-category')
    expect(decoded.data).toBeUndefined()
    // The configuration still travels intact.
    expect(decoded.transform.aggregation).toBe('sum')
  })

  it('still drops oversized data when there is no sample to point at', () => {
    const { dataOmitted } = encodeState(state({ data: huge }))
    expect(dataOmitted).toBe(true)
  })
})

describe('share state rejection', () => {
  it('ignores a hash that is not ours', () => {
    expect(decodeState('#something-else')).toBeNull()
    expect(decodeState('')).toBeNull()
  })

  it('ignores corrupt payloads rather than throwing', () => {
    expect(decodeState('#c=not-valid-base64!!')).toBeNull()
    expect(decodeState('#c=' + btoa('{"nope":true}'))).toBeNull()
  })

  it('ignores a future version', () => {
    const encoded = encodeState(state()).hash
    const bumped = JSON.parse(JSON.stringify({ ...state(), v: 2 }))
    expect(decodeState(encoded)).not.toBeNull()
    expect(decodeState('#c=' + btoa(JSON.stringify(bumped)))).toBeNull()
  })

  const raw = (payload: unknown) => '#c=' + btoa(JSON.stringify(payload))

  it('rejects a null or array transform', () => {
    expect(decodeState(raw({ v: 1, transform: null }))).toBeNull()
    expect(decodeState(raw({ v: 1, transform: [] }))).toBeNull()
    expect(decodeState(raw(null))).toBeNull()
  })

  it('fills missing or mistyped fields with defaults, so the tool can render', () => {
    const decoded = decodeState(raw({
      v: 1,
      transform: { xCol: 'Month', series: 'Revenue', filters: null, topN: '5' },
      cosmetics: { title: 'Kept', min: 3, palette: 'nope' },
      chartType: 'radar',
      orientation: 'sideways',
      styles: null,
      data: 42,
      sampleId: {},
    }))!
    expect(decoded).not.toBeNull()
    expect(decoded.transform).toEqual({ ...DEFAULT_TRANSFORM, xCol: 'Month' })
    expect(decoded.cosmetics).toEqual({ ...DEFAULT_COSMETICS, title: 'Kept' })
    expect(decoded.chartType).toBe('bar')
    expect(decoded.orientation).toBe('vertical')
    expect(decoded.styles).toEqual({})
    expect(decoded.data).toBeUndefined()
    expect(decoded.sampleId).toBeUndefined()
  })

  it('drops malformed filter rules and series names but keeps valid ones', () => {
    const decoded = decodeState(raw({
      v: 1,
      transform: {
        xCol: 'Month',
        series: ['Revenue', 7, null],
        filters: [
          { id: '1', column: 'Revenue', op: 'gt', value: '10' },
          { id: '2', column: 'Revenue', op: 'explode', value: '1' },
          null,
        ],
      },
    }))!
    expect(decoded.transform.series).toEqual(['Revenue'])
    expect(decoded.transform.filters).toEqual([{ id: '1', column: 'Revenue', op: 'gt', value: '10' }])
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
