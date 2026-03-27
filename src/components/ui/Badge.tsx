import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'error'
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded border',
          {
            'bg-[var(--color-cream-dark)] text-[var(--color-ink-muted)] border-[var(--color-border)]': variant === 'default',
            'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-[var(--color-accent)]/20': variant === 'accent',
            'bg-[var(--color-success-bg)] text-[var(--color-success-text)] border-[var(--color-success-border)]': variant === 'success',
            'bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] border-[var(--color-warning-border)]': variant === 'warning',
            'bg-[var(--color-error-bg)] text-[var(--color-error-text)] border-[var(--color-error-border)]': variant === 'error',
          },
          className
        )}
        {...props}
      />
    )
  }
)

Badge.displayName = 'Badge'
