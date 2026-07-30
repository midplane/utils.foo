import { describe, it, expect } from 'vitest'
import {
  parseInput,
  toNumber,
  isNumericColumn,
  resolveSelection,
  columnsKey,
} from '../tools/chart-builder/chartData'
import {
  buildOption,
  buildColorMap,
  readPalette,
  DEFAULT_COSMETICS,
  type BuildOptionArgs,
} from '../tools/chart-builder/chartOption'
import { transform, DEFAULT_TRANSFORM, type TransformConfig } from '../tools/chart-builder/transform'
import type { ParsedData } from '../tools/chart-builder/chartData'

const rows = (csv: string) => parseInput(csv).data

/**
 * Data shaping now lives in transform(); buildOption consumes its result.
 * This helper runs the same pipeline the component does so these tests keep
 * asserting end-to-end behaviour rather than a hand-built intermediate.
 */
function build(
  data: ParsedData,
  tc: Partial<TransformConfig>,
  bo: Partial<Omit<BuildOptionArgs, 'result'>> = {}
) {
  const config: TransformConfig = { ...DEFAULT_TRANSFORM, ...tc }
  const result = transform(data, config)
  return buildOption({
    result,
    xCol: config.xCol,
    chartType: 'bar',
    orientation: 'vertical',
    cosmetics: DEFAULT_COSMETICS,
    colors: buildColorMap(config.series),
    styles: {},
    palette: readPalette(false),
    ...bo,
  })
}

describe('numeric coercion', () => {
  it('accepts the formats real exports contain', () => {
    expect(toNumber(1200)).toBe(1200)
    expect(toNumber('1,200')).toBe(1200)
    expect(toNumber('$99.50')).toBe(99.5)
    expect(toNumber('45%')).toBe(45)
    expect(toNumber('  12 ')).toBe(12)
    expect(toNumber('(250)')).toBe(-250) // accounting negative
  })

  it('returns null rather than 0 for anything unusable', () => {
    // 0 would claim the value was zero; null leaves a gap.
    expect(toNumber('')).toBeNull()
    expect(toNumber(null)).toBeNull()
    expect(toNumber('N/A')).toBeNull()
    expect(toNumber('abc')).toBeNull()
    expect(toNumber(Infinity)).toBeNull()
  })
})

describe('column classification', () => {
  it('tolerates a minority of junk values', () => {
    const data = rows(`Month,Revenue\nJan,100\nFeb,N/A\nMar,300\nApr,400\nMay,500`)
    expect(isNumericColumn('Revenue', data.rows)).toBe(true)
  })

  it('accepts thousands separators and currency', () => {
    expect(isNumericColumn('Revenue', rows(`M,Revenue\na,"1,200"\nb,"1,400"`).rows)).toBe(true)
    expect(isNumericColumn('Revenue', rows(`M,Revenue\na,$100\nb,$200`).rows)).toBe(true)
  })

  it('rejects a column that is blank in every row', () => {
    // Previously vacuously true, so it was charted as a flat zero series.
    const data = rows(`Month,Revenue,Notes\nJan,100,\nFeb,200,`)
    expect(isNumericColumn('Notes', data.rows)).toBe(false)
    expect(isNumericColumn('Revenue', data.rows)).toBe(true)
  })

  it('rejects a mostly-textual column', () => {
    const data = rows(`M,Mixed\na,1\nb,x\nc,y\nd,z\ne,w`)
    expect(isNumericColumn('Mixed', data.rows)).toBe(false)
  })
})

describe('selection resolution', () => {
  const data = rows(`Month,Revenue,Expenses,Profit\nJan,1,2,3\nFeb,4,5,6`)
  const key = columnsKey(data.columns)

  it('derives sensible defaults with no saved selection', () => {
    const s = resolveSelection(data, null)
    expect(s.xCol).toBe('Month')
    expect(s.series).toEqual(['Revenue', 'Expenses', 'Profit'])
  })

  it('keeps the X axis when only the series are changed', () => {
    // The regression: committing a series selection used to blank the X axis,
    // which unmounted the chart entirely.
    const s = resolveSelection(data, { key, xCol: 'Month', series: ['Revenue'] })
    expect(s.xCol).toBe('Month')
    expect(s.series).toEqual(['Revenue'])
  })

  it('ignores a selection saved against a different column set', () => {
    const s = resolveSelection(data, { key: 'other', xCol: 'Nope', series: ['Gone'] })
    expect(s.xCol).toBe('Month')
    expect(s.series).toEqual(['Revenue', 'Expenses', 'Profit'])
  })

  it('drops saved series that are no longer numeric', () => {
    // Same headers, but Expenses is now text: it must not stay selected and
    // invisible, charted as zeros.
    const swapped = rows(`Month,Revenue,Expenses,Profit\nJan,1,x,3\nFeb,4,y,6\nMar,7,z,9`)
    const s = resolveSelection(swapped, {
      key: columnsKey(swapped.columns),
      xCol: 'Month',
      series: ['Revenue', 'Expenses'],
    })
    expect(s.series).toEqual(['Revenue'])
    expect(s.numeric).not.toContain('Expenses')
  })

  it('keeps series in chip order regardless of save order', () => {
    const s = resolveSelection(data, { key, xCol: 'Month', series: ['Profit', 'Revenue'] })
    expect(s.series).toEqual(['Revenue', 'Profit'])
  })
})

