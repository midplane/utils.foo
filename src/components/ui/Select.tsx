import { SelectHTMLAttributes, forwardRef, useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, id, options, ...props }, ref) => {
    const generatedId = useId()
    const fieldId = id ?? generatedId
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={fieldId} className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)] mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={fieldId}
            className={cn(
              'w-full px-2.5 py-1.5 text-sm bg-[var(--color-input-bg)] border border-[var(--color-input-border)] shadow-[var(--shadow-input-inset)] rounded-lg text-[var(--color-ink)] appearance-none cursor-pointer',
              'focus:border-[var(--color-accent)]',
              'aria-invalid:border-[var(--color-error-icon)]',
              'disabled:bg-[var(--color-cream-dark)] disabled:text-[var(--color-ink-muted)] disabled:cursor-not-allowed disabled:shadow-none',
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
            <ChevronDown className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" aria-hidden="true" />
          </div>
        </div>
      </div>
    )
  }
)

Select.displayName = 'Select'
