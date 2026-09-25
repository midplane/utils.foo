/**
 * Share links that carry their whole payload in the URL fragment.
 *
 * Browsers never send the part after `#` to a server: it is not in the HTTP
 * request line, and it is stripped from the Referer header. So a link built
 * here hands the recipient the data without the data ever touching
 * utils.foo, and "nothing is stored or uploaded" stays literally true.
 *
 * The payload is JSON, raw-DEFLATE compressed and base64url encoded. CSV and
 * source code typically shrink three- to eight-fold, which is the difference
 * between a pivot's data fitting in a link and not.
 */

/**
 * Longest fragment we will produce or accept.
 *
 * Browsers take far more (Chrome allows ~2 MB), but chat apps, email clients
 * and URL shorteners start mangling long links well before that, and a link
 * that arrives truncated is worse than one that was never made.
 */
export const MAX_HASH_LENGTH = 32_000

/** Upper bound on the decompressed payload, so a tiny fragment cannot expand into gigabytes. */
export const MAX_PAYLOAD_BYTES = 2_000_000

export class ShareLinkError extends Error {
  constructor(readonly kind: 'invalid' | 'too-large', message: string) {
    super(message)
    this.name = 'ShareLinkError'
  }
}

const INVALID = 'This share link is invalid, incomplete, or from a newer version of the site.'
const TOO_LARGE = 'This is too large to fit in a share link.'

// ─── Bytes ────────────────────────────────────────────────────────────────────

/** Drain a stream, aborting once it passes `limit` bytes. */
export async function readBytes(
  stream: ReadableStream<Uint8Array>,
  limit: number,
  tooLarge: () => Error = () => new ShareLinkError('too-large', TOO_LARGE),
): Promise<Uint8Array<ArrayBuffer>> {
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
        throw tooLarge()
      }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return bytes
}

export function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Throws on anything outside the base64url alphabet. */
export function fromBase64Url(encoded: string): Uint8Array<ArrayBuffer> {
  if (!encoded || !/^[A-Za-z0-9_-]+$/.test(encoded)) throw new ShareLinkError('invalid', INVALID)
  const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

/** A one-chunk stream, built by hand because not every `Blob` implementation has `stream()`. */
function streamOf(bytes: Uint8Array<ArrayBuffer>): ReadableStream<Uint8Array<ArrayBuffer>> {
  return new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close() } })
}

export function compress(bytes: Uint8Array<ArrayBuffer>, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  return readBytes(streamOf(bytes).pipeThrough(new CompressionStream('deflate-raw')), limit)
}

export function decompress(
  bytes: Uint8Array<ArrayBuffer>,
  limit: number,
  format: CompressionFormat = 'deflate-raw',
): Promise<Uint8Array<ArrayBuffer>> {
  return readBytes(streamOf(bytes).pipeThrough(new DecompressionStream(format)), limit)
}

// ─── Fragments ────────────────────────────────────────────────────────────────

/**
 * Encode `value` as `#<prefix>=<payload>`.
 *
 * Throws a `ShareLinkError` of kind `too-large` when the result would exceed
 * `MAX_HASH_LENGTH`; callers decide whether to retry with less (a settings-only
 * link) or tell the user.
 */
export async function encodeFragment(prefix: string, value: unknown): Promise<string> {
  const head = `#${prefix}=`
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  if (bytes.length > MAX_PAYLOAD_BYTES) throw new ShareLinkError('too-large', TOO_LARGE)
  // Base64 grows by 4/3, so bounding the compressed bytes by 3/4 of the budget
  // stops a huge input early instead of compressing all of it first.
  const compressed = await compress(bytes, Math.ceil((MAX_HASH_LENGTH * 3) / 4))
  const hash = head + toBase64Url(compressed)
  if (hash.length > MAX_HASH_LENGTH) throw new ShareLinkError('too-large', TOO_LARGE)
  return hash
}

/**
 * Decode a fragment produced by `encodeFragment`.
 *
 * Returns null when the hash is not ours (no link, or another tool's), so a
 * plain visit is not an error. Anything that is ours but unreadable throws a
 * `ShareLinkError`; the parsed value is otherwise untrusted and the caller
 * must validate its shape.
 */
export async function decodeFragment(prefix: string, hash: string): Promise<unknown> {
  const head = `#${prefix}=`
  if (!hash.startsWith(head)) return null
  if (hash.length > MAX_HASH_LENGTH) throw new ShareLinkError('too-large', TOO_LARGE)
  try {
    const bytes = await decompress(fromBase64Url(hash.slice(head.length)), MAX_PAYLOAD_BYTES)
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown
  } catch (error) {
    if (error instanceof ShareLinkError && error.kind === 'too-large') throw error
    throw new ShareLinkError('invalid', INVALID)
  }
}

/** The current page's URL with its query replaced by nothing and its hash by `hash`. */
export function buildShareUrl(hash: string, currentUrl: string, pathname?: string): string {
  const url = new URL(currentUrl)
  if (pathname) url.pathname = pathname
  url.search = ''
  url.hash = hash
  return url.toString()
}
