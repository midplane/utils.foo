import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { BarChart2, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import {
  Alert,
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
import { AGGREGATION_LABELS } from '../pivot-table/types'
import {
  transform,
  isDateColumn,
  DEFAULT_TRANSFORM,
  DATE_BIN_LABELS,
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
import { ChartTypePicker } from './components/ChartTypePicker'
import { RailSection } from './components/RailSection'
import { ShapePanel } from './components/ShapePanel'
import { SeriesPanel } from './components/SeriesPanel'
import { FilterEditor } from './components/FilterEditor'
import { StylePanel } from './components/StylePanel'
import { ExportMenu } from './components/ExportMenu'

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
  const [sampleId, setSampleId] = useState<string | undefined>(boot.shared?.sampleId)
  const [chartType, setChartType] = useState<ChartType>(boot.shared?.chartType ?? 'bar')
  const [orientation, setOrientation] = useState<Orientation>(boot.shared?.orientation ?? 'vertical')
  const [cosmetics, setCosmetics] = useState<Cosmetics>(boot.shared?.cosmetics ?? DEFAULT_COSMETICS)
  const [styles, setStyles] = useState<Record<string, SeriesStyle>>(boot.shared?.styles ?? {})
  const [sampleState, setSampleState] = useState<{ loading: boolean; error: string }>(() => ({
    // A shared link naming a sample starts out fetching, so say so from the
    // first paint rather than flipping the flag inside an effect.
    loading: Boolean(boot.shared?.sampleId) && !boot.shared?.data,
    error: '',
  }))
  /** The rail can be folded away to hand the full width to the chart. */
  const [railOpen, setRailOpen] = useState(true)
  /**
   * A shared link that had to drop its data leaves the recipient looking at an
   * empty tool with settings they cannot see. Say so, and name the columns the
   * settings expect, until they load something.
   */
  const [settingsOnlyLink, setSettingsOnlyLink] = useState(
    Boolean(boot.shared) && !boot.shared?.data && !boot.shared?.sampleId
  )

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

  // A shared link that names a sample re-fetches it rather than carrying the
  // CSV. Async, so it cannot be done while initialising state.
  useEffect(() => {
    const wanted = boot.shared?.sampleId
    if (!wanted || boot.shared?.data) return
    const sample = SAMPLES.find((s) => s.id === wanted)
    if (!sample) return

    let cancelled = false
    loadSample(sample)
      .then((csv) => {
        if (cancelled) return
        setRaw(csv)
        setSourceLabel(sample.label)
        setSampleState({ loading: false, error: '' })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setSampleState({
          loading: false,
          error: e instanceof Error ? e.message : 'Could not load the shared sample.',
        })
      })
    return () => { cancelled = true }
  }, [boot])

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
      setSampleId(sample.id)
      setSettingsOnlyLink(false)
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
    // Edited by hand, so it is no longer the sample it started from.
    setSampleId(undefined)
    setSettingsOnlyLink(false)
  }, [])

  const handleShare = useCallback(() => {
    const { hash, dataOmitted } = encodeState({
      v: 1,
      transform: { ...config, series: effectiveSeries },
      cosmetics, chartType, orientation, styles,
      data: raw,
      sampleId,
    })
    const url = `${window.location.origin}${window.location.pathname}${hash}`
    window.history.replaceState(null, '', hash)
    try {
      void navigator.clipboard.writeText(url)
      return { ok: true, dataOmitted }
    } catch {
      return { ok: false, dataOmitted }
    }
  }, [config, effectiveSeries, cosmetics, chartType, orientation, styles, raw, sampleId])

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

  // Collapsed-section summaries, so the rail still reports its state when folded.
  const shapeSummary = [
    config.xCol,
    config.aggregation === 'none' ? null : AGGREGATION_LABELS[config.aggregation],
    config.dateBin === 'none' ? null : DATE_BIN_LABELS[config.dateBin],
  ].filter(Boolean).join(' · ')

  const rail = (
    <div className="divide-y divide-[var(--color-border)]">
      <RailSection title="Chart type" summary={CHART_TYPE_LABELS[chartType]}>
        <ChartTypePicker
          value={chartType}
          orientation={orientation}
          onChange={setChartType}
          onOrientationChange={setOrientation}
        />
      </RailSection>

      <RailSection title="Data" summary={shapeSummary}>
        <ShapePanel
          columns={data.columns}
          activeSeries={effectiveSeries}
          config={config}
          xIsDate={xIsDate}
          onChange={patchConfig}
        />
      </RailSection>

      <RailSection
        title="Series"
        summary={
          effectiveSeries.length === 0
            ? 'none'
            : `${effectiveSeries.length} of ${numericCols.length}`
        }
      >
        {SINGLE_SERIES_TYPES.has(chartType) && activeSeries.length > 1 && (
          <p className="mb-1.5 text-[10px] font-mono text-[var(--color-ink-muted)]">
            {CHART_TYPE_LABELS[chartType]} shows one measure — using “{effectiveSeries[0]}”
          </p>
        )}
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
      </RailSection>

      <RailSection
        title="Filters"
        defaultOpen={config.filters.length > 0}
        summary={config.filters.length === 0 ? 'none' : `${config.filters.length} active`}
      >
        <FilterEditor
          columns={data.columns}
          filters={config.filters}
          matchedRows={result.filteredRows}
          totalRows={data.rows.length}
          onChange={(filters: FilterRule[]) => patchConfig({ filters })}
        />
      </RailSection>

      <RailSection title="Style" defaultOpen={false} summary={cosmetics.title || 'defaults'}>
        <StylePanel
          cosmetics={cosmetics}
          usesRightAxis={usesRightAxis}
          supportsAxes={supportsAxes}
          onChange={(patch) => setCosmetics((prev) => ({ ...prev, ...patch }))}
        />
      </RailSection>
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in">
      {!expanded && <ToolHeader icon={<BarChart2 />} title="Chart" accentedSuffix="Builder" />}

      {settingsOnlyLink && (
        <Alert variant="info" size="sm">
          This link carries chart settings only — the data was too large to fit in a URL.
          {boot.shared?.transform.xCol && (
            <> Load data with a <strong>{boot.shared.transform.xCol}</strong> column
            {boot.shared.transform.series.length > 0 && (
              <> and <strong>{boot.shared.transform.series.join('</strong>, <strong>')}</strong></>
            )} to rebuild the chart.</>
          )}
        </Alert>
      )}

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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRailOpen((v) => !v)}
                aria-expanded={railOpen}
                aria-controls="chart-control-rail"
                title={railOpen ? 'Hide controls' : 'Show controls'}
                className="hidden lg:inline-flex items-center justify-center w-7 h-7 rounded-lg text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream-dark)] transition-colors cursor-pointer"
              >
                {railOpen
                  ? <PanelLeftClose className="w-3.5 h-3.5" aria-hidden="true" />
                  : <PanelLeftOpen className="w-3.5 h-3.5" aria-hidden="true" />}
              </button>

              <span className="text-xs font-semibold text-[var(--color-ink)]">
                {cosmetics.title || CHART_TYPE_LABELS[chartType]}
              </span>

              <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
                {result.filteredRows.toLocaleString()} rows
                {result.aggregated && ` · ${result.totalCategories.toLocaleString()} groups`}
              </span>

              <div className="flex-1" />

              {option && (
                <ExportMenu
                  option={option}
                  background={palette.background}
                  measured={measured}
                  onShare={handleShare}
                />
              )}
              <ExpandToggleButton />
            </div>
          </ExpandableCardHeader>

          <ExpandableCardContent className="p-0">
            {/* Rail beside the canvas from lg up; stacked below it on narrow
                screens, where a 300px rail would leave nothing for the chart. */}
            <div className="flex flex-col lg:flex-row lg:items-stretch">
              {railOpen && (
                <div
                  id="chart-control-rail"
                  className="lg:w-[300px] lg:shrink-0 lg:border-r border-b lg:border-b-0 border-[var(--color-border)] lg:overflow-y-auto order-2 lg:order-1"
                  style={{ maxHeight: expanded ? EXPANDED_PANE_HEIGHT : undefined }}
                >
                  {rail}
                </div>
              )}

              <div className="flex-1 min-w-0 p-3 space-y-2 order-1 lg:order-2">
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
                    {config.topN > 0 && !config.groupOther && ' Enable “Other” to account for the rest.'}
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

                <ExpandHint />
              </div>
            </div>
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
