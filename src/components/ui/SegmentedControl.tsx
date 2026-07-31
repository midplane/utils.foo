import { createContext, useContext, ReactNode } from 'react'
import { cn } from '../../lib/utils'

// ─── Shared styles ───────────────────────────────────────────────────────────
// Tabs imports these so the two controls cannot drift apart visually. They
// previously duplicated the same class strings by hand and were pixel-identical
// by accident rather than on purpose.

/** Container for the contained ("pill") group. */
export const SEGMENTED_GROUP_CLASS =
  'inline-flex rounded-lg bg-[var(--color-cream-dark)] border border-[var(--color-border)] p-0.5'

/** A single item in a contained ("pill") group. */
export function segmentedItemClass(isSelected: boolean) {
  return cn(
    'inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer',
    isSelected
      // Accent means "selected" everywhere in the app. The raised surface chip
      // carries the elevation, the accent text carries the state.
      ? 'bg-[var(--color-surface)] text-[var(--color-accent)] shadow-sm'
      : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
  )
}

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Visual variant:
 * - 'pill' (default): one contained group on a tinted track. Use for 2-4 short
 *   mode switches that sit inline in a toolbar.
 * - 'bordered': individually bordered buttons that wrap. Use when there are
 *   many options, long labels, or the group needs to break across lines.
 *
 * Both render selection in the accent colour. There is deliberately no third
 * variant — 'accent' and 'ink' were removed because they differed from
 * 'bordered' only by a border and a fill colour, which gave callers no basis
 * for choosing between them.
 */
type SegmentedControlVariant = 'pill' | 'bordered'

interface SegmentedControlContextType {
  value: string
  onChange: (value: string) => void
  variant: SegmentedControlVariant
}

const SegmentedControlContext = createContext<SegmentedControlContextType | null>(null)

interface SegmentedControlProps {
  value: string
  onChange: (value: string) => void
  children: ReactNode
  className?: string
  variant?: SegmentedControlVariant
  /** Accessible name for the group, e.g. "View mode". */
  label?: string
}

// ─── Components ──────────────────────────────────────────────────────────────

export function SegmentedControl({ value, onChange, children, className, variant = 'pill', label }: SegmentedControlProps) {
  return (
    <SegmentedControlContext.Provider value={{ value, onChange, variant }}>
      <div
        role="group"
        aria-label={label}
        className={cn(
          variant === 'pill' ? SEGMENTED_GROUP_CLASS : 'inline-flex flex-wrap rounded-lg gap-1',
          className
        )}
      >
        {children}
      </div>
    </SegmentedControlContext.Provider>
  )
}

interface SegmentedControlItemProps {
  value: string
  children: ReactNode
  className?: string
  disabled?: boolean
  /**
   * Accessible name. Required for icon-only items, where the children provide
   * no text for a screen reader to announce. Do not set it when the item has a
   * visible text label — it would override that text.
   */
  label?: string
  /** Supplementary hover description. Not an accessible name on its own. */
  title?: string
}

export function SegmentedControlItem({ value, children, className, disabled, label, title }: SegmentedControlItemProps) {
  const context = useContext(SegmentedControlContext)
  if (!context) throw new Error('SegmentedControlItem must be used within SegmentedControl')

  const { value: selectedValue, onChange, variant } = context
  const isSelected = selectedValue === value

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(value)}
      aria-pressed={isSelected}
      aria-label={label}
      title={title ?? label}
      className={cn(
        variant === 'pill'
          ? segmentedItemClass(isSelected)
          : cn(
              'inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer border',
              isSelected
                ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white font-semibold'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:border-[var(--color-border-dark)] hover:text-[var(--color-ink)]'
            ),
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  )
}
