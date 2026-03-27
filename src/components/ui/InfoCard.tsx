import { forwardRef, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InfoCardProps {
  /** Icon to display on the left */
  icon: ReactNode
  /** Title text */
  title: string
  /** Description text */
  description: string
  /** Additional classes for the container */
  className?: string
}

// ─── Component ───────────────────────────────────────────────────────────────

export const InfoCard = forwardRef<HTMLDivElement, InfoCardProps>(
  ({ icon, title, description, className }, ref) => {
    return (
      <div 
        ref={ref} 
        className={cn(
          'px-3 py-2 bg-[var(--color-cream-dark)] rounded-lg border border-[var(--color-border)]',
          className
        )}
      >
        <div className="flex gap-2 items-start">
          <span className="flex-shrink-0 mt-0.5 [&>svg]:w-3.5 [&>svg]:h-3.5">
            {icon}
          </span>
          <div>
            <h3 className="font-semibold text-[var(--color-ink)] text-xs">{title}</h3>
            <p className="text-[10px] text-[var(--color-ink-muted)] leading-tight mt-0.5">
              {description}
            </p>
          </div>
        </div>
      </div>
    )
  }
)

InfoCard.displayName = 'InfoCard'
