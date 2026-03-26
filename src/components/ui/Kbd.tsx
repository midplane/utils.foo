import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

type KbdProps = HTMLAttributes<HTMLElement>

export const Kbd = forwardRef<HTMLElement, KbdProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <kbd
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono font-medium',
          'bg-[var(--color-cream-dark)] text-[var(--color-ink-muted)] border border-[var(--color-border)] rounded',
          'shadow-[0_1px_0_var(--color-border-dark)]',
          className
        )}
        {...props}
      >
        {children}
      </kbd>
    )
  }
)

Kbd.displayName = 'Kbd'
