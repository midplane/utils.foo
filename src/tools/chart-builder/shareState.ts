import { decodeFragment, encodeFragment, ShareLinkError } from '../../lib/shareLink'
import type { TransformConfig } from './transform'
import type { ChartType, Cosmetics, Orientation, SeriesStyle } from './chartOption'

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

const PREFIX = 'cz'

/**
 * The original, uncompressed format. No longer written, but links already
 * pasted into docs and chats must keep opening.
 */
const LEGACY_PREFIX = '#c='

// ─── Encoding ─────────────────────────────────────────────────────────────────

export interface EncodeResult {
  hash: string
  /** True when the data was dropped to keep the link usable. */
  dataOmitted: boolean
}

export async function encodeState(state: ShareState): Promise<EncodeResult> {
  // A sample reference makes the inline copy redundant.
  const source: ShareState = state.sampleId ? { ...state, data: undefined } : state
  try {
    return { hash: await encodeFragment(PREFIX, source), dataOmitted: false }
  } catch (error) {
    if (!(error instanceof ShareLinkError) || error.kind !== 'too-large' || !source.data) throw error
  }

  const withoutData: ShareState = {
    v: state.v,
    transform: state.transform,
    cosmetics: state.cosmetics,
    chartType: state.chartType,
    orientation: state.orientation,
    styles: state.styles,
  }
  return { hash: await encodeFragment(PREFIX, withoutData), dataOmitted: true }
}

function accept(parsed: unknown): ShareState | null {
  const state = parsed as ShareState | null
  // Only accept the shape this build understands.
  if (state?.v !== 1 || typeof state.transform !== 'object' || state.transform === null) return null
  return state
}

function decodeLegacy(encoded: string): ShareState | null {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return accept(JSON.parse(new TextDecoder().decode(bytes)))
}

/** Corrupt or foreign links decode to null, leaving the tool in its default state. */
export async function decodeState(hash: string): Promise<ShareState | null> {
  try {
    if (hash.startsWith(LEGACY_PREFIX)) return decodeLegacy(hash.slice(LEGACY_PREFIX.length))
    return accept(await decodeFragment(PREFIX, hash))
  } catch {
    return null
  }
}

/** True when the hash looks like a chart link, before paying for decoding it. */
export function isChartHash(hash: string): boolean {
  return hash.startsWith(LEGACY_PREFIX) || hash.startsWith(`#${PREFIX}=`)
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
