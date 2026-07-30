import { useState } from 'react'
import { Settings2, X } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { SectionLabel } from '../../../components/ui/SectionLabel'
import { PALETTES, type SeriesMark, type SeriesStyle, type ChartType, type PaletteName } from '../chartOption'

interface SeriesPanelProps {
  numericCols: string[]
  active: string[]
  colors: Map<string, string>
  styles: Record<string, SeriesStyle>
  chartType: ChartType
  palette: PaletteName
  onToggle: (col: string) => void
  onStyleChange: (col: string, style: SeriesStyle) => void
}

const MARKS: SeriesMark[] = ['bar', 'line', 'area']

/**
 * Series chips, each carrying its own popover for per-series settings.
 *
 * The settings live on the chip rather than in a separate list so the colour
 * swatch, the axis binding and the mark are edited where the series is
 * selected, instead of in a second control the user has to keep in sync.
 */
export function SeriesPanel({
  numericCols, active, colors, styles, chartType, palette,
  onToggle, onStyleChange,
}: SeriesPanelProps) {
  const [open, setOpen] = useState<string | null>(null)

  if (numericCols.length === 0) {
    return (
      <p className="text-[11px] text-[var(--color-ink-muted)] font-mono">
        No numeric columns found
      </p>
    )
  }

  const supportsMark = chartType === 'combo'
  const supportsAxis = chartType !== 'pie' && chartType !== 'donut'

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Series">
        {numericCols.map((col) => {
          const isActive = active.includes(col)
          const color = colors.get(col)!
          const style = styles[col] ?? {}
          return (
            <div key={col} className="relative">
              <div
                className={cn(
                  'inline-flex items-center rounded-md border transition-all',
                  isActive
                    ? 'border-transparent'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                )}
                style={isActive ? { backgroundColor: color, borderColor: color } : {}}
              >
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onToggle(col)}
                  className={cn(
                    'inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 text-[11px] font-mono cursor-pointer',
                    isActive ? 'text-white font-semibold' : 'text-[var(--color-ink-muted)]'
                  )}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.7)' : color }}
                  />
                  {col}
                  {isActive && style.axis === 'right' && (
                    <span className="text-[9px] opacity-80">R</span>
                  )}
                  {isActive && supportsMark && style.mark && (
                    <span className="text-[9px] opacity-80">{style.mark[0]!.toUpperCase()}</span>
                  )}
                </button>
                {isActive && (
                  <button
                    type="button"
                    aria-label={`Settings for ${col}`}
                    onClick={() => setOpen(open === col ? null : col)}
                    className="px-1.5 py-1 text-white/80 hover:text-white cursor-pointer"
                  >
                    <Settings2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              {open === col && (
                <div className="absolute z-30 mt-1 left-0 w-56 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <SectionLabel>{col}</SectionLabel>
                    <button
                      type="button"
                      onClick={() => setOpen(null)}
                      aria-label="Close"
                      className="p-0.5 rounded hover:bg-[var(--color-cream-dark)] cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <SectionLabel>Colour</SectionLabel>
                    <div className="flex flex-wrap gap-1">
                      {PALETTES[palette].map((c) => (
                        <button
                          key={c}
                          type="button"
                          aria-label={`Use ${c}`}
                          onClick={() => onStyleChange(col, { ...style, color: c })}
                          className={cn(
                            'w-5 h-5 rounded border cursor-pointer',
                            style.color === c
                              ? 'border-[var(--color-ink)] ring-1 ring-[var(--color-ink)]'
                              : 'border-[var(--color-border)]'
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <label className="w-5 h-5 rounded border border-[var(--color-border)] cursor-pointer overflow-hidden relative">
                        <input
                          type="color"
                          value={style.color ?? color}
                          onChange={(e) => onStyleChange(col, { ...style, color: e.target.value })}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          aria-label="Custom colour"
                        />
                        <span className="block w-full h-full bg-gradient-to-br from-red-400 via-green-400 to-blue-500" />
                      </label>
                    </div>
                    {style.color && (
                      <button
                        type="button"
                        onClick={() =>
                          onStyleChange(col, { mark: style.mark, axis: style.axis })
                        }
                        className="text-[10px] underline text-[var(--color-ink-muted)] cursor-pointer"
                      >
                        Reset to palette
                      </button>
                    )}
                  </div>

                  {supportsAxis && (
                    <div className="space-y-1">
                      <SectionLabel>Y axis</SectionLabel>
                      <div className="flex gap-1">
                        {(['left', 'right'] as const).map((side) => (
                          <button
                            key={side}
                            type="button"
                            onClick={() => onStyleChange(col, { ...style, axis: side })}
                            className={cn(
                              'px-2 py-0.5 text-[10px] font-mono rounded border cursor-pointer capitalize',
                              (style.axis ?? 'left') === side
                                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                                : 'border-[var(--color-border)] text-[var(--color-ink-muted)]'
                            )}
                          >
                            {side}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {supportsMark && (
                    <div className="space-y-1">
                      <SectionLabel>Draw as</SectionLabel>
                      <div className="flex gap-1">
                        {MARKS.map((mark) => (
                          <button
                            key={mark}
                            type="button"
                            onClick={() => onStyleChange(col, { ...style, mark })}
                            className={cn(
                              'px-2 py-0.5 text-[10px] font-mono rounded border cursor-pointer capitalize',
                              (style.mark ?? 'bar') === mark
                                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                                : 'border-[var(--color-border)] text-[var(--color-ink-muted)]'
                            )}
                          >
                            {mark}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
