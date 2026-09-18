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

export const SectionLabel = forwardRef<HTMLElement, SectionLabelProps>(
  ({ children, htmlFor, className }, ref) => {
    const classes = cn(
      'text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]',
      className
    )
    // A <label> with nothing to label is not a label; render a span instead.
    if (!htmlFor) {
      return (
        <span ref={ref as React.Ref<HTMLSpanElement>} className={classes}>
          {children}
        </span>
      )
    }
    return (
      <label ref={ref as React.Ref<HTMLLabelElement>} htmlFor={htmlFor} className={classes}>
        {children}
      </label>
    )
  }
)

SectionLabel.displayName = 'SectionLabel'
