import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, label, id, ...props }, ref) => {
    return (
      <label htmlFor={id} className="inline-flex items-center gap-2 cursor-pointer group">
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            className={cn(
              'peer sr-only',
              className
            )}
            {...props}
          />
          <div className={cn(
            'w-8 h-[18px] bg-[var(--color-border-dark)] rounded-full transition-colors',
            'peer-checked:bg-[var(--color-ink)]',
            'peer-focus:ring-1 peer-focus:ring-[var(--color-ink)]/10 peer-focus:ring-offset-1',
            'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed'
          )} />
          <div className={cn(
            'absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform',
            'peer-checked:translate-x-3.5'
          )} />
        </div>
        {label && (
          <span className="text-sm text-[var(--color-ink)] group-hover:text-[var(--color-ink-light)] transition-colors">
            {label}
          </span>
        )}
      </label>
    )
  }
)

Toggle.displayName = 'Toggle'
