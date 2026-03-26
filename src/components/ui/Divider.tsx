import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  label?: string
}

export const Divider = forwardRef<HTMLDivElement, DividerProps>(
  ({ className, label, ...props }, ref) => {
    if (label) {
      return (
        <div ref={ref} className={cn('flex items-center gap-3', className)} {...props}>
          <div className="flex-1 h-px bg-[var(--color-border)]" />
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
            {label}
          </span>
          <div className="flex-1 h-px bg-[var(--color-border)]" />
        </div>
      )
    }
    return (
      <div
        ref={ref}
        className={cn('h-px bg-[var(--color-border)]', className)}
        {...props}
      />
    )
  }
)

Divider.displayName = 'Divider'
