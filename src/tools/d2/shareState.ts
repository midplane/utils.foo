import type { Layout, RenderFormat } from './useD2'
import { INITIAL_CODE } from './samples'

export interface ShareState {
  v: 1
  code: string
  layout: Layout
  theme: '0' | '1' | '3' | '200'
  sketch: boolean
  renderer: 'svg' | 'ascii'
  asciiMode: Exclude<RenderFormat, 'svg'>
  view: 'split' | 'editor' | 'preview'
  zoom: number
  expanded: boolean
  isDark: boolean
}

// These defaults are part of the v2 wire format. Keep them fixed even if the
// editor's initial settings change, so existing compact links still restore.
const V2_DEFAULTS = Object.freeze({
  layout: 'tala', theme: '0', sketch: false,
  renderer: 'svg', asciiMode: 'standard', view: 'split', zoom: 1,
  expanded: false, isDark: false,
} satisfies Omit<ShareState, 'v' | 'code'>)

export const DEFAULT_STATE: ShareState = {
  v: 1, code: INITIAL_CODE, ...V2_DEFAULTS,
}

const PREFIX = '#d2='
export const MAX_HASH_LENGTH = 32_000
const MAX_STATE_BYTES = 1_000_000
const INVALID_LINK = 'This D2 share link is invalid or uses an unsupported version.'
const TOO_LARGE = 'This diagram is too large for a share link. Shorten the source and try again; no source or settings have been omitted.'

function validateState(value: unknown): ShareState {
  if (!value || typeof value !== 'object') throw new Error(INVALID_LINK)
  const state = value as Record<string, unknown>
  if (
    state.v !== 1 || typeof state.code !== 'string' ||
    typeof state.layout !== 'string' || !['tala', 'dagre', 'elk'].includes(state.layout) ||
    !['0', '1', '3', '200'].includes(String(state.theme)) || typeof state.theme !== 'string' ||
    typeof state.sketch !== 'boolean' || typeof state.renderer !== 'string' || !['svg', 'ascii'].includes(state.renderer) ||
    typeof state.asciiMode !== 'string' || !['standard', 'extended'].includes(state.asciiMode) ||
    typeof state.view !== 'string' || !['split', 'editor', 'preview'].includes(state.view) ||
    typeof state.zoom !== 'number' || !Number.isFinite(state.zoom) || state.zoom < 0.5 || state.zoom > 4 ||
    typeof state.expanded !== 'boolean' || typeof state.isDark !== 'boolean' ||
    (state.renderer === 'ascii' && state.layout === 'dagre')
  ) throw new Error(INVALID_LINK)
  return value as ShareState
}

// v2: [2, source, optional settings]. Booleans share a five-bit flags field;
// other settings are included only when they differ from the wire defaults.
function packState(state: ShareState): unknown[] {
  const options: Record<string, number> = {}
  if (state.layout !== V2_DEFAULTS.layout) options.l = state.layout === 'dagre' ? 1 : 2
  if (state.theme !== V2_DEFAULTS.theme) options.t = Number(state.theme)
  const flags = Number(state.sketch) | (Number(state.renderer === 'ascii') << 1) |
    (Number(state.asciiMode === 'extended') << 2) | (Number(state.expanded) << 3) | (Number(state.isDark) << 4)
  if (flags) options.f = flags
  if (state.view !== V2_DEFAULTS.view) options.w = state.view === 'editor' ? 1 : 2
  if (state.zoom !== V2_DEFAULTS.zoom) options.z = state.zoom
  return Object.keys(options).length ? [2, state.code, options] : [2, state.code]
}

function unpackState(value: unknown): ShareState {
  if (!Array.isArray(value) || value[0] !== 2 || typeof value[1] !== 'string' ||
    (value.length !== 2 && value.length !== 3)) throw new Error(INVALID_LINK)
  const options: unknown = value.length === 3 ? value[2] : {}
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new Error(INVALID_LINK)
  const settings = options as Record<string, unknown>
  if (Object.keys(settings).some(key => !['l', 't', 'f', 'w', 'z'].includes(key)) ||
    ('l' in settings && settings.l !== 1 && settings.l !== 2) ||
    ('t' in settings && settings.t !== 1 && settings.t !== 3 && settings.t !== 200) ||
    ('w' in settings && settings.w !== 1 && settings.w !== 2) ||
    ('z' in settings && (typeof settings.z !== 'number' || !Number.isFinite(settings.z))) ||
    ('f' in settings && (typeof settings.f !== 'number' || !Number.isInteger(settings.f) || settings.f < 0 || settings.f > 31))
  ) throw new Error(INVALID_LINK)
  const flags = typeof settings.f === 'number' ? settings.f : 0
  return validateState({
    v: 1, code: value[1], ...V2_DEFAULTS,
    layout: settings.l === 1 ? 'dagre' : settings.l === 2 ? 'elk' : V2_DEFAULTS.layout,
    theme: settings.t === undefined ? V2_DEFAULTS.theme : String(settings.t),
    sketch: Boolean(flags & 1), renderer: flags & 2 ? 'ascii' : 'svg',
    asciiMode: flags & 4 ? 'extended' : 'standard', expanded: Boolean(flags & 8), isDark: Boolean(flags & 16),
    view: settings.w === 1 ? 'editor' : settings.w === 2 ? 'preview' : V2_DEFAULTS.view,
    zoom: settings.z ?? V2_DEFAULTS.zoom,
  })
}

// Bound the decompressed payload as well as the URL to avoid expanding an
// untrusted fragment into an arbitrarily large allocation.
async function readBytes(stream: ReadableStream<Uint8Array>, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.length
      if (length > limit) {
        await reader.cancel()
        throw new Error(TOO_LARGE)
      }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return bytes
}

export async function encodeState(state: ShareState): Promise<string> {
  validateState(state)
  const bytes = new TextEncoder().encode(JSON.stringify(packState(state)))
  if (bytes.length > MAX_STATE_BYTES) throw new Error(TOO_LARGE)
  const compressed = await readBytes(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw')), MAX_HASH_LENGTH)
  let binary = ''
  for (const byte of compressed) binary += String.fromCharCode(byte)
  const hash = PREFIX + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  if (hash.length > MAX_HASH_LENGTH) throw new Error(TOO_LARGE)
  return hash
}

export async function decodeState(hash: string): Promise<ShareState | null> {
  if (!hash.startsWith(PREFIX)) return null
  if (hash.length > MAX_HASH_LENGTH) throw new Error(TOO_LARGE)
  try {
    const encoded = hash.slice(PREFIX.length)
    if (!encoded || !/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error(INVALID_LINK)
    const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
    // Gzip's magic bytes cannot begin a valid raw DEFLATE stream (its first
    // byte specifies a reserved block type), so old links are unambiguous.
    const legacy = bytes[0] === 0x1f && bytes[1] === 0x8b
    const decompressed = await readBytes(new Blob([bytes]).stream().pipeThrough(new DecompressionStream(legacy ? 'gzip' : 'deflate-raw')), MAX_STATE_BYTES)
    const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decompressed))
    return legacy ? validateState(parsed) : unpackState(parsed)
  } catch {
    throw new Error(INVALID_LINK)
  }
}

export async function createShareUrl(state: ShareState, currentUrl: string): Promise<string> {
  const url = new URL(currentUrl)
  url.pathname = '/d2'
  url.search = ''
  url.hash = await encodeState(state)
  return url.toString()
}
