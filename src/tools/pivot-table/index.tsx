import { useState, useCallback, useMemo, useDeferredValue } from 'react'
import Papa from 'papaparse'
import { Table2 } from 'lucide-react'
import { ToolHeader } from '../../components/ui'
import { DataInput } from './components/DataInput'
import { ConfigPanel } from './components/ConfigPanel'
import { PivotGrid } from './components/PivotGrid'
import { usePivotData, analyzeData } from './hooks/usePivotData'
import { derivedFieldInfo, derivedFieldNames, looksLikeDate } from './engine/grouping'
import { PivotConfig, DataRecord, FieldInfo, ValueConfig } from './types'

// ─── Sample Data ──────────────────────────────────────────────────────────────

const SAMPLE_CSV = `Title,ReleaseDate,Genre,Decade,Studio,Rating,Budget,BoxOffice,Runtime
The Dark Knight,2008-07-18,Action,2000s,Warner Bros,9.0,185,1006,152
Inception,2010-07-16,Sci-Fi,2010s,Warner Bros,8.8,160,837,148
Interstellar,2014-11-07,Sci-Fi,2010s,Paramount,8.6,165,701,169
The Avengers,2012-05-04,Action,2010s,Disney,8.0,220,1519,143
Titanic,1997-12-19,Drama,1990s,Paramount,7.9,200,2202,195
Jurassic Park,1993-06-11,Sci-Fi,1990s,Universal,8.2,63,1046,127
The Lion King,1994-06-24,Animation,1990s,Disney,8.5,45,1084,88
Forrest Gump,1994-07-06,Drama,1990s,Paramount,8.8,55,678,142
Pulp Fiction,1994-10-14,Crime,1990s,Miramax,8.9,8,214,154
The Matrix,1999-03-31,Sci-Fi,1990s,Warner Bros,8.7,63,467,136
Gladiator,2000-05-05,Action,2000s,DreamWorks,8.5,103,465,155
Finding Nemo,2003-05-30,Animation,2000s,Disney,8.2,94,941,100
The Incredibles,2004-11-05,Animation,2000s,Disney,8.0,92,633,115
Spider-Man,2002-05-03,Action,2000s,Sony,7.4,139,825,121
Avatar,2009-12-18,Sci-Fi,2000s,Fox,7.9,237,2923,162
Frozen,2013-11-27,Animation,2010s,Disney,7.4,150,1280,102
Black Panther,2018-02-16,Action,2010s,Disney,7.3,200,1348,134
Joker,2019-10-04,Crime,2010s,Warner Bros,8.4,55,1074,122
Parasite,2019-05-30,Drama,2010s,CJ Ent,8.5,11,263,132
Get Out,2017-02-24,Horror,2010s,Universal,7.7,5,255,104
The Godfather,1972-03-24,Crime,1970s,Paramount,9.2,6,287,175
Jaws,1975-06-20,Horror,1970s,Universal,8.0,7,476,124
Star Wars,1977-05-25,Sci-Fi,1970s,Fox,8.6,11,775,121
Rocky,1976-11-21,Drama,1970s,United Artists,8.1,1,225,120
Alien,1979-05-25,Sci-Fi,1970s,Fox,8.5,11,203,117
E.T.,1982-06-11,Sci-Fi,1980s,Universal,7.9,10,793,115
Back to the Future,1985-07-03,Sci-Fi,1980s,Universal,8.5,19,389,116
Die Hard,1988-07-15,Action,1980s,Fox,8.2,28,140,132
Rain Man,1988-12-16,Drama,1980s,MGM,8.0,25,412,133
Batman,1989-06-23,Action,1980s,Warner Bros,7.5,35,411,126
Dune,2021-10-22,Sci-Fi,2020s,Warner Bros,8.0,165,434,155
Top Gun Maverick,2022-05-27,Action,2020s,Paramount,8.2,170,1496,130
Oppenheimer,2023-07-21,Drama,2020s,Universal,8.4,100,952,180
Barbie,2023-07-21,Comedy,2020s,Warner Bros,7.0,145,1442,114
Spider-Verse,2023-06-02,Animation,2020s,Sony,8.4,100,691,140`

// ─── Config Defaults ──────────────────────────────────────────────────────────

const BASE_CONFIG: Omit<PivotConfig, 'rows' | 'cols' | 'values'> = {
  filters: [],
  rowOrder: 'key_asc',
  colOrder: 'key_asc',
  groupings: {},
  heatmap: 'full',
  layout: 'compact',
  rowSubtotals: 'bottom',
  colSubtotals: 'none',
  showRowTotals: true,
  showColTotals: true,
  collapsedRows: [],
  collapsedCols: [],
}

// Two row fields so the hierarchy - subtotals, collapsing, and the difference
// between compact and tabular layout - is visible from the first render.
const SAMPLE_CONFIG: PivotConfig = {
  ...BASE_CONFIG,
  rows: ['Genre', 'Studio'],
  cols: ['Decade'],
  values: [{ id: 'sample-boxoffice', field: 'BoxOffice', aggregation: 'sum', showAs: 'raw' }],
}

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
  const [csvText, setCsvText] = useState(SAMPLE_CSV)
  const [config, setConfig] = useState<PivotConfig>(SAMPLE_CONFIG)

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

  const handleLoadSample = useCallback(() => {
    setCsvText(SAMPLE_CSV)
    setConfig(SAMPLE_CONFIG)
  }, [])

  return (
    <div className="space-y-4 animate-fade-in">
      <ToolHeader icon={<Table2 />} title="Pivot" accentedSuffix="Table" />

      <DataInput
        value={csvText}
        onChange={setCsvText}
        error={error}
        warning={warning}
        onLoadSample={handleLoadSample}
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
