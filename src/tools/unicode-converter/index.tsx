import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { CircleX, Globe, Info, Trash2, ChevronLeft } from 'lucide-react'

import { Button } from '../../components/ui/Button'
import { CopyButton } from '../../components/ui/CopyButton'
import { cn } from '../../lib/utils'

type InputMode = 'text' | 'codepoint' | 'hex' | 'decimal'

interface CharInfo {
  char: string
  codepoint: number
  hex: string
  decimal: string
  name: string
  utf8: string
  utf16: string
}

function getCharInfo(char: string): CharInfo {
  const codepoint = char.codePointAt(0) ?? 0
  const hex = 'U+' + codepoint.toString(16).toUpperCase().padStart(4, '0')
  const decimal = codepoint.toString()
  
  // Get UTF-8 bytes
  const encoder = new TextEncoder()
  const utf8Bytes = encoder.encode(char)
  const utf8 = Array.from(utf8Bytes).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')
  
  // Get UTF-16 code units
  const utf16Units: string[] = []
  for (let i = 0; i < char.length; i++) {
    utf16Units.push(char.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0'))
  }
  const utf16 = utf16Units.join(' ')
  
  // Try to get character name (simplified approach)
  let name = 'Unknown'
  if (codepoint >= 0x0000 && codepoint <= 0x001F) name = 'Control Character'
  else if (codepoint >= 0x0020 && codepoint <= 0x007F) name = 'Basic Latin'
  else if (codepoint >= 0x0080 && codepoint <= 0x00FF) name = 'Latin-1 Supplement'
  else if (codepoint >= 0x0100 && codepoint <= 0x017F) name = 'Latin Extended-A'
  else if (codepoint >= 0x0180 && codepoint <= 0x024F) name = 'Latin Extended-B'
  else if (codepoint >= 0x0370 && codepoint <= 0x03FF) name = 'Greek and Coptic'
  else if (codepoint >= 0x0400 && codepoint <= 0x04FF) name = 'Cyrillic'
  else if (codepoint >= 0x0590 && codepoint <= 0x05FF) name = 'Hebrew'
  else if (codepoint >= 0x0600 && codepoint <= 0x06FF) name = 'Arabic'
  else if (codepoint >= 0x3000 && codepoint <= 0x303F) name = 'CJK Symbols'
  else if (codepoint >= 0x4E00 && codepoint <= 0x9FFF) name = 'CJK Unified Ideographs'
  else if (codepoint >= 0x1F300 && codepoint <= 0x1F9FF) name = 'Emoji'
  
  return { char, codepoint, hex, decimal, name, utf8, utf16 }
}

function parseInput(input: string, mode: InputMode): string[] {
  if (mode === 'text') {
    // Split into graphemes (handles emoji and combining characters)
    // Use Array.from for basic support, with Intl.Segmenter for better emoji handling if available
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const segmenter = new (Intl as any).Segmenter()
      return [...segmenter.segment(input)].map((s: { segment: string }) => s.segment)
    }
    // Fallback: use Array.from which handles basic multi-byte chars
    return Array.from(input)
  } else if (mode === 'codepoint') {
    // Parse U+XXXX format
    const matches = input.match(/U\+[0-9A-Fa-f]+/gi) ?? []
    return matches.map(m => {
      const codepoint = parseInt(m.slice(2), 16)
      return String.fromCodePoint(codepoint)
    })
  } else if (mode === 'hex') {
    // Parse hex values (0xXXXX or just XXXX)
    const matches = input.match(/(?:0x)?[0-9A-Fa-f]+/gi) ?? []
    return matches.map(m => {
      const hex = m.startsWith('0x') ? m.slice(2) : m
      const codepoint = parseInt(hex, 16)
      return String.fromCodePoint(codepoint)
    })
  } else {
    // Parse decimal values
    const matches = input.match(/\d+/g) ?? []
    return matches.map(m => {
      const codepoint = parseInt(m, 10)
      return String.fromCodePoint(codepoint)
    })
  }
}

