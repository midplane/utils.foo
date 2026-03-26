import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { CopyButton } from '../../components/ui/CopyButton'
import { Globe, Loader2, Info } from 'lucide-react'
import { cn } from '../../lib/utils'

// ─── Constants ───────────────────────────────────────────────────────────────

const RECORD_TYPES = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA'] as const
type RecordType = typeof RECORD_TYPES[number]

// Cloudflare DNS-over-HTTPS endpoint
const DOH_URL = 'https://cloudflare-dns.com/dns-query'

// ─── Types ───────────────────────────────────────────────────────────────────

interface DnsAnswer {
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

interface RecordResult {
  type: RecordType
  status: 'ok' | 'nxdomain' | 'error'
  answers: DnsAnswer[]
  error?: string
}

// ─── DNS helpers ─────────────────────────────────────────────────────────────

const RCODE_MESSAGES: Record<number, string> = {
  1: 'Format error',
  2: 'Server failure',
  3: 'Non-existent domain (NXDOMAIN)',
  4: 'Not implemented',
  5: 'Refused',
}

async function queryDns(domain: string, type: RecordType): Promise<RecordResult> {
  const url = `${DOH_URL}?name=${encodeURIComponent(domain)}&type=${type}`
  const res = await fetch(url, { headers: { Accept: 'application/dns-json' } })
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

function formatAnswer(answer: DnsAnswer, type: RecordType): string {
  if (type === 'MX') {
    // MX data is "priority exchange" — already in the data field
    return answer.data
  }
  if (type === 'TXT') {
    // Strip surrounding quotes from TXT records
    return answer.data.replace(/^"|"$/g, '')
  }
  return answer.data
}

function ttlLabel(ttl: number): string {
  if (ttl < 60) return `${ttl}s`
  if (ttl < 3600) return `${Math.round(ttl / 60)}m`
  return `${Math.round(ttl / 3600)}h`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RecordBadge({ type, active, onClick }: { type: RecordType; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2.5 py-1 rounded text-xs font-mono font-semibold border transition-colors',
        active
          ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
          : 'bg-[var(--color-cream-dark)] text-[var(--color-ink-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
      )}
    >
      {type}
    </button>
  )
}

function RecordSection({ result }: { result: RecordResult }) {
  const hasAnswers = result.status === 'ok' && result.answers.length > 0
  if (!hasAnswers && result.status !== 'error') return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-accent)]">
          {result.type}
        </span>
        {result.status === 'error' && (
          <span className="text-[10px] text-red-600">{result.error}</span>
        )}
      </div>
      {hasAnswers && (
        <div className="space-y-1">
          {result.answers.map((ans, i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-3 py-1.5 px-2 bg-[var(--color-cream-dark)] rounded border border-[var(--color-border)]"
            >
              <span className="text-xs font-mono text-[var(--color-ink)] break-all flex-1">
                {formatAnswer(ans, result.type)}
              </span>
              <span className="text-[10px] text-[var(--color-ink-muted)] font-mono flex-shrink-0 pt-0.5">
                TTL {ttlLabel(ans.TTL)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DnsLookupTool() {
  const [domain, setDomain] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<Set<RecordType>>(
    () => new Set(['A', 'AAAA', 'MX', 'TXT', 'NS'] as RecordType[])
  )
  const [results, setResults] = useState<RecordResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [queriedDomain, setQueriedDomain] = useState('')

  const toggleType = useCallback((type: RecordType) => {
    setSelectedTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) {
        if (next.size === 1) return prev // keep at least one selected
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }, [])

  const handleLookup = useCallback(async () => {
    const d = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    if (!d) { setError('Enter a domain name'); return }
    setError('')
    setResults([])
    setIsLoading(true)
    setQueriedDomain(d)

    const types = RECORD_TYPES.filter(t => selectedTypes.has(t))
    try {
      const settled = await Promise.allSettled(types.map(t => queryDns(d, t)))
      const resolved: RecordResult[] = settled.map((s, i) => {
        if (s.status === 'fulfilled') return s.value
        return {
          type: types[i]!,
          status: 'error' as const,
          answers: [],
          error: s.reason instanceof Error ? s.reason.message : 'Request failed',
        }
      })
      setResults(resolved)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lookup failed')
    } finally {
      setIsLoading(false)
    }
  }, [domain, selectedTypes])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { void handleLookup() }
  }, [handleLookup])

  const visibleResults = results.filter(r =>
    (r.status === 'ok' && r.answers.length > 0) || r.status === 'error'
  )

  const resultText = results
    .filter(r => r.status === 'ok' && r.answers.length > 0)
    .flatMap(r => r.answers.map(a => `${r.type}\t${a.TTL}\t${a.data}`))
    .join('\n')

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Breadcrumb & Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-white">
          <Globe className="w-3.5 h-3.5" />
        </div>
        <h1 className="font-mono text-lg font-semibold text-[var(--color-ink)]">
          DNS <span className="text-[var(--color-accent)]">Lookup</span>
        </h1>
      </div>

      {/* Input card */}
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold text-[var(--color-ink)]">Domain</span>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="example.com"
              value={domain}
              onChange={e => { setDomain(e.target.value); setError('') }}
              onKeyDown={handleKeyDown}
              className="font-mono text-xs flex-1"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => { void handleLookup() }}
              disabled={!domain.trim() || isLoading}
              className="gap-1 flex-shrink-0"
            >
              {isLoading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Globe className="w-3.5 h-3.5" />}
              Lookup
            </Button>
          </div>

          {/* Record type toggles */}
          <div className="flex flex-wrap gap-1.5">
            {RECORD_TYPES.map(type => (
              <RecordBadge
                key={type}
                type={type}
                active={selectedTypes.has(type)}
                onClick={() => toggleType(type)}
              />
            ))}
          </div>

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-mono">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results card */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--color-ink)]">Results</span>
                <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">{queriedDomain}</span>
              </div>
              {resultText && <CopyButton text={resultText} />}
            </div>
          </CardHeader>
          <CardContent>
            {visibleResults.length === 0 ? (
              <p className="text-xs text-[var(--color-ink-muted)] text-center py-4">
                No records found for the selected types.
              </p>
            ) : (
              <div className="space-y-4">
                {visibleResults.map(r => (
                  <RecordSection key={r.type} result={r} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="px-3 py-2 bg-[var(--color-cream-dark)] rounded-lg border border-[var(--color-border)]">
          <div className="flex gap-2 items-start">
            <Info className="w-3.5 h-3.5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[var(--color-ink)] text-xs">DNS-over-HTTPS</h3>
              <p className="text-[10px] text-[var(--color-ink-muted)] leading-tight mt-0.5">
                Queries use Cloudflare's DoH API (1.1.1.1). Results reflect Cloudflare's resolver cache — TTLs may differ from authoritative servers.
              </p>
            </div>
          </div>
        </div>
        <div className="px-3 py-2 bg-[var(--color-cream-dark)] rounded-lg border border-[var(--color-border)]">
          <div className="flex gap-2 items-start">
            <Globe className="w-3.5 h-3.5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[var(--color-ink)] text-xs">Record types</h3>
              <p className="text-[10px] text-[var(--color-ink-muted)] leading-tight mt-0.5">
                Toggle which record types to query. At least one must remain selected. Enter key triggers the lookup.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
