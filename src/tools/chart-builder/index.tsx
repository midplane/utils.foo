import { useState, useRef, useMemo, useCallback } from 'react'
import { BarChart2, SlidersHorizontal, Palette as PaletteIcon } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import {
  Alert,
  SectionLabel,
  SegmentedControl,
  SegmentedControlItem,
  ToolHeader,
  DataInput,
  useExpandable,
  ExpandableCard,
  ExpandableCardHeader,
  ExpandableCardContent,
  ExpandToggleButton,
  ExpandHint,
  EXPANDED_PANE_HEIGHT,
  DEFAULT_PANE_HEIGHT,
} from '../../components/ui'
import { useTheme } from '../../contexts/ThemeContext'
import { parseInput, numericColumns, columnsKey } from './chartData'
import {
  transform,
  isDateColumn,
  DEFAULT_TRANSFORM,
  MAX_PLOT_POINTS,
  type TransformConfig,
  type FilterRule,
} from './transform'
import {
  buildOption,
  buildColorMap,
  readPalette,
  CHART_TYPE_LABELS,
  SINGLE_SERIES_TYPES,
  DEFAULT_COSMETICS,
  LABEL_TRUNCATE,
  type ChartType,
  type Cosmetics,
  type Orientation,
  type SeriesStyle,
} from './chartOption'
import { SAMPLES, loadSample, type ChartSample } from './samples'
import { encodeState, readStateFromLocation, consumeHandoff } from './shareState'
import { ShapePanel } from './components/ShapePanel'
import { SeriesPanel } from './components/SeriesPanel'
import { FilterEditor } from './components/FilterEditor'
import { StylePanel } from './components/StylePanel'
import { ExportBar } from './components/ExportBar'

const CHART_TYPES = Object.keys(CHART_TYPE_LABELS) as ChartType[]

/**
 * Resolve the starting state once, before first paint.
 *
 * A Pivot Table handoff wins over a shared link: it is the more deliberate
 * action, and it is consumed on read so a later reload does not resurrect it.
 * Doing this here rather than in a mount effect avoids a render with empty
 * state followed by a cascading update.
 */
function bootState() {
  const handoff = consumeHandoff()
  if (handoff) {
    return { raw: handoff.csv, source: handoff.source, shared: null }
  }
  const shared = readStateFromLocation()
  return {
    raw: shared?.data ?? '',
    source: shared?.data ? 'Shared link' : '',
    shared,
  }
}

