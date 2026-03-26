import { useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { CopyButton } from '../../components/ui/CopyButton'
import { cn } from '../../lib/utils'
import { ChevronDown, Info, LockKeyhole, RefreshCw, ShieldCheck, ChevronLeft } from 'lucide-react'

const CHARSETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  digits:    '0123456789',
  symbols:   '!@#$%^&*()-_=+[]{}|;:,.<>?',
}

type CharsetKey = keyof typeof CHARSETS

function generatePassword(length: number, enabled: Record<CharsetKey, boolean>, excludeAmbiguous: boolean): string {
  let pool = ''
  for (const [key, chars] of Object.entries(CHARSETS) as [CharsetKey, string][]) {
    if (enabled[key]) pool += chars
  }
  if (excludeAmbiguous) pool = pool.replace(/[0Ol1I]/g, '')
  if (!pool) return ''

  // Use crypto.getRandomValues for cryptographically secure generation
  const poolLen = pool.length
  const result: string[] = []
  while (result.length < length) {
    const rand = new Uint32Array(length - result.length)
    crypto.getRandomValues(rand)
    for (const n of rand) {
      if (result.length >= length) break
      // Discard values that would introduce modulo bias
      const limit = Math.floor(0xffffffff / poolLen) * poolLen
      if (n <= limit) result.push(pool[n % poolLen]!)
    }
  }
  return result.join('')
}

function calcEntropy(length: number, enabled: Record<CharsetKey, boolean>, excludeAmbiguous: boolean): number {
  let pool = ''
  for (const [key, chars] of Object.entries(CHARSETS) as [CharsetKey, string][]) {
    if (enabled[key]) pool += chars
  }
  if (excludeAmbiguous) pool = pool.replace(/[0Ol1I]/g, '')
  if (!pool) return 0
  return Math.floor(length * Math.log2(pool.length))
}

function entropyLabel(bits: number): { label: string; color: string } {
  if (bits < 40)  return { label: 'Very Weak',  color: 'text-red-600' }
  if (bits < 60)  return { label: 'Weak',        color: 'text-orange-500' }
  if (bits < 80)  return { label: 'Fair',        color: 'text-yellow-600' }
  if (bits < 100) return { label: 'Strong',      color: 'text-emerald-600' }
  return            { label: 'Very Strong',  color: 'text-emerald-700' }
}

const DEFAULT_ENABLED: Record<CharsetKey, boolean> = {
  uppercase: true,
  lowercase: true,
  digits:    true,
  symbols:   true,
}

