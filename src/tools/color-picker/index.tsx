import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { CopyButton } from '../../components/ui/CopyButton'
import { cn } from '../../lib/utils'

// ─── Color conversion helpers ─────────────────────────────────────────────────

interface RGB { r: number; g: number; b: number }
interface HSL { h: number; s: number; l: number }

function hexToRgb(hex: string): RGB | null {
  const clean = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

function rgbToHex({ r, g, b }: RGB): string {
  return '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('')
}

function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  let h = 0, s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break
      case gn: h = ((bn - rn) / d + 2) / 6; break
      case bn: h = ((rn - gn) / d + 4) / 6; break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

function hslToRgb({ h, s, l }: HSL): RGB {
  const sn = s / 100, ln = l / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = ln - c / 2
  let r: number, g: number, b: number

  if (h < 60)       { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else              { r = c; g = 0; b = x }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

function parseRgbString(value: string): RGB | null {
  const m = value.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (!m) return null
  const r = parseInt(m[1]!), g = parseInt(m[2]!), b = parseInt(m[3]!)
  if ([r, g, b].some(n => n < 0 || n > 255)) return null
  return { r, g, b }
}

function parseHslString(value: string): HSL | null {
  const m = value.match(/(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?/)
  if (!m) return null
  const h = parseInt(m[1]!), s = parseInt(m[2]!), l = parseInt(m[3]!)
  if (h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) return null
  return { h, s, l }
}

function getContrastColor(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#000000'
  // WCAG relative luminance
  const lum = 0.2126 * rgb.r / 255 + 0.7152 * rgb.g / 255 + 0.0722 * rgb.b / 255
  return lum > 0.5 ? '#1a1a1a' : '#ffffff'
}

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

  const applyRgb = useCallback((newRgb: RGB) => {
    const newHex = rgbToHex(newRgb)
    const newHsl = rgbToHsl(newRgb)
    setHex(newHex)
    setHexInput(newHex)
    setRgbInput(`${newRgb.r}, ${newRgb.g}, ${newRgb.b}`)
    setHslInput(`${newHsl.h}, ${newHsl.s}%, ${newHsl.l}%`)
  }, [])

  const handleHexChange = (value: string) => {
    setHexInput(value)
    setHexError('')
    const normalized = value.startsWith('#') ? value : '#' + value
    const parsed = hexToRgb(normalized)
    if (!parsed) { setHexError('Must be a valid 6-digit hex color'); return }
    setHex(normalized)
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
    applyRgb(parsed)
    setHexError('')
    setHslError('')
  }

  const handleHslChange = (value: string) => {
    setHslInput(value)
    setHslError('')
    const parsed = parseHslString(value)
    if (!parsed) { setHslError('Must be h (0-360), s% (0-100), l% (0-100)'); return }
    applyRgb(hslToRgb(parsed))
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
      {/* Header */}
      <div className="space-y-2">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] transition-colors">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-white">
            <PaletteIcon className="w-3.5 h-3.5" />
          </div>
          <h1 className="font-mono text-lg font-semibold text-[var(--color-ink)]">
            Color <span className="text-[var(--color-accent)]">Picker</span>
          </h1>
        </div>
      </div>

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
                className={cn('font-mono', hexError && 'border-red-400')}
                placeholder="#663399"
              />
              {hexError && <p className="text-[10px] text-red-600 mt-0.5">{hexError}</p>}
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
                className={cn('font-mono', rgbError && 'border-red-400')}
                placeholder="102, 51, 153"
              />
              {rgbError && <p className="text-[10px] text-red-600 mt-0.5">{rgbError}</p>}
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
                className={cn('font-mono', hslError && 'border-red-400')}
                placeholder="270, 50%, 40%"
              />
              {hslError && <p className="text-[10px] text-red-600 mt-0.5">{hslError}</p>}
            </div>
            <div className="mb-0.5"><CopyButton text={`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`} /></div>
          </div>

          {/* CSS variable snippet */}
          <div className="flex items-center justify-between px-3 py-2 bg-[var(--color-ink)] rounded-lg">
            <code className="font-mono text-xs text-[var(--color-cream)]">
              <span className="text-blue-400">--color</span>
              {': '}
              <span className="text-emerald-400">{hex.toUpperCase()}</span>
              {';'}
            </code>
            <CopyButton text={`--color: ${hex.toUpperCase()};`} className="!bg-white/10 !border-white/20 !text-[var(--color-cream)] hover:!bg-white/20" />
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="grid grid-cols-2 gap-2">
        <div className="px-3 py-2 bg-[var(--color-cream-dark)] rounded-lg border border-[var(--color-border)]">
          <div className="flex gap-2 items-start">
            <InfoIcon className="w-3.5 h-3.5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[var(--color-ink)] text-xs">Click the preview</h3>
              <p className="text-[10px] text-[var(--color-ink-muted)] leading-tight mt-0.5">
                Opens your browser's native color picker.
              </p>
            </div>
          </div>
        </div>
        <div className="px-3 py-2 bg-[var(--color-cream-dark)] rounded-lg border border-[var(--color-border)]">
          <div className="flex gap-2 items-start">
            <InfoIcon className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[var(--color-ink)] text-xs">rebeccapurple</h3>
              <p className="text-[10px] text-[var(--color-ink-muted)] leading-tight mt-0.5">
                Named in CSS spec for Rebecca Meyer (2014).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PaletteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  )
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
