import { useState, useCallback, useMemo } from 'react'
import Papa from 'papaparse'
import { Table2 } from 'lucide-react'
import { ToolHeader } from '../../components/ui/ToolHeader'
import { DataInput } from './components/DataInput'
import { ConfigPanel } from './components/ConfigPanel'
import { PivotGrid } from './components/PivotGrid'
import { usePivotData, analyzeData } from './hooks/usePivotData'
import { PivotConfig, DataRecord, FieldInfo } from './types'

// ─── Sample Data ──────────────────────────────────────────────────────────────

const SAMPLE_CSV = `Title,Genre,Decade,Studio,Rating,Budget,BoxOffice,Runtime
The Dark Knight,Action,2000s,Warner Bros,9.0,185,1006,152
Inception,Sci-Fi,2010s,Warner Bros,8.8,160,837,148
Interstellar,Sci-Fi,2010s,Paramount,8.6,165,701,169
The Avengers,Action,2010s,Disney,8.0,220,1519,143
Titanic,Drama,1990s,Paramount,7.9,200,2202,195
Jurassic Park,Sci-Fi,1990s,Universal,8.2,63,1046,127
The Lion King,Animation,1990s,Disney,8.5,45,1084,88
Forrest Gump,Drama,1990s,Paramount,8.8,55,678,142
Pulp Fiction,Crime,1990s,Miramax,8.9,8,214,154
The Matrix,Sci-Fi,1990s,Warner Bros,8.7,63,467,136
Gladiator,Action,2000s,DreamWorks,8.5,103,465,155
Finding Nemo,Animation,2000s,Disney,8.2,94,941,100
The Incredibles,Animation,2000s,Disney,8.0,92,633,115
Spider-Man,Action,2000s,Sony,7.4,139,825,121
Avatar,Sci-Fi,2000s,Fox,7.9,237,2923,162
Frozen,Animation,2010s,Disney,7.4,150,1280,102
Black Panther,Action,2010s,Disney,7.3,200,1348,134
Joker,Crime,2010s,Warner Bros,8.4,55,1074,122
Parasite,Drama,2010s,CJ Ent,8.5,11,263,132
Get Out,Horror,2010s,Universal,7.7,5,255,104
The Godfather,Crime,1970s,Paramount,9.2,6,287,175
Jaws,Horror,1970s,Universal,8.0,7,476,124
Star Wars,Sci-Fi,1970s,Fox,8.6,11,775,121
Rocky,Drama,1970s,United Artists,8.1,1,225,120
Alien,Sci-Fi,1970s,Fox,8.5,11,203,117
E.T.,Sci-Fi,1980s,Universal,7.9,10,793,115
Back to the Future,Sci-Fi,1980s,Universal,8.5,19,389,116
Die Hard,Action,1980s,Fox,8.2,28,140,132
Rain Man,Drama,1980s,MGM,8.0,25,412,133
Batman,Action,1980s,Warner Bros,7.5,35,411,126
Dune,Sci-Fi,2020s,Warner Bros,8.0,165,434,155
Top Gun Maverick,Action,2020s,Paramount,8.2,170,1496,130
Oppenheimer,Drama,2020s,Universal,8.4,100,952,180
Barbie,Comedy,2020s,Warner Bros,7.0,145,1442,114
Spider-Verse,Animation,2020s,Sony,8.4,100,691,140`

// ─── Default Config ───────────────────────────────────────────────────────────

const DEFAULT_CONFIG: PivotConfig = {
  rows: ['Genre'],
  cols: ['Decade'],
  values: [{ field: 'BoxOffice', aggregation: 'sum' }],
  filters: [],
  rowOrder: 'key_asc',
  colOrder: 'key_asc',
  heatmap: 'full',
  showRowTotals: false,
  showColTotals: false,
  showGrandTotal: false,
}

const EMPTY_CONFIG: PivotConfig = {
  rows: [],
  cols: [],
  values: [],
  filters: [],
  rowOrder: 'key_asc',
  colOrder: 'key_asc',
  heatmap: 'none',
  showRowTotals: false,
  showColTotals: false,
  showGrandTotal: false,
}

// ─── Parse CSV Helper ─────────────────────────────────────────────────────────

interface ParseResult {
  records: DataRecord[]
  fields: FieldInfo[]
  error: string
}

function parseCsvData(csvText: string): ParseResult {
  if (!csvText.trim()) {
    return { records: [], fields: [], error: '' }
  }

  const result = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  })

  if (result.errors.length > 0) {
    return {
      records: [],
      fields: [],
      error: result.errors[0]?.message ?? 'CSV parse error',
    }
  }

  if (result.data.length === 0) {
    return { records: [], fields: [], error: 'No data found in CSV' }
  }

  const records = result.data as DataRecord[]
  const fields = analyzeData(records)

  return { records, fields, error: '' }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PivotTable() {
  const [csvText, setCsvText] = useState(SAMPLE_CSV)
  const [config, setConfig] = useState<PivotConfig>(DEFAULT_CONFIG)

  // ── Parse CSV (derived state, no setState in useMemo) ───────────────────────

  const { records, fields, error } = useMemo(
    () => parseCsvData(csvText),
    [csvText]
  )

  // ── Compute pivot ───────────────────────────────────────────────────────────

  const pivotResult = usePivotData(records, config)

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCsvChange = useCallback((newCsv: string) => {
    setCsvText(newCsv)
    // Reset config to empty when data changes (fields may be different)
    setConfig(EMPTY_CONFIG)
  }, [])

  const handleLoadSample = useCallback(() => {
    setCsvText(SAMPLE_CSV)
    setConfig(DEFAULT_CONFIG)
  }, [])

  const handleConfigChange = useCallback((newConfig: PivotConfig) => {
    setConfig(newConfig)
  }, [])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <ToolHeader icon={<Table2 />} title="Pivot" accentedSuffix="Table" />

      {/* Data Input */}
      <DataInput
        value={csvText}
        onChange={handleCsvChange}
        error={error}
        onLoadSample={handleLoadSample}
      />

      {/* Configuration */}
      {fields.length > 0 && (
        <ConfigPanel
          config={config}
          fields={fields}
          onConfigChange={handleConfigChange}
        />
      )}

      {/* Pivot Grid */}
      {fields.length > 0 && (
        <PivotGrid result={pivotResult} config={config} />
      )}
    </div>
  )
}
