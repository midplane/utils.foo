import { useState, useRef, useMemo, useCallback } from 'react'
import { BarChart2, Trash2, Download, X } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  Alert,
  SectionLabel,
  SegmentedControl,
  SegmentedControlItem,
  ToolHeader,
} from '../../components/ui'
import { cn } from '../../lib/utils'
import { useTheme } from '../../contexts/ThemeContext'
import {
  parseInput,
  resolveSelection,
  columnsKey,
  Selection,
} from './chartData'
import {
  buildOption,
  buildColorMap,
  readPalette,
  LABEL_TRUNCATE,
  ChartType,
  Orientation,
} from './chartOption'

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChartBuilderTool() {
  const [raw, setRaw] = useState('')
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [orientation, setOrientation] = useState<Orientation>('vertical')
  const [showLegend, setShowLegend] = useState(true)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  /**
   * The user's explicit choices, tagged with the column set they were made
   * against. Storing both halves together is what stops committing one from
   * promoting the other's uninitialised value - previously toggling a series
   * blanked the X axis and unmounted the chart.
   */
  const [saved, setSaved] = useState<(Selection & { key: string }) | null>(null)

  const echartsRef = useRef<ReactECharts>(null)
  const { isDark } = useTheme()

  const { data, error: parseError } = useMemo(() => parseInput(raw), [raw])
  const { xCol, series: activeSeries, numeric: numericCols } = useMemo(
    () => resolveSelection(data, saved),
    [data, saved]
  )

  // Re-sampled whenever the theme flips, since ECharts cannot read CSS variables.
  const palette = useMemo(() => readPalette(isDark), [isDark])
  const colors = useMemo(() => buildColorMap(numericCols), [numericCols])

  // ── Selection updates always commit both halves ────────────────────────────

  const commit = useCallback(
    (next: Partial<Selection>) => {
      setSaved({ key: columnsKey(data.columns), xCol, series: activeSeries, ...next })
    },
    [data.columns, xCol, activeSeries]
  )

  const toggleSeries = useCallback(
    (col: string) => {
      const next = activeSeries.includes(col)
        ? activeSeries.filter((c) => c !== col)
        : // Re-insert in chip order rather than appending, so toggling a series
          // off and on is an identity operation and colours stay put.
          numericCols.filter((c) => c === col || activeSeries.includes(c))
      commit({ series: next })
    },
    [activeSeries, numericCols, commit]
  )

  const handleXColChange = useCallback(
    (col: string) => {
      setBannerDismissed(false)
      commit({ xCol: col, series: activeSeries.filter((c) => c !== col) })
    },
    [activeSeries, commit]
  )

  const resetSelection = useCallback(() => {
    setSaved(null)
    setBannerDismissed(false)
  }, [])

  const loadSample = useCallback(
    (sample: string) => {
      setRaw(sample)
      resetSelection()
    },
    [resetSelection]
  )

  const handleClear = useCallback(() => {
    setRaw('')
    resetSelection()
  }, [resetSelection])

  // ── Warnings ───────────────────────────────────────────────────────────────

  const hasLongLabels = useMemo(
    () =>
      Boolean(xCol) &&
      data.rows.some((r) => String(r[xCol] ?? '').length > LABEL_TRUNCATE),
    [xCol, data]
  )

  const isBar = chartType === 'bar' || chartType === 'stacked-bar'
  const showLongLabelHint =
    isBar && orientation === 'vertical' && hasLongLabels && !bannerDismissed

  // ── Chart ──────────────────────────────────────────────────────────────────

  const option = useMemo(() => {
    if (!xCol || activeSeries.length === 0 || data.rows.length === 0) return null
    return buildOption({
      data,
      xCol,
      series: activeSeries,
      chartType,
      orientation,
      showLegend,
      colors,
      palette,
    })
  }, [data, xCol, activeSeries, chartType, orientation, showLegend, colors, palette])

  const handleExport = useCallback(() => {
    const instance = echartsRef.current?.getEchartsInstance()
    if (!instance) return

    // The canvas renderer is required for this to produce an actual raster:
    // under the SVG renderer getDataURL ignores `type` and returns SVG markup.
    const url = instance.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: palette.background,
    })

    const a = document.createElement('a')
    a.href = url
    a.download = 'chart.png'
    a.click()
  }, [palette])

  const hasData = data.columns.length > 0 && data.rows.length > 0

  return (
    <div className="space-y-4 animate-fade-in">
      <ToolHeader icon={<BarChart2 />} title="Chart" accentedSuffix="Builder" />

      {/* ── Data ─────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <SectionLabel htmlFor="chart-data">Data</SectionLabel>
            <div className="flex items-center gap-1">
              <select
                aria-label="Load sample data"
                className="h-7 px-2 text-xs font-mono rounded border border-[var(--color-ink-muted)] bg-[var(--color-cream)] text-[var(--color-ink)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                value=""
                onChange={(e) => {
                  const sample = SAMPLES[e.target.value]
                  if (sample) loadSample(sample)
                }}
              >
                <option value="" disabled>
                  Load sample data
                </option>
                {Object.keys(SAMPLES).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              {raw && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs h-7 px-2"
                  onClick={handleClear}
                >
                  <Trash2 className="w-3 h-3" aria-hidden="true" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <textarea
            id="chart-data"
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value)
              setBannerDismissed(false)
            }}
            placeholder={
              'Paste CSV or TSV data here…\n\nExample:\nMonth,Revenue,Expenses\nJan,42000,31000\nFeb,38000,29000'
            }
            spellCheck={false}
            className="w-full h-40 resize-y font-mono text-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20 transition-all"
          />

          {parseError ? (
            <Alert variant="error" size="sm">
              {parseError}
            </Alert>
          ) : hasData ? (
            <p className="text-[10px] font-mono text-[var(--color-ink-muted)]">
              <span className="text-[var(--color-accent)] font-semibold">
                {data.rows.length}
              </span>{' '}
              rows ·{' '}
              <span className="text-[var(--color-accent)] font-semibold">
                {data.columns.length}
              </span>{' '}
              columns · {numericCols.length} numeric
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      {hasData && (
        <Card>
          <CardHeader>
            <SectionLabel>Controls</SectionLabel>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <div className="space-y-1.5">
                <SectionLabel>Chart Type</SectionLabel>
                <SegmentedControl
                  value={chartType}
                  onChange={(v) => setChartType(v as ChartType)}
                  variant="bordered"
                >
                  {(['bar', 'stacked-bar', 'line', 'scatter'] as ChartType[]).map((t) => (
                    <SegmentedControlItem key={t} value={t} className="font-mono">
                      {t === 'stacked-bar' ? 'stacked bar' : t}
                    </SegmentedControlItem>
                  ))}
                </SegmentedControl>
              </div>

              {isBar && (
                <div className="space-y-1.5">
                  <SectionLabel>Orientation</SectionLabel>
                  <SegmentedControl
                    value={orientation}
                    onChange={(o) => setOrientation(o as Orientation)}
                    variant="bordered"
                  >
                    {(['vertical', 'horizontal'] as Orientation[]).map((o) => (
                      <SegmentedControlItem
                        key={o}
                        value={o}
                        className="font-mono capitalize"
                      >
                        {o}
                      </SegmentedControlItem>
                    ))}
                  </SegmentedControl>
                </div>
              )}

              <div className="space-y-1.5">
                <SectionLabel htmlFor="chart-x-axis">X Axis</SectionLabel>
                <select
                  id="chart-x-axis"
                  value={xCol}
                  onChange={(e) => handleXColChange(e.target.value)}
                  className="w-full text-xs font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20 transition-all cursor-pointer"
                >
                  {data.columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <SectionLabel>Series</SectionLabel>
                {numericCols.length === 0 ? (
                  <p className="text-[11px] text-[var(--color-ink-muted)] font-mono">
                    No numeric columns found
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Series">
                    {numericCols.map((col) => {
                      const active = activeSeries.includes(col)
                      const color = colors.get(col)!
                      return (
                        <button
                          key={col}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleSeries(col)}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono rounded-md border transition-all cursor-pointer',
                            active
                              ? 'border-transparent text-white font-semibold'
                              : 'border-[var(--color-border)] text-[var(--color-ink-muted)] bg-[var(--color-surface)] hover:border-[var(--color-border-dark)]'
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

              <div className="space-y-1.5">
                <SectionLabel>Legend</SectionLabel>
                <SegmentedControl
                  value={showLegend ? 'on' : 'off'}
                  onChange={(v) => setShowLegend(v === 'on')}
                  variant="bordered"
                >
                  <SegmentedControlItem value="on" className="font-mono">
                    On
                  </SegmentedControlItem>
                  <SegmentedControlItem value="off" className="font-mono">
                    Off
                  </SegmentedControlItem>
                </SegmentedControl>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Preview ──────────────────────────────────────────────────────── */}
      {option && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <SectionLabel>Preview</SectionLabel>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs h-7 px-2"
                onClick={handleExport}
              >
                <Download className="w-3 h-3" aria-hidden="true" />
                Export PNG
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {showLongLabelHint && (
              <Alert variant="info" size="sm">
                <span className="flex items-center justify-between gap-3 w-full">
                  <span>
                    Long labels detected — a{' '}
                    <button
                      type="button"
                      onClick={() => setOrientation('horizontal')}
                      className="underline underline-offset-2 cursor-pointer font-semibold"
                    >
                      horizontal bar chart
                    </button>{' '}
                    may be easier to read.
                  </span>
                  <button
                    type="button"
                    onClick={() => setBannerDismissed(true)}
                    aria-label="Dismiss"
                    className="shrink-0 p-0.5 rounded hover:bg-[var(--color-cream-dark)] transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </span>
              </Alert>
            )}

            <ReactECharts
              ref={echartsRef}
              option={option}
              style={{ height: '420px', width: '100%' }}
              opts={{ renderer: 'canvas' }}
              notMerge
            />

            <p className="text-center text-[10px] text-[var(--color-ink-muted)] font-mono">
              Hover over the chart for exact values
            </p>
          </CardContent>
        </Card>
      )}

      {/* Selecting the only numeric column as X leaves nothing to plot; say so
          rather than silently dropping the preview. */}
      {hasData && !option && (
        <Card>
          <CardContent className="py-6">
            <Alert variant="info" size="sm">
              {numericCols.length === 0
                ? `No numeric columns left to plot. "${xCol}" is the X axis — pick a different one, or check that your measures are numeric.`
                : 'Select at least one series to draw a chart.'}
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {!hasData && !raw && (
        <div className="text-center py-12 text-[var(--color-ink-muted)]">
          <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-20" aria-hidden="true" />
          <p className="text-sm font-mono">
            Paste data above or load a sample to get started
          </p>
        </div>
      )}
    </div>
  )
}
