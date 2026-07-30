import type { EChartsOption } from 'echarts'
import type { TransformResult } from './transform'

// ─── Palettes ─────────────────────────────────────────────────────────────────

export type PaletteName = 'wong' | 'tableau' | 'vivid' | 'earth' | 'mono'

/** Bang Wong's colorblind-safe palette — the default for good reason. */
const WONG = ['#0072B2', '#D55E00', '#009E73', '#E69F00', '#CC79A7', '#56B4E9', '#F0E442']
const TABLEAU = ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC948', '#B07AA1', '#FF9DA7']
const VIVID = ['#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#14B8A6']
const EARTH = ['#8C6D46', '#B08968', '#7F9172', '#557153', '#A98467', '#6B705C', '#CB997E']
const MONO = ['#1C1917', '#44403C', '#78716C', '#A8A29E', '#D6D3D1']

export const PALETTES: Record<PaletteName, string[]> = {
  wong: WONG, tableau: TABLEAU, vivid: VIVID, earth: EARTH, mono: MONO,
}

export const PALETTE_LABELS: Record<PaletteName, string> = {
  wong: 'Colorblind-safe', tableau: 'Tableau', vivid: 'Vivid', earth: 'Earth', mono: 'Mono',
}

/** Kept for backwards compatibility with existing imports and tests. */
export const SERIES_COLORS = WONG

const FONT = "'JetBrains Mono', ui-monospace, monospace"

// ─── Theme palette ────────────────────────────────────────────────────────────

export interface Palette {
  background: string
  ink: string
  inkLight: string
  inkMuted: string
  border: string
  borderDark: string
  tooltipText: string
}

// Used only when the CSS variables cannot be read - during SSR, or before
// styles have applied. Kept per-theme so the fallback is never inverted.
const FALLBACKS: Record<'light' | 'dark', Palette> = {
  light: {
    background: '#FFFBF5', ink: '#1C1917', inkLight: '#44403C', inkMuted: '#78716C',
    border: '#E7E5E4', borderDark: '#D6D3D1', tooltipText: '#FFFBF5',
  },
  dark: {
    background: '#1C1917', ink: '#F2EDE8', inkLight: '#CFC8C1', inkMuted: '#9A8F88',
    border: '#3A3430', borderDark: '#4A4440', tooltipText: '#1C1917',
  },
}

/**
 * Read the live theme tokens.
 *
 * ECharts renders to canvas and cannot use CSS variables, so the palette has to
 * be sampled from the document. Hardcoding it meant the chart kept the light
 * palette in dark mode - a bright panel inside a dark page.
 */
export function readPalette(isDark: boolean): Palette {
  const fallback = FALLBACKS[isDark ? 'dark' : 'light']
  if (typeof document === 'undefined') return fallback

  const style = getComputedStyle(document.documentElement)
  const read = (name: string, value: string) => style.getPropertyValue(name).trim() || value

  return {
    background: read('--color-cream', fallback.background),
    ink: read('--color-ink', fallback.ink),
    inkLight: read('--color-ink-light', fallback.inkLight),
    inkMuted: read('--color-ink-muted', fallback.inkMuted),
    border: read('--color-border', fallback.border),
    borderDark: read('--color-border-dark', fallback.borderDark),
    // The tooltip body is the inverse of the page, so its text is the page bg.
    tooltipText: read('--color-cream', fallback.tooltipText),
  }
}

/**
 * Stable column-to-colour assignment.
 *
 * Keyed on the full list of plottable columns, not on the selected subset, so a
 * series keeps its colour when others are toggled off and the control chips
 * always agree with the chart.
 */
export function buildColorMap(
  numeric: string[],
  palette: PaletteName = 'wong',
  overrides: Record<string, string> = {}
): Map<string, string> {
  const ramp = PALETTES[palette] ?? WONG
  return new Map(numeric.map((col, i) => [col, overrides[col] || ramp[i % ramp.length]!]))
}

// ─── Chart configuration ──────────────────────────────────────────────────────

export type ChartType =
  | 'bar' | 'stacked-bar' | 'line' | 'area' | 'stacked-area'
  | 'scatter' | 'pie' | 'donut' | 'combo'

export const CHART_TYPE_LABELS: Record<ChartType, string> = {
  bar: 'Bar', 'stacked-bar': 'Stacked bar', line: 'Line', area: 'Area',
  'stacked-area': 'Stacked area', scatter: 'Scatter', pie: 'Pie', donut: 'Donut',
  combo: 'Combo',
}

/** Types that ignore the series list beyond the first entry. */
export const SINGLE_SERIES_TYPES: ReadonlySet<ChartType> = new Set<ChartType>(['pie', 'donut'])