export default function PasswordGeneratorTool() {
  const [length, setLength] = useState(20)
  const [enabled, setEnabled] = useState<Record<CharsetKey, boolean>>(DEFAULT_ENABLED)
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false)
  const [count, setCount] = useState(5)
  // seed triggers a re-generation without changing any config
  const [seed, setSeed] = useState(0)

  const passwords = useMemo(
    () => Array.from({ length: count }, () => generatePassword(length, enabled, excludeAmbiguous)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [length, enabled, excludeAmbiguous, count, seed]
  )

  const generate = useCallback(() => setSeed(s => s + 1), [])

  const entropy = calcEntropy(length, enabled, excludeAmbiguous)
  const { label: strengthLabel, color: strengthColor } = entropyLabel(entropy)
  const anyEnabled = Object.values(enabled).some(Boolean)

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Breadcrumb & Header */}
      <div className="space-y-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-white">
            <LockKeyhole className="w-3.5 h-3.5" />
          </div>
          <h1 className="font-mono text-lg font-semibold text-[var(--color-ink)]">
            Password <span className="text-[var(--color-accent)]">Generator</span>
          </h1>
        </div>
      </div>

      {/* Config Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-semibold text-[var(--color-ink)]">Configuration</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-ink-muted)]">Count:</span>
              {[1, 5, 10].map(n => (
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
              <Button variant="ghost" size="sm" onClick={generate} className="gap-1 text-xs h-7 px-2">
                <RefreshCw className="w-3 h-3" />
                Regenerate
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Length slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                Length
              </label>
              <span className="text-xs font-mono font-semibold text-[var(--color-ink)]">{length}</span>
            </div>
            <input
              type="range"
              min={8}
              max={128}
              value={length}
              onChange={e => setLength(Number(e.target.value))}
              className="w-full h-1.5 rounded-full accent-[var(--color-accent)] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[var(--color-ink-muted)]">
              <span>8</span><span>128</span>
            </div>
          </div>

          {/* Charset toggles */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
              Character sets
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(CHARSETS) as CharsetKey[]).map(key => (
                <button
                  key={key}
                  onClick={() => setEnabled(prev => ({ ...prev, [key]: !prev[key] }))}
                  className={cn(
                    'px-3 py-2 text-xs rounded-lg border text-left transition-all',
                    enabled[key]
                      ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)] text-[var(--color-accent)]'
                      : 'bg-white border-[var(--color-border)] text-[var(--color-ink-muted)]'
                  )}
                >
                  <span className="font-semibold capitalize">{key}</span>
                  <span className="block text-[9px] font-mono opacity-70 mt-0.5 truncate">
                    {CHARSETS[key].slice(0, 20)}{CHARSETS[key].length > 20 ? '…' : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Exclude ambiguous */}
          <button
            onClick={() => setExcludeAmbiguous(p => !p)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg border transition-all text-left',
              excludeAmbiguous
                ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'bg-white border-[var(--color-border)] text-[var(--color-ink-muted)]'
            )}
          >
            <div className={cn(
              'w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0',
              excludeAmbiguous ? 'bg-[var(--color-accent)] border-[var(--color-accent)]' : 'border-current'
            )}>
              {excludeAmbiguous && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            Exclude ambiguous characters <span className="font-mono ml-1">(0, O, l, 1, I)</span>
          </button>

          {/* Entropy bar */}
          {anyEnabled && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                  Entropy
                </label>
                <span className={cn('text-xs font-semibold', strengthColor)}>
                  {strengthLabel} — {entropy} bits
                </span>
              </div>
              <div className="h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (entropy / 128) * 100)}%`,
                    backgroundColor: entropy >= 100 ? '#059669' : entropy >= 80 ? '#10b981' : entropy >= 60 ? '#d97706' : entropy >= 40 ? '#f97316' : '#dc2626'
                  }}
                />
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-[var(--color-border)]" />
            <div className="p-1 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-600">
              <ChevronDown className="w-3 h-3" />
            </div>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>

          {/* Passwords output */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                Generated passwords
              </label>
              {passwords.length > 1 && <CopyButton text={passwords.join('\n')} />}
            </div>
            {anyEnabled ? (
              <div className="space-y-1">
                {passwords.map((pw, idx) => (
                  <div key={idx} className="p-2 bg-emerald-50/50 border border-emerald-200 rounded-lg flex items-center justify-between gap-2">
                    <code className="text-xs font-mono text-[var(--color-ink)] break-all">{pw}</code>
                    <CopyButton text={pw} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-[var(--color-cream-dark)] border border-[var(--color-border)] rounded-lg text-center">
                <span className="text-xs text-[var(--color-ink-muted)]">Enable at least one character set.</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="px-3 py-2 bg-[var(--color-cream-dark)] rounded-lg border border-[var(--color-border)]">
          <div className="flex gap-2 items-start">
            <Info className="w-3.5 h-3.5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[var(--color-ink)] text-xs">Cryptographically secure</h3>
              <p className="text-[10px] text-[var(--color-ink-muted)] leading-tight mt-0.5">
                Uses <code className="text-[9px]">crypto.getRandomValues()</code> — the same API browsers use for TLS. Not Math.random().
              </p>
            </div>
          </div>
        </div>
        <div className="px-3 py-2 bg-[var(--color-cream-dark)] rounded-lg border border-[var(--color-border)]">
          <div className="flex gap-2 items-start">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[var(--color-ink)] text-xs">Entropy guide</h3>
              <p className="text-[10px] text-[var(--color-ink-muted)] leading-tight mt-0.5">
                Aim for &ge;80 bits for most accounts; &ge;100 bits for high-value targets.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

