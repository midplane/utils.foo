import { SelectHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, id, options, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)] mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={id}
            className={cn(
              'w-full px-2.5 py-1.5 text-sm bg-white border border-[var(--color-border)] rounded-lg text-[var(--color-ink)] appearance-none cursor-pointer',
              'focus:outline-none focus:border-[var(--color-border-dark)] focus:ring-1 focus:ring-[var(--color-ink)]/5',
              'disabled:bg-[var(--color-cream-dark)] disabled:text-[var(--color-ink-muted)] disabled:cursor-not-allowed',
              'transition-colors',
              className
            )}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
            <svg className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    )
  }
)

Select.displayName = 'Select'
