import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ToolHeader } from '../../components/ui/ToolHeader'
import { SegmentedControl, SegmentedControlItem } from '../../components/ui/SegmentedControl'
import { cn } from '../../lib/utils'
import { Download, SquareAsterisk } from 'lucide-react'
import { buildSvg } from './svg'

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT_FAMILIES = [
  { label: 'Inter',        value: 'Inter, sans-serif' },
  { label: 'Mono',         value: 'ui-monospace, monospace' },
  { label: 'Serif',        value: 'Georgia, serif' },
  { label: 'System',       value: 'system-ui, sans-serif' },
]

const FONT_WEIGHTS = [
  { label: 'Regular', value: '400' },
  { label: 'Medium',  value: '500' },
  { label: 'Bold',    value: '700' },
  { label: 'Black',   value: '900' },
]

const ASPECT_RATIOS = [
  { label: '1:1',  value: '1:1',  w: 512,  h: 512 },
  { label: '4:3',  value: '4:3',  w: 512,  h: 384 },
  { label: '16:9', value: '16:9', w: 512,  h: 288 },
  { label: '3:1',  value: '3:1',  w: 600,  h: 200 },
]

const BG_PRESETS = [
  { label: 'Ink',     bg: '#1C1917', fg: '#FFFBF5' },
  { label: 'Cream',   bg: '#FFFBF5', fg: '#1C1917' },
  { label: 'Blue',    bg: '#1D4ED8', fg: '#FFFFFF' },
  { label: 'Green',   bg: '#15803D', fg: '#FFFFFF' },
  { label: 'Rose',    bg: '#E11D48', fg: '#FFFFFF' },
  { label: 'Violet',  bg: '#7C3AED', fg: '#FFFFFF' },
  { label: 'Amber',   bg: '#D97706', fg: '#FFFFFF' },
  { label: 'Slate',   bg: '#475569', fg: '#FFFFFF' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  // Some browsers start the download after click() returns, so keep the URL valid for a short time.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LogoGenerator() {
  const [text, setText]                   = useState('utils.foo')
  const [bgColor, setBgColor]             = useState('#1C1917')
  const [fgColor, setFgColor]             = useState('#FFFBF5')
  const [fontSize, setFontSize]           = useState(72)
  const [fontFamily, setFontFamily]       = useState(FONT_FAMILIES[0]!.value)
  const [fontWeight, setFontWeight]       = useState('700')
  const [letterSpacing, setLetterSpacing] = useState(-2)
  const [lineHeight, setLineHeight]       = useState(1.2)
  const [ratio, setRatio]                 = useState(ASPECT_RATIOS[0]!)

  // ── Compute canvas dimensions from ratio ──────────────────────────────────
  const canvasW = ratio.w
  const canvasH = ratio.h

  // ── Compute SVG string from current settings ───────────────────────────────
  const svgString = useMemo(() => buildSvg({
    lines: text.split('\n'), width: canvasW, height: canvasH, fontSize,
    fontFamily, fontWeight, bgColor, fgColor, letterSpacing, lineHeight,
  }), [text, canvasW, canvasH, fontSize,
      fontFamily, fontWeight, bgColor, fgColor, letterSpacing, lineHeight])

  // ── Download handlers ──────────────────────────────────────────────────────
  const downloadSvg = useCallback(() => {
    downloadBlob(new Blob([svgString], { type: 'image/svg+xml' }), 'logo.svg')
  }, [svgString])

  // Rasterise the current SVG when the user clicks, so the PNG always matches the preview.
  const downloadPng = useCallback(() => {
    const url = URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml' }))
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = canvasW
      canvas.height = canvasH
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0, canvasW, canvasH)
      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, 'logo.png')
      }, 'image/png')
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
  }, [svgString, canvasW, canvasH])

  // ── Apply a color preset ───────────────────────────────────────────────────
  const applyPreset = useCallback((bg: string, fg: string) => {
    setBgColor(bg)
    setFgColor(fg)
  }, [])

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <ToolHeader icon={<SquareAsterisk />} title="Logo" accentedSuffix="Generator" />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">

        {/* ── Preview ─────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <span className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider">Preview</span>
          </CardHeader>
          <CardContent>
            {/* SVG preview — scales to container */}
            <div
              className="w-full rounded-lg overflow-hidden border border-[var(--color-border)]"
              style={{ aspectRatio: `${canvasW} / ${canvasH}` }}
              dangerouslySetInnerHTML={{ __html: svgString.replace(
                `width="${canvasW}" height="${canvasH}"`,
                `width="100%" height="100%"`
              )}}
            />
          </CardContent>
        </Card>

        {/* ── Controls ────────────────────────────────────────────────────── */}
        <div className="space-y-3">

          {/* Text */}
          <Card>
            <CardHeader>
              <span className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider">Text</span>
            </CardHeader>
            <CardContent>
              <textarea
                aria-label="Logo text"
                value={text}
                onChange={e => setText(e.target.value)}
                rows={3}
                placeholder="Your logo text…"
                className="w-full px-3 py-2 text-sm font-mono bg-[var(--color-input-bg)] border border-[var(--color-input-border)] shadow-[var(--shadow-input-inset)] rounded-lg text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] focus:border-[var(--color-accent)] resize-none transition-all"
              />
              <p className="mt-1 text-[10px] text-[var(--color-ink-muted)]">Use newlines for multiple lines</p>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader>
              <span className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider">Colors</span>
            </CardHeader>
            <CardContent>
              {/* Presets */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {BG_PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p.bg, p.fg)}
                    title={p.label}
                    aria-label={`${p.label} preset`}
                    aria-pressed={bgColor === p.bg}
                    className={cn(
                      'w-6 h-6 rounded border-2 transition-transform hover:scale-110 cursor-pointer',
                      bgColor === p.bg ? 'border-[var(--color-accent)] scale-110' : 'border-transparent'
                    )}
                    style={{ background: p.bg }}
                  />
                ))}
              </div>
              {/* Manual pickers */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-[var(--color-ink-muted)] mb-1 uppercase tracking-wider">Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={e => setBgColor(e.target.value)}
                      aria-label="Pick background color"
                      className="w-8 h-8 rounded cursor-pointer border border-[var(--color-border)] p-0.5 bg-[var(--color-surface)]"
                    />
                    <Input
                      aria-label="Background color hex"
                      value={bgColor}
                      onChange={e => setBgColor(e.target.value)}
                      className="flex-1 font-mono text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--color-ink-muted)] mb-1 uppercase tracking-wider">Text</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={fgColor}
                      onChange={e => setFgColor(e.target.value)}
                      aria-label="Pick text color"
                      className="w-8 h-8 rounded cursor-pointer border border-[var(--color-border)] p-0.5 bg-[var(--color-surface)]"
                    />
                    <Input
                      aria-label="Text color hex"
                      value={fgColor}
                      onChange={e => setFgColor(e.target.value)}
                      className="flex-1 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Typography */}
          <Card>
            <CardHeader>
              <span className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider">Typography</span>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Font family */}
              <div>
                <span id="logo-font-label" className="block text-[10px] text-[var(--color-ink-muted)] mb-1 uppercase tracking-wider">Font</span>
                <div role="group" aria-labelledby="logo-font-label" className="flex flex-wrap gap-1">
                  {FONT_FAMILIES.map(f => (
                    <button
                      key={f.value}
                      type="button"
                      aria-pressed={fontFamily === f.value}
                      onClick={() => setFontFamily(f.value)}
                      className={cn(
                        'px-2 py-1 text-xs rounded border transition-all cursor-pointer',
                        fontFamily === f.value
                          ? 'bg-[var(--color-accent-text)] text-[var(--color-cream)] border-[var(--color-accent-text)]'
                          : 'bg-[var(--color-surface)] text-[var(--color-ink)] border-[var(--color-border)] hover:border-[var(--color-border-dark)]'
                      )}
                      style={{ fontFamily: f.value }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font weight */}
              <div>
                <span id="logo-weight-label" className="block text-[10px] text-[var(--color-ink-muted)] mb-1 uppercase tracking-wider">Weight</span>
                <div role="group" aria-labelledby="logo-weight-label" className="flex flex-wrap gap-1">
                  {FONT_WEIGHTS.map(w => (
                    <button
                      key={w.value}
                      type="button"
                      aria-pressed={fontWeight === w.value}
                      onClick={() => setFontWeight(w.value)}
                      className={cn(
                        'px-2 py-1 text-xs rounded border transition-all cursor-pointer',
                        fontWeight === w.value
                          ? 'bg-[var(--color-accent-text)] text-[var(--color-cream)] border-[var(--color-accent-text)]'
                          : 'bg-[var(--color-surface)] text-[var(--color-ink)] border-[var(--color-border)] hover:border-[var(--color-border-dark)]'
                      )}
                      style={{ fontWeight: w.value }}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font size */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="logo-size" className="text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wider">Size</label>
                  <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">{fontSize}px</span>
                </div>
                <input
                  id="logo-size"
                  type="range"
                  min={12}
                  max={600}
                  value={fontSize}
                  onChange={e => setFontSize(Number(e.target.value))}
                  className="w-full accent-[var(--color-accent)]"
                />
              </div>

              {/* Letter spacing */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="logo-letter-spacing" className="text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wider">Letter spacing</label>
                  <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">{letterSpacing}px</span>
                </div>
                <input
                  id="logo-letter-spacing"
                  type="range"
                  min={-10}
                  max={30}
                  value={letterSpacing}
                  onChange={e => setLetterSpacing(Number(e.target.value))}
                  className="w-full accent-[var(--color-accent)]"
                />
              </div>

              {/* Line height (only relevant for multi-line) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="logo-line-height" className="text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wider">Line height</label>
                  <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">{lineHeight.toFixed(1)}</span>
                </div>
                <input
                  id="logo-line-height"
                  type="range"
                  min={0.8}
                  max={2.5}
                  step={0.1}
                  value={lineHeight}
                  onChange={e => setLineHeight(Number(e.target.value))}
                  className="w-full accent-[var(--color-accent)]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Canvas */}
          <Card>
            <CardHeader>
              <span className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider">Canvas</span>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Aspect ratio */}
              <div>
                <span className="block text-[10px] text-[var(--color-ink-muted)] mb-1 uppercase tracking-wider">Aspect ratio</span>
                <SegmentedControl label="Aspect ratio" value={ratio.value} onChange={(v) => setRatio(ASPECT_RATIOS.find(r => r.value === v) ?? ASPECT_RATIOS[0]!)} variant="bordered">
                  {ASPECT_RATIOS.map(r => (
                    <SegmentedControlItem key={r.value} value={r.value} className="px-2 py-1 font-mono">
                      {r.label}
                    </SegmentedControlItem>
                  ))}
                </SegmentedControl>
                <p className="mt-1 text-[10px] text-[var(--color-ink-muted)]">
                  {canvasW} × {canvasH}px
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Export */}
          <div className="flex gap-2">
            <Button onClick={downloadSvg} variant="secondary" className="flex-1 gap-1.5">
              <Download className="w-3.5 h-3.5" />
              SVG
            </Button>
            <Button onClick={downloadPng} className="flex-1 gap-1.5">
              <Download className="w-3.5 h-3.5" />
              PNG
            </Button>
          </div>

        </div>
      </div>
    </div>
  )
}
