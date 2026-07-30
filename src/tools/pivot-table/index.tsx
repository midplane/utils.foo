import { useState, useCallback, useEffect, useMemo, useDeferredValue } from 'react'
import Papa from 'papaparse'
import { Table2 } from 'lucide-react'
import { ToolHeader } from '../../components/ui'
import { DataInput } from '../../components/ui/DataInput'
import { ConfigPanel } from './components/ConfigPanel'
import { PivotGrid } from './components/PivotGrid'
import { usePivotData, analyzeData } from './hooks/usePivotData'
import { derivedFieldInfo, derivedFieldNames, looksLikeDate } from './engine/grouping'
import { SAMPLES, DEFAULT_SAMPLE, loadSample, Sample } from './samples'
import { PivotConfig, DataRecord, FieldInfo, ValueConfig } from './types'



type SampleState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; message: string }

// ─── CSV Parsing ──────────────────────────────────────────────────────────────

interface ParseResult {
  records: DataRecord[]
  fields: FieldInfo[]
  error: string
  warning: string
}

const EMPTY_PARSE: ParseResult = { records: [], fields: [], error: '', warning: '' }

function parseCsvData(csvText: string): ParseResult {
  if (!csvText.trim()) return EMPTY_PARSE

  const result = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  })

  // Papa reports ragged rows and delimiter guesses as row-level errors. Those
  // are recoverable - discarding an otherwise valid file because one line has
  // an extra comma is far worse than showing the data with a warning.
  const fatal = result.errors.find(
    (e) => e.type === 'Delimiter' || e.type === 'Quotes'
  )
  if (fatal) {
    return { ...EMPTY_PARSE, error: fatal.message || 'Could not parse the CSV.' }
  }

  if (result.data.length === 0) {
    return { ...EMPTY_PARSE, error: 'No data rows found.' }
  }

  const records = result.data as DataRecord[]
  const warning =
    result.errors.length > 0
      ? `${result.errors.length.toLocaleString()} row${result.errors.length === 1 ? '' : 's'} had a formatting problem and may be incomplete.`
      : ''

  return { records, fields: analyzeData(records), error: '', warning }
}

// ─── Config Reconciliation ────────────────────────────────────────────────────

/**
 * Adapt an existing configuration to a new set of fields.
 *
 * Editing the CSV must not throw away the user's pivot. Anything that still
 * refers to a field that exists is kept; only genuinely dangling references are
 * dropped, and a sensible default metric is seeded when nothing is left.
 */
function reconcileConfig(config: PivotConfig, fields: FieldInfo[]): PivotConfig {
  const sourceNames = new Set(fields.map((f) => f.name))
  const numeric = new Set(fields.filter((f) => f.isNumeric).map((f) => f.name))

  // A grouping is only meaningful while its source column exists.
  const groupings = Object.fromEntries(
    Object.entries(config.groupings).filter(([base]) => sourceNames.has(base))
  )

  // Grouped fields are virtual but perfectly valid on an axis, so they have to
  // count as known names or every grouped pivot would be torn down on reparse.
  const names = new Set([...sourceNames, ...derivedFieldNames(groupings)])

  const rows = config.rows.filter((f) => names.has(f))
  const cols = config.cols.filter((f) => names.has(f))
  const filters = config.filters.filter((f) => names.has(f.field))

  const values = config.values.filter(
    (v) => names.has(v.field) && (v.field2 === undefined || names.has(v.field2))
  )

  const unchanged =
    rows.length === config.rows.length &&
    cols.length === config.cols.length &&
    filters.length === config.filters.length &&
    values.length === config.values.length &&
    Object.keys(groupings).length === Object.keys(config.groupings).length

  if (unchanged) return config

  return {
    ...config,
    rows,
    cols,
    filters,
    groupings,
    values: values.length > 0 ? values : defaultValues(fields, numeric),
    // Collapse keys and column sort targets are built from field values, so
    // they are meaningless once the shape changes.
    collapsedRows: [],
    collapsedCols: [],
    rowSortBy: undefined,
  }
}

