import { useState, useEffect, useRef, useCallback } from 'react'
import QRCode from 'qrcode'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Textarea } from '../../components/ui/Textarea'
import { ToolHeader } from '../../components/ui/ToolHeader'
import { SectionLabel } from '../../components/ui/SectionLabel'
import { SegmentedControl, SegmentedControlItem } from '../../components/ui/SegmentedControl'
import { Check, Copy, Download, QrCode } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ErrorLevel = 'L' | 'M' | 'Q' | 'H'
type OutputFormat = 'png' | 'svg'

const ERROR_LEVELS: { value: ErrorLevel; label: string; desc: string }[] = [
  { value: 'L', label: 'L', desc: '~7% correction' },
  { value: 'M', label: 'M', desc: '~15% correction' },
  { value: 'Q', label: 'Q', desc: '~25% correction' },
  { value: 'H', label: 'H', desc: '~30% correction' },
]

const PRESETS = [
  { label: 'URL',      value: 'https://utils.foo' },
  { label: 'Email',    value: 'mailto:hello@utils.foo' },
  { label: 'Phone',    value: 'tel:+18005551234' },
  { label: 'WiFi',     value: 'WIFI:T:WPA;S:Pretty Fly for a WiFi;P:correct-horse-battery-staple;;' },
  { label: 'vCard',    value: 'BEGIN:VCARD\nVERSION:3.0\nFN:Grace Hopper\nTEL:+18005551234\nEMAIL:grace@utils.foo\nEND:VCARD' },
  { label: 'UPI',      value: 'upi://pay?pa=bafna@ybl&pn=Nikhil%20Bafna&am=1&cu=INR&tn=thank%20you%20for%20utils' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function QrGeneratorTool() {
  const [text, setText]               = useState('https://example.com')
  const [errorLevel, setErrorLevel]   = useState<ErrorLevel>('M')
  const [size, setSize]               = useState(256)
  const [fgColor, setFgColor]         = useState('#1C1917')
  const [bgColor, setBgColor]         = useState('#FFFBF5')
  const [margin, setMargin]           = useState(2)
  const [dataUrl, setDataUrl]         = useState<string>('')
  const [svgString, setSvgString]     = useState<string>('')
  const [format, setFormat]           = useState<OutputFormat>('png')
  const [error, setError]             = useState<string>('')
  const [copied, setCopied]           = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  // ── Generate QR ──────────────────────────────────────────────────────────────
  const generate = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed) {
      setDataUrl('')
      setSvgString('')
      setError('')
      return
    }

    const opts = {
      errorCorrectionLevel: errorLevel,
      margin,
      color: { dark: fgColor, light: bgColor },
    }

    try {
      // PNG via canvas
      const url = await QRCode.toDataURL(trimmed, { ...opts, width: size, type: 'image/png' })
      setDataUrl(url)

      // SVG string
      const svg = await QRCode.toString(trimmed, { ...opts, type: 'svg' })
      setSvgString(svg)

      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate QR code')
      setDataUrl('')
      setSvgString('')
    }
  }, [text, errorLevel, size, fgColor, bgColor, margin])

  useEffect(() => {
    const id = setTimeout(generate, 150)
    return () => clearTimeout(id)
  }, [generate])

  // ── Download ─────────────────────────────────────────────────────────────────
  const handleDownload = () => {
    if (format === 'png') {
      if (!dataUrl) return
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = 'qrcode.png'
      a.click()
    } else {
      if (!svgString) return
      const blob = new Blob([svgString], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'qrcode.svg'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  // ── Copy SVG ─────────────────────────────────────────────────────────────────
  const handleCopySvg = async () => {
    if (!svgString) return
    await navigator.clipboard.writeText(svgString)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const hasContent = text.trim().length > 0
  const byteLen    = new TextEncoder().encode(text.trim()).length

  return (
    <div className="space-y-4 animate-fade-in">
      <ToolHeader icon={<QrCode />} title="QR" accentedSuffix="Generator" />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
        {/* Left column — input + options */}
        <div className="space-y-3">
          {/* Content input */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[var(--color-ink)]">Content</span>
                <div className="flex items-center gap-1">
                  {byteLen > 0 && (
                    <Badge variant={byteLen > 2000 ? 'error' : 'default'} className="text-[10px]">
                      {byteLen} bytes
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                id="qr-content"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter a URL, text, email, phone number…"
                rows={4}
              />
              {error && <p className="text-[11px] text-red-600">{error}</p>}

              {/* Presets */}
              <div className="flex flex-wrap gap-1 pt-0.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setText(p.value)}
                    className="text-[10px] px-2 py-0.5 rounded-md border border-[var(--color-border)] bg-[var(--color-cream-dark)] text-[var(--color-ink-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors cursor-pointer font-mono"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Options */}
          <Card>
            <CardHeader>
              <span className="text-xs font-semibold text-[var(--color-ink)]">Options</span>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Error correction */}
              <div>
                <SectionLabel className="block mb-1.5">Error correction</SectionLabel>
                <SegmentedControl value={errorLevel} onChange={(v) => setErrorLevel(v as ErrorLevel)} variant="bordered" className="w-full">
                  {ERROR_LEVELS.map((lvl) => (
                    <SegmentedControlItem key={lvl.value} value={lvl.value} title={lvl.desc} className="flex-1 font-mono font-semibold rounded-lg">
                      {lvl.label}
                    </SegmentedControlItem>
                  ))}
                </SegmentedControl>
                <p className="text-[10px] text-[var(--color-ink-muted)] mt-1">
                  {ERROR_LEVELS.find(l => l.value === errorLevel)?.desc} — higher levels allow more of the code to be obscured
                </p>
              </div>

              {/* Size */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <SectionLabel>Size</SectionLabel>
                  <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">{size}px</span>
                </div>
                <input
                  type="range"
                  min={128}
                  max={512}
                  step={32}
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="w-full accent-[var(--color-accent)] cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-[var(--color-ink-muted)] mt-0.5">
                  <span>128</span><span>512</span>
                </div>
              </div>

              {/* Margin */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <SectionLabel>Quiet zone</SectionLabel>
                  <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">{margin} modules</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={6}
                  step={1}
                  value={margin}
                  onChange={(e) => setMargin(Number(e.target.value))}
                  className="w-full accent-[var(--color-accent)] cursor-pointer"
                />
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <SectionLabel className="block mb-1.5">Foreground</SectionLabel>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 border border-[var(--color-border)] rounded-lg bg-[var(--color-cream)]">
                    <div className="relative w-5 h-5 rounded flex-shrink-0 overflow-hidden border border-[var(--color-border)]"
                      style={{ backgroundColor: fgColor }}>
                      <input
                        type="color"
                        value={fgColor}
                        onChange={(e) => setFgColor(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      />
                    </div>
                    <input
                      type="text"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="flex-1 min-w-0 text-xs font-mono text-[var(--color-ink)] bg-transparent focus:outline-none"
                      maxLength={7}
                    />
                  </div>
                </div>
                <div>
                  <SectionLabel className="block mb-1.5">Background</SectionLabel>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 border border-[var(--color-border)] rounded-lg bg-[var(--color-cream)]">
                    <div className="relative w-5 h-5 rounded flex-shrink-0 overflow-hidden border border-[var(--color-border)]"
                      style={{ backgroundColor: bgColor }}>
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      />
                    </div>
                    <input
                      type="text"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="flex-1 min-w-0 text-xs font-mono text-[var(--color-ink)] bg-transparent focus:outline-none"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column — preview + download */}
        <div className="space-y-3">
          <Card>
            <CardHeader>
              <span className="text-xs font-semibold text-[var(--color-ink)]">Preview</span>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              {/* QR preview */}
              <div
                className="rounded-xl border border-[var(--color-border)] overflow-hidden flex items-center justify-center"
                style={{ width: 220, height: 220, backgroundColor: bgColor }}
              >
                {hasContent && dataUrl ? (
                  <img
                    src={dataUrl}
                    alt="QR code"
                    width={220}
                    height={220}
                    className="block"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[var(--color-ink-muted)]">
                    <QrCode className="w-12 h-12 opacity-20" />
                    <span className="text-[10px]">Enter content above</span>
                  </div>
                )}
              </div>

              {/* Format toggle + download */}
              {hasContent && dataUrl && (
                <>
                  <SegmentedControl value={format} onChange={(v) => setFormat(v as OutputFormat)} variant="bordered" className="w-full">
                    {(['png', 'svg'] as OutputFormat[]).map((f) => (
                      <SegmentedControlItem key={f} value={f} className="flex-1 font-mono font-semibold rounded-lg uppercase">
                        {f}
                      </SegmentedControlItem>
                    ))}
                  </SegmentedControl>

                  <div className="flex flex-col gap-1.5 w-full">
                    <Button
                      onClick={handleDownload}
                      className="w-full gap-1.5 justify-center"
                      size="sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download {format.toUpperCase()}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleCopySvg}
                      className="w-full gap-1.5 justify-center text-xs h-7"
                      size="sm"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-[var(--color-success-icon)]" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied!' : 'Copy SVG'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Hidden canvas for rendering */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

