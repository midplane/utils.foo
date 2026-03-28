import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ToolHeader } from '../../components/ui/ToolHeader'
import { SegmentedControl, SegmentedControlItem } from '../../components/ui/SegmentedControl'
import { cn } from '../../lib/utils'
import { Download, SquareAsterisk } from 'lucide-react'

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

function buildSvg(
  lines: string[],
  w: number,
  h: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: string,
  bgColor: string,
  fgColor: string,
  letterSpacing: number,
  lineHeight: number,
): string {
  const lineCount = lines.length
  // For multi-line: offset each line relative to centre so the block is centred
  const blockH = lineCount === 1
    ? 0
    : (lineCount - 1) * fontSize * lineHeight
  const startY = h / 2 - blockH / 2

  const tspans = lines.map((line, i) => {
    const dy = i === 0 ? 0 : fontSize * lineHeight
    const safeText = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
    return `<tspan x="50%" dy="${dy}">${safeText || '&#x200B;'}</tspan>`
  }).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${bgColor}"/>
  <text
    x="50%"
    y="${startY.toFixed(1)}"
    text-anchor="middle"
    dominant-baseline="central"
    font-family="${fontFamily}"
    font-size="${fontSize}"
    font-weight="${fontWeight}"
    fill="${fgColor}"
    letter-spacing="${letterSpacing}"
  >${tspans}</text>
</svg>`
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

  const canvasRef = useRef<HTMLCanvasElement>(null)

  // ── Compute canvas dimensions from ratio ──────────────────────────────────
  const canvasW = ratio.w
  const canvasH = ratio.h

  // ── Split text on newlines ─────────────────────────────────────────────────
  const lines = text.split('\n')

  // ── Compute SVG string from current settings ───────────────────────────────
  const svgString = useMemo(() => buildSvg(
    lines, canvasW, canvasH, fontSize,
    fontFamily, fontWeight, bgColor, fgColor, letterSpacing, lineHeight,
  ), [lines, canvasW, canvasH, fontSize,
      fontFamily, fontWeight, bgColor, fgColor, letterSpacing, lineHeight])

  // ── Draw onto canvas for PNG export ───────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !svgString) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = new Image()
    const blob = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      ctx.clearRect(0, 0, canvasW, canvasH)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
    }
    img.src = url
  }, [svgString, canvasW, canvasH])

  // ── Download handlers ──────────────────────────────────────────────────────
  const downloadSvg = useCallback(() => {
    if (!svgString) return
    const blob = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'logo.svg'
    a.click()
    URL.revokeObjectURL(url)
  }, [svgString])

  const downloadPng = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'logo.png'
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }, [])

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
            {/* Hidden canvas for PNG export */}
            <canvas
              ref={canvasRef}
              width={canvasW}
              height={canvasH}
              className="hidden"
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
                value={text}
                onChange={e => setText(e.target.value)}
                rows={3}
                placeholder="Your logo text…"
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-[var(--color-border)] rounded-lg text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20 resize-none transition-all"
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
                    onClick={() => applyPreset(p.bg, p.fg)}
                    title={p.label}
                    className={cn(
                      'w-6 h-6 rounded border-2 transition-transform hover:scale-110',
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
                      className="w-8 h-8 rounded cursor-pointer border border-[var(--color-border)] p-0.5 bg-white"
                    />
                    <Input
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
                      className="w-8 h-8 rounded cursor-pointer border border-[var(--color-border)] p-0.5 bg-white"
                    />
                    <Input
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
                <label className="block text-[10px] text-[var(--color-ink-muted)] mb-1 uppercase tracking-wider">Font</label>
                <div className="flex flex-wrap gap-1">
                  {FONT_FAMILIES.map(f => (
                    <button
                      key={f.value}
                      onClick={() => setFontFamily(f.value)}
                      className={cn(
                        'px-2 py-1 text-xs rounded border transition-all',
                        fontFamily === f.value
                          ? 'bg-[var(--color-ink)] text-[var(--color-cream)] border-[var(--color-ink)]'
                          : 'bg-white text-[var(--color-ink)] border-[var(--color-border)] hover:border-[var(--color-ink-muted)]'
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
                <label className="block text-[10px] text-[var(--color-ink-muted)] mb-1 uppercase tracking-wider">Weight</label>
                <div className="flex flex-wrap gap-1">
                  {FONT_WEIGHTS.map(w => (
                    <button
                      key={w.value}
                      onClick={() => setFontWeight(w.value)}
                      className={cn(
                        'px-2 py-1 text-xs rounded border transition-all',
                        fontWeight === w.value
                          ? 'bg-[var(--color-ink)] text-[var(--color-cream)] border-[var(--color-ink)]'
                          : 'bg-white text-[var(--color-ink)] border-[var(--color-border)] hover:border-[var(--color-ink-muted)]'
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
                  <label className="text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wider">Size</label>
                  <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">{fontSize}px</span>
                </div>
                 <input
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
                  <label className="text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wider">Letter spacing</label>
                  <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">{letterSpacing}px</span>
                </div>
                <input
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
                  <label className="text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wider">Line height</label>
                  <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">{lineHeight.toFixed(1)}</span>
                </div>
                <input
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
                <label className="block text-[10px] text-[var(--color-ink-muted)] mb-1 uppercase tracking-wider">Aspect ratio</label>
                <SegmentedControl value={ratio.value} onChange={(v) => setRatio(ASPECT_RATIOS.find(r => r.value === v) ?? ASPECT_RATIOS[0]!)} variant="ink">
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
