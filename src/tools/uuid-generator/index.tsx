import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { CopyButton } from '../../components/ui/CopyButton'
import { InfoCard } from '../../components/ui/InfoCard'
import { ToolHeader } from '../../components/ui/ToolHeader'
import { FlowDivider } from '../../components/ui/FlowDivider'
import { SectionLabel } from '../../components/ui/SectionLabel'
import { SegmentedControl, SegmentedControlItem } from '../../components/ui/SegmentedControl'
import { Dices, Info, RefreshCw, ShieldCheck } from 'lucide-react'

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
      <ToolHeader icon={<Dices />} title="UUID" accentedSuffix="Generator" />

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* Version Toggle */}
            <SegmentedControl value={version} onChange={(val) => setVersion(val as UuidVersion)}>
              {(['v4', 'v5', 'v7'] as UuidVersion[]).map((v) => (
                <SegmentedControlItem key={v} value={v}>{v.toUpperCase()}</SegmentedControlItem>
              ))}
            </SegmentedControl>
            {version !== 'v5' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-ink-muted)]">Count:</span>
                <SegmentedControl value={count.toString()} onChange={(v) => setCount(Number(v))} variant="bordered">
                  {[1, 5, 10, 25].map(n => (
                    <SegmentedControlItem key={n} value={n.toString()} className="w-8 h-7">
                      {n}
                    </SegmentedControlItem>
                  ))}
                </SegmentedControl>
                <Button variant="ghost" size="sm" onClick={generateBulk} className="gap-1 text-xs h-7 px-2">
                  <RefreshCw className="w-3 h-3" />
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
                <SectionLabel>Namespace</SectionLabel>
                <SegmentedControl value={v5Namespace} onChange={setV5Namespace} variant="bordered" className="mb-1">
                  {Object.entries(NAMESPACES).map(([label, ns]) => (
                    <SegmentedControlItem key={label} value={ns} className="px-2 py-0.5 text-[10px]">
                      {label}
                    </SegmentedControlItem>
                  ))}
                </SegmentedControl>
                <input
                  className="w-full px-3 py-2 text-xs font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                  value={v5Namespace}
                  onChange={e => setV5Namespace(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  spellCheck={false}
                />
              </div>
              <div className="space-y-1">
                <SectionLabel>Name</SectionLabel>
                <input
                  className="w-full px-3 py-2 text-xs font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                  value={v5Name}
                  onChange={e => setV5Name(e.target.value)}
                  placeholder="e.g. example.com"
                  spellCheck={false}
                />
              </div>
              <Button variant="primary" size="sm" onClick={generateV5} className="gap-1 text-xs">
                <RefreshCw className="w-3 h-3" />
                Generate V5 UUID
              </Button>
              {v5Error && (
                <p className="text-xs text-red-600 font-mono">{v5Error}</p>
              )}
              {v5Result && (
                <>
                  <FlowDivider hasOutput />
                  <div className="p-2.5 bg-[var(--color-success-bg-subtle)] border border-[var(--color-success-border)] rounded-lg flex items-center justify-between gap-2">
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
              <FlowDivider hasOutput />
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <SectionLabel>Generated UUIDs</SectionLabel>
                  {uuids.length > 1 && <CopyButton text={allText} />}
                </div>
                <div className="space-y-1">
                  {uuids.map((id, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-[var(--color-success-bg-subtle)] border border-[var(--color-success-border)] rounded-lg flex items-center justify-between gap-2"
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
        <InfoCard
          icon={<Info className="text-[var(--color-accent)]" />}
          title="UUID versions"
          description="v4 = random. v5 = deterministic SHA-1 hash of namespace+name. v7 = time-ordered (sortable)."
        />
        <InfoCard
          icon={<ShieldCheck className="text-[var(--color-success-icon)]" />}
          title="Client-side only"
          description="Generated entirely in your browser using the Web Crypto API. Nothing is sent to any server."
        />
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
              Generated entirely from random (or pseudo-random) numbers. Version and variant bits are fixed; the remaining 122 bits come from <code className="text-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1">crypto.getRandomValues()</code>. Two independently generated v4 UUIDs will collide with probability ~1 in 5.3&times;10<sup>36</sup>.
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
              <strong className="text-[var(--color-ink)]">Use when:</strong> you need a stable, reproducible ID for a named resource — e.g. mapping <code className="text-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1">dns:example.com</code> to a consistent UUID across systems without coordination.
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
              <strong className="text-[var(--color-ink)]">Use when:</strong> UUIDs are stored as primary keys in a database — sorted inserts avoid page splits in B-tree indexes (the same problem <code className="text-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1">ULID</code> and <code className="text-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1">CUID2</code> solve). PostgreSQL, MySQL, and SQLite all benefit from this ordering. Standardised in RFC 9562 (2024).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

