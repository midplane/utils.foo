import { decodeFragment, encodeFragment, ShareLinkError } from '../../lib/shareLink'
import {
  AGGREGATION_LABELS,
  DATE_PART_ORDER,
  HEATMAP_LABELS,
  LABEL_OP_LABELS,
  LAYOUT_LABELS,
  MEASURE_OP_LABELS,
  NUMBER_STYLE_LABELS,
  SHOW_AS_LABELS,
  SORT_ORDER_LABELS,
  SUBTOTAL_LABELS,
  type AxisSortTarget,
  type DatePart,
  type FieldGrouping,
  type FilterConfig,
  type NumberFormat,
  type PivotConfig,
  type ValueConfig,
} from './types'

/**
 * Everything needed to reproduce a pivot.
 *
 * Exactly one of `data` and `sampleId` is set, or neither when the data was
 * too large for a link and only the configuration travels.
 */
export interface ShareState {
  config: PivotConfig
  /** The CSV exactly as the sender had it. */
  data?: string
  /** A bundled sample, which the recipient re-fetches instead of receiving. */
  sampleId?: string
}

const PREFIX = 'p'
const VERSION = 1

const INVALID = 'This pivot share link is invalid or from a newer version of the site.'

// ─── Wire format ──────────────────────────────────────────────────────────────

/** `FilterConfig` holds a Set, which JSON would flatten to `{}`. */
type WireFilter = Omit<FilterConfig, 'excludedValues'> & { excludedValues: string[] }
type WireConfig = Omit<PivotConfig, 'filters'> & { filters: WireFilter[] }

interface Wire {
  v: typeof VERSION
  config: WireConfig
  data?: string
  sampleId?: string
}

function toWire(state: ShareState, withData: boolean): Wire {
  const config: WireConfig = {
    ...state.config,
    filters: state.config.filters.map((f) => ({ ...f, excludedValues: [...f.excludedValues] })),
  }
  const wire: Wire = { v: VERSION, config }
  if (state.sampleId) wire.sampleId = state.sampleId
  else if (withData && state.data) wire.data = state.data
  return wire
}

export interface EncodeResult {
  hash: string
  /** True when the CSV was too large and only the settings are in the link. */
  dataOmitted: boolean
}

export async function encodeState(state: ShareState): Promise<EncodeResult> {
  try {
    return { hash: await encodeFragment(PREFIX, toWire(state, true)), dataOmitted: false }
  } catch (error) {
    const hadData = Boolean(state.data) && !state.sampleId
    if (!(error instanceof ShareLinkError) || error.kind !== 'too-large' || !hadData) throw error
  }
  return { hash: await encodeFragment(PREFIX, toWire(state, false)), dataOmitted: true }
}

export async function decodeState(hash: string): Promise<ShareState | null> {
  const parsed = await decodeFragment(PREFIX, hash)
  if (parsed === null) return null
  return fromWire(parsed)
}

// ─── Validation ───────────────────────────────────────────────────────────────
// A link is untrusted input: every field is checked against the types the
// engine expects, so a hand-edited link fails loudly here instead of throwing
// from somewhere deep inside an aggregation.

