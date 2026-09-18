import { TextareaHTMLAttributes, forwardRef, useId } from 'react'
import { cn } from '../../lib/utils'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, id, ...props }, ref) => {
    const generatedId = useId()
    const fieldId = id ?? generatedId
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={fieldId} className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)] mb-1">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={fieldId}
          className={cn(
            'w-full px-2.5 py-2 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] shadow-[var(--shadow-input-inset)] rounded-lg text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] resize-none font-mono text-xs leading-relaxed',
            'focus:border-[var(--color-accent)]',
            'aria-invalid:border-[var(--color-error-icon)]',
            'disabled:bg-[var(--color-cream-dark)] disabled:text-[var(--color-ink-muted)] disabled:shadow-none',
            'transition-colors',
            className
          )}
          {...props}
        />
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
