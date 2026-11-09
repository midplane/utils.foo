import {
  DEFAULT_TRANSFORM,
  DATE_BIN_LABELS,
  FILTER_OP_LABELS,
  SORT_LABELS,
  type FilterRule,
  type TransformConfig,
} from './transform'
import {
  CHART_TYPE_LABELS,
  DEFAULT_COSMETICS,
  NUMBER_STYLE_LABELS,
  PALETTE_LABELS,
  type ChartType,
  type Cosmetics,
  type Orientation,
  type SeriesStyle,
} from './chartOption'
import { AGGREGATION_LABELS } from '../pivot-table/types'

/**
 * Everything needed to reproduce a chart, minus the data.
 *
 * Versioned so a future format change can be detected and ignored rather than
 * throwing or, worse, silently mis-reading old links.
 */
export interface ShareState {
  v: 1
  transform: TransformConfig
  cosmetics: Cosmetics
  chartType: ChartType
  orientation: Orientation
  styles: Record<string, SeriesStyle>
  /** Omitted when the data is too large to survive a URL. */
  data?: string
  /**
   * Set when the data came from a bundled sample.
   *
   * Carried instead of the CSV: the sales sample alone encodes to ~87 KB,
   * far past any usable URL, but its id costs a dozen characters and the
   * recipient re-fetches the same asset.
   */
  sampleId?: string
}

/**
 * Browsers and proxies start truncating URLs well before the theoretical
 * limit. Past this the data is dropped and only the configuration travels.
 */
const MAX_HASH_LENGTH = 12_000

const PREFIX = '#c='

// ─── Encoding ─────────────────────────────────────────────────────────────────

