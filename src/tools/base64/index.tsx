import { useState } from 'react'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Textarea } from '../../components/ui/Textarea'
import { Button } from '../../components/ui/Button'
import { CopyButton } from '../../components/ui/CopyButton'
import { InfoCard } from '../../components/ui/InfoCard'
import { ToolHeader } from '../../components/ui/ToolHeader'
import { FlowDivider } from '../../components/ui/FlowDivider'
import { SectionLabel } from '../../components/ui/SectionLabel'
import { SegmentedControl, SegmentedControlItem } from '../../components/ui/SegmentedControl'
import { Alert } from '../../components/ui/Alert'
import { cn } from '../../lib/utils'
import { ArrowLeftRight, Binary, Check, Info, MoveLeft, MoveRight, Trash2 } from 'lucide-react'

type Mode = 'encode' | 'decode'

export default function Base64Tool() {
  const [mode, setMode] = useState<Mode>('encode')
  // Easter egg: The answer to life, the universe, and everything
  const [input, setInput] = useState('The answer is 42')
  const [output, setOutput] = useState('VGhlIGFuc3dlciBpcyA0Mg==')
  const [error, setError] = useState('')

  const handleInputChange = (value: string) => {
    setInput(value)
    setError('')

    if (!value.trim()) {
      setOutput('')
      return
    }

    try {
      if (mode === 'encode') {
        const encoded = btoa(unescape(encodeURIComponent(value)))
        setOutput(encoded)
      } else {
        const decoded = decodeURIComponent(escape(atob(value)))
        setOutput(decoded)
      }
    } catch {
      setError(mode === 'decode' ? 'Invalid Base64 input' : 'Failed to encode')
      setOutput('')
    }
  }

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode)
    setInput('')
    setOutput('')
    setError('')
  }

  const handleClear = () => {
    setInput('')
    setOutput('')
    setError('')
  }

  const handleSwap = () => {
    if (output && !error) {
      const newMode = mode === 'encode' ? 'decode' : 'encode'
      setMode(newMode)
      setInput(output)
      try {
        if (newMode === 'encode') {
          const encoded = btoa(unescape(encodeURIComponent(output)))
          setOutput(encoded)
        } else {
          const decoded = decodeURIComponent(escape(atob(output)))
          setOutput(decoded)
        }
      } catch {
        setError(newMode === 'decode' ? 'Invalid Base64 input' : 'Failed to encode')
        setOutput('')
      }
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <ToolHeader icon={<Binary />} title="Base64" accentedSuffix="Encoder" />

      {/* Main Card - Compact */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* Mode Toggle */}
            <SegmentedControl value={mode} onChange={(val) => handleModeChange(val as Mode)}>
              <SegmentedControlItem value="encode" className="flex items-center gap-1.5">
                <MoveRight className="w-3 h-3" />
                Encode
              </SegmentedControlItem>
              <SegmentedControlItem value="decode" className="flex items-center gap-1.5">
                <MoveLeft className="w-3 h-3" />
                Decode
              </SegmentedControlItem>
            </SegmentedControl>
            
            {/* Actions */}
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={handleSwap} disabled={!output || !!error} className="gap-1 text-xs h-7 px-2">
                <ArrowLeftRight className="w-3 h-3" />
                Swap
              </Button>
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
              label={mode === 'encode' ? 'Text to encode' : 'Base64 to decode'}
              placeholder={mode === 'encode' ? 'Enter text to encode...' : 'Enter Base64 string to decode...'}
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
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

          {/* Error */}
          {error && (
            <Alert variant="error" size="sm">{error}</Alert>
          )}

          {/* Arrow Divider - Compact */}
          <FlowDivider hasOutput={!!output} />

          {/* Output */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <SectionLabel>
                {mode === 'encode' ? 'Base64 output' : 'Decoded text'}
              </SectionLabel>
              {output && <CopyButton text={output} />}
            </div>
            <Textarea
              value={output}
              readOnly
              rows={4}
              placeholder="Output will appear here..."
              className={cn(
                "font-mono text-sm",
                output ? "bg-[var(--color-success-bg-subtle)] border-[var(--color-success-border)]" : "bg-[var(--color-cream-dark)]"
              )}
              id="output"
            />
            {output && (
              <div className="text-[10px] text-[var(--color-ink-muted)] text-right">
                {output.length} chars
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info - Compact as single row */}
      <div className="grid grid-cols-2 gap-2">
        <InfoCard
          icon={<Info className="text-[var(--color-accent)]" />}
          title="What is Base64?"
          description="Binary-to-text encoding for URLs, emails, and data URIs."
        />
        <InfoCard
          icon={<Check className="text-[var(--color-success-icon)]" />}
          title="UTF-8 Support"
          description="Supports special characters and emojis."
        />
      </div>
    </div>
  )
}

