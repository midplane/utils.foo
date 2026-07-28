import salesUrl from './sales.csv?url'
import moviesUrl from './movies.csv?url'
import { PivotConfig } from '../types'
import { datePartField } from '../engine/grouping'

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

export interface Sample {
  /** Also the basename of the CSV in this directory. */
  id: string
  label: string
  description: string
  /** Hashed asset URL; the file is fetched rather than bundled into the chunk. */
  url: string
  config: PivotConfig
}

/**
 * Sample datasets.
 *
 * The CSVs are imported as URLs, not as strings: inlining the sales data cost
 * ~63 KB of JavaScript that every visitor to the tool parsed on load, whether
 * or not they ever looked at the sample. As assets they are content-hashed,
 * cached independently of the code, and fetched after the page renders.
 *
 * The default view is chosen to show the tool doing something non-trivial on
 * first paint: a two-level row hierarchy with subtotals, columns grouped from a
 * date field, and a weighted-average metric that cannot be produced by
 * averaging a column.
 */
export const SAMPLES: Sample[] = [
  {
    id: 'sales',
    label: 'Sales orders',
    description: '568 order lines over three years',
    url: salesUrl,
    config: {
      ...BASE_CONFIG,
      groupings: { OrderDate: { kind: 'date', parts: ['year', 'quarter'] } },
      rows: ['Category', 'SubCategory'],
      cols: [datePartField('OrderDate', 'year')],
      values: [
        { id: 'sales', field: 'Sales', aggregation: 'sum', showAs: 'raw' },
        {
          id: 'margin',
          field: 'Profit',
          field2: 'Sales',
          aggregation: 'sumOverSum',
          showAs: 'raw',
          format: { style: 'percent', decimals: 1 },
          // Without this the header reads "Sum/Sum of Profit / Sales", repeated
          // under every year group.
          caption: 'Margin',
        },
      ],
    },
  },
  {
    id: 'movies',
    label: 'Movies',
    description: '35 films, one row each',
    url: moviesUrl,
    config: {
      ...BASE_CONFIG,
      rows: ['Genre', 'Studio'],
      cols: ['Decade'],
      values: [{ id: 'boxoffice', field: 'BoxOffice', aggregation: 'sum', showAs: 'raw' }],
    },
  },
]

export const DEFAULT_SAMPLE = SAMPLES[0]!

// Fetched CSVs, kept for the lifetime of the page so switching back and forth
// between samples does not re-download them.
const cache = new Map<string, string>()

export async function loadSample(sample: Sample): Promise<string> {
  const cached = cache.get(sample.url)
  if (cached !== undefined) return cached

  const response = await fetch(sample.url)
  if (!response.ok) {
    throw new Error(`Could not load the ${sample.label} sample (${response.status}).`)
  }

  const text = await response.text()
  cache.set(sample.url, text)
  return text
}
