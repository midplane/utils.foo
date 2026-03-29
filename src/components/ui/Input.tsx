import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)] mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full px-2.5 py-1.5 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-ink)] placeholder-[var(--color-ink-muted)]/60',
            'focus:outline-none focus:border-[var(--color-border-dark)] focus:ring-1 focus:ring-[var(--color-ink)]/5',
            'disabled:bg-[var(--color-cream-dark)] disabled:text-[var(--color-ink-muted)]',
            'transition-colors',
            className
          )}
          {...props}
        />
      </div>
    )
  }
)

Input.displayName = 'Input'
