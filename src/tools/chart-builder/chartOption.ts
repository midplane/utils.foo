import type { EChartsOption } from 'echarts'
import { ParsedData, toNumber } from './chartData'

// Bang Wong colorblind-safe 7-color palette.
export const SERIES_COLORS = [
  '#0072B2', // blue
  '#D55E00', // vermillion
  '#009E73', // green
  '#E69F00', // orange
  '#CC79A7', // pink
  '#56B4E9', // sky blue
  '#F0E442', // yellow
]

const FONT = "'JetBrains Mono', ui-monospace, monospace"

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
    background: '#FFFBF5',
    ink: '#1C1917',
    inkLight: '#44403C',
    inkMuted: '#78716C',
    border: '#E7E5E4',
    borderDark: '#D6D3D1',
    tooltipText: '#FFFBF5',
  },
  dark: {
    background: '#1C1917',
    ink: '#F2EDE8',
    inkLight: '#CFC8C1',
    inkMuted: '#9A8F88',
    border: '#3A3430',
    borderDark: '#4A4440',
    tooltipText: '#1C1917',
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
  const read = (name: string, value: string) =>
    style.getPropertyValue(name).trim() || value

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
export function buildColorMap(numeric: string[]): Map<string, string> {
  return new Map(numeric.map((col, i) => [col, SERIES_COLORS[i % SERIES_COLORS.length]!]))
}

export type ChartType = 'bar' | 'stacked-bar' | 'line' | 'scatter'
export type Orientation = 'vertical' | 'horizontal'

/** Category labels longer than this are truncated on the axis. */
export const LABEL_TRUNCATE = 10

export interface BuildOptionArgs {
  data: ParsedData
  xCol: string
  series: string[]
  chartType: ChartType
  orientation: Orientation
  showLegend: boolean
  colors: Map<string, string>
  palette: Palette
}

export function buildOption({
  data,
  xCol,
  series: activeSeries,
  chartType,
  orientation,
  showLegend,
  colors,
  palette,
}: BuildOptionArgs): EChartsOption {
  const isBar = chartType === 'bar' || chartType === 'stacked-bar'
  const isHorizontal = isBar && orientation === 'horizontal'
  const isScatter = chartType === 'scatter'

  const axisLabel = { fontFamily: FONT, fontSize: 11, color: palette.inkMuted }

  const categoryAxis = {
    type: 'category' as const,
    data: data.rows.map((r) => String(r[xCol] ?? '')),
    axisLine: { lineStyle: { color: palette.borderDark } },
    axisTick: { show: false },
    axisLabel: {
      ...axisLabel,
      formatter: (v: string) =>
        isHorizontal || v.length <= LABEL_TRUNCATE ? v : `${v.slice(0, LABEL_TRUNCATE - 1)}…`,
    },
    splitLine: { show: false },
    // A category Y axis draws bottom-up, which reverses the reading order when
    // switching a bar chart to horizontal. Invert it so the first row stays first.
    ...(isHorizontal ? { inverse: true } : {}),
  }

  const valueAxis = {
    type: 'value' as const,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      ...axisLabel,
      formatter: (v: number) => formatCompact(v),
    },
    splitLine: { lineStyle: { color: palette.border, type: 'dashed' as const } },
    scale: true,
  }

  const tooltip = {
    backgroundColor: palette.ink,
    borderColor: palette.ink,
    borderWidth: 0,
    padding: [8, 12] as [number, number],
    textStyle: { fontFamily: FONT, fontSize: 11, color: palette.tooltipText },
  }

  const legend = showLegend
    ? {
        show: true,
        top: 8,
        textStyle: { fontFamily: FONT, fontSize: 11, color: palette.inkLight },
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
      }
    : { show: false }

  const base = {
    backgroundColor: palette.background,
    textStyle: { fontFamily: FONT, color: palette.ink },
    legend,
  }

  // ── Scatter: both axes are value axes and points are [x, y] pairs ──────────
  if (isScatter) {
    const series = activeSeries.map((col) => ({
      name: col,
      type: 'scatter' as const,
      // Points with an unusable coordinate are dropped rather than snapped to
      // zero, which previously stacked every point on the axis silently.
      data: data.rows
        .map((r) => [toNumber(r[xCol]), toNumber(r[col])])
        .filter((pair): pair is [number, number] => pair[0] !== null && pair[1] !== null),
      symbolSize: 8,
      itemStyle: { color: colors.get(col) },
    }))

    return {
      ...base,
      grid: { top: showLegend ? 48 : 24, bottom: 48, left: 16, right: 24, containLabel: true },
      tooltip: {
        ...tooltip,
        trigger: 'item',
        formatter: (p: unknown) => {
          const point = p as { seriesName: string; value: [number, number] }
          // seriesName, not a hardcoded first series - otherwise every series
          // after the first reported its Y under the wrong column name.
          return `${point.seriesName}<br/>${xCol}: <b>${point.value[0]}</b><br/>${point.seriesName}: <b>${point.value[1]}</b>`
        },
      },
      xAxis: {
        ...valueAxis,
        name: xCol,
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: { fontFamily: FONT, fontSize: 11, color: palette.inkMuted },
      },
      yAxis: { ...valueAxis },
      series,
    } as EChartsOption
  }

  // ── Bar / stacked bar / line ───────────────────────────────────────────────
  const series = activeSeries.map((col) => {
    const color = colors.get(col)
    return {
      name: col,
      type: (chartType === 'line' ? 'line' : 'bar') as 'bar' | 'line',
      stack: chartType === 'stacked-bar' ? 'total' : undefined,
      // null leaves a genuine gap; 0 would claim the value was zero.
      data: data.rows.map((r) => toNumber(r[col])),
      smooth: chartType === 'line' ? 0.3 : false,
      symbol: chartType === 'line' ? 'circle' : undefined,
      symbolSize: chartType === 'line' ? 5 : undefined,
      connectNulls: false,
      itemStyle: { color },
      lineStyle: chartType === 'line' ? { width: 2.5, color } : undefined,
    }
  })

  return {
    ...base,
    grid: {
      top: showLegend ? 48 : 24,
      bottom: isHorizontal ? 24 : 48,
      left: isHorizontal ? '2%' : 16,
      right: 24,
      containLabel: true,
    },
    tooltip: {
      ...tooltip,
      trigger: 'axis',
      axisPointer: {
        type: chartType === 'line' ? 'line' : 'shadow',
        shadowStyle: { color: 'rgba(128,128,128,0.08)' },
        lineStyle: { color: palette.border },
      },
    },
    ...(isHorizontal
      ? { xAxis: valueAxis, yAxis: categoryAxis }
      : { xAxis: categoryAxis, yAxis: valueAxis }),
    series,
  } as EChartsOption
}

/** Axis ticks read better as 80k than 80000. */
function formatCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${trim(value / 1_000_000_000)}B`
  if (abs >= 1_000_000) return `${trim(value / 1_000_000)}M`
  if (abs >= 1_000) return `${trim(value / 1_000)}k`
  return trim(value)
}

function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)))
}
