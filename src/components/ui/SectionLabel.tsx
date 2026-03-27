import { forwardRef, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SectionLabelProps {
  /** Label text or content */
  children: ReactNode
  /** HTML for attribute to associate with an input */
  htmlFor?: string
  /** Additional classes */
  className?: string
}

// ─── Component ───────────────────────────────────────────────────────────────

export const SectionLabel = forwardRef<HTMLLabelElement, SectionLabelProps>(
  ({ children, htmlFor, className }, ref) => {
    return (
      <label
        ref={ref}
        htmlFor={htmlFor}
        className={cn(
          'text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]',
          className
        )}
      >
        {children}
      </label>
    )
  }
)

SectionLabel.displayName = 'SectionLabel'
