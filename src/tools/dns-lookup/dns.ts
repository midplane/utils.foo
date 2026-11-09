// ─── Constants ───────────────────────────────────────────────────────────────

export const RECORD_TYPES = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA'] as const
export type RecordType = typeof RECORD_TYPES[number]

// Cloudflare DNS-over-HTTPS endpoint
export const DOH_URL = 'https://cloudflare-dns.com/dns-query'

export const LOOKUP_TIMEOUT_MS = 10_000

const TYPE_NAMES: Record<number, string> = {
  1: 'A',
  2: 'NS',
  5: 'CNAME',
  6: 'SOA',
  15: 'MX',
  16: 'TXT',
  28: 'AAAA',
  39: 'DNAME',
  46: 'RRSIG',
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DnsAnswer {
  name: string
  type: number
  TTL: number
  data: string
}

interface DohResponse {
  Status: number
  Answer?: DnsAnswer[]
  Authority?: DnsAnswer[]
}

export interface RecordResult {
  type: RecordType
  status: 'ok' | 'nxdomain' | 'error'
  answers: DnsAnswer[]
  error?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RCODE_MESSAGES: Record<number, string> = {
  1: 'Format error',
  2: 'Server failure',
  3: 'Non-existent domain (NXDOMAIN)',
  4: 'Not implemented',
  5: 'Refused',
}

export function typeName(code: number): string {
  return TYPE_NAMES[code] ?? `TYPE${code}`
}

/**
 * Gets the host name from a domain or a pasted URL. Removes the scheme, user
 * info, port, path, query and fragment, changes the name to lowercase and
 * converts an IDN to punycode. Returns null if the input is not a valid host.
 */
export function normaliseDomain(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const withoutScheme = trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
  try {
    const host = new URL(`http://${withoutScheme}`).hostname
    return host || null
  } catch {
    return null
  }
}

/**
 * Converts TXT presentation data (one or more quoted character-strings) into
 * the plain value. The strings are joined without a separator, as SPF and DKIM
 * require. Returns the data unchanged if it is not in the quoted form.
 */
export function parseTxt(data: string): string {
  const encoder = new TextEncoder()
  const bytes: number[] = []
  let i = 0
  while (i < data.length) {
    while (data[i] === ' ') i++
    if (i >= data.length) break
    if (data[i] !== '"') return data
    i++
    while (i < data.length && data[i] !== '"') {
      const ch = data[i]!
      if (ch === '\\' && i + 1 < data.length) {
        const dec = /^\d{3}/.exec(data.slice(i + 1, i + 4))
        if (dec) {
          bytes.push(Number(dec[0]) & 0xff)
          i += 4
          continue
        }
        bytes.push(...encoder.encode(data[i + 1]!))
        i += 2
        continue
      }
      const cp = data.codePointAt(i)!
      const char = String.fromCodePoint(cp)
      bytes.push(...encoder.encode(char))
      i += char.length
    }
    if (i >= data.length) return data
    i++
  }
  return new TextDecoder().decode(new Uint8Array(bytes))
}

export function formatAnswer(answer: DnsAnswer): string {
  if (answer.type === 16) return parseTxt(answer.data)
  return answer.data
}

export function ttlLabel(ttl: number): string {
  if (ttl < 60) return `${ttl}s`
  if (ttl < 3600) return `${Math.round(ttl / 60)}m`
  return `${Math.round(ttl / 3600)}h`
}

export async function queryDns(domain: string, type: RecordType, signal?: AbortSignal): Promise<RecordResult> {
  const url = `${DOH_URL}?name=${encodeURIComponent(domain)}&type=${type}`
  const res = await fetch(url, { headers: { Accept: 'application/dns-json' }, signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data: DohResponse = await res.json() as DohResponse
  if (data.Status === 3) {
    return { type, status: 'nxdomain', answers: [] }
  }
  if (data.Status !== 0) {
    return { type, status: 'error', answers: [], error: RCODE_MESSAGES[data.Status] ?? `RCODE ${data.Status}` }
  }
  return { type, status: 'ok', answers: data.Answer ?? [] }
}

/** Plain-text copy of the results: one "TYPE<tab>TTL<tab>value" line per record. */
export function resultsToText(results: RecordResult[]): string {
  return results
    .filter(r => r.status === 'ok')
    .flatMap(r => r.answers.map(a => `${typeName(a.type)}\t${a.TTL}\t${formatAnswer(a)}`))
    .join('\n')
}
