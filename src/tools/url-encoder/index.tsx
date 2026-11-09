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
import { ArrowLeftRight, Info, Link2, MoveLeft, MoveRight, Trash2 } from 'lucide-react'
import { convert, type EncodeType, type Mode } from './convert'

export default function UrlEncoderTool() {
  const [mode, setMode] = useState<Mode>('encode')
  const [encodeType, setEncodeType] = useState<EncodeType>('component')
  // Easter egg: The meaning of foo & bar (RFC 3092)
  const [input, setInput] = useState('foo=bar&baz=qux quux')
  const [output, setOutput] = useState('foo%3Dbar%26baz%3Dqux%20quux')
  const [error, setError] = useState('')

  const applyResult = (value: string, nextMode: Mode, nextType: EncodeType) => {
    const result = convert(value, nextMode, nextType)
    setOutput(result.output)
    setError(result.error)
  }

  const handleInputChange = (value: string) => {
    setInput(value)
    applyResult(value, mode, encodeType)
  }

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode)
    setInput('')
    setOutput('')
    setError('')
  }

  const handleEncodeTypeChange = (newType: EncodeType) => {
    setEncodeType(newType)
    applyResult(input, mode, newType)
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
      applyResult(output, newMode, encodeType)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Breadcrumb & Header */}
      <ToolHeader icon={<Link2 />} title="URL" accentedSuffix="Encoder" />

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
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
              
              {/* Encode Type Toggle */}
              <SegmentedControl value={encodeType} onChange={(val) => handleEncodeTypeChange(val as EncodeType)}>
                <SegmentedControlItem value="component">Component</SegmentedControlItem>
                <SegmentedControlItem value="full">Full URL</SegmentedControlItem>
              </SegmentedControl>
            </div>
            
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
              label={mode === 'encode' ? 'Text to encode' : 'URL to decode'}
              placeholder={mode === 'encode' ? 'Enter text to encode...' : 'Enter encoded URL to decode...'}
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

          {/* Arrow Divider */}
          <FlowDivider hasOutput={!!output} />

          {/* Output */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <SectionLabel>
                {mode === 'encode' ? 'Encoded URL' : 'Decoded text'}
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

      {/* Info */}
      <div className="grid grid-cols-2 gap-2">
        <InfoCard
          icon={<Info className="text-[var(--color-accent)]" />}
          title="Component Mode"
          description="Encodes all special chars including / : ? & ="
        />
        <InfoCard
          icon={<Info className="text-[var(--color-success-icon)]" />}
          title="Full URL Mode"
          description="Preserves URL structure chars like / : ? & ="
        />
      </div>
    </div>
  )
}

