import { useState } from 'react'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Globe, Info, Trash2 } from 'lucide-react'

import { Button } from '../../components/ui/Button'
import { CopyButton } from '../../components/ui/CopyButton'
import { InfoCard } from '../../components/ui/InfoCard'
import { ToolHeader } from '../../components/ui/ToolHeader'
import { SectionLabel } from '../../components/ui/SectionLabel'
import { SegmentedControl, SegmentedControlItem } from '../../components/ui/SegmentedControl'
import { Alert } from '../../components/ui/Alert'
import { FlowDivider } from '../../components/ui/FlowDivider'
import { getCharInfo, parseInput, type CharInfo, type InputMode } from './unicode'

// Easter egg: "Cafe" with coffee emoji - shows off unicode combining characters
const EASTER_EGG_INPUT = 'Caf\u00e9 ☕'
const EASTER_EGG_CHAR_INFOS: CharInfo[] = parseInput(EASTER_EGG_INPUT, 'text').map(getCharInfo)

export default function UnicodeConverterTool() {
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [input, setInput] = useState(EASTER_EGG_INPUT)
  const [charInfos, setCharInfos] = useState<CharInfo[]>(EASTER_EGG_CHAR_INFOS)
  const [error, setError] = useState('')

  const handleInputChange = (value: string) => {
    setInput(value)
    setError('')
    setCharInfos([])

    // Do not trim: whitespace such as U+00A0 or U+FEFF is valid input to inspect.
    if (!value) {
      return
    }

    try {
      const chars = parseInput(value, inputMode)
      const infos = chars.map(char => getCharInfo(char))
      setCharInfos(infos)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid input for selected mode')
    }
  }

  const handleModeChange = (mode: InputMode) => {
    setInputMode(mode)
    setInput('')
    setCharInfos([])
    setError('')
  }

  const handleClear = () => {
    setInput('')
    setCharInfos([])
    setError('')
  }

  const getPlaceholder = () => {
    switch (inputMode) {
      case 'text': return 'Enter text (e.g., Hello World)'
      case 'codepoint': return 'Enter codepoints (e.g., U+0048 U+0065)'
      case 'hex': return 'Enter hex values (e.g., 0x48 0x65 or 48 65)'
      case 'decimal': return 'Enter decimal values (e.g., 72 101)'
    }
  }

  const combinedText = charInfos.map(c => c.char).join('')
  const combinedHex = charInfos.map(c => c.hex).join(' ')
  const combinedDecimal = charInfos.map(c => c.decimal).join(' ')

  return (
    <div className="space-y-4 animate-fade-in">
      <ToolHeader icon={<Globe />} title="Unicode" accentedSuffix="Converter" />

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* Mode Toggle */}
            <SegmentedControl value={inputMode} onChange={(v) => handleModeChange(v as InputMode)} className="flex-wrap">
              <SegmentedControlItem value="text">text</SegmentedControlItem>
              <SegmentedControlItem value="codepoint">U+</SegmentedControlItem>
              <SegmentedControlItem value="hex">hex</SegmentedControlItem>
              <SegmentedControlItem value="decimal">decimal</SegmentedControlItem>
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
            <Input
              label={`Input (${inputMode})`}
              placeholder={getPlaceholder()}
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              id="input"
              className="font-mono text-sm"
            />
          </div>

          {/* Error */}
          {error && (
            <Alert variant="error" size="sm">{error}</Alert>
          )}

          {/* Flow Divider */}
          <FlowDivider hasOutput={charInfos.length > 0} />

          {/* Combined Output */}
          {charInfos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-2 bg-[var(--color-cream-dark)] border border-[var(--color-border)] rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">Text</span>
                  <CopyButton text={combinedText} />
                </div>
                <code className="text-sm font-mono text-[var(--color-ink)] break-all">{combinedText}</code>
              </div>
              <div className="p-2 bg-[var(--color-cream-dark)] border border-[var(--color-border)] rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">Codepoints</span>
                  <CopyButton text={combinedHex} />
                </div>
                <code className="text-[11px] font-mono text-[var(--color-ink)] break-all">{combinedHex}</code>
              </div>
              <div className="p-2 bg-[var(--color-cream-dark)] border border-[var(--color-border)] rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">Decimal</span>
                  <CopyButton text={combinedDecimal} />
                </div>
                <code className="text-[11px] font-mono text-[var(--color-ink)] break-all">{combinedDecimal}</code>
              </div>
            </div>
          )}

          {/* Character Details */}
          {charInfos.length > 0 && (
            <div className="space-y-1">
              <SectionLabel>Character Details</SectionLabel>
              <div className="max-h-64 overflow-y-auto space-y-1.5" tabIndex={0} role="region" aria-label="Character details">
                {charInfos.map((info, idx) => (
                  <div 
                    key={idx}
                    className="p-2 bg-[var(--color-success-bg-subtle)] border border-[var(--color-success-border)] rounded-lg flex items-start gap-3"
                  >
                    <div className="w-10 h-10 flex items-center justify-center bg-[var(--color-surface)] border border-[var(--color-success-border)] rounded-lg text-2xl">
                      {info.char}
                    </div>
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                      <div>
                        <span className="text-[10px] text-[var(--color-ink-muted)]">Codepoint</span>
                        <div className="font-mono font-medium text-[var(--color-ink)]">{info.hex}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--color-ink-muted)]">Decimal</span>
                        <div className="font-mono font-medium text-[var(--color-ink)]">{info.decimal}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--color-ink-muted)]">UTF-8</span>
                        <div className="font-mono font-medium text-[var(--color-ink)]">{info.utf8}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--color-ink-muted)]">UTF-16</span>
                        <div className="font-mono font-medium text-[var(--color-ink)]">{info.utf16}</div>
                      </div>
                      <div className="col-span-2 sm:col-span-4">
                        <span className="text-[10px] text-[var(--color-ink-muted)]">Block</span>
                        <div className="font-medium text-[var(--color-ink)]">{info.name}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {charInfos.length === 0 && !error && (
            <div className="p-4 bg-[var(--color-cream-dark)] border border-[var(--color-border)] rounded-lg text-center">
              <span className="text-xs text-[var(--color-ink-muted)]">
                Character details will appear here...
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <div className="grid grid-cols-2 gap-2">
        <InfoCard
          icon={<Info className="text-[var(--color-accent)]" />}
          title="Unicode Codepoints"
          description="U+XXXX format represents the unique code for each character."
        />
        <InfoCard
          icon={<Info className="text-[var(--color-success-icon)]" />}
          title="Emoji Support"
          description="Handles multi-byte characters including emoji sequences."
        />
      </div>
    </div>
  )
}

