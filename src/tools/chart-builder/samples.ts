import salesUrl from '../pivot-table/samples/sales.csv?url'
import moviesUrl from '../pivot-table/samples/movies.csv?url'
import type { TransformConfig } from './transform'
import type { ChartType, Cosmetics } from './chartOption'

export interface ChartSample {
  id: string
  label: string
  description: string
  /** Inline CSV, or a hashed asset URL fetched on demand. */
  url?: string
  csv?: string
  chartType: ChartType
  transform: Partial<TransformConfig>
  cosmetics?: Partial<Cosmetics>
}

const REVENUE = `Month,Revenue,Expenses,Profit
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

const POPULATION = `Country,Population (millions)
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

const SCATTER = `Label,Study Hours,Exam Score
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

/**
 * Samples are ordered to show the tool doing progressively more.
 *
 * The first two are raw transactional data that cannot be charted at all
 * without a group-by, which is the capability most worth demonstrating: the
 * sales file is 568 order lines, so plotting it row-by-row would be noise.
 */
export const SAMPLES: ChartSample[] = [
  {
    id: 'sales-by-category',
    label: 'Sales by category',
    description: '568 raw order lines, summed by category',
    url: salesUrl,
    chartType: 'bar',
    transform: {
      xCol: 'Category',
      series: ['Sales'],
      aggregation: 'sum',
      sort: 'value-desc',
    },
    cosmetics: { title: 'Sales by category', numberStyle: 'currency', showDataLabels: true },
  },
  {
    id: 'sales-over-time',
    label: 'Sales over time',
    description: 'Same orders, bucketed by month on a real time axis',
    url: salesUrl,
    chartType: 'area',
    transform: {
      xCol: 'OrderDate',
      series: ['Sales'],
      aggregation: 'sum',
      dateBin: 'month',
    },
    cosmetics: { title: 'Monthly sales', numberStyle: 'currency' },
  },
  {
    id: 'movies',
    label: 'Movies by genre',
    description: '35 films, average box office per genre',
    url: moviesUrl,
    chartType: 'bar',
    transform: {
      xCol: 'Genre',
      series: ['BoxOffice'],
      aggregation: 'average',
      sort: 'value-desc',
      topN: 8,
      groupOther: true,
    },
    cosmetics: { title: 'Average box office by genre', numberStyle: 'compact' },
  },
  {
    id: 'revenue',
    label: 'Revenue (multi-series)',
    description: 'Pre-summarised monthly figures',
    csv: REVENUE,
    chartType: 'bar',
    transform: { xCol: 'Month', series: ['Revenue', 'Expenses', 'Profit'] },
  },
  {
    id: 'population',
    label: 'Population (single series)',
    description: 'Long labels, better read horizontally',
    csv: POPULATION,
    chartType: 'bar',
    transform: { xCol: 'Country', series: ['Population (millions)'], sort: 'value-desc' },
  },
  {
    id: 'scatter',
    label: 'Study hours vs score',
    description: 'Numeric X, plotted as a scatter',
    csv: SCATTER,
    chartType: 'scatter',
    transform: { xCol: 'Study Hours', series: ['Exam Score'], numericX: true },
  },
]

// Fetched CSVs, kept for the lifetime of the page so switching back and forth
// between samples does not re-download them.
const cache = new Map<string, string>()

export async function loadSample(sample: ChartSample): Promise<string> {
  if (sample.csv !== undefined) return sample.csv
  if (!sample.url) return ''

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
