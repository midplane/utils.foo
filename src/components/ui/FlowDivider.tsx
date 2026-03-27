import { forwardRef, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FlowDividerProps {
  /** Whether to show the "success" state (output available) */
  hasOutput?: boolean
  /** Custom icon to display (defaults to ChevronDown) */
  icon?: ReactNode
  /** Additional classes for the container */
  className?: string
}

// ─── Component ───────────────────────────────────────────────────────────────

export const FlowDivider = forwardRef<HTMLDivElement, FlowDividerProps>(
  ({ hasOutput = false, icon, className }, ref) => {
    return (
      <div ref={ref} className={cn('flex items-center gap-2', className)}>
        <div className="flex-1 h-px bg-[var(--color-border)]" />
        <div
          className={cn(
            'p-1 rounded-full border transition-colors [&>svg]:w-3 [&>svg]:h-3',
            hasOutput
              ? 'bg-[var(--color-success-bg)] border-[var(--color-success-border)] text-[var(--color-success-icon)]'
              : 'bg-[var(--color-cream-dark)] border-[var(--color-border)] text-[var(--color-ink-muted)]'
          )}
        >
          {icon ?? <ChevronDown />}
        </div>
        <div className="flex-1 h-px bg-[var(--color-border)]" />
      </div>
    )
  }
)

FlowDivider.displayName = 'FlowDivider'
