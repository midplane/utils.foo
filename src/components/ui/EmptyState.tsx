import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

export interface EmptyStateProps extends HTMLAttributes<HTMLParagraphElement> {
  /** The message to display. For search results, use the `query` prop instead. */
  message?: string
  /** If provided, displays "No results for {query}" */
  query?: string
  /** Size variant affecting text size and padding */
  size?: 'sm' | 'default'
}

export const EmptyState = forwardRef<HTMLParagraphElement, EmptyStateProps>(
  ({ className, message, query, size = 'default', ...props }, ref) => {
    const displayMessage = query
      ? `No results for "${query}"`
      : message || 'No results found'

    return (
      <p
        ref={ref}
        className={cn(
          'text-[var(--color-ink-muted)] text-center',
          size === 'sm' ? 'text-xs py-4' : 'text-sm py-8',
          className
        )}
        {...props}
      >
        {displayMessage}
      </p>
    )
  }
)

EmptyState.displayName = 'EmptyState'
