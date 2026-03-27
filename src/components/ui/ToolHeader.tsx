import { forwardRef, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ToolHeaderProps {
  /** Icon to display (should be a lucide-react icon element) */
  icon: ReactNode
  /** Main title text */
  title: string
  /** Optional accented suffix (displayed in accent color) */
  accentedSuffix?: string
  /** Additional classes for the container */
  className?: string
}

// ─── Component ───────────────────────────────────────────────────────────────

export const ToolHeader = forwardRef<HTMLDivElement, ToolHeaderProps>(
  ({ icon, title, accentedSuffix, className }, ref) => {
    return (
      <div ref={ref} className={cn('flex items-center gap-2', className)}>
        <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-white [&>svg]:w-3.5 [&>svg]:h-3.5">
          {icon}
        </div>
        <h1 className="font-mono text-lg font-semibold text-[var(--color-ink)]">
          {title}
          {accentedSuffix && (
            <>
              {' '}
              <span className="text-[var(--color-accent)]">{accentedSuffix}</span>
            </>
          )}
        </h1>
      </div>
    )
  }
)

ToolHeader.displayName = 'ToolHeader'