/** Per-series mark, used by the combo type. */
export type SeriesMark = 'bar' | 'line' | 'area'

export type Orientation = 'vertical' | 'horizontal'
export type AxisScale = 'linear' | 'log'

export type NumberStyle = 'auto' | 'plain' | 'compact' | 'percent' | 'currency'

export const NUMBER_STYLE_LABELS: Record<NumberStyle, string> = {
  auto: 'Auto', plain: '1234.5', compact: '1.2k', percent: '12%', currency: '$1,234',
}

export interface SeriesStyle {
  /** Only consulted when chartType is `combo`. */
  mark?: SeriesMark
  /** Which Y axis this series binds to. */
  axis?: 'left' | 'right'
  /** Explicit colour, overriding the palette. */
  color?: string
}

export interface Cosmetics {
  title: string
  subtitle: string
  xLabel: string
  yLabel: string
  yRightLabel: string
  scale: AxisScale
  /** Empty string means "let ECharts decide". */
  min: string
  max: string
  numberStyle: NumberStyle
  /** null means "decide from the data". */
  decimals: number | null
  currencySymbol: string
  palette: PaletteName
  showLegend: boolean
  showGrid: boolean
  showDataLabels: boolean
  smooth: boolean
}

export const DEFAULT_COSMETICS: Cosmetics = {
  title: '', subtitle: '', xLabel: '', yLabel: '', yRightLabel: '',
  scale: 'linear', min: '', max: '',
  numberStyle: 'auto', decimals: null, currencySymbol: '$',
  palette: 'wong', showLegend: true, showGrid: true, showDataLabels: false, smooth: true,
}

/** Category labels longer than this are truncated on the axis. */
export const LABEL_TRUNCATE = 10

// ─── Number formatting ────────────────────────────────────────────────────────

function trim(n: number, decimals: number | null): string {
  if (decimals !== null) return n.toFixed(decimals)
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)))
}

