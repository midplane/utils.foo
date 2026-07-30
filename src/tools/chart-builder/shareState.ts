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
  const withData = PREFIX + toBase64(JSON.stringify(state))
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

export function decodeState(hash: string): ShareState | null {
  if (!hash.startsWith(PREFIX)) return null
  try {
    const parsed = JSON.parse(fromBase64(hash.slice(PREFIX.length))) as ShareState
    // Only accept the shape this build understands.
    if (parsed?.v !== 1 || typeof parsed.transform !== 'object') return null
    return parsed
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
