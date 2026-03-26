import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { CopyButton } from '../../components/ui/CopyButton'
import { cn } from '../../lib/utils'

type UuidVersion = 'v4' | 'v5' | 'v7'

// --- UUID generation ---

function uuidV4(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  return formatUuidBytes(bytes)
}

async function uuidV5(namespace: string, name: string): Promise<string> {
  // Parse namespace UUID
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

function uuidV7(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const now = BigInt(Date.now())
  // Set top 48 bits to millisecond timestamp
  bytes[0] = Number((now >> 40n) & 0xffn)
  bytes[1] = Number((now >> 32n) & 0xffn)
  bytes[2] = Number((now >> 24n) & 0xffn)
  bytes[3] = Number((now >> 16n) & 0xffn)
  bytes[4] = Number((now >> 8n) & 0xffn)
  bytes[5] = Number(now & 0xffn)
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  return formatUuidBytes(bytes)
}

function formatUuidBytes(bytes: Uint8Array): string {
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function parseUuidToBytes(uuid: string): Uint8Array | null {
  const clean = uuid.replace(/-/g, '')
  if (!/^[0-9a-fA-F]{32}$/.test(clean)) return null
  const bytes = new Uint8Array(16)
  for (let i = 0; i < 16; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

// Well-known namespace UUIDs (RFC 4122)
const NAMESPACES: Record<string, string> = {
  'DNS':  '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  'URL':  '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
  'OID':  '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
  'X500': '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
}

export default function UuidGeneratorTool() {
  const [version, setVersion] = useState<UuidVersion>('v7')
  const [count, setCount] = useState(5)
  const [uuids, setUuids] = useState<string[]>(() => Array.from({ length: 5 }, uuidV7))
  const [v5Namespace, setV5Namespace] = useState<string>(NAMESPACES['DNS'] ?? '')
  const [v5Name, setV5Name] = useState('example.com')
  const [v5Result, setV5Result] = useState('')
  const [v5Error, setV5Error] = useState('')

  const generateBulk = useCallback(async () => {
    if (version === 'v4') {
      setUuids(Array.from({ length: count }, uuidV4))
    } else if (version === 'v7') {
      // slight delay between each so timestamps differ
      const results: string[] = []
      for (let i = 0; i < count; i++) {
        await new Promise(r => setTimeout(r, 1))
        results.push(uuidV7())
      }
      setUuids(results)
    } else {
      // v5 — single deterministic UUID shown in its own section
      setUuids([])
    }
  }, [version, count])

  const generateV5 = useCallback(async () => {
    setV5Error('')
    setV5Result('')
    try {
      const result = await uuidV5(v5Namespace, v5Name)
      setV5Result(result)
    } catch (e) {
      setV5Error(e instanceof Error ? e.message : 'Invalid input')
    }
  }, [v5Namespace, v5Name])

  const allText = uuids.join('\n')

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Breadcrumb & Header */}
      <div className="space-y-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-white">
            <UuidIcon className="w-3.5 h-3.5" />
          </div>
          <h1 className="font-mono text-lg font-semibold text-[var(--color-ink)]">
            UUID <span className="text-[var(--color-accent)]">Generator</span>
          </h1>
        </div>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* Version Toggle */}
            <div className="flex bg-[var(--color-cream-dark)] rounded-lg p-0.5 border border-[var(--color-border)]">
              {(['v4', 'v5', 'v7'] as UuidVersion[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setVersion(v)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                    version === v
                      ? 'bg-white text-[var(--color-ink)] shadow-sm'
                      : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                  )}
                >
                  {v.toUpperCase()}
                </button>
              ))}
            </div>
            {version !== 'v5' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-ink-muted)]">Count:</span>
                {[1, 5, 10, 25].map(n => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    className={cn(
                      'w-8 h-7 text-xs font-medium rounded-md border transition-all',
                      count === n
                        ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                        : 'bg-white text-[var(--color-ink-muted)] border-[var(--color-border)] hover:text-[var(--color-ink)]'
                    )}
                  >
                    {n}
                  </button>
                ))}
                <Button variant="ghost" size="sm" onClick={generateBulk} className="gap-1 text-xs h-7 px-2">
                  <RefreshIcon className="w-3 h-3" />
                  Regenerate
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* V5 inputs */}
          {version === 'v5' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                  Namespace
                </label>
                <div className="flex gap-1 flex-wrap mb-1">
                  {Object.entries(NAMESPACES).map(([label, ns]) => (
                    <button
                      key={label}
                      onClick={() => setV5Namespace(ns)}
                      className={cn(
                        'px-2 py-0.5 text-[10px] font-medium rounded border transition-all',
                        v5Namespace === ns
                          ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                          : 'bg-white text-[var(--color-ink-muted)] border-[var(--color-border)] hover:text-[var(--color-ink)]'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <input
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                  value={v5Namespace}
                  onChange={e => setV5Namespace(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  spellCheck={false}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                  Name
                </label>
                <input
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                  value={v5Name}
                  onChange={e => setV5Name(e.target.value)}
                  placeholder="e.g. example.com"
                  spellCheck={false}
                />
              </div>
              <Button variant="primary" size="sm" onClick={generateV5} className="gap-1 text-xs">
                <RefreshIcon className="w-3 h-3" />
                Generate V5 UUID
              </Button>
              {v5Error && (
                <p className="text-xs text-red-600 font-mono">{v5Error}</p>
              )}
              {v5Result && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-[var(--color-border)]" />
                    <div className="p-1 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-600">
                      <ArrowDownIcon className="w-3 h-3" />
                    </div>
                    <div className="flex-1 h-px bg-[var(--color-border)]" />
                  </div>
                  <div className="p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-lg flex items-center justify-between gap-2">
                    <code className="text-xs font-mono text-[var(--color-ink)] break-all">{v5Result}</code>
                    <CopyButton text={v5Result} />
                  </div>
                  <p className="text-[10px] text-[var(--color-ink-muted)]">
                    Deterministic — same namespace + name always yields the same UUID.
                  </p>
                </>
              )}
            </div>
          )}

          {/* V4 / V7 bulk output */}
          {version !== 'v5' && (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-[var(--color-border)]" />
                <div className="p-1 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-600">
                  <ArrowDownIcon className="w-3 h-3" />
                </div>
                <div className="flex-1 h-px bg-[var(--color-border)]" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                    Generated UUIDs
                  </label>
                  {uuids.length > 1 && <CopyButton text={allText} />}
                </div>
                <div className="space-y-1">
                  {uuids.map((id, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-emerald-50/50 border border-emerald-200 rounded-lg flex items-center justify-between gap-2"
                    >
                      <code className="text-xs font-mono text-[var(--color-ink)]">{id}</code>
                      <CopyButton text={id} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="px-3 py-2 bg-[var(--color-cream-dark)] rounded-lg border border-[var(--color-border)]">
          <div className="flex gap-2 items-start">
            <InfoIcon className="w-3.5 h-3.5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[var(--color-ink)] text-xs">UUID versions</h3>
              <p className="text-[10px] text-[var(--color-ink-muted)] leading-tight mt-0.5">
                v4 = random. v5 = deterministic SHA-1 hash of namespace+name. v7 = time-ordered (sortable).
              </p>
            </div>
          </div>
        </div>
        <div className="px-3 py-2 bg-[var(--color-cream-dark)] rounded-lg border border-[var(--color-border)]">
          <div className="flex gap-2 items-start">
            <ShieldIcon className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[var(--color-ink)] text-xs">Client-side only</h3>
              <p className="text-[10px] text-[var(--color-ink-muted)] leading-tight mt-0.5">
                Generated entirely in your browser using the Web Crypto API. Nothing is sent to any server.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Version explainer */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
          UUID Version Reference
        </h2>
        <div className="space-y-2">
          {/* v4 */}
          <div className="px-3 py-3 bg-[var(--color-cream-dark)] rounded-lg border border-[var(--color-border)]">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-[var(--color-accent)] text-white">V4</span>
              <h3 className="text-xs font-semibold text-[var(--color-ink)]">Random</h3>
              <span className="text-[10px] text-[var(--color-ink-muted)] font-mono">122 bits of entropy</span>
            </div>
            <p className="text-[11px] text-[var(--color-ink-muted)] leading-relaxed">
              Generated entirely from random (or pseudo-random) numbers. Version and variant bits are fixed; the remaining 122 bits come from <code className="text-[10px] bg-white border border-[var(--color-border)] rounded px-1">crypto.getRandomValues()</code>. Two independently generated v4 UUIDs will collide with probability ~1 in 5.3&times;10<sup>36</sup>.
            </p>
            <p className="text-[11px] text-[var(--color-ink-muted)] leading-relaxed mt-1">
              <strong className="text-[var(--color-ink)]">Use when:</strong> you need a unique ID and don't care about ordering or reproducibility — the right choice for most applications.
            </p>
          </div>

          {/* v5 */}
          <div className="px-3 py-3 bg-[var(--color-cream-dark)] rounded-lg border border-[var(--color-border)]">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-[var(--color-accent)] text-white">V5</span>
              <h3 className="text-xs font-semibold text-[var(--color-ink)]">Name-based (SHA-1)</h3>
              <span className="text-[10px] text-[var(--color-ink-muted)] font-mono">deterministic</span>
            </div>
            <p className="text-[11px] text-[var(--color-ink-muted)] leading-relaxed">
              Derived by hashing a <strong className="text-[var(--color-ink)]">namespace UUID</strong> concatenated with a <strong className="text-[var(--color-ink)]">name</strong> using SHA-1, then truncating to 128 bits and stamping the version/variant. The same namespace + name pair always produces the same UUID — on any machine, at any time.
            </p>
            <p className="text-[11px] text-[var(--color-ink-muted)] leading-relaxed mt-1">
              <strong className="text-[var(--color-ink)]">Use when:</strong> you need a stable, reproducible ID for a named resource — e.g. mapping <code className="text-[10px] bg-white border border-[var(--color-border)] rounded px-1">dns:example.com</code> to a consistent UUID across systems without coordination.
            </p>
            <p className="text-[11px] text-[var(--color-ink-muted)] leading-relaxed mt-1">
              <strong className="text-[var(--color-ink)]">Note:</strong> SHA-1 is considered cryptographically weak for security purposes, but v5 is designed for identity, not secrecy. Use v8 with SHA-256 if collision resistance is critical.
            </p>
          </div>

          {/* v7 */}
          <div className="px-3 py-3 bg-[var(--color-cream-dark)] rounded-lg border border-[var(--color-border)]">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-[var(--color-accent)] text-white">V7</span>
              <h3 className="text-xs font-semibold text-[var(--color-ink)]">Time-ordered (Unix timestamp)</h3>
              <span className="text-[10px] text-[var(--color-ink-muted)] font-mono">ms precision</span>
            </div>
            <p className="text-[11px] text-[var(--color-ink-muted)] leading-relaxed">
              Encodes a Unix millisecond timestamp in the most-significant 48 bits, followed by a 4-bit version, 12 bits of random data, a 2-bit variant, and 62 more random bits. Because the timestamp comes first, v7 UUIDs sort lexicographically in creation order.
            </p>
            <p className="text-[11px] text-[var(--color-ink-muted)] leading-relaxed mt-1">
              <strong className="text-[var(--color-ink)]">Use when:</strong> UUIDs are stored as primary keys in a database — sorted inserts avoid page splits in B-tree indexes (the same problem <code className="text-[10px] bg-white border border-[var(--color-border)] rounded px-1">ULID</code> and <code className="text-[10px] bg-white border border-[var(--color-border)] rounded px-1">CUID2</code> solve). PostgreSQL, MySQL, and SQLite all benefit from this ordering. Standardised in RFC 9562 (2024).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function UuidIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  )
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  )
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}
