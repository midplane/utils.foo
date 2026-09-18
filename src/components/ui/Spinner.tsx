import { cn } from '../../lib/utils'

export interface SpinnerProps {
  /** Announces the spinner as a status. Omit when a nearby text label already says what is loading. */
  label?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Spinner({ size = 'md', label, className }: SpinnerProps) {
  return (
    <svg
      className={cn(
        'animate-spin text-[var(--color-ink-muted)]',
        {
          'w-3 h-3': size === 'sm',
          'w-4 h-4': size === 'md',
          'w-6 h-6': size === 'lg',
        },
        className
      )}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
