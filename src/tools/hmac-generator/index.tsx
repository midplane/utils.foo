import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Textarea } from '../../components/ui/Textarea'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { CopyButton } from '../../components/ui/CopyButton'
import { InfoCard } from '../../components/ui/InfoCard'
import { ToolHeader } from '../../components/ui/ToolHeader'
import { FlowDivider } from '../../components/ui/FlowDivider'
import { SectionLabel } from '../../components/ui/SectionLabel'
import { SegmentedControl, SegmentedControlItem } from '../../components/ui/SegmentedControl'
import { Alert } from '../../components/ui/Alert'
import { Info, KeyRound, ShieldCheck, Trash2 } from 'lucide-react'
import { computeHmac, type HmacAlgorithm } from './hmac'

export default function HmacGeneratorTool() {
  const [algorithm, setAlgorithm] = useState<HmacAlgorithm | 'both'>('both')
  const [message, setMessage] = useState('The quick brown fox jumps over the lazy dog')
  const [secret, setSecret] = useState('super-secret-key')
  const [results, setResults] = useState<{ algo: HmacAlgorithm; hmac: string }[]>([])
  const [error, setError] = useState('')

  // An empty message is a valid HMAC input. Web Crypto does not accept an empty key.
  useEffect(() => {
    let cancelled = false
    const algos: HmacAlgorithm[] = algorithm === 'both' ? ['SHA-256', 'SHA-512'] : [algorithm]
    if (!secret) {
      Promise.resolve().then(() => { if (!cancelled) { setResults([]); setError('') } })
    } else {
      Promise.all(algos.map(a => computeHmac(message, secret, a).then(hmac => ({ algo: a, hmac }))))
        .then(res => { if (!cancelled) { setResults(res); setError('') } })
        .catch((e: unknown) => {
          if (cancelled) return
          setResults([])
          setError(e instanceof Error ? e.message : 'Cannot compute the HMAC.')
        })
    }
    return () => { cancelled = true }
  }, [message, secret, algorithm])

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Breadcrumb & Header */}
      <ToolHeader icon={<KeyRound />} title="HMAC" accentedSuffix="Generator" />

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* Algorithm Toggle */}
            <SegmentedControl
              value={algorithm}
              onChange={(val) => setAlgorithm(val as HmacAlgorithm | 'both')}
            >
              <SegmentedControlItem value="both">Both</SegmentedControlItem>
              <SegmentedControlItem value="SHA-256">SHA-256</SegmentedControlItem>
              <SegmentedControlItem value="SHA-512">SHA-512</SegmentedControlItem>
            </SegmentedControl>
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
          <FlowDivider hasOutput={results.length > 0} />

          {/* Output */}
          <div className="space-y-2">
            <SectionLabel>
              HMAC output{algorithm === 'both' ? 's' : ''}
            </SectionLabel>
            {error ? (
              <Alert variant="error" size="sm">Cannot compute the HMAC: {error}</Alert>
            ) : results.length > 0 ? (
              <div className="space-y-2">
                {results.map(({ algo, hmac }) => (
                  <div key={algo} className="p-2.5 bg-[var(--color-success-bg-subtle)] border border-[var(--color-success-border)] rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-success-text)]">
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
                  {secret ? 'Computing…' : 'Enter a secret key above.'}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-2">
        <InfoCard
          icon={<Info className="text-[var(--color-accent)]" />}
          title="What is HMAC?"
          description="Hash-based Message Authentication Code — proves a message came from a party that holds the secret key and wasn't tampered with."
        />
        <InfoCard
          icon={<ShieldCheck className="text-[var(--color-success-icon)]" />}
          title="Common uses"
          description="API request signing (AWS, Stripe, GitHub webhooks), JWT verification, and cookie integrity."
        />
      </div>
    </div>
  )
}

