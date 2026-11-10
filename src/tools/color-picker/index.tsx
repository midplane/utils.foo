import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { CopyButton } from '../../components/ui/CopyButton'
import { InfoCard } from '../../components/ui/InfoCard'
import { ToolHeader } from '../../components/ui/ToolHeader'
import { cn } from '../../lib/utils'
import { Info, Pipette } from 'lucide-react'
import { getContrastColor, hexToRgb, hslToRgb, parseHslString, parseRgbString, rgbToHex, rgbToHsl, type RGB } from './color'

// ─── Presets / swatches ───────────────────────────────────────────────────────

const SWATCHES = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#ffffff', '#d1d5db', '#6b7280', '#111827',
]

// ─── Component ────────────────────────────────────────────────────────────────

// Easter egg: Oklab-famous "rebeccapurple" — named after Rebecca Meyer by the CSS WG
const EASTER_EGG_HEX = '#663399'

export default function ColorPickerTool() {
  const [hex, setHex]             = useState(EASTER_EGG_HEX)
  const [hexInput, setHexInput]   = useState(EASTER_EGG_HEX)
  const [rgbInput, setRgbInput]   = useState('102, 51, 153')
  const [hslInput, setHslInput]   = useState('270, 50%, 40%')
  const [hexError, setHexError]   = useState('')
  const [rgbError, setRgbError]   = useState('')
  const [hslError, setHslError]   = useState('')

  const rgb = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 }
  const hsl = rgbToHsl(rgb)
  const contrastColor = getContrastColor(hex)

  // Do not rewrite the field that the user is typing in. A rewrite moves the
  // cursor to the end and can make some values impossible to type.
  const applyRgb = useCallback((newRgb: RGB, source: 'rgb' | 'hsl') => {
    const newHex = rgbToHex(newRgb)
    const newHsl = rgbToHsl(newRgb)
    setHex(newHex)
    setHexInput(newHex)
    if (source !== 'rgb') setRgbInput(`${newRgb.r}, ${newRgb.g}, ${newRgb.b}`)
    if (source !== 'hsl') setHslInput(`${newHsl.h}, ${newHsl.s}%, ${newHsl.l}%`)
  }, [])

  const handleHexChange = (value: string) => {
    setHexInput(value)
    setHexError('')
    const parsed = hexToRgb(value)
    if (!parsed) { setHexError('Must be a valid 6-digit hex color'); return }
    setHex(rgbToHex(parsed))
    setRgbInput(`${parsed.r}, ${parsed.g}, ${parsed.b}`)
    const h = rgbToHsl(parsed)
    setHslInput(`${h.h}, ${h.s}%, ${h.l}%`)
    setRgbError('')
    setHslError('')
  }

  const handleRgbChange = (value: string) => {
    setRgbInput(value)
    setRgbError('')
    const parsed = parseRgbString(value)
    if (!parsed) { setRgbError('Must be r, g, b (0–255)'); return }
    applyRgb(parsed, 'rgb')
    setHexError('')
    setHslError('')
  }

  const handleHslChange = (value: string) => {
    setHslInput(value)
    setHslError('')
    const parsed = parseHslString(value)
    if (!parsed) { setHslError('Must be h (0-360), s% (0-100), l% (0-100)'); return }
    applyRgb(hslToRgb(parsed), 'hsl')
    setHexError('')
    setRgbError('')
  }

  const handlePickerChange = (value: string) => {
    const parsed = hexToRgb(value)
    if (!parsed) return
    setHex(value)
    setHexInput(value)
    setRgbInput(`${parsed.r}, ${parsed.g}, ${parsed.b}`)
    const h = rgbToHsl(parsed)
    setHslInput(`${h.h}, ${h.s}%, ${h.l}%`)
    setHexError('')
    setRgbError('')
    setHslError('')
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <ToolHeader icon={<Pipette />} title="Color" accentedSuffix="Picker" />

      {/* Preview + native picker */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div
            className="relative w-full h-24 rounded-xl border border-[var(--color-border)] flex items-center justify-center gap-3 transition-colors"
            style={{ backgroundColor: hex }}
          >
            <span className="font-mono text-2xl font-bold tracking-wider" style={{ color: contrastColor }}>
              {hex.toUpperCase()}
            </span>
            <CopyButton text={hex.toUpperCase()} className={cn(
              '!border-white/30',
              contrastColor === '#ffffff' ? '!text-white !bg-white/10 hover:!bg-white/20' : '!text-black/60 !bg-black/10 hover:!bg-black/20'
            )} />
            {/* Native color input as an overlay */}
            <input
              type="color"
              value={hex}
              onChange={e => handlePickerChange(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Pick a color"
              title="Pick a color"
            />
          </div>

          {/* Swatches */}
          <div className="flex flex-wrap gap-1.5">
            {SWATCHES.map(swatch => (
              <button
                key={swatch}
                onClick={() => handlePickerChange(swatch)}
                title={swatch}
                className={cn(
                  'w-6 h-6 rounded-md border-2 transition-all hover:scale-110',
                  hex.toLowerCase() === swatch.toLowerCase()
                    ? 'border-[var(--color-accent)] scale-110'
                    : 'border-[var(--color-border)]'
                )}
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Conversions */}
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold text-[var(--color-ink)]">Format conversions</span>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* HEX */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                id="hex"
                label="HEX"
                value={hexInput}
                onChange={e => handleHexChange(e.target.value)}
                className={cn('font-mono', hexError && 'border-[var(--color-error-border)]')}
                placeholder="#663399"
              />
              {hexError && <p className="text-[10px] text-[var(--color-error-text)] mt-0.5">{hexError}</p>}
            </div>
            <div className="mb-0.5"><CopyButton text={hex.toUpperCase()} /></div>
          </div>

          {/* RGB */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                id="rgb"
                label="RGB"
                value={rgbInput}
                onChange={e => handleRgbChange(e.target.value)}
                className={cn('font-mono', rgbError && 'border-[var(--color-error-border)]')}
                placeholder="102, 51, 153"
              />
              {rgbError && <p className="text-[10px] text-[var(--color-error-text)] mt-0.5">{rgbError}</p>}
            </div>
            <div className="mb-0.5"><CopyButton text={`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`} /></div>
          </div>

          {/* HSL */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                id="hsl"
                label="HSL"
                value={hslInput}
                onChange={e => handleHslChange(e.target.value)}
                className={cn('font-mono', hslError && 'border-[var(--color-error-border)]')}
                placeholder="270, 50%, 40%"
              />
              {hslError && <p className="text-[10px] text-[var(--color-error-text)] mt-0.5">{hslError}</p>}
            </div>
            <div className="mb-0.5"><CopyButton text={`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`} /></div>
          </div>

          {/* CSS variable snippet */}
          <div className="flex items-center justify-between px-3 py-2 bg-[var(--color-cream-dark)] border border-[var(--color-border)] rounded-lg">
            <code className="font-mono text-xs text-[var(--color-ink)]">
              <span className="text-[var(--color-info-text)]">--color</span>
              {': '}
              <span className="text-[var(--color-success-text)]">{hex.toUpperCase()}</span>
              {';'}
            </code>
            <CopyButton text={`--color: ${hex.toUpperCase()};`} />
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="grid grid-cols-2 gap-2">
        <InfoCard
          icon={<Info className="text-[var(--color-accent)]" />}
          title="Click the preview"
          description="Opens your browser's native color picker."
        />
        <InfoCard
          icon={<Info className="text-[var(--color-success-icon)]" />}
          title="rebeccapurple"
          description="Named in CSS spec for Rebecca Meyer (2014)."
        />
      </div>
    </div>
  )
}

