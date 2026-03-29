import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/50 disabled:opacity-50 disabled:pointer-events-none',
          {
            'bg-[var(--color-ink)] text-[var(--color-cream)] hover:bg-[var(--color-accent)]': variant === 'primary',
            'bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-cream-dark)] border border-[var(--color-border)] hover:border-[var(--color-border-dark)]': variant === 'secondary',
            'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream-dark)]': variant === 'ghost',
          },
          {
            'text-[10px] px-2 py-1': size === 'sm',
            'text-xs px-3 py-1.5': size === 'md',
            'text-sm px-4 py-2': size === 'lg',
          },
          className
        )}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'
