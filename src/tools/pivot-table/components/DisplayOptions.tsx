import { useEffect, useId, useRef, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import {
  Button,
  SectionLabel,
  SegmentedControl,
  SegmentedControlItem,
  Toggle,
} from '../../../components/ui'
import { cn } from '../../../lib/utils'
import {
  PivotConfig,
  HEATMAP_LABELS,
  LAYOUT_LABELS,
  SORT_ORDER_LABELS,
  SUBTOTAL_LABELS,
} from '../types'

interface DisplayOptionsProps {
  config: PivotConfig
  onConfigChange: (config: PivotConfig) => void
}

/**
 * Presentation settings for the grid.
 *
 * These live on the output card rather than in the query builder: they describe
 * how the result is drawn, not what is computed, and they are set once and then
 * left alone. Inline they consumed a fifth of the viewport and pushed the table
 * itself below the fold.
 */
export function DisplayOptions({ config, onConfigChange }: DisplayOptionsProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const set = <K extends keyof PivotConfig>(key: K, value: PivotConfig[K]) =>
    onConfigChange({ ...config, [key]: value })

  // Layout and subtotals only mean anything once an axis has more than one field.
  const hasRowHierarchy = config.rows.length > 1
  const hasColHierarchy = config.cols.length > 1

  // Surfaced on the trigger so non-default settings are not hidden away.
  const activeCount =
    (config.heatmap !== 'none' ? 1 : 0) +
    (config.rowSubtotals !== 'none' ? 1 : 0) +
    (config.colSubtotals !== 'none' ? 1 : 0) +
    (config.rowSortBy ? 1 : 0)

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className="gap-1"
      >
        <SlidersHorizontal className="w-3 h-3" aria-hidden="true" />
        Display
        {activeCount > 0 && (
          <span className="px-1 rounded-full bg-[var(--color-accent)] text-white text-[10px] font-semibold">
            {activeCount}
          </span>
        )}
      </Button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Display options"
          className={cn(
            'absolute right-0 top-full z-40 mt-1 w-[19rem] p-3 space-y-3',
            'rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg'
          )}
        >
          <div className="flex items-center gap-2">
            <SectionLabel>Display</SectionLabel>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close display options"
              className="p-0.5 rounded text-[var(--color-ink-muted)] hover:bg-[var(--color-cream-dark)] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <Row label="Layout" hint={hasRowHierarchy ? undefined : 'Needs two or more row fields'}>
            <SegmentedControl
              value={config.layout}
              onChange={(v) => set('layout', v as PivotConfig['layout'])}
            >
              {Object.entries(LAYOUT_LABELS).map(([key, label]) => (
                <SegmentedControlItem key={key} value={key} disabled={!hasRowHierarchy}>
                  {label}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </Row>

          <Row
            label="Row subtotals"
            hint={hasRowHierarchy ? undefined : 'Needs two or more row fields'}
          >
            <SegmentedControl
              value={config.rowSubtotals}
              onChange={(v) => set('rowSubtotals', v as PivotConfig['rowSubtotals'])}
            >
              {Object.entries(SUBTOTAL_LABELS).map(([key, label]) => (
                <SegmentedControlItem key={key} value={key} disabled={!hasRowHierarchy}>
                  {label}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </Row>

          <Row
            label="Column subtotals"
            hint={hasColHierarchy ? undefined : 'Needs two or more column fields'}
          >
            <SegmentedControl
              value={config.colSubtotals}
              onChange={(v) => set('colSubtotals', v as PivotConfig['colSubtotals'])}
            >
              {Object.entries(SUBTOTAL_LABELS).map(([key, label]) => (
                <SegmentedControlItem key={key} value={key} disabled={!hasColHierarchy}>
                  {label}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </Row>

          <Row label="Heatmap">
            <SegmentedControl
              value={config.heatmap}
              onChange={(v) => set('heatmap', v as PivotConfig['heatmap'])}
            >
              {Object.entries(HEATMAP_LABELS).map(([key, label]) => (
                <SegmentedControlItem key={key} value={key}>
                  {label}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </Row>

          <div className="pt-2 border-t border-[var(--color-border)] space-y-2">
            <Row label="Sort rows">
              <div className="flex items-center gap-2">
                <SortSelect
                  value={config.rowOrder}
                  ariaLabel="Sort rows"
                  onChange={(v) =>
                    onConfigChange({ ...config, rowOrder: v, rowSortBy: undefined })
                  }
                />
                {config.rowSortBy && (
                  <button
                    type="button"
                    onClick={() => set('rowSortBy', undefined)}
                    className="text-[11px] text-[var(--color-accent)] hover:underline cursor-pointer"
                  >
                    Clear column sort
                  </button>
                )}
              </div>
            </Row>

            <Row label="Sort columns">
              <SortSelect
                value={config.colOrder}
                ariaLabel="Sort columns"
                onChange={(v) => set('colOrder', v)}
              />
            </Row>
          </div>

          <div className="pt-2 border-t border-[var(--color-border)] space-y-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Toggle
                checked={config.showRowTotals}
                onChange={(e) => set('showRowTotals', e.target.checked)}
              />
              Grand total column
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Toggle
                checked={config.showColTotals}
                onChange={(e) => set('showColTotals', e.target.checked)}
              />
              Grand total row
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <SectionLabel>{label}</SectionLabel>
        {hint && (
          <span className="text-[10px] text-[var(--color-ink-muted)] italic">{hint}</span>
        )}
      </div>
      {children}
    </div>
  )
}

function SortSelect({
  value,
  ariaLabel,
  onChange,
}: {
  value: PivotConfig['rowOrder']
  ariaLabel: string
  onChange: (value: PivotConfig['rowOrder']) => void
}) {
  return (
    <select
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value as PivotConfig['rowOrder'])}
      className="px-1.5 py-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-xs cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]"
    >
      {Object.entries(SORT_ORDER_LABELS).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  )
}
