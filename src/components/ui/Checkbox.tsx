import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    return (
      <label htmlFor={id} className="inline-flex items-center gap-2 cursor-pointer group">
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            className={cn(
              'peer w-4 h-4 border border-[var(--color-border)] rounded bg-white appearance-none cursor-pointer',
              'checked:bg-[var(--color-ink)] checked:border-[var(--color-ink)]',
              'focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)]/10 focus:ring-offset-1',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors',
              className
            )}
            {...props}
          />
          <svg
            className="absolute inset-0 w-4 h-4 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
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

Checkbox.displayName = 'Checkbox'
