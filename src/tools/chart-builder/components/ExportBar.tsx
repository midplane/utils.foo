import { useState } from 'react'
import type { EChartsOption } from 'echarts'
import { Download, Check, Copy, Link2, Braces } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import {
  SIZE_PRESETS,
  exportPNG,
  exportSVG,
  copyPNGToClipboard,
  downloadJSON,
  type ExportSize,
} from '../export'

interface ExportBarProps {
  option: EChartsOption
  background: string
  /**
   * On-screen chart size, used when the preset is "current".
   *
   * A getter rather than a value: it is read from a DOM rect, which is not
   * available during render and can change as the card is resized or expanded.
   */
  measured: () => { width: number; height: number }
  onShare: () => { ok: boolean; dataOmitted: boolean }
}

const selectClass =
  'text-[10px] font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 h-7 text-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer'

type Flash = { kind: 'copied' | 'linked' | 'link-partial' | 'error'; text: string } | null

export function ExportBar({ option, background, measured, onShare }: ExportBarProps) {
  const [preset, setPreset] = useState('current')
  const [scale, setScale] = useState(2)
  const [flash, setFlash] = useState<Flash>(null)

  const size: ExportSize = {
    width: SIZE_PRESETS[preset]?.width ?? 0,
    height: SIZE_PRESETS[preset]?.height ?? 0,
    scale,
  }

  const show = (f: NonNullable<Flash>) => {
    setFlash(f)
    setTimeout(() => setFlash(null), 2000)
  }

  const handleCopy = async () => {
    try {
      const ok = await copyPNGToClipboard(option, size, measured(), background)
      show(ok
        ? { kind: 'copied', text: 'Copied' }
        : { kind: 'error', text: 'Clipboard unsupported' })
    } catch {
      show({ kind: 'error', text: 'Copy failed' })
    }
  }

  const handleShare = () => {
    const { ok, dataOmitted } = onShare()
    if (!ok) return show({ kind: 'error', text: 'Copy failed' })
    show(dataOmitted
      ? { kind: 'link-partial', text: 'Link copied (settings only — data too large)' }
      : { kind: 'linked', text: 'Link copied' })
  }

  return (
    <div className="flex items-center gap-1 flex-wrap justify-end">
      {flash && (
        <span
          className={
            flash.kind === 'error'
              ? 'text-[10px] font-mono text-[var(--color-error-text)]'
              : 'text-[10px] font-mono text-[var(--color-success-text)]'
          }
        >
          {flash.kind !== 'error' && <Check className="w-3 h-3 inline mr-0.5" />}
          {flash.text}
        </span>
      )}

      <select
        aria-label="Export size"
        value={preset}
        onChange={(e) => setPreset(e.target.value)}
        className={selectClass}
      >
        {Object.entries(SIZE_PRESETS).map(([key, p]) => (
          <option key={key} value={key}>{p.label}</option>
        ))}
      </select>

      <select
        aria-label="Export scale"
        value={scale}
        onChange={(e) => setScale(Number(e.target.value))}
        className={selectClass}
        title="Pixel density for raster export"
      >
        <option value={1}>1×</option>
        <option value={2}>2×</option>
        <option value={3}>3×</option>
      </select>

      <Button
        variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2"
        onClick={() => exportPNG(option, size, measured(), background)}
      >
        <Download className="w-3 h-3" />
        PNG
      </Button>
      <Button
        variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2"
        onClick={() => exportSVG(option, size, measured())}
      >
        <Download className="w-3 h-3" />
        SVG
      </Button>
      <Button
        variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2"
        onClick={handleCopy} title="Copy the chart as an image"
      >
        <Copy className="w-3 h-3" />
        Copy
      </Button>
      <Button
        variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2"
        onClick={() => downloadJSON(option)}
        title="Download the ECharts option for embedding"
      >
        <Braces className="w-3 h-3" />
        Option
      </Button>
      <Button
        variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2"
        onClick={handleShare} title="Copy a link that reproduces this chart"
      >
        <Link2 className="w-3 h-3" />
        Share
      </Button>
    </div>
  )
}
