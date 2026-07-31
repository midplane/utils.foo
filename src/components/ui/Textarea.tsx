import { TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)] mb-1">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            'w-full px-2.5 py-2 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] shadow-[var(--shadow-input-inset)] rounded-lg text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] resize-none font-mono text-xs leading-relaxed',
            'focus:border-[var(--color-accent)]',
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
