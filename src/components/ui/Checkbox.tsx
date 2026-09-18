import { InputHTMLAttributes, forwardRef } from 'react'
import { Check } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    return (
      <label htmlFor={id} className="inline-flex items-center gap-2 cursor-pointer group has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed">
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            className={cn(
              'peer w-4 h-4 border border-[var(--color-input-border)] rounded bg-[var(--color-input-bg)] shadow-[var(--shadow-input-inset)] appearance-none cursor-pointer',
              'checked:bg-[var(--color-ink)] checked:border-[var(--color-ink)] checked:shadow-none',
              'focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2',
              'disabled:cursor-not-allowed',
              'transition-colors',
              className
            )}
            {...props}
          />
          <Check
            className="absolute inset-0 w-4 h-4 p-px text-[var(--color-cream)] opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
            strokeWidth={3}
            aria-hidden="true"
          />
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