describe('colour assignment', () => {
  it('is stable when a series is deselected', () => {
    // Chips and chart both key off the full numeric list, so deselecting one
    // series no longer shifts every other series' colour.
    const numeric = ['Revenue', 'Expenses', 'Profit']
    const colors = buildColorMap(numeric)
    expect(colors.get('Expenses')).toBe(buildColorMap(numeric).get('Expenses'))

    const data = rows(`Month,Revenue,Expenses,Profit\nJan,1,2,3`)
    const option = build(data, { xCol: 'Month', series: ['Expenses', 'Profit'] }, { colors })
    const series = (option!.series ?? []) as { name: string; itemStyle: { color: string } }[]
    expect(series[0]!.itemStyle.color).toBe(colors.get('Expenses'))
    expect(series[1]!.itemStyle.color).toBe(colors.get('Profit'))
  })
})

describe('option building', () => {
  const data: ParsedData = rows(`Month,Revenue\nJan,100\nFeb,\nMar,300`)

  it('renders missing values as gaps, not zeros', () => {
    const option = build(data, { xCol: 'Month', series: ['Revenue'] })
    const series = (option!.series ?? []) as { data: (number | null)[] }[]
    expect(series[0]!.data).toEqual([100, null, 300])
  })

  it('inverts the category axis for horizontal bars so order is preserved', () => {
    const horizontal = build(data, { xCol: 'Month', series: ['Revenue'] }, {
      orientation: 'horizontal',
    }) as unknown as { yAxis: { inverse?: boolean } }
    expect(horizontal.yAxis.inverse).toBe(true)

    const vertical = build(data, { xCol: 'Month', series: ['Revenue'] }) as unknown as {
      xAxis: { inverse?: boolean }
    }
    expect(vertical.xAxis.inverse).toBeUndefined()
  })

  it('drops individual scatter points with an unusable coordinate', () => {
    // X is numeric overall, but one row is junk. That single point is dropped
    // rather than snapped to 0, which used to stack points on the axis.
    const mixed = rows(`X,Y\n1,10\n2,20\n3,30\n4,40\nbad,50`)
    const scatter = build(mixed, { xCol: 'X', series: ['Y'], numericX: true }, {
      chartType: 'scatter',
    })
    const series = (scatter!.series ?? []) as { data: [number, number][] }[]
    expect(series[0]!.data).toEqual([[1, 10], [2, 20], [3, 30], [4, 40]])
  })

  it('plots scatter pairs when both coordinates are numeric', () => {
    const numericData = rows(`Label,Hours,Score\nA,2,58\nB,3,65`)
    const scatter = build(numericData, { xCol: 'Hours', series: ['Score'], numericX: true }, {
      chartType: 'scatter',
    })
    const series = (scatter!.series ?? []) as { data: [number, number][] }[]
    expect(series[0]!.data).toEqual([[2, 58], [3, 65]])
  })
})

describe('palette', () => {
  it('reads live theme tokens rather than hardcoded light values', () => {
    document.documentElement.style.setProperty('--color-cream', '#000000')
    document.documentElement.style.setProperty('--color-ink', '#ffffff')
    const dark = readPalette(false)
    expect(dark.background).toBe('#000000')
    expect(dark.ink).toBe('#ffffff')

    document.documentElement.style.removeProperty('--color-cream')
    document.documentElement.style.removeProperty('--color-ink')
    expect(readPalette(false).background).toBe('#FFFBF5')
    // The fallback follows the theme instead of always being the light one.
    expect(readPalette(true).background).toBe('#1C1917')
    expect(readPalette(true).ink).toBe('#F2EDE8')
  })
})

describe('scatter with a categorical X', () => {
  // The Population sample: one numeric column, so a numeric X is impossible.
  const data = rows(`Country,Population\nIndia,1429\nChina,1412\nBrazil,215`)
  const option = build(data, { xCol: 'Country', series: ['Population'], numericX: true }, {
    chartType: 'scatter',
  }) as unknown as { xAxis: { type: string; data?: string[] }; series: { data: unknown[] }[] }

  it('plots against a category axis rather than refusing', () => {
    expect(option.xAxis.type).toBe('category')
    expect(option.xAxis.data).toEqual(['India', 'China', 'Brazil'])
  })

  it('keeps every point instead of dropping or stacking them', () => {
    expect(option.series[0]!.data).toEqual([1429, 1412, 215])
  })

  it('still uses value axes when X is numeric', () => {
    const numeric = rows(`Label,Hours,Score\nA,2,58\nB,3,65`)
    const scatter = build(numeric, { xCol: 'Hours', series: ['Score'], numericX: true }, {
      chartType: 'scatter',
    }) as unknown as { xAxis: { type: string }; series: { data: unknown[] }[] }
    expect(scatter.xAxis.type).toBe('value')
    expect(scatter.series[0]!.data).toEqual([[2, 58], [3, 65]])
  })
})
