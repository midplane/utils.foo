import { forwardRef, type ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { CopyButton } from './CopyButton'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ResultBoxProps {
  /** Optional label displayed above the content */
  label?: string
  /** Content to display inside the result box */
  children: ReactNode
  /** Additional classes for the container */
  className?: string
  /** Whether to show the empty/placeholder state */
  isEmpty?: boolean
  /** Placeholder text when isEmpty is true */
  placeholder?: string
  /** Text to copy when copy button is clicked (shows copy button in header when provided) */
  copyText?: string
}

// ─── Component ───────────────────────────────────────────────────────────────

export const ResultBox = forwardRef<HTMLDivElement, ResultBoxProps>(
  ({ label, children, className, isEmpty, placeholder = 'Output will appear here...', copyText }, ref) => {
    if (isEmpty) {
      return (
        <div ref={ref} className={cn('space-y-2', className)}>
          {label && (
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
              {label}
            </label>
          )}
          <div className="p-4 bg-[var(--color-cream-dark)] border border-[var(--color-border)] rounded-lg text-center">
            <span className="text-xs text-[var(--color-ink-muted)]">
              {placeholder}
            </span>
          </div>
        </div>
      )
    }

    const showHeader = label || copyText

    return (
      <div ref={ref} className={cn('space-y-2', className)}>
        {showHeader && (
          <div className="flex items-center justify-between">
            {label ? (
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                {label}
              </label>
            ) : (
              <span />
            )}
            {copyText && <CopyButton text={copyText} />}
          </div>
        )}
        <div className="p-2.5 bg-[var(--color-success-bg-subtle)] border border-[var(--color-success-border)] rounded-lg">
          {children}
        </div>
      </div>
    )
  }
)

ResultBox.displayName = 'ResultBox'
