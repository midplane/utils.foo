import { describe, it, expect } from 'vitest'
import Papa from 'papaparse'
import { readFileSync } from 'fs'
import { SAMPLES } from '../tools/pivot-table/samples'
import { computeFilteredPivot } from '../tools/pivot-table/engine/filters'
import { analyzeData } from '../tools/pivot-table/hooks/usePivotData'
import { derivedFieldInfo, looksLikeDate } from '../tools/pivot-table/engine/grouping'
import { flattenRows, flattenCols } from '../tools/pivot-table/engine/axis'
import { compositeKey, flattenKey } from '../tools/pivot-table/engine/sorters'
import type { DataRecord } from '../tools/pivot-table/types'

/**
 * The CSVs are fetched as assets at runtime, so read them from disk here. The
 * sample id is the basename by convention.
 */
function readSample(id: string): string {
  return readFileSync(`src/tools/pivot-table/samples/${id}.csv`, 'utf8')
}

function parse(csv: string): DataRecord[] {
  return Papa.parse<DataRecord>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  }).data
}

describe('bundled samples', () => {
  it.each(SAMPLES)('$id parses without errors', (sample) => {
    const result = Papa.parse(readSample(sample.id).trim(), { header: true, skipEmptyLines: true })
    expect(result.errors).toEqual([])
    expect(result.data.length).toBeGreaterThan(0)
  })

  it.each(SAMPLES)('$id config only references fields that exist', (sample) => {
      const records = parse(readSample(sample.id))
      const fields = analyzeData(records)
      const known = new Set([
        ...fields.map((f) => f.name),
        ...derivedFieldInfo(fields, sample.config.groupings, records).map((f) => f.name),
      ])

      for (const field of [...sample.config.rows, ...sample.config.cols]) {
        expect(known).toContain(field)
      }
      for (const value of sample.config.values) {
        expect(known).toContain(value.field)
        if (value.field2) expect(known).toContain(value.field2)
      }
      for (const base of Object.keys(sample.config.groupings)) {
        expect(fields.map((f) => f.name)).toContain(base)
      }
  })

  it.each(SAMPLES)('$id renders a populated grid', (sample) => {
    const result = computeFilteredPivot(parse(readSample(sample.id)), sample.config)
    const lines = flattenRows(result.rowRoot, {
      layout: sample.config.layout,
      subtotals: sample.config.rowSubtotals,
      collapsed: new Set(),
      grandTotal: true,
      numRowFields: sample.config.rows.length,
    })
    const slots = flattenCols(result.colRoot, {
      subtotals: sample.config.colSubtotals,
      collapsed: new Set(),
      grandTotal: true,
      numColFields: sample.config.cols.length,
    })

    expect(lines.length).toBeGreaterThan(5)
    expect(slots.length).toBeGreaterThan(1)
    // A hierarchy on rows must actually produce subtotals.
    expect(lines.some((l) => l.kind === 'subtotal')).toBe(true)
  })
})

describe('sales sample profile', () => {
  const sample = SAMPLES.find((s) => s.id === 'sales')!
  const records = parse(readSample('sales'))
  const fields = analyzeData(records)

  it('is the default and exercises the whole feature set', () => {
    expect(SAMPLES[0]!.id).toBe('sales')

    // Repeated order ids make Count Unique and drill-down meaningful.
    const orders = new Set(records.map((r) => r.OrderID))
    expect(orders.size).toBeLessThan(records.length / 1.5)

    // Losses, so negative binning and heatmaps have something to show.
    expect(records.some((r) => Number(r.Profit) < 0)).toBe(true)

    // Blanks, so the (blank) label is reachable.
    expect(records.some((r) => r.Segment === null || r.Segment === '')).toBe(true)

    // Enough sub-categories for a Top-N filter to be interesting.
    expect(fields.find((f) => f.name === 'SubCategory')!.valueCount).toBeGreaterThan(10)
  })

  it('types dimensions and measures correctly', () => {
    const numeric = new Set(fields.filter((f) => f.isNumeric).map((f) => f.name))
    for (const m of ['Quantity', 'UnitPrice', 'Discount', 'Sales', 'Profit']) {
      expect(numeric).toContain(m)
    }
    // OrderDate must not read as numeric just because it starts with a year.
    for (const d of ['Region', 'State', 'Category', 'SubCategory', 'OrderID', 'OrderDate']) {
      expect(numeric.has(d)).toBe(false)
    }
    expect(fields.filter((f) => looksLikeDate(records, f.name)).map((f) => f.name)).toEqual([
      'OrderDate',
    ])
  })

  it('computes a weighted margin that averaging rows could not', () => {
    const result = computeFilteredPivot(records, sample.config)
    const tables = result.cells.get(compositeKey(flattenKey(['Furniture', 'Tables']), ''))!
    // Tables are sold at a loss in this dataset.
    expect(tables.values[1]).toBeLessThan(0)
    expect(tables.formatted[1]).toMatch(/%$/)
  })
})

describe('sample delivery', () => {
  it('ships the CSVs as assets, not as inlined JavaScript', () => {
    // Inlining cost ~63 KB of JS that every visitor parsed on load. `?url`
    // keeps them as separately-cached, content-hashed files.
    const registry = readFileSync('src/tools/pivot-table/samples/index.ts', 'utf8')
    expect(registry).toMatch(/\.csv\?url'/)

    for (const source of ['index.tsx', 'components/DataInput.tsx']) {
      const text = readFileSync(`src/tools/pivot-table/${source}`, 'utf8')
      expect(text).not.toContain('OrderID,OrderDate')
    }
  })
})