export default function ChartBuilderTool() {
  const [boot] = useState(bootState)

  const [raw, setRaw] = useState(boot.raw)
  const [sourceLabel, setSourceLabel] = useState(boot.source)
  const [chartType, setChartType] = useState<ChartType>(boot.shared?.chartType ?? 'bar')
  const [orientation, setOrientation] = useState<Orientation>(boot.shared?.orientation ?? 'vertical')
  const [cosmetics, setCosmetics] = useState<Cosmetics>(boot.shared?.cosmetics ?? DEFAULT_COSMETICS)
  const [styles, setStyles] = useState<Record<string, SeriesStyle>>(boot.shared?.styles ?? {})
  const [tab, setTab] = useState('shape')
  const [sampleState, setSampleState] = useState<{ loading: boolean; error: string }>({
    loading: false, error: '',
  })

  /**
   * Shaping choices, tagged with the column set they were made against, so a
   * new dataset does not inherit a selection that no longer means anything.
   */
  /**
   * The user's shaping choices, tagged with the column set they were made
   * against. The tag is what separates "not configured yet" from "deliberately
   * emptied": without it, deselecting the last series looks identical to a
   * fresh dataset and the defaults immediately reselect everything.
   *
   * A null tag means the config came from a sample or a shared link and has not
   * been matched against real columns yet.
   */
  const [stored, setStored] = useState<{ config: TransformConfig; key: string | null }>(() => ({
    config: boot.shared?.transform ?? DEFAULT_TRANSFORM,
    key: null,
  }))

  const { expanded, setExpanded } = useExpandable()
  const { isDark } = useTheme()
  const echartsRef = useRef<ReactECharts>(null)
  const chartBoxRef = useRef<HTMLDivElement>(null)

  const { data, error: parseError } = useMemo(() => parseInput(raw), [raw])

  /**
   * The configuration actually in force.
   *
   * Derived rather than synchronised through an effect: when the data changes
   * the stored selection may name columns that no longer exist, and defaulting
   * it here means there is never a render where the two disagree.
   */
  const dataKey = useMemo(() => columnsKey(data.columns), [data.columns])

  const config = useMemo<TransformConfig>(() => {
    if (data.columns.length === 0) return stored.config

    // Owned by this dataset: honour it exactly, including an empty series list.
    if (stored.key === dataKey) return stored.config

    const prev = stored.config
    const xCol = prev.xCol && data.columns.includes(prev.xCol) ? prev.xCol : data.columns[0] ?? ''
    const numeric = numericColumns(data, xCol)
    const carried = prev.series.filter((s) => numeric.includes(s))
    return { ...prev, xCol, series: carried.length > 0 ? carried : numeric }
  }, [data, dataKey, stored])

  const numericCols = useMemo(
    () => numericColumns(data, config.xCol),
    [data, config.xCol]
  )

  // Drop series that are no longer numeric, without disturbing the rest.
  const activeSeries = useMemo(
    () => config.series.filter((s) => numericCols.includes(s)),
    [config.series, numericCols]
  )

  const palette = useMemo(() => readPalette(isDark), [isDark])
  const overrides = useMemo(() => {
    const out: Record<string, string> = {}
    for (const [col, style] of Object.entries(styles)) if (style.color) out[col] = style.color
    return out
  }, [styles])
  const colors = useMemo(
    () => buildColorMap(numericCols, cosmetics.palette, overrides),
    [numericCols, cosmetics.palette, overrides]
  )

  const xIsDate = useMemo(
    () => isDateColumn(config.xCol, data.rows),
    [config.xCol, data.rows]
  )

  // Circular charts encode one measure; the rest of the selection is ignored.
  const effectiveSeries = SINGLE_SERIES_TYPES.has(chartType)
    ? activeSeries.slice(0, 1)
    : activeSeries

  const result = useMemo(
    () => transform(data, {
      ...config,
      series: effectiveSeries,
      numericX: chartType === 'scatter',
    }),
    [data, config, effectiveSeries, chartType]
  )

  const option = useMemo(() => {
    if (result.categories.length === 0) return null
    return buildOption({
      result, xCol: config.xCol, chartType, orientation,
      cosmetics, colors, styles, palette,
    })
  }, [result, config.xCol, chartType, orientation, cosmetics, colors, styles, palette])

  // ── Handlers ───────────────────────────────────────────────────────────────

  // Edits commit the derived config, so defaults become explicit the moment
  // the user touches anything.
  const patchConfig = useCallback((patch: Partial<TransformConfig>) => {
    const next = { ...config, ...patch }
    // Moving a column onto the X axis must remove it from the series.
    if (patch.xCol) {
      next.series = numericColumns(data, patch.xCol).filter((s) => next.series.includes(s))
      if (next.series.length === 0) next.series = numericColumns(data, patch.xCol)
    }
    setStored({ config: next, key: dataKey })
  }, [config, data, dataKey])

  const toggleSeries = useCallback((col: string) => {
    setStored({
      config: {
        ...config,
        series: config.series.includes(col)
          // Re-insert in chip order rather than appending, so toggling a series
          // off and on is an identity operation and colours stay put.
          ? config.series.filter((c) => c !== col)
          : numericCols.filter((c) => c === col || config.series.includes(c)),
      },
      key: dataKey,
    })
  }, [config, numericCols, dataKey])

  const setSeriesStyle = useCallback((col: string, style: SeriesStyle) => {
    setStyles((prev) => ({ ...prev, [col]: style }))
  }, [])

  const handleLoadSample = useCallback(async (sample: ChartSample) => {
    setSampleState({ loading: true, error: '' })
    try {
      const csv = await loadSample(sample)
      setRaw(csv)
      setSourceLabel(sample.label)
      setChartType(sample.chartType)
      setCosmetics({ ...DEFAULT_COSMETICS, ...sample.cosmetics })
      setStyles({})
      setStored({ config: { ...DEFAULT_TRANSFORM, ...sample.transform }, key: null })
      setSampleState({ loading: false, error: '' })
    } catch (e) {
      setSampleState({
        loading: false,
        error: e instanceof Error ? e.message : 'Could not load the sample.',
      })
    }
  }, [])

  const handleDataChange = useCallback((value: string) => {
    setRaw(value)
    setSourceLabel('')
  }, [])

  const handleShare = useCallback(() => {
    const { hash, dataOmitted } = encodeState({
      v: 1,
      transform: { ...config, series: effectiveSeries },
      cosmetics, chartType, orientation, styles,
      data: raw,
    })
    const url = `${window.location.origin}${window.location.pathname}${hash}`
    window.history.replaceState(null, '', hash)
    try {
      void navigator.clipboard.writeText(url)
      return { ok: true, dataOmitted }
    } catch {
      return { ok: false, dataOmitted }
    }
  }, [config, effectiveSeries, cosmetics, chartType, orientation, styles, raw])

  // ── Derived UI state ───────────────────────────────────────────────────────

  const hasData = data.columns.length > 0 && data.rows.length > 0
  const usesRightAxis = effectiveSeries.some((s) => styles[s]?.axis === 'right')
  const supportsAxes = !SINGLE_SERIES_TYPES.has(chartType)
  const isBar = chartType === 'bar' || chartType === 'stacked-bar'

  const hasLongLabels = useMemo(
    () => Boolean(config.xCol) && result.xKind === 'category' &&
      result.categories.some((c) => String(c).length > LABEL_TRUNCATE),
    [config.xCol, result]
  )

  const chartHeight = expanded ? EXPANDED_PANE_HEIGHT : DEFAULT_PANE_HEIGHT

  // Read at click time, not during render: the ref is not populated during
  // render and the box changes size when the card expands.
  const measured = useCallback(() => {
    const box = chartBoxRef.current?.getBoundingClientRect()
    return { width: box?.width ?? 900, height: box?.height ?? 480 }
  }, [])

  return (
    <div className="space-y-4 animate-fade-in">
      {!expanded && <ToolHeader icon={<BarChart2 />} title="Chart" accentedSuffix="Builder" />}

      {!expanded && (
        <DataInput
          value={raw}
          onChange={handleDataChange}
          error={parseError}
          warning={
            data.rows.length > MAX_PLOT_POINTS
              ? `${data.rows.length.toLocaleString()} rows loaded. Charts are capped at ${MAX_PLOT_POINTS.toLocaleString()} points — summarise or filter to see all of it.`
              : ''
          }
          samples={SAMPLES}
          onLoadSample={handleLoadSample}
          loadingSample={sampleState.loading}
          sampleError={sampleState.error}
          recordCount={data.rows.length}
          fieldCount={data.columns.length}
          sourceLabel={sourceLabel}
          inputId="chart-data"
          label="Data"
        />
      )}

      {hasData && (
        <ExpandableCard expanded={expanded} onExpandedChange={setExpanded}>
          <ExpandableCardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <SegmentedControl
                value={chartType}
                onChange={(v) => setChartType(v as ChartType)}
                variant="bordered"
              >
                {CHART_TYPES.map((t) => (
                  <SegmentedControlItem key={t} value={t} className="font-mono text-[11px]">
                    {CHART_TYPE_LABELS[t]}
                  </SegmentedControlItem>
                ))}
              </SegmentedControl>

              <div className="flex items-center gap-1">
                {option && (
                  <ExportBar
                    option={option}
                    background={palette.background}
                    measured={measured}
                    onShare={handleShare}
                  />
                )}
                <ExpandToggleButton />
              </div>
            </div>
          </ExpandableCardHeader>

          <ExpandableCardContent className="space-y-3">
            {isBar && (
              <div className="flex items-center gap-2">
                <SectionLabel>Orientation</SectionLabel>
                <SegmentedControl
                  value={orientation}
                  onChange={(o) => setOrientation(o as Orientation)}
                  variant="pill"
                >
                  {(['vertical', 'horizontal'] as Orientation[]).map((o) => (
                    <SegmentedControlItem key={o} value={o} className="font-mono capitalize text-[11px]">
                      {o}
                    </SegmentedControlItem>
                  ))}
                </SegmentedControl>
              </div>
            )}

            {hasLongLabels && isBar && orientation === 'vertical' && (
              <Alert variant="info" size="sm">
                Long labels detected — a{' '}
                <button
                  type="button"
                  onClick={() => setOrientation('horizontal')}
                  className="underline underline-offset-2 cursor-pointer font-semibold"
                >
                  horizontal bar chart
                </button>{' '}
                may be easier to read.
              </Alert>
            )}

            {result.truncated && (
              <Alert variant="info" size="sm">
                Showing {result.categories.length} of {result.totalCategories.toLocaleString()} groups.
                {config.topN > 0 && !config.groupOther && ' Enable “Group as Other” to account for the rest.'}
              </Alert>
            )}

            <div ref={chartBoxRef} style={{ height: chartHeight }}>
              {option ? (
                <ReactECharts
                  ref={echartsRef}
                  option={option}
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                  notMerge
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <Alert variant="info" size="sm">
                    {numericCols.length === 0
                      ? `No numeric columns left to plot. “${config.xCol}” is the X axis — pick a different one, or check that your measures are numeric.`
                      : effectiveSeries.length === 0
                        ? 'Select at least one series to draw a chart.'
                        : 'No rows match the current filters.'}
                  </Alert>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">
                {result.filteredRows.toLocaleString()} rows
                {result.aggregated && ` · ${result.totalCategories.toLocaleString()} groups`}
              </span>
              <ExpandHint />
            </div>

            {/* ── Controls ─────────────────────────────────────────────── */}
            <SegmentedControl value={tab} onChange={setTab} variant="pill">
              <SegmentedControlItem value="shape" className="font-mono text-[11px]">
                <SlidersHorizontal className="w-3 h-3" />
                Data
              </SegmentedControlItem>
              <SegmentedControlItem value="style" className="font-mono text-[11px]">
                <PaletteIcon className="w-3 h-3" />
                Style
              </SegmentedControlItem>
            </SegmentedControl>

            {tab === 'shape' ? (
              <div className="space-y-4 pt-1">
                <ShapePanel
                  columns={data.columns}
                  activeSeries={effectiveSeries}
                  config={config}
                  xIsDate={xIsDate}
                  onChange={patchConfig}
                />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <SectionLabel>Series</SectionLabel>
                    {SINGLE_SERIES_TYPES.has(chartType) && activeSeries.length > 1 && (
                      <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">
                        {CHART_TYPE_LABELS[chartType]} shows one measure — using “{effectiveSeries[0]}”
                      </span>
                    )}
                  </div>
                  <SeriesPanel
                    numericCols={numericCols}
                    active={config.series}
                    colors={colors}
                    styles={styles}
                    chartType={chartType}
                    palette={cosmetics.palette}
                    onToggle={toggleSeries}
                    onStyleChange={setSeriesStyle}
                  />
                </div>
                <FilterEditor
                  columns={data.columns}
                  filters={config.filters}
                  matchedRows={result.filteredRows}
                  totalRows={data.rows.length}
                  onChange={(filters: FilterRule[]) => patchConfig({ filters })}
                />
              </div>
            ) : (
              <div className="pt-1">
                <StylePanel
                  cosmetics={cosmetics}
                  usesRightAxis={usesRightAxis}
                  supportsAxes={supportsAxes}
                  onChange={(patch) => setCosmetics((prev) => ({ ...prev, ...patch }))}
                />
              </div>
            )}
          </ExpandableCardContent>
        </ExpandableCard>
      )}

      {!hasData && !raw && (
        <div className="text-center py-12 text-[var(--color-ink-muted)]">
          <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-20" aria-hidden="true" />
          <p className="text-sm font-mono">Paste data above or load a sample to get started</p>
        </div>
      )}
    </div>
  )
}
