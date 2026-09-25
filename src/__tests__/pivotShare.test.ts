import { describe, expect, it } from 'vitest'
import { decodeState, encodeState } from '../tools/pivot-table/shareState'
import { SAMPLES } from '../tools/pivot-table/samples'
import { encodeFragment } from '../lib/shareLink'
import type { PivotConfig } from '../tools/pivot-table/types'

const base = SAMPLES[0]!.config

const config: PivotConfig = {
  ...base,
  filters: [
    {
      field: 'Region',
      excludedValues: new Set(['West', 'South']),
      label: { op: 'contains', text: 'or' },
      measure: { op: 'top', valueIndex: 0, a: 5 },
    },
  ],
  rowSortBy: { flatKey: '2023', valueIndex: 0, descending: true },
  groupings: { ...base.groupings, Sales: { kind: 'number', binSize: 100 } },
  values: [
    ...base.values,
    { id: 'c', field: 'Sales', aggregation: 'average', showAs: 'pctOfGrandTotal', caption: 'Avg', format: { style: 'currency', decimals: 2, currency: 'EUR' } },
  ],
  collapsedRows: ['Furniture'],
}

describe('pivot share links', () => {
  it('round-trips the full configuration, including filter Sets', async () => {
    const { hash, dataOmitted } = await encodeState({ config, data: 'Region,Sales\nNorth,1' })
    expect(dataOmitted).toBe(false)
    expect(hash.startsWith('#p=')).toBe(true)
    const decoded = await decodeState(hash)
    expect(decoded?.data).toBe('Region,Sales\nNorth,1')
    expect(decoded?.config).toEqual(config)
    expect(decoded?.config.filters[0]?.excludedValues).toBeInstanceOf(Set)
  })

  it('names a bundled sample instead of carrying its rows', async () => {
    const { hash } = await encodeState({ config, data: 'x'.repeat(50_000), sampleId: 'sales' })
    expect(hash.length).toBeLessThan(2_000)
    const decoded = await decodeState(hash)
    expect(decoded?.sampleId).toBe('sales')
    expect(decoded?.data).toBeUndefined()
  })

  it('falls back to a settings-only link when the data will not fit', async () => {
    let seed = 3
    const next = () => (seed = (seed * 48271) % 2147483647).toString(36)
    const data = 'a,b\n' + Array.from({ length: 20_000 }, () => `${next()},${next()}`).join('\n')
    const { hash, dataOmitted } = await encodeState({ config, data })
    expect(dataOmitted).toBe(true)
    const decoded = await decodeState(hash)
    expect(decoded?.data).toBeUndefined()
    expect(decoded?.config.rows).toEqual(config.rows)
  })

  it('ignores other hashes', async () => {
    expect(await decodeState('')).toBeNull()
    expect(await decodeState('#d2=abc')).toBeNull()
  })

  const wire = { v: 1, config: { ...config, filters: [] } }
  const tampered: [string, unknown][] = [
    ['a future version', { ...wire, v: 2 }],
    ['an unknown aggregation', { ...wire, config: { ...wire.config, values: [{ id: 'a', field: 'x', aggregation: 'eval', showAs: 'raw' }] } }],
    ['a non-array rows field', { ...wire, config: { ...wire.config, rows: 'Region' } }],
    ['an out-of-range sort metric', { ...wire, config: { ...wire.config, rowSortBy: { flatKey: '', valueIndex: 9, descending: true } } }],
    ['a malformed currency', { ...wire, config: { ...wire.config, values: [{ id: 'a', field: 'x', aggregation: 'sum', showAs: 'raw', format: { style: 'currency', currency: 'nope' } }] } }],
    ['a zero bin size', { ...wire, config: { ...wire.config, groupings: { x: { kind: 'number', binSize: 0 } } } }],
    ['both data and a sample', { ...wire, data: 'a', sampleId: 'sales' }],
    ['a non-object', 'hello'],
  ]
  it.each(tampered)('rejects %s', async (_, value) => {
    await expect(decodeState(await encodeFragment('p', value))).rejects.toThrow('invalid')
  })
})
