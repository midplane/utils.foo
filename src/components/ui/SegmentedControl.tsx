import { createContext, useContext, ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface SegmentedControlContextType {
  value: string
  onChange: (value: string) => void
}

const SegmentedControlContext = createContext<SegmentedControlContextType | null>(null)

interface SegmentedControlProps {
  value: string
  onChange: (value: string) => void
  children: ReactNode
  className?: string
}

export function SegmentedControl({ value, onChange, children, className }: SegmentedControlProps) {
  return (
    <SegmentedControlContext.Provider value={{ value, onChange }}>
      <div className={cn(
        'inline-flex bg-[var(--color-cream-dark)] rounded-lg p-0.5 border border-[var(--color-border)]',
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
}

export function SegmentedControlItem({ value, children, className, disabled }: SegmentedControlItemProps) {
  const context = useContext(SegmentedControlContext)
  if (!context) throw new Error('SegmentedControlItem must be used within SegmentedControl')

  const { value: selectedValue, onChange } = context
  const isSelected = selectedValue === value

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(value)}
      className={cn(
        'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
        isSelected
          ? 'bg-white text-[var(--color-ink)] shadow-sm'
          : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  )
}