function fail(): never {
  throw new ShareLinkError('invalid', INVALID)
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function oneOf<T extends string>(labels: Record<T, string>, v: unknown): T {
  if (typeof v !== 'string' || !Object.prototype.hasOwnProperty.call(labels, v)) fail()
  return v as T
}

function strings(v: unknown): string[] {
  if (!Array.isArray(v) || v.some((s) => typeof s !== 'string')) fail()
  return v as string[]
}

function optionalString(v: unknown): string | undefined {
  if (v === undefined) return undefined
  if (typeof v !== 'string') fail()
  return v
}

function numberFormat(v: unknown): NumberFormat | undefined {
  if (v === undefined) return undefined
  if (!isObject(v)) fail()
  const decimals = v.decimals
  if (decimals !== undefined && (!Number.isInteger(decimals) || (decimals as number) < 0 || (decimals as number) > 20)) fail()
  const currency = optionalString(v.currency)
  // Intl throws a RangeError on anything that is not a well-formed code.
  if (currency !== undefined && !/^[A-Z]{3}$/.test(currency)) fail()
  return { style: oneOf(NUMBER_STYLE_LABELS, v.style), decimals: decimals as number | undefined, currency }
}

function valueConfig(v: unknown): ValueConfig {
  if (!isObject(v) || typeof v.id !== 'string' || typeof v.field !== 'string') fail()
  return {
    id: v.id,
    field: v.field,
    field2: optionalString(v.field2),
    aggregation: oneOf(AGGREGATION_LABELS, v.aggregation),
    showAs: oneOf(SHOW_AS_LABELS, v.showAs),
    format: numberFormat(v.format),
    caption: optionalString(v.caption),
  }
}

function filter(v: unknown, valueCount: number): FilterConfig {
  if (!isObject(v) || typeof v.field !== 'string') fail()
  const out: FilterConfig = { field: v.field, excludedValues: new Set(strings(v.excludedValues)) }
  if (v.label !== undefined) {
    if (!isObject(v.label) || typeof v.label.text !== 'string') fail()
    out.label = { op: oneOf(LABEL_OP_LABELS, v.label.op), text: v.label.text }
  }
  if (v.measure !== undefined) {
    const m = v.measure
    if (!isObject(m) || !Number.isInteger(m.valueIndex) || !isFiniteNumber(m.a)) fail()
    if ((m.valueIndex as number) < 0 || (m.valueIndex as number) >= valueCount) fail()
    if (m.b !== undefined && !isFiniteNumber(m.b)) fail()
    out.measure = { op: oneOf(MEASURE_OP_LABELS, m.op), valueIndex: m.valueIndex as number, a: m.a, b: m.b }
  }
  return out
}

function grouping(v: unknown): FieldGrouping {
  if (!isObject(v)) fail()
  if (v.kind === 'date') {
    const parts = strings(v.parts)
    if (parts.length === 0 || parts.some((p) => !(DATE_PART_ORDER as string[]).includes(p))) fail()
    return { kind: 'date', parts: parts as DatePart[] }
  }
  if (v.kind === 'number') {
    if (!isFiniteNumber(v.binSize) || v.binSize <= 0) fail()
    return { kind: 'number', binSize: v.binSize }
  }
  fail()
}

function sortTarget(v: unknown, valueCount: number): AxisSortTarget | undefined {
  if (v === undefined) return undefined
  if (!isObject(v) || typeof v.flatKey !== 'string' || typeof v.descending !== 'boolean') fail()
  if (!Number.isInteger(v.valueIndex) || (v.valueIndex as number) < 0 || (v.valueIndex as number) >= valueCount) fail()
  return { flatKey: v.flatKey, valueIndex: v.valueIndex as number, descending: v.descending }
}

function config(v: unknown): PivotConfig {
  if (!isObject(v) || !Array.isArray(v.values) || !Array.isArray(v.filters) || !isObject(v.groupings)) fail()
  if (typeof v.showRowTotals !== 'boolean' || typeof v.showColTotals !== 'boolean') fail()
  const values = v.values.map(valueConfig)
  return {
    rows: strings(v.rows),
    cols: strings(v.cols),
    values,
    filters: v.filters.map((f) => filter(f, values.length)),
    rowOrder: oneOf(SORT_ORDER_LABELS, v.rowOrder),
    colOrder: oneOf(SORT_ORDER_LABELS, v.colOrder),
    rowSortBy: sortTarget(v.rowSortBy, values.length),
    groupings: Object.fromEntries(Object.entries(v.groupings).map(([k, g]) => [k, grouping(g)])),
    heatmap: oneOf(HEATMAP_LABELS, v.heatmap),
    layout: oneOf(LAYOUT_LABELS, v.layout),
    rowSubtotals: oneOf(SUBTOTAL_LABELS, v.rowSubtotals),
    colSubtotals: oneOf(SUBTOTAL_LABELS, v.colSubtotals),
    showRowTotals: v.showRowTotals,
    showColTotals: v.showColTotals,
    collapsedRows: strings(v.collapsedRows),
    collapsedCols: strings(v.collapsedCols),
  }
}

function fromWire(v: unknown): ShareState {
  if (!isObject(v) || v.v !== VERSION) fail()
  const data = optionalString(v.data)
  const sampleId = optionalString(v.sampleId)
  if (data !== undefined && sampleId !== undefined) fail()
  return { config: config(v.config), data, sampleId }
}
