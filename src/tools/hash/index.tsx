import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Textarea } from '../../components/ui/Textarea'
import { Button } from '../../components/ui/Button'
import { CopyButton } from '../../components/ui/CopyButton'
import { InfoCard } from '../../components/ui/InfoCard'
import { ToolHeader } from '../../components/ui/ToolHeader'
import { FlowDivider } from '../../components/ui/FlowDivider'
import { SectionLabel } from '../../components/ui/SectionLabel'
import { SegmentedControl, SegmentedControlItem } from '../../components/ui/SegmentedControl'
import { Fingerprint, Info, Loader2, ShieldCheck, Trash2 } from 'lucide-react'
import { type HashAlgorithm, ALGORITHMS, computeHash } from './logic'

interface HashResult {
  algorithm: HashAlgorithm
  hash: string
}

export default function HashTool() {
  // Easter egg: "Hello, World!" - the classic first program
  const [input, setInput] = useState('Hello, World!')
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<HashAlgorithm | 'all'>('all')
  const [hashes, setHashes] = useState<HashResult[]>([])
  const [isComputing, setIsComputing] = useState(false)

  useEffect(() => {
    const computeHashes = async () => {
      if (!input.trim()) {
        setHashes([])
        return
      }

      setIsComputing(true)
      
      const algorithms = selectedAlgorithm === 'all' ? ALGORITHMS : [selectedAlgorithm]
      const results: HashResult[] = []
      
      for (const algo of algorithms) {
        const hash = await computeHash(input, algo)
        results.push({ algorithm: algo, hash })
      }
      
      setHashes(results)
      setIsComputing(false)
    }

    computeHashes()
  }, [input, selectedAlgorithm])

  const handleClear = () => {
    setInput('')
    setHashes([])
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Breadcrumb & Header */}
      <ToolHeader icon={<Fingerprint />} title="Hash" accentedSuffix="Generator" />

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* Algorithm Toggle */}
            <SegmentedControl
              value={selectedAlgorithm}
              onChange={(val) => setSelectedAlgorithm(val as HashAlgorithm | 'all')}
              className="flex-wrap"
            >
              <SegmentedControlItem value="all">All</SegmentedControlItem>
              {ALGORITHMS.map((algo) => (
                <SegmentedControlItem key={algo} value={algo}>{algo}</SegmentedControlItem>
              ))}
            </SegmentedControl>
            
            {/* Actions */}
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1 text-xs h-7 px-2">
                <Trash2 className="w-3 h-3" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Input */}
          <div className="space-y-1">
            <Textarea
              label="Text to hash"
              placeholder="Enter text to generate hash..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={4}
              id="input"
              className="font-mono text-sm"
            />
            {input && (
              <div className="text-[10px] text-[var(--color-ink-muted)] text-right">
                {input.length} chars
              </div>
            )}
          </div>

          {/* Arrow Divider */}
          <FlowDivider
            hasOutput={hashes.length > 0}
            icon={isComputing ? <Loader2 className="animate-spin" /> : undefined}
          />

          {/* Output */}
          <div className="space-y-2">
            <SectionLabel>
              Hash output{selectedAlgorithm === 'all' ? 's' : ''}
            </SectionLabel>
            
            {hashes.length > 0 ? (
              <div className="space-y-2">
                {hashes.map(({ algorithm, hash }) => (
                  <div 
                    key={algorithm}
                    className="p-2.5 bg-[var(--color-success-bg-subtle)] border border-[var(--color-success-border)] rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-success-text)]">
                        {algorithm}
                      </span>
                      <CopyButton text={hash} />
                    </div>
                    <code className="block text-xs font-mono text-[var(--color-ink)] break-all">
                      {hash}
                    </code>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-[var(--color-cream-dark)] border border-[var(--color-border)] rounded-lg text-center">
                <span className="text-xs text-[var(--color-ink-muted)]">
                  Hash output will appear here...
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="grid grid-cols-2 gap-2">
        <InfoCard
          icon={<Info className="text-[var(--color-accent)]" />}
          title="What is hashing?"
          description="One-way function that converts data into a fixed-size digest."
        />
        <InfoCard
          icon={<ShieldCheck className="text-[var(--color-success-icon)]" />}
          title="Security Note"
          description="Use SHA-256 or SHA-512 for security-sensitive applications."
        />
      </div>
    </div>
  )
}

