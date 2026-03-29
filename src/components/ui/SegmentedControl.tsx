import { createContext, useContext, ReactNode } from 'react'
import { cn } from '../../lib/utils'

type SegmentedControlVariant = 'pill' | 'accent' | 'bordered' | 'ink'

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
  /** 
   * Visual variant:
   * - 'pill' (default): contained with white bg on active
   * - 'accent': ghost style with accent bg on active
   * - 'bordered': individual bordered buttons with accent bg on active
   * - 'ink': individual bordered buttons with ink bg on active
   */
  variant?: SegmentedControlVariant
}

export function SegmentedControl({ value, onChange, children, className, variant = 'pill' }: SegmentedControlProps) {
  return (
    <SegmentedControlContext.Provider value={{ value, onChange, variant }}>
      <div className={cn(
        'inline-flex rounded-lg',
        variant === 'pill' && 'bg-[var(--color-cream-dark)] border border-[var(--color-border)] p-0.5',
        variant === 'accent' && 'gap-0.5 p-0.5',
        (variant === 'bordered' || variant === 'ink') && 'flex-wrap gap-1',
        className
      )}>
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
  /** Optional title attribute for accessibility */
  title?: string
}

export function SegmentedControlItem({ value, children, className, disabled, title }: SegmentedControlItemProps) {
  const context = useContext(SegmentedControlContext)
  if (!context) throw new Error('SegmentedControlItem must be used within SegmentedControl')

  const { value: selectedValue, onChange, variant } = context
  const isSelected = selectedValue === value

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(value)}
      title={title}
      className={cn(
        'inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer',
        variant === 'pill' && (
          isSelected
            ? 'bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm'
            : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
        ),
        variant === 'accent' && (
          isSelected
            ? 'bg-[var(--color-accent)] text-white'
            : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream-dark)]'
        ),
        variant === 'bordered' && (
          isSelected
            ? 'bg-[var(--color-accent)] border border-[var(--color-accent)] text-white font-semibold'
            : 'border border-[var(--color-border)] bg-[var(--color-cream-dark)] text-[var(--color-ink-muted)] hover:border-[var(--color-border-dark)] hover:text-[var(--color-ink)]'
        ),
        variant === 'ink' && (
          isSelected
            ? 'bg-[var(--color-ink)] border border-[var(--color-ink)] text-[var(--color-cream)]'
            : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-ink-muted)]'
        ),
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  )
}
