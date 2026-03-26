import { useState, useRef, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { BarChart2, ChevronLeft, Trash2, Download, X, ArrowLeftRight } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import Papa from 'papaparse'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

// Bang Wong colorblind-safe 7-color palette
const SERIES_COLORS = [
  '#0072B2', // blue
  '#D55E00', // vermillion
  '#009E73', // green
  '#E69F00', // orange
  '#CC79A7', // pink
  '#56B4E9', // sky blue
  '#F0E442', // yellow
]

const FONT = "'JetBrains Mono', ui-monospace, monospace"
const C = {
  cream:      '#FFFBF5',
  creamDark:  '#FFF7ED',
  ink:        '#1C1917',
  inkLight:   '#44403C',
  inkMuted:   '#78716C',
  accent:     '#EA580C',
  border:     '#E7E5E4',
  borderDark: '#D6D3D1',
}

// ─── Sample data ──────────────────────────────────────────────────────────────

const SAMPLE_REVENUE = `Month,Revenue,Expenses,Profit
Jan,42000,31000,11000
Feb,38000,29000,9000
Mar,51000,34000,17000
Apr,47000,32000,15000
May,55000,37000,18000
Jun,62000,40000,22000
Jul,58000,38000,20000
Aug,64000,41000,23000
Sep,70000,44000,26000
Oct,67000,42000,25000
Nov,73000,46000,27000
Dec,80000,50000,30000`

const SAMPLE_POPULATION = `Country,Population (millions)
India,1429
China,1412
United States,335
Indonesia,277
Pakistan,231
Brazil,215
Nigeria,220
Bangladesh,172
Russia,144
Ethiopia,126`

const SAMPLE_SCATTER = `Label,Study Hours,Exam Score
Alice,2,58
Bob,3,65
Carol,4,70
Dave,5,75
Eve,6,80
Frank,7,84
Grace,8,88
Hank,9,91
Iris,10,94
Jack,11,96`

const SAMPLES: Record<string, string> = {
  'Revenue (multi-series)': SAMPLE_REVENUE,
  'Population (single-series)': SAMPLE_POPULATION,
  'Study Hours vs Score (scatter)': SAMPLE_SCATTER,
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ChartType = 'bar' | 'stacked-bar' | 'line' | 'scatter'
type Orientation = 'vertical' | 'horizontal'

interface ParsedData {
  columns: string[]
  rows: Record<string, string | number>[]
}

// ─── Parse helpers ────────────────────────────────────────────────────────────

function parseInput(raw: string): { data: ParsedData; error: string } {
  if (!raw.trim()) return { data: { columns: [], rows: [] }, error: '' }

  const result = Papa.parse<Record<string, string>>(raw.trim(), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    delimiter: '',  // auto-detect CSV vs TSV
  })

  if (result.errors.length > 0 && result.data.length === 0) {
    return { data: { columns: [], rows: [] }, error: result.errors[0]!.message }
  }

  const columns = result.meta.fields ?? []
  if (columns.length === 0) {
    return { data: { columns: [], rows: [] }, error: 'No columns detected. Make sure your data has a header row.' }
  }

  return {
    data: { columns, rows: result.data as Record<string, string | number>[] },
    error: '',
  }
}

function isNumericColumn(col: string, rows: Record<string, string | number>[]): boolean {
  return rows.every((r) => {
    const v = r[col]
    return v === null || v === undefined || v === '' || (typeof v === 'number' && isFinite(v))
  })
}

// ─── ECharts option builder ───────────────────────────────────────────────────

function buildOption(
  data: ParsedData,
  xCol: string,
  activeSeries: string[],
  chartType: ChartType,
  orientation: Orientation,
  showLegend: boolean,
): EChartsOption {
  const xValues = data.rows.map((r) => String(r[xCol] ?? ''))
  const isHorizontal = (chartType === 'bar' || chartType === 'stacked-bar') && orientation === 'horizontal'
  const isScatter = chartType === 'scatter'
  const isStackedBar = chartType === 'stacked-bar'

  const axisLabel = {
    fontFamily: FONT,
    fontSize: 11,
    color: C.inkMuted,
  }

  const categoryAxis = {
    type: 'category' as const,
    data: xValues,
    axisLine: { lineStyle: { color: C.borderDark } },
    axisTick: { show: false },
    axisLabel: {
      ...axisLabel,
      formatter: (v: string) => isHorizontal ? v : v.length > 10 ? v.slice(0, 9) + '…' : v,
      rotate: 0,
    },
    splitLine: { show: false },
  }

  const valueAxis = {
    type: 'value' as const,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { ...axisLabel },
    splitLine: { lineStyle: { color: C.border, type: 'dashed' as const } },
    scale: true,
  }

  // ── Scatter: both axes are value axes, data is [x, y] pairs
  if (isScatter) {
    const series = activeSeries.map((col, i) => ({
      name: col,
      type: 'scatter' as const,
      data: data.rows.map((r) => {
        const xVal = r[xCol]
        const yVal = r[col]
        return [
          typeof xVal === 'number' ? xVal : parseFloat(String(xVal)) || 0,
          typeof yVal === 'number' ? yVal : parseFloat(String(yVal)) || 0,
        ]
      }),
      symbolSize: 8,
      itemStyle: { color: SERIES_COLORS[i % SERIES_COLORS.length] },
    }))

    return {
      backgroundColor: C.cream,
      textStyle: { fontFamily: FONT, color: C.ink },
      grid: { top: showLegend ? 48 : 24, bottom: 48, left: 16, right: 24, containLabel: true },
      legend: showLegend ? {
        show: true, top: 8,
        textStyle: { fontFamily: FONT, fontSize: 11, color: C.inkLight },
        icon: 'circle', itemWidth: 8, itemHeight: 8,
      } : { show: false },
      tooltip: {
        trigger: 'item',
        backgroundColor: C.ink,
        borderColor: C.ink,
        borderWidth: 0,
        padding: [8, 12],
        textStyle: { fontFamily: FONT, fontSize: 11, color: '#FFFBF5' },
        formatter: (p: { seriesName: string; value: [number, number] } | unknown) => {
          const point = p as { seriesName: string; value: [number, number] }
          return `${point.seriesName}<br/>${xCol}: <b>${point.value[0]}</b><br/>${activeSeries[0]}: <b>${point.value[1]}</b>`
        },
      },
      xAxis: { ...valueAxis, name: xCol, nameLocation: 'middle', nameGap: 28, nameTextStyle: { fontFamily: FONT, fontSize: 11, color: C.inkMuted } },
      yAxis: { ...valueAxis },
      series,
    } as EChartsOption
  }

  // ── Bar / Stacked Bar / Line
  const series = activeSeries.map((col, i) => ({
    name: col,
    type: (chartType === 'line' ? 'line' : 'bar') as 'bar' | 'line',
    stack: isStackedBar ? 'total' : undefined,
    data: data.rows.map((r) => {
      const v = r[col]
      return typeof v === 'number' ? v : parseFloat(String(v)) || 0
    }),
    smooth: chartType === 'line' ? 0.3 : false,
    symbol: chartType === 'line' ? 'circle' : undefined,
    symbolSize: chartType === 'line' ? 5 : undefined,
    itemStyle: { color: SERIES_COLORS[i % SERIES_COLORS.length] },
    lineStyle: chartType === 'line' ? { width: 2.5, color: SERIES_COLORS[i % SERIES_COLORS.length] } : undefined,
  }))

  return {
    backgroundColor: C.cream,
    textStyle: { fontFamily: FONT, color: C.ink },
    grid: {
      top: showLegend ? 48 : 24,
      bottom: isHorizontal ? 24 : 48,
      left: isHorizontal ? '2%' : 16,
      right: 24,
      containLabel: true,
    },
    legend: showLegend ? {
      show: true,
      top: 8,
      textStyle: { fontFamily: FONT, fontSize: 11, color: C.inkLight },
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
    } : { show: false },
    tooltip: {
      trigger: 'axis',
      backgroundColor: C.ink,
      borderColor: C.ink,
      borderWidth: 0,
      padding: [8, 12],
      textStyle: { fontFamily: FONT, fontSize: 11, color: '#FFFBF5' },
      axisPointer: {
        type: chartType === 'line' ? 'line' : 'shadow',
        shadowStyle: { color: 'rgba(28,25,23,0.04)' },
        lineStyle: { color: C.border },
      },
    },
    ...(isHorizontal
      ? { xAxis: valueAxis, yAxis: { ...categoryAxis, axisLabel: { ...axisLabel, rotate: 0 } } }
      : { xAxis: categoryAxis, yAxis: valueAxis }
    ),
    series,
  } as EChartsOption
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChartBuilderTool() {
  const [raw, setRaw] = useState('')
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [orientation, setOrientation] = useState<Orientation>('vertical')
  // xColOverride / activeSeriesOverride are user-chosen values for a specific column set.
  // When the column set changes (new data loaded), they are ignored and defaults are derived.
  const [colsKey, setColsKey] = useState('')          // tracks which dataset the overrides belong to
  const [xColOverride, setXColOverride] = useState<string>('')
  const [activeSeriesOverride, setActiveSeriesOverride] = useState<string[]>([])
  const [showLegend, setShowLegend] = useState(true)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const echartsRef = useRef<ReactECharts>(null)

  // ── Parse ────────────────────────────────────────────────────────────────────
  const { data, error: parseError } = useMemo(() => parseInput(raw), [raw])

  // ── Derive effective xCol / activeSeries ─────────────────────────────────────
  // If colsKey matches the current data, use the user overrides; otherwise derive defaults.
  const currentKey = data.columns.join('|')
  const xCol = currentKey === colsKey ? xColOverride : (data.columns[0] ?? '')
  const defaultNumeric = useMemo(() => {
    const defaultX = data.columns[0] ?? ''
    return data.columns.filter((c) => c !== defaultX && isNumericColumn(c, data.rows))
  }, [data])
  const activeSeries = currentKey === colsKey ? activeSeriesOverride : defaultNumeric

  const numericCols = useMemo(
    () => data.columns.filter((c) => c !== xCol && isNumericColumn(c, data.rows)),
    [data, xCol]
  )

  // ── Handlers that also update the colsKey ────────────────────────────────────
  const setXCol = useCallback((col: string) => {
    setColsKey(currentKey)
    setXColOverride(col)
  }, [currentKey])

  const setActiveSeries = useCallback((series: string[] | ((prev: string[]) => string[])) => {
    setColsKey(currentKey)
    if (typeof series === 'function') {
      setActiveSeriesOverride(series(activeSeries))
    } else {
      setActiveSeriesOverride(series)
    }
  }, [currentKey, activeSeries])

  // ── Long label detection ──────────────────────────────────────────────────────
  const hasLongLabels = useMemo(() => {
    if (!xCol || data.rows.length === 0) return false
    return data.rows.some((r) => String(r[xCol] ?? '').length > 8)
  }, [xCol, data])

  const showBanner = (chartType === 'bar' || chartType === 'stacked-bar') && orientation === 'vertical' && hasLongLabels && !bannerDismissed

  // ── Chart option ─────────────────────────────────────────────────────────────
  const option = useMemo(() => {
    if (!xCol || activeSeries.length === 0 || data.rows.length === 0) return null
    return buildOption(data, xCol, activeSeries, chartType, orientation, showLegend)
  }, [data, xCol, activeSeries, chartType, orientation, showLegend])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const loadSample = useCallback((sample: string) => {
    setRaw(sample)
    setBannerDismissed(false)
  }, [])

  const handleClear = useCallback(() => {
    setRaw('')
    setColsKey('')
    setXColOverride('')
    setActiveSeriesOverride([])
    setBannerDismissed(false)
  }, [])

  const toggleSeries = useCallback((col: string) => {
    setActiveSeries((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    )
  }, [setActiveSeries])

  const handleXColChange = useCallback((col: string) => {
    setXCol(col)
    setBannerDismissed(false)
    // Remove new x col from series, add old x col if it was numeric
    setActiveSeries((prev) => {
      const without = prev.filter((c) => c !== col)
      return without
    })
  }, [setXCol, setActiveSeries])

  const handleExport = useCallback(() => {
    const instance = echartsRef.current?.getEchartsInstance()
    if (!instance) return
    const url = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: C.cream })
    const a = document.createElement('a')
    a.href = url
    a.download = 'chart.png'
    a.click()
  }, [])

  const hasData = data.columns.length > 0 && data.rows.length > 0

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] transition-colors"
        >
          <ChevronLeft className="w-3 h-3" />
          Back
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-white">
            <BarChart2 className="w-3.5 h-3.5" />
          </div>
          <h1 className="font-mono text-lg font-semibold text-[var(--color-ink)]">
            Chart <span className="text-[var(--color-accent)]">Builder</span>
          </h1>
        </div>
      </div>

      {/* Zone 1: Data input */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider">Data</span>
            <div className="flex items-center gap-1">
              <select
                className="h-7 px-2 text-xs font-mono rounded border border-[var(--color-ink-muted)] bg-[var(--color-cream)] text-[var(--color-ink)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                value=""
                onChange={e => { const s = SAMPLES[e.target.value]; if (s) loadSample(s) }}
              >
                <option value="" disabled>Load sample data</option>
                {Object.keys(SAMPLES).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              {raw && (
                <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2" onClick={handleClear}>
                  <Trash2 className="w-3 h-3" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <textarea
            value={raw}
            onChange={(e) => { setRaw(e.target.value); setBannerDismissed(false) }}
            placeholder={'Paste CSV or TSV data here…\n\nExample:\nMonth,Revenue,Expenses\nJan,42000,31000\nFeb,38000,29000'}
            spellCheck={false}
            className="w-full h-40 resize-y font-mono text-xs bg-white border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20 transition-all"
          />
          {/* Status line */}
          <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono">
            {parseError ? (
              <span className="text-red-600">{parseError}</span>
            ) : hasData ? (
              <span className="text-[var(--color-ink-muted)]">
                <span className="text-[var(--color-accent)] font-semibold">{data.rows.length}</span> rows
                {' · '}
                <span className="text-[var(--color-accent)] font-semibold">{data.columns.length}</span> columns
                {' · '}
                {numericCols.length} numeric
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Zone 2: Controls */}
      {hasData && (
        <Card>
          <CardHeader>
            <span className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider">Controls</span>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">

              {/* Chart type */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-ink-muted)]">Chart Type</label>
                <div className="flex flex-wrap gap-1">
                  {(['bar', 'stacked-bar', 'line', 'scatter'] as ChartType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setChartType(t)}
                      className={cn(
                        'px-3 py-1 text-xs font-mono rounded-md border transition-colors cursor-pointer',
                        chartType === t
                          ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white font-semibold'
                          : 'border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-border-dark)] hover:text-[var(--color-ink)]'
                      )}
                    >
                      {t === 'stacked-bar' ? 'stacked bar' : t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orientation (bar / stacked-bar only) */}
              {(chartType === 'bar' || chartType === 'stacked-bar') && (
              <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-ink-muted)]">Orientation</label>
                  <div className="flex gap-1">
                    {(['vertical', 'horizontal'] as Orientation[]).map((o) => (
                      <button
                        key={o}
                        onClick={() => { setOrientation(o); if (o === 'horizontal') setBannerDismissed(true) }}
                        className={cn(
                          'px-3 py-1 text-xs font-mono rounded-md border transition-colors cursor-pointer capitalize',
                          orientation === o
                            ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white font-semibold'
                            : 'border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-border-dark)] hover:text-[var(--color-ink)]'
                        )}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* X axis */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-ink-muted)]">X Axis</label>
                <select
                  value={xCol}
                  onChange={(e) => handleXColChange(e.target.value)}
                  className="w-full text-xs font-mono bg-white border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20 transition-all cursor-pointer"
                >
                  {data.columns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Series */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-ink-muted)]">Series</label>
                {numericCols.length === 0 ? (
                  <p className="text-[11px] text-[var(--color-ink-muted)] font-mono">No numeric columns found</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {numericCols.map((col, i) => {
                      const active = activeSeries.includes(col)
                      const color = SERIES_COLORS[i % SERIES_COLORS.length]!
                      return (
                        <button
                          key={col}
                          onClick={() => toggleSeries(col)}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono rounded-md border transition-all cursor-pointer',
                            active
                              ? 'border-transparent text-white font-semibold'
                              : 'border-[var(--color-border)] text-[var(--color-ink-muted)] bg-white hover:border-[var(--color-border-dark)]'
                          )}
                          style={active ? { backgroundColor: color, borderColor: color } : {}}
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: active ? 'rgba(255,255,255,0.7)' : color }}
                          />
                          {col}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Legend toggle */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-ink-muted)]">Legend</label>
                <button
                  onClick={() => setShowLegend((v) => !v)}
                  className={cn(
                    'inline-flex items-center gap-2 px-3 py-1 text-xs font-mono rounded-md border transition-colors cursor-pointer',
                    showLegend
                      ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white font-semibold'
                      : 'border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-border-dark)] hover:text-[var(--color-ink)]'
                  )}
                >
                  {showLegend ? 'On' : 'Off'}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Zone 3: Chart preview */}
      {option && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider">Preview</span>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7 px-2" onClick={handleExport}>
                <Download className="w-3 h-3" />
                Export PNG
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Long-label banner */}
            {showBanner && (
              <div className="mb-3 flex items-center justify-between gap-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] font-mono text-amber-800">
                <span>
                  Long labels detected — a{' '}
                  <button
                    onClick={() => { setOrientation('horizontal'); setBannerDismissed(true) }}
                    className="underline underline-offset-2 cursor-pointer hover:text-amber-900 font-semibold"
                  >
                    horizontal bar chart
                  </button>
                  {' '}may be easier to read.
                </span>
                <button
                  onClick={() => setBannerDismissed(true)}
                  className="flex-shrink-0 p-0.5 hover:bg-amber-100 rounded transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <ReactECharts
              ref={echartsRef}
              option={option}
              style={{ height: '420px', width: '100%' }}
              opts={{ renderer: 'svg' }}
              notMerge
            />

            {/* Chart type hint */}
            <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-[var(--color-ink-muted)] font-mono">
              <ArrowLeftRight className="w-3 h-3" />
              <span>Hover over the chart for exact values</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!hasData && !raw && (
        <div className="text-center py-12 text-[var(--color-ink-muted)]">
          <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-mono">Paste data above or load a sample to get started</p>
        </div>
      )}
    </div>
  )
}