function defaultValues(fields: FieldInfo[], numeric: Set<string>): ValueConfig[] {
  const preferred = fields.find((f) => f.isNumeric) ?? fields[0]
  if (!preferred) return []
  return [
    {
      id: 'default',
      field: preferred.name,
      aggregation: numeric.has(preferred.name) ? 'sum' : 'count',
      showAs: 'raw',
    },
  ]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PivotTable() {
  const [csvText, setCsvText] = useState('')
  const [config, setConfig] = useState<PivotConfig>(DEFAULT_SAMPLE.config)
  const [sampleState, setSampleState] = useState<SampleState>({ status: 'loading' })
  const [sourceLabel, setSourceLabel] = useState('')

  // Parsing a large paste is not cheap. Deferring it keeps the textarea
  // responsive while React re-parses in the background.
  const deferredCsv = useDeferredValue(csvText)
  const { records, fields, error, warning } = useMemo(
    () => parseCsvData(deferredCsv),
    [deferredCsv]
  )

  // Drop references to fields that no longer exist, but keep everything else.
  const activeConfig = useMemo(() => reconcileConfig(config, fields), [config, fields])

  // Grouped fields are virtual: they exist only as long as their grouping is
  // configured, and are resolved from the source column on read.
  const allFields = useMemo(
    () => [...fields, ...derivedFieldInfo(fields, activeConfig.groupings, records)],
    [fields, activeConfig.groupings, records]
  )

  const pivotResult = usePivotData(records, activeConfig)

  // Which source columns can be grouped, and how. Detected from the data so the
  // grouping menu only offers options that will actually produce buckets.
  const groupableFields = useMemo(() => {
    const out = new Map<string, 'date' | 'number'>()
    for (const field of fields) {
      if (looksLikeDate(records, field.name)) out.set(field.name, 'date')
      else if (field.isNumeric) out.set(field.name, 'number')
    }
    return out
  }, [fields, records])

  const handleLoadSample = useCallback((sample: Sample) => {
    setSampleState({ status: 'loading' })
    let cancelled = false

    loadSample(sample)
      .then((csv) => {
        // A slow first request must not clobber a sample picked since.
        if (cancelled) return
        setCsvText(csv)
        setConfig(sample.config)
        setSourceLabel(sample.label)
        setSampleState({ status: 'ready' })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setSampleState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Could not load the sample.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Hand-edited or pasted data is no longer "the Sales orders sample".
  const handleCsvChange = useCallback((next: string) => {
    setCsvText(next)
    setSourceLabel('')
  }, [])

  // Fetch the default sample once, after the tool has rendered.
  useEffect(() => {
    const cancel = handleLoadSample(DEFAULT_SAMPLE)
    return cancel
    // Deliberately runs once; picking another sample goes through the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-4 animate-fade-in">
      <ToolHeader icon={<Table2 />} title="Pivot" accentedSuffix="Table" />

      <DataInput
        value={csvText}
        onChange={handleCsvChange}
        error={error}
        warning={warning}
        samples={SAMPLES}
        onLoadSample={handleLoadSample}
        loadingSample={sampleState.status === 'loading'}
        sampleError={sampleState.status === 'error' ? sampleState.message : ''}
        recordCount={records.length}
        fieldCount={fields.length}
        sourceLabel={sourceLabel}
        inputId="pivot-csv"
      />

      {fields.length > 0 && (
        <>
          <ConfigPanel
            config={activeConfig}
            fields={allFields}
            groupableFields={groupableFields}
            onConfigChange={setConfig}
          />
          <PivotGrid
            result={pivotResult}
            config={activeConfig}
            onConfigChange={setConfig}
            records={records}
            sourceColumns={fields.map((f) => f.name)}
          />
        </>
      )}
    </div>
  )
}