// Easter egg: "Cafe" with coffee emoji - shows off unicode combining characters
const EASTER_EGG_INPUT = 'Caf\u00e9 ☕'
const EASTER_EGG_CHAR_INFOS: CharInfo[] = [
  { char: 'C', codepoint: 67, hex: 'U+0043', decimal: '67', name: 'Basic Latin', utf8: '43', utf16: '0043' },
  { char: 'a', codepoint: 97, hex: 'U+0061', decimal: '97', name: 'Basic Latin', utf8: '61', utf16: '0061' },
  { char: 'f', codepoint: 102, hex: 'U+0066', decimal: '102', name: 'Basic Latin', utf8: '66', utf16: '0066' },
  { char: '\u00e9', codepoint: 233, hex: 'U+00E9', decimal: '233', name: 'Latin-1 Supplement', utf8: 'C3 A9', utf16: '00E9' },
  { char: ' ', codepoint: 32, hex: 'U+0020', decimal: '32', name: 'Basic Latin', utf8: '20', utf16: '0020' },
  { char: '☕', codepoint: 9749, hex: 'U+2615', decimal: '9749', name: 'Unknown', utf8: 'E2 98 95', utf16: '2615' },
]

export default function UnicodeConverterTool() {
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [input, setInput] = useState(EASTER_EGG_INPUT)
  const [charInfos, setCharInfos] = useState<CharInfo[]>(EASTER_EGG_CHAR_INFOS)
  const [error, setError] = useState('')

  const handleInputChange = (value: string) => {
    setInput(value)
    setError('')
    setCharInfos([])

    if (!value.trim()) {
      return
    }

    try {
      const chars = parseInput(value, inputMode)
      const infos = chars.map(char => getCharInfo(char))
      setCharInfos(infos)
    } catch {
      setError('Invalid input for selected mode')
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
            <Globe className="w-3.5 h-3.5" />
          </div>
          <h1 className="font-mono text-lg font-semibold text-[var(--color-ink)]">
            Unicode <span className="text-[var(--color-accent)]">Converter</span>
          </h1>
        </div>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* Mode Toggle */}
            <div className="flex bg-[var(--color-cream-dark)] rounded-lg p-0.5 border border-[var(--color-border)] flex-wrap">
              {(['text', 'codepoint', 'hex', 'decimal'] as InputMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleModeChange(mode)}
                  className={cn(
                    'px-2.5 py-1.5 text-xs font-medium rounded-md transition-all capitalize',
                    inputMode === mode
                      ? 'bg-white text-[var(--color-ink)] shadow-sm'
                      : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                  )}
                >
                  {mode === 'codepoint' ? 'U+' : mode}
                </button>
              ))}
            </div>
            
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
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <CircleX className="w-3 h-3 text-red-500 flex-shrink-0" />
              <span className="text-xs font-medium">{error}</span>
            </div>
          )}

          {/* Combined Output */}
          {charInfos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
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
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                Character Details
              </label>
              <div className="max-h-64 overflow-y-auto space-y-1.5">
                {charInfos.map((info, idx) => (
                  <div 
                    key={idx}
                    className="p-2 bg-emerald-50/50 border border-emerald-200 rounded-lg flex items-start gap-3"
                  >
                    <div className="w-10 h-10 flex items-center justify-center bg-white border border-emerald-200 rounded-lg text-2xl">
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
        <div className="px-3 py-2 bg-[var(--color-cream-dark)] rounded-lg border border-[var(--color-border)]">
          <div className="flex gap-2 items-start">
            <Info className="w-3.5 h-3.5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[var(--color-ink)] text-xs">Unicode Codepoints</h3>
              <p className="text-[10px] text-[var(--color-ink-muted)] leading-tight mt-0.5">
                U+XXXX format represents the unique code for each character.
              </p>
            </div>
          </div>
        </div>
        <div className="px-3 py-2 bg-[var(--color-cream-dark)] rounded-lg border border-[var(--color-border)]">
          <div className="flex gap-2 items-start">
            <Info className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[var(--color-ink)] text-xs">Emoji Support</h3>
              <p className="text-[10px] text-[var(--color-ink-muted)] leading-tight mt-0.5">
                Handles multi-byte characters including emoji sequences.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

