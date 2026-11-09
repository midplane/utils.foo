// ─── Formatting / parsing ───────────────────────────────────────────────────

export function formatUuidBytes(bytes: Uint8Array): string {
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i

/** Accepts the hyphenated, plain-hex, `{braced}` and `urn:uuid:` forms. Surrounding whitespace is ignored. */
export function parseUuidToBytes(uuid: string): Uint8Array | null {
  let s = uuid.trim()
  if (/^urn:uuid:/i.test(s)) s = s.slice(9)
  else if (s.startsWith('{') && s.endsWith('}')) s = s.slice(1, -1)
  if (!UUID_RE.test(s)) return null
  const clean = s.replace(/-/g, '')
  const bytes = new Uint8Array(16)
  for (let i = 0; i < 16; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

// ─── Generators ─────────────────────────────────────────────────────────────

export function uuidV4(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  return formatUuidBytes(bytes)
}

export async function uuidV5(namespace: string, name: string): Promise<string> {
  const nsBytes = parseUuidToBytes(namespace)
  if (!nsBytes) throw new Error('Invalid namespace UUID')

  const nameBytes = new TextEncoder().encode(name)
  const combined = new Uint8Array(nsBytes.length + nameBytes.length)
  combined.set(nsBytes)
  combined.set(nameBytes, nsBytes.length)

  const hashBuffer = await crypto.subtle.digest('SHA-1', combined)
  const bytes = new Uint8Array(hashBuffer).slice(0, 16)
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  return formatUuidBytes(bytes)
}

const RAND_BITS = 74n // 12 bits rand_a + 62 bits rand_b
const RAND_LIMIT = 1n << RAND_BITS

function random74(): bigint {
  const b = crypto.getRandomValues(new Uint8Array(10))
  let n = 0n
  for (const x of b) n = (n << 8n) | BigInt(x)
  return n & (RAND_LIMIT - 1n)
}

/**
 * Returns a v7 generator that is monotonic (RFC 9562 section 6.2, method 2).
 * In the same millisecond, or when the clock moves back, the generator keeps
 * the last timestamp and increments the 74 random bits. On overflow it moves
 * the timestamp forward by 1 ms.
 */
export function createUuidV7Generator(now: () => number = Date.now): () => string {
  let lastTs = -1n
  let lastRand = 0n
  return () => {
    let ts = BigInt(now())
    let rand: bigint
    if (ts > lastTs) {
      rand = random74()
    } else {
      ts = lastTs
      rand = lastRand + 1n
      if (rand >= RAND_LIMIT) { ts += 1n; rand = random74() }
    }
    lastTs = ts
    lastRand = rand

    const randA = rand >> 62n
    const randB = rand & ((1n << 62n) - 1n)
    const value = (ts << 80n) | (0x7n << 76n) | (randA << 64n) | (0x2n << 62n) | randB
    const bytes = new Uint8Array(16)
    for (let i = 0; i < 16; i++) bytes[i] = Number((value >> BigInt(8 * (15 - i))) & 0xffn)
    return formatUuidBytes(bytes)
  }
}

export const uuidV7 = createUuidV7Generator()