/** Axis ticks read better as 80k than 80000. */
export function formatCompact(value: number, decimals: number | null = null): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${trim(value / 1_000_000_000, decimals)}B`
  if (abs >= 1_000_000) return `${trim(value / 1_000_000, decimals)}M`
  if (abs >= 1_000) return `${trim(value / 1_000, decimals)}k`
  return trim(value, decimals)
}

export function formatValue(value: number, c: Cosmetics): string {
  if (!isFinite(value)) return '—'
  switch (c.numberStyle) {
    case 'plain':
      return trim(value, c.decimals)
    case 'compact':
      return formatCompact(value, c.decimals)
    case 'percent':
      return `${trim(value, c.decimals ?? 1)}%`
    case 'currency':
      return `${c.currencySymbol}${Number(trim(value, c.decimals)).toLocaleString('en-US', {
        minimumFractionDigits: c.decimals ?? 0,
        maximumFractionDigits: c.decimals ?? 2,
      })}`
    default:
      // Auto: compact for large magnitudes, plain otherwise.
      return Math.abs(value) >= 1000 ? formatCompact(value, c.decimals) : trim(value, c.decimals)
  }
}

/** Axis label for a time axis, chosen to suit the span being displayed. */
function formatTimeLabel(stamp: number): string {
  const d = new Date(stamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─── Option builder ───────────────────────────────────────────────────────────

export interface BuildOptionArgs {
  result: TransformResult
  xCol: string
  chartType: ChartType
  orientation: Orientation
  cosmetics: Cosmetics
  colors: Map<string, string>
  styles: Record<string, SeriesStyle>
  palette: Palette
}

function markFor(type: ChartType, col: string, styles: Record<string, SeriesStyle>): SeriesMark {
  if (type === 'combo') return styles[col]?.mark ?? 'bar'
  if (type === 'line') return 'line'
  if (type === 'area' || type === 'stacked-area') return 'area'
  return 'bar'
}

export function buildOption({
  result, xCol, chartType, orientation, cosmetics: c, colors, styles, palette,
}: BuildOptionArgs): EChartsOption | null {
  const seriesNames = [...result.values.keys()]
  if (seriesNames.length === 0 || result.categories.length === 0) return null

  const axisLabel = { fontFamily: FONT, fontSize: 11, color: palette.inkMuted }
  const nameStyle = { fontFamily: FONT, fontSize: 11, color: palette.inkMuted }

  const title = c.title || c.subtitle
    ? {
        text: c.title, subtext: c.subtitle, left: 'center' as const, top: 4,
        textStyle: { fontFamily: FONT, fontSize: 14, fontWeight: 600 as const, color: palette.ink },
        subtextStyle: { fontFamily: FONT, fontSize: 11, color: palette.inkMuted },
      }
    : undefined

  const titleOffset = title ? (c.subtitle ? 44 : 28) : 0

  const tooltip = {
    backgroundColor: palette.ink,
    borderColor: palette.ink,
    borderWidth: 0,
    padding: [8, 12] as [number, number],
    textStyle: { fontFamily: FONT, fontSize: 11, color: palette.tooltipText },
  }

  const legend = c.showLegend
    ? {
        show: true,
        top: titleOffset + 8,
        type: 'scroll' as const,
        textStyle: { fontFamily: FONT, fontSize: 11, color: palette.inkLight },
        icon: 'circle', itemWidth: 8, itemHeight: 8,
      }
    : { show: false }

  const base = {
    backgroundColor: palette.background,
    textStyle: { fontFamily: FONT, color: palette.ink },
    legend,
    ...(title ? { title } : {}),
  }

  // ── Pie / donut ───────────────────────────────────────────────────────────
  // Circular charts encode a single measure, so they use the first series.
  if (chartType === 'pie' || chartType === 'donut') {
    const col = seriesNames[0]!
    const values = result.values.get(col) ?? []
    const ramp = PALETTES[c.palette] ?? WONG

    return {
      ...base,
      tooltip: {
        ...tooltip,
        trigger: 'item',
        formatter: (p: unknown) => {
          const point = p as { name: string; value: number; percent: number }
          return `${point.name}<br/><b>${formatValue(point.value, c)}</b> (${point.percent}%)`
        },
      },
      series: [{
        name: col,
        type: 'pie' as const,
        radius: chartType === 'donut' ? ['45%', '70%'] : '68%',
        center: ['50%', c.showLegend ? '58%' : '52%'],
        data: result.categories
          .map((name, i) => ({
            name: String(typeof name === 'number' && result.xKind === 'time' ? formatTimeLabel(name) : name),
            value: values[i] ?? 0,
          }))
          .filter((d) => d.value !== null),
        itemStyle: { borderColor: palette.background, borderWidth: 2 },
        color: ramp,
        label: {
          show: c.showDataLabels,
          fontFamily: FONT, fontSize: 10, color: palette.inkLight,
          formatter: (p: { name: string; percent: number }) => `${p.name} ${p.percent}%`,
        },
        labelLine: { show: c.showDataLabels },
      }],
    } as EChartsOption
  }

  const isBarLike = chartType === 'bar' || chartType === 'stacked-bar'
  const isHorizontal = isBarLike && orientation === 'horizontal'
  const usesRightAxis = seriesNames.some((n) => styles[n]?.axis === 'right')

  const categoryAxis = {
    type: (result.xKind === 'time' ? 'time' : 'category') as 'time' | 'category',
    ...(result.xKind === 'time' ? {} : { data: result.categories.map((v) => String(v)) }),
    name: c.xLabel || undefined,
    nameLocation: 'middle' as const,
    nameGap: 30,
    nameTextStyle: nameStyle,
    axisLine: { lineStyle: { color: palette.borderDark } },
    axisTick: { show: false },
    axisLabel: {
      ...axisLabel,
      formatter:
        result.xKind === 'time'
          ? (v: number) => formatTimeLabel(v)
          : (v: string) => (isHorizontal || v.length <= LABEL_TRUNCATE ? v : `${v.slice(0, LABEL_TRUNCATE - 1)}…`),
    },
    splitLine: { show: false },
    // A category Y axis draws bottom-up, which reverses the reading order when
    // switching a bar chart to horizontal. Invert it so the first row stays first.
    ...(isHorizontal && result.xKind !== 'time' ? { inverse: true } : {}),
  }

  const makeValueAxis = (name: string, showSplit: boolean) => ({
    // ECharts names the linear scale 'value'; 'linear' is not a valid axis type
    // and silently produces an unusable axis.
    type: (c.scale === 'log' ? 'log' : 'value') as 'value' | 'log',
    name: name || undefined,
    nameLocation: 'end' as const,
    nameGap: 12,
    nameTextStyle: nameStyle,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { ...axisLabel, formatter: (v: number) => formatValue(v, c) },
    splitLine: showSplit && c.showGrid
      ? { lineStyle: { color: palette.border, type: 'dashed' as const } }
      : { show: false },
    scale: true,
    ...(c.min.trim() !== '' && isFinite(Number(c.min)) ? { min: Number(c.min) } : {}),
    ...(c.max.trim() !== '' && isFinite(Number(c.max)) ? { max: Number(c.max) } : {}),
  })

  const valueAxes = usesRightAxis
    ? [makeValueAxis(c.yLabel, true), makeValueAxis(c.yRightLabel, false)]
    : [makeValueAxis(c.yLabel, true)]

  const dataLabel = {
    show: c.showDataLabels,
    fontFamily: FONT,
    fontSize: 10,
    color: palette.inkLight,
    formatter: (p: { value: number | null }) => (p.value === null ? '' : formatValue(p.value as number, c)),
  }

  // ── Scatter ───────────────────────────────────────────────────────────────
  if (chartType === 'scatter') {
    const series = seriesNames.map((col) => ({
      name: col,
      type: 'scatter' as const,
      yAxisIndex: usesRightAxis && styles[col]?.axis === 'right' ? 1 : 0,
      data: (result.values.get(col) ?? []).map((y, i) => {
        const x = result.categories[i]
        // Paired coordinates only when X carries real magnitude. Against a
        // category axis the point is aligned by index and null leaves a gap.
        return result.xKind === 'time' || result.xKind === 'value' ? [x as number, y] : y
      }),
      symbolSize: 8,
      itemStyle: { color: colors.get(col) },
      label: dataLabel,
    }))

    return {
      ...base,
      grid: { top: titleOffset + (c.showLegend ? 48 : 24), bottom: c.xLabel ? 56 : 48, left: 16, right: usesRightAxis ? 40 : 24, containLabel: true },
      tooltip: {
        ...tooltip,
        trigger: 'item',
        formatter: (p: unknown) => {
          const point = p as { seriesName: string; name: string; value: number | [number, number] }
          // seriesName, not a hardcoded first series - otherwise every series
          // after the first reported its Y under the wrong column name.
          const [x, y] = Array.isArray(point.value) ? [point.value[0], point.value[1]] : [point.name, point.value]
          const xText = result.xKind === 'time' && typeof x === 'number' ? formatTimeLabel(x) : x
          return `${point.seriesName}<br/>${xCol}: <b>${xText}</b><br/>${point.seriesName}: <b>${
            typeof y === 'number' ? formatValue(y, c) : y
          }</b>`
        },
      },
      xAxis:
        result.xKind === 'value'
          ? { ...makeValueAxis(c.xLabel || xCol, false), nameLocation: 'middle' as const, nameGap: 28 }
          : categoryAxis,
      yAxis: valueAxes,
      series,
    } as EChartsOption
  }

  // ── Bar / line / area / stacked / combo ───────────────────────────────────
  const stacked = chartType === 'stacked-bar' || chartType === 'stacked-area'

  const series = seriesNames.map((col) => {
    const color = colors.get(col)
    const mark = markFor(chartType, col, styles)
    const isArea = mark === 'area'
    const isLine = mark === 'line' || isArea

    return {
      name: col,
      type: (isLine ? 'line' : 'bar') as 'bar' | 'line',
      yAxisIndex: usesRightAxis && styles[col]?.axis === 'right' ? 1 : 0,
      stack: stacked ? 'total' : undefined,
      // null leaves a genuine gap; 0 would claim the value was zero.
      data:
        result.xKind === 'time'
          ? (result.values.get(col) ?? []).map((y, i) => [result.categories[i] as number, y])
          : (result.values.get(col) ?? []),
      smooth: isLine && c.smooth ? 0.3 : false,
      symbol: isLine ? 'circle' : undefined,
      symbolSize: isLine ? 5 : undefined,
      connectNulls: false,
      itemStyle: { color },
      lineStyle: isLine ? { width: 2.5, color } : undefined,
      areaStyle: isArea ? { color, opacity: 0.25 } : undefined,
      label: dataLabel,
    }
  })

  return {
    ...base,
    grid: {
      top: titleOffset + (c.showLegend ? 48 : 24),
      bottom: isHorizontal ? 24 : c.xLabel ? 56 : 48,
      left: isHorizontal ? '2%' : 16,
      right: usesRightAxis ? 40 : 24,
      containLabel: true,
    },
    tooltip: {
      ...tooltip,
      trigger: 'axis',
      axisPointer: {
        type: series.every((s) => s.type === 'line') ? 'line' : 'shadow',
        shadowStyle: { color: 'rgba(128,128,128,0.08)' },
        lineStyle: { color: palette.border },
      },
      valueFormatter: (v: unknown) => (typeof v === 'number' ? formatValue(v, c) : '—'),
    },
    ...(isHorizontal
      ? { xAxis: valueAxes, yAxis: categoryAxis }
      : { xAxis: categoryAxis, yAxis: valueAxes }),
    series,
  } as EChartsOption
}
