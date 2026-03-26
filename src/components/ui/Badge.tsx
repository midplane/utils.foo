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
            'bg-emerald-50 text-emerald-700 border-emerald-200': variant === 'success',
            'bg-amber-50 text-amber-700 border-amber-200': variant === 'warning',
            'bg-red-50 text-red-700 border-red-200': variant === 'error',
          },
          className
        )}
        {...props}
      />
    )
  }
)

Badge.displayName = 'Badge'
