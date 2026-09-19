import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, label, id, ...props }, ref) => {
    // Only a labelled control is its own <label>; an unlabelled one is usually
    // inside a row-level <label>, and labels do not nest.
    const Wrapper = label ? 'label' : 'span'
    return (
      <Wrapper className="inline-flex items-center gap-2 cursor-pointer group has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed">
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            role="switch"
            id={id}
            className={cn(
              'peer sr-only',
              className
            )}
            {...props}
          />
          <div className={cn(
            // Off track is the field border (3:1 against page and knob); --color-border-dark is 1.4:1.
            'w-8 h-[18px] bg-[var(--color-input-border)] rounded-full transition-colors',
            'peer-checked:bg-[var(--color-accent)]',
            // The <input> is sr-only, so the global *:focus-visible outline would
            // land on an invisible box. Mirror it onto the visible track instead.
            'peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--color-accent)] peer-focus-visible:outline-offset-2'
          )} />
          <div className={cn(
            'absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-[var(--color-surface)] rounded-full shadow-sm transition-transform',
            'peer-checked:translate-x-3.5'
          )} />
        </div>
        {label && (
          <span className="text-sm text-[var(--color-ink)] group-hover:text-[var(--color-ink-light)] transition-colors">
            {label}
          </span>
        )}
      </Wrapper>
    )
  }
)

Toggle.displayName = 'Toggle'
