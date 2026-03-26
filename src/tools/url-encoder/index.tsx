import { useState } from 'react'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Textarea } from '../../components/ui/Textarea'
import { Button } from '../../components/ui/Button'
import { CopyButton } from '../../components/ui/CopyButton'
import { cn } from '../../lib/utils'
import { ArrowLeftRight, ChevronDown, CircleX, Info, Link2, MoveLeft, MoveRight, Trash2 } from 'lucide-react'

type Mode = 'encode' | 'decode'
type EncodeType = 'component' | 'full'

export default function UrlEncoderTool() {
  const [mode, setMode] = useState<Mode>('encode')
  const [encodeType, setEncodeType] = useState<EncodeType>('component')
  // Easter egg: The meaning of foo & bar (RFC 3092)
  const [input, setInput] = useState('foo=bar&baz=qux quux')
  const [output, setOutput] = useState('foo%3Dbar%26baz%3Dqux%20quux')
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
        const encoded = encodeType === 'component' 
          ? encodeURIComponent(value)
          : encodeURI(value)
        setOutput(encoded)
      } else {
        const decoded = encodeType === 'component'
          ? decodeURIComponent(value)
          : decodeURI(value)
        setOutput(decoded)
      }
    } catch {
      setError(mode === 'decode' ? 'Invalid encoded input' : 'Failed to encode')
      setOutput('')
    }
  }

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode)
    setInput('')
    setOutput('')
    setError('')
  }

  const handleEncodeTypeChange = (newType: EncodeType) => {
    setEncodeType(newType)
    if (input) {
      handleInputChange(input)
    }
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
          const encoded = encodeType === 'component'
            ? encodeURIComponent(output)
            : encodeURI(output)
          setOutput(encoded)
        } else {
          const decoded = encodeType === 'component'
            ? decodeURIComponent(output)
            : decodeURI(output)
          setOutput(decoded)
        }
      } catch {
        setError(newMode === 'decode' ? 'Invalid encoded input' : 'Failed to encode')
        setOutput('')
      }
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Breadcrumb & Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-white">
          <Link2 className="w-3.5 h-3.5" />
        </div>
        <h1 className="font-mono text-lg font-semibold text-[var(--color-ink)]">
          URL <span className="text-[var(--color-accent)]">Encoder</span>
        </h1>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
              {/* Mode Toggle */}
              <div className="flex bg-[var(--color-cream-dark)] rounded-lg p-0.5 border border-[var(--color-border)]">
                <button
                  onClick={() => handleModeChange('encode')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5',
                    mode === 'encode'
                      ? 'bg-white text-[var(--color-ink)] shadow-sm'
                      : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                  )}
                >
                  <MoveRight className="w-3 h-3" />
                  Encode
                </button>
                <button
                  onClick={() => handleModeChange('decode')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5',
                    mode === 'decode'
                      ? 'bg-white text-[var(--color-ink)] shadow-sm'
                      : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                  )}
                >
                  <MoveLeft className="w-3 h-3" />
                  Decode
                </button>
              </div>
              
              {/* Encode Type Toggle */}
              <div className="flex bg-[var(--color-cream-dark)] rounded-lg p-0.5 border border-[var(--color-border)]">
                <button
                  onClick={() => handleEncodeTypeChange('component')}
                  className={cn(
                    'px-2 py-1.5 text-xs font-medium rounded-md transition-all',
                    encodeType === 'component'
                      ? 'bg-white text-[var(--color-ink)] shadow-sm'
                      : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                  )}
                >
                  Component
                </button>
                <button
                  onClick={() => handleEncodeTypeChange('full')}
                  className={cn(
                    'px-2 py-1.5 text-xs font-medium rounded-md transition-all',
                    encodeType === 'full'
                      ? 'bg-white text-[var(--color-ink)] shadow-sm'
                      : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                  )}
                >
                  Full URL
                </button>
              </div>
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
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <CircleX className="w-3 h-3 text-red-500 flex-shrink-0" />
              <span className="text-xs font-medium">{error}</span>
            </div>
          )}

          {/* Arrow Divider */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-[var(--color-border)]" />
            <div className={cn(
              "p-1 rounded-full border transition-colors",
              output 
                ? "bg-emerald-50 border-emerald-200 text-emerald-600" 
                : "bg-[var(--color-cream-dark)] border-[var(--color-border)] text-[var(--color-ink-muted)]"
            )}>
              <ChevronDown className="w-3 h-3" />
            </div>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>

          {/* Output */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                {mode === 'encode' ? 'Encoded URL' : 'Decoded text'}
              </label>
              {output && <CopyButton text={output} />}
            </div>
            <Textarea
              value={output}
              readOnly
              rows={4}
              placeholder="Output will appear here..."
              className={cn(
                "font-mono text-sm",
                output ? "bg-emerald-50/50 border-emerald-200" : "bg-[var(--color-cream-dark)]"
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
        <div className="px-3 py-2 bg-[var(--color-cream-dark)] rounded-lg border border-[var(--color-border)]">
          <div className="flex gap-2 items-start">
            <Info className="w-3.5 h-3.5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[var(--color-ink)] text-xs">Component Mode</h3>
              <p className="text-[10px] text-[var(--color-ink-muted)] leading-tight mt-0.5">
                Encodes all special chars including / : ? & =
              </p>
            </div>
          </div>
        </div>
        <div className="px-3 py-2 bg-[var(--color-cream-dark)] rounded-lg border border-[var(--color-border)]">
          <div className="flex gap-2 items-start">
            <Info className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[var(--color-ink)] text-xs">Full URL Mode</h3>
              <p className="text-[10px] text-[var(--color-ink-muted)] leading-tight mt-0.5">
                Preserves URL structure chars like / : ? & =
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