/** UTF-8 safe base64, since btoa alone throws on non-Latin-1 characters. */
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64(encoded: string): string {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export interface EncodeResult {
  hash: string
  /** True when the data was dropped to keep the link usable. */
  dataOmitted: boolean
}

export function encodeState(state: ShareState): EncodeResult {
  // A sample reference makes the inline copy redundant.
  const source: ShareState = state.sampleId ? { ...state, data: undefined } : state

  const withData = PREFIX + toBase64(JSON.stringify(source))
  if (withData.length <= MAX_HASH_LENGTH) return { hash: withData, dataOmitted: false }

  const withoutData: ShareState = {
    v: state.v,
    transform: state.transform,
    cosmetics: state.cosmetics,
    chartType: state.chartType,
    orientation: state.orientation,
    styles: state.styles,
  }
  return { hash: PREFIX + toBase64(JSON.stringify(withoutData)), dataOmitted: true }
}

// ─── Validation ───────────────────────────────────────────────────────────────

type Plain = Record<string, unknown>

const isPlain = (value: unknown): value is Plain =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function oneOf<T extends string>(value: unknown, allowed: Record<T, unknown>, fallback: T): T {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(allowed, value)
    ? (value as T)
    : fallback
}

/** Keep each field of `input` that has the same type as its default. */
function sameTypes<T extends object>(defaults: T, input: Plain): T {
  const out = { ...defaults } as Plain
  for (const [key, fallback] of Object.entries(defaults)) {
    if (typeof input[key] === typeof fallback && input[key] !== null) out[key] = input[key]
  }
  return out as T
}

function readTransform(input: Plain): TransformConfig {
  const t = sameTypes(DEFAULT_TRANSFORM, input)
  const aggregations = { none: '', ...AGGREGATION_LABELS }
  const filters = Array.isArray(input.filters) ? input.filters : []
  return {
    ...t,
    series: Array.isArray(input.series)
      ? input.series.filter((s): s is string => typeof s === 'string')
      : [],
    filters: filters.filter((f): f is FilterRule =>
      isPlain(f) &&
      typeof f.id === 'string' &&
      typeof f.column === 'string' &&
      typeof f.value === 'string' &&
      oneOf(f.op, FILTER_OP_LABELS, 'eq') === f.op
    ),
    aggregation: oneOf(t.aggregation, aggregations, 'none'),
    dateBin: oneOf(t.dateBin, DATE_BIN_LABELS, 'none'),
    sort: oneOf(t.sort, SORT_LABELS, 'none'),
    topN: Number.isFinite(t.topN) && t.topN > 0 ? Math.floor(t.topN) : 0,
  }
}

function readCosmetics(input: unknown): Cosmetics {
  if (!isPlain(input)) return DEFAULT_COSMETICS
  const c = sameTypes(DEFAULT_COSMETICS, input)
  return {
    ...c,
    decimals: typeof input.decimals === 'number' && Number.isFinite(input.decimals)
      ? Math.max(0, Math.min(6, Math.floor(input.decimals)))
      : null,
    scale: c.scale === 'log' ? 'log' : 'linear',
    numberStyle: oneOf(c.numberStyle, NUMBER_STYLE_LABELS, 'auto'),
    palette: oneOf(c.palette, PALETTE_LABELS, 'wong'),
  }
}

function readStyles(input: unknown): Record<string, SeriesStyle> {
  const out: Record<string, SeriesStyle> = {}
  if (!isPlain(input)) return out
  for (const [col, raw] of Object.entries(input)) {
    if (!isPlain(raw)) continue
    const style: SeriesStyle = {}
    if (raw.mark === 'bar' || raw.mark === 'line' || raw.mark === 'area') style.mark = raw.mark
    if (raw.axis === 'left' || raw.axis === 'right') style.axis = raw.axis
    if (typeof raw.color === 'string') style.color = raw.color
    out[col] = style
  }
  return out
}

export function decodeState(hash: string): ShareState | null {
  if (!hash.startsWith(PREFIX)) return null
  try {
    const parsed: unknown = JSON.parse(fromBase64(hash.slice(PREFIX.length)))
    // Only accept the shape this build understands.
    if (!isPlain(parsed) || parsed.v !== 1 || !isPlain(parsed.transform)) return null
    // The link can come from anywhere. Replace each missing or bad field with
    // its default, so the tool does not crash when it reads the field.
    const state: ShareState = {
      v: 1,
      transform: readTransform(parsed.transform),
      cosmetics: readCosmetics(parsed.cosmetics),
      chartType: oneOf(parsed.chartType, CHART_TYPE_LABELS, 'bar'),
      orientation: parsed.orientation === 'horizontal' ? 'horizontal' : 'vertical',
      styles: readStyles(parsed.styles),
    }
    if (typeof parsed.data === 'string') state.data = parsed.data
    if (typeof parsed.sampleId === 'string') state.sampleId = parsed.sampleId
    return state
  } catch {
    return null
  }
}

/** Read and clear the share state from the current URL. */
export function readStateFromLocation(): ShareState | null {
  if (typeof window === 'undefined') return null
  return decodeState(window.location.hash)
}

// ─── Cross-tool handoff ───────────────────────────────────────────────────────

/**
 * Pivot Table writes its result here before navigating.
 *
 * sessionStorage rather than the URL because an aggregated grid routinely
 * exceeds any practical URL length, and rather than a module variable because
 * the tools are separate lazy chunks and the navigation remounts the tree.
 */
export const HANDOFF_KEY = 'utils-foo:chart-handoff'

export interface ChartHandoff {
  csv: string
  source: string
}

export function writeHandoff(handoff: ChartHandoff) {
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(handoff))
  } catch {
    // Private browsing and quota failures are not worth blocking navigation.
  }
}

/** Read the handoff and remove it, so a later reload does not resurrect it. */
export function consumeHandoff(): ChartHandoff | null {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY)
    if (!raw) return null
    sessionStorage.removeItem(HANDOFF_KEY)
    const parsed = JSON.parse(raw) as ChartHandoff
    return typeof parsed?.csv === 'string' ? parsed : null
  } catch {
    return null
  }
}
