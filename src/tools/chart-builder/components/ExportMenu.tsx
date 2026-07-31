import { useState, useRef, useEffect } from 'react'
import type { EChartsOption } from 'echarts'
import { Download, Check, Copy, Link2, Braces, ChevronDown, Image } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { SectionLabel } from '../../../components/ui/SectionLabel'
import { cn } from '../../../lib/utils'
import {
  SIZE_PRESETS,
  exportPNG,
  exportSVG,
  copyPNGToClipboard,
  downloadJSON,
  type ExportSize,
} from '../export'

interface ExportMenuProps {
  option: EChartsOption
  background: string
  /**
   * On-screen chart size, used when the preset is "current". A getter because
   * it comes from a DOM rect, which is not available during render.
   */
  measured: () => { width: number; height: number }
  onShare: () => { ok: boolean; dataOmitted: boolean }
}

type Flash = { ok: boolean; text: string } | null

const selectClass =
  'w-full text-[11px] font-mono bg-[var(--color-input-bg)] border border-[var(--color-input-border)] shadow-[var(--shadow-input-inset)] rounded px-2 py-1 text-[var(--color-ink)] focus:border-[var(--color-accent)] cursor-pointer'

/**
 * Every export path behind one control.
 *
 * These were seven controls sitting in the card header — two selects and five
 * buttons — which crowded out the chart-type picker and wrapped badly. They are
 * all infrequent, terminal actions, so a menu is the right weight for them.
 */
export function ExportMenu({ option, background, measured, onShare }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const [preset, setPreset] = useState('current')
  const [scale, setScale] = useState(2)
  const [flash, setFlash] = useState<Flash>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // Unlike the expanded card, this menu genuinely has an outside.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const size: ExportSize = {
    width: SIZE_PRESETS[preset]?.width ?? 0,
    height: SIZE_PRESETS[preset]?.height ?? 0,
    scale,
  }

  const show = (ok: boolean, text: string) => {
    setFlash({ ok, text })
    setTimeout(() => setFlash(null), 2200)
  }

  const handleCopy = async () => {
    try {
      const ok = await copyPNGToClipboard(option, size, measured(), background)
      show(ok, ok ? 'Copied to clipboard' : 'Clipboard not supported here')
    } catch {
      show(false, 'Copy failed')
    }
  }

  const handleShare = () => {
    const { ok, dataOmitted } = onShare()
    if (!ok) return show(false, 'Could not copy the link')
    show(true, dataOmitted ? 'Link copied — settings only, data too large' : 'Link copied')
  }

  const item =
    'w-full flex items-center gap-2 px-2 py-1.5 text-[11px] font-mono rounded text-[var(--color-ink)] hover:bg-[var(--color-cream-dark)] cursor-pointer text-left'

  return (
    <div className="relative" ref={rootRef}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="gap-1 text-xs h-7 px-2"
      >
        <Download className="w-3 h-3" aria-hidden="true" />
        Export
        <ChevronDown className="w-3 h-3" aria-hidden="true" />
      </Button>

      {flash && (
        <span
          className={cn(
            'absolute right-0 top-full mt-1 whitespace-nowrap text-[10px] font-mono z-40',
            flash.ok ? 'text-[var(--color-success-text)]' : 'text-[var(--color-error-text)]'
          )}
        >
          {flash.ok && <Check className="w-3 h-3 inline mr-0.5" aria-hidden="true" />}
          {flash.text}
        </span>
      )}

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 w-60 z-40 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg p-2 space-y-2"
        >
          <div className="space-y-1">
            <SectionLabel>Size</SectionLabel>
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
          </div>

          <div className="space-y-1">
            <SectionLabel>Pixel density</SectionLabel>
            <select
              aria-label="Export scale"
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className={selectClass}
            >
              <option value={1}>1× — screen</option>
              <option value={2}>2× — retina</option>
              <option value={3}>3× — print</option>
            </select>
          </div>

          <div className="h-px bg-[var(--color-border)]" />

          <button
            type="button" role="menuitem" className={item}
            onClick={() => { exportPNG(option, size, measured(), background); setOpen(false) }}
          >
            <Image className="w-3 h-3" aria-hidden="true" />
            Download PNG
          </button>
          <button
            type="button" role="menuitem" className={item}
            onClick={() => { exportSVG(option, size, measured()); setOpen(false) }}
          >
            <Image className="w-3 h-3" aria-hidden="true" />
            Download SVG
          </button>
          <button
            type="button" role="menuitem" className={item}
            onClick={() => { void handleCopy(); setOpen(false) }}
          >
            <Copy className="w-3 h-3" aria-hidden="true" />
            Copy image
          </button>

          <div className="h-px bg-[var(--color-border)]" />

          <button
            type="button" role="menuitem" className={item}
            onClick={() => { handleShare(); setOpen(false) }}
          >
            <Link2 className="w-3 h-3" aria-hidden="true" />
            Copy shareable link
          </button>
          <button
            type="button" role="menuitem" className={item}
            onClick={() => { downloadJSON(option); setOpen(false) }}
          >
            <Braces className="w-3 h-3" aria-hidden="true" />
            Download ECharts option
          </button>
        </div>
      )}
    </div>
  )
}
