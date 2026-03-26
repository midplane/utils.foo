import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, id, ...props }, ref) => {
    return (
      <label htmlFor={id} className="inline-flex items-center gap-2 cursor-pointer group">
        <div className="relative">
          <input
            ref={ref}
            type="radio"
            id={id}
            className={cn(
              'peer w-4 h-4 border border-[var(--color-border)] rounded-full bg-white appearance-none cursor-pointer',
              'checked:border-[var(--color-ink)]',
              'focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)]/10 focus:ring-offset-1',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors',
              className
            )}
            {...props}
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-2 h-2 rounded-full bg-[var(--color-ink)] opacity-0 peer-checked:opacity-100 transition-opacity" />
          </div>
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

Radio.displayName = 'Radio'
