import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Textarea } from '../../components/ui/Textarea'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { CopyButton } from '../../components/ui/CopyButton'
import { cn } from '../../lib/utils'
import { ChevronDown, Info, KeyRound, ShieldCheck, Trash2 } from 'lucide-react'

type HmacAlgorithm = 'SHA-256' | 'SHA-512'

async function computeHmac(message: string, secret: string, algorithm: HmacAlgorithm): Promise<string> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: algorithm },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', keyMaterial, enc.encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function HmacGeneratorTool() {
  const [algorithm, setAlgorithm] = useState<HmacAlgorithm | 'both'>('both')
  const [message, setMessage] = useState('The quick brown fox jumps over the lazy dog')
  const [secret, setSecret] = useState('super-secret-key')
  const [results, setResults] = useState<{ algo: HmacAlgorithm; hmac: string }[]>([])

  useEffect(() => {
    let cancelled = false
    const algos: HmacAlgorithm[] = algorithm === 'both' ? ['SHA-256', 'SHA-512'] : [algorithm]
    if (!message || !secret) {
      Promise.resolve().then(() => { if (!cancelled) setResults([]) })
    } else {
      Promise.all(algos.map(a => computeHmac(message, secret, a).then(hmac => ({ algo: a, hmac }))))
        .then(res => { if (!cancelled) setResults(res) })
        .catch(() => { if (!cancelled) setResults([]) })
    }
    return () => { cancelled = true }
  }, [message, secret, algorithm])

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Breadcrumb & Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-white">
          <KeyRound className="w-3.5 h-3.5" />
        </div>
        <h1 className="font-mono text-lg font-semibold text-[var(--color-ink)]">
          HMAC <span className="text-[var(--color-accent)]">Generator</span>
        </h1>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* Algorithm Toggle */}
            <div className="flex bg-[var(--color-cream-dark)] rounded-lg p-0.5 border border-[var(--color-border)]">
              {(['both', 'SHA-256', 'SHA-512'] as const).map(a => (
                <button
                  key={a}
                  onClick={() => setAlgorithm(a)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                    algorithm === a
                      ? 'bg-white text-[var(--color-ink)] shadow-sm'
                      : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                  )}
                >
                  {a === 'both' ? 'Both' : a}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setMessage(''); setSecret('') }}
              className="gap-1 text-xs h-7 px-2"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Secret Key */}
          <Input
            label="Secret key"
            id="hmac-secret"
            type="text"
            placeholder="Enter secret key..."
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="font-mono text-sm"
          />

          {/* Message */}
          <Textarea
            label="Message"
            id="hmac-message"
            placeholder="Enter message to authenticate..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="font-mono text-sm"
          />

          {/* Divider */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-[var(--color-border)]" />
            <div className={cn(
              'p-1 rounded-full border transition-colors',
              results.length > 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                : 'bg-[var(--color-cream-dark)] border-[var(--color-border)] text-[var(--color-ink-muted)]'
            )}>
              <ChevronDown className="w-3 h-3" />
            </div>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>

          {/* Output */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
              HMAC output{algorithm === 'both' ? 's' : ''}
            </label>
            {results.length > 0 ? (
              <div className="space-y-2">
                {results.map(({ algo, hmac }) => (
                  <div key={algo} className="p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                        HMAC-{algo}
                      </span>
                      <CopyButton text={hmac} />
                    </div>
                    <code className="block text-xs font-mono text-[var(--color-ink)] break-all">{hmac}</code>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-[var(--color-cream-dark)] border border-[var(--color-border)] rounded-lg text-center">
                <span className="text-xs text-[var(--color-ink-muted)]">
                  {message && secret ? 'Computing…' : 'Enter a message and secret key above.'}
                </span>
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
              <h3 className="font-semibold text-[var(--color-ink)] text-xs">What is HMAC?</h3>
              <p className="text-[10px] text-[var(--color-ink-muted)] leading-tight mt-0.5">
                Hash-based Message Authentication Code — proves a message came from a party that holds the secret key and wasn't tampered with.
              </p>
            </div>
          </div>
        </div>
        <div className="px-3 py-2 bg-[var(--color-cream-dark)] rounded-lg border border-[var(--color-border)]">
          <div className="flex gap-2 items-start">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[var(--color-ink)] text-xs">Common uses</h3>
              <p className="text-[10px] text-[var(--color-ink-muted)] leading-tight mt-0.5">
                API request signing (AWS, Stripe, GitHub webhooks), JWT verification, and cookie integrity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

