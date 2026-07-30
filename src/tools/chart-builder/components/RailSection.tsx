import { useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '../../../lib/utils'

interface RailSectionProps {
  title: string
  /** Short summary shown on the header while collapsed. */
  summary?: string
  defaultOpen?: boolean
  children: ReactNode
}

/**
 * A disclosure section for the control rail.
 *
 * The rail carries five groups of controls; showing all of them at once makes
 * it a wall, and the previous tab strip hid half of them behind a click with no
 * indication of what was inside. A summary on the collapsed header keeps the
 * current state visible either way.
 */
export function RailSection({ title, summary, defaultOpen = true, children }: RailSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-[var(--color-border)] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-1.5 px-3 py-2 text-left cursor-pointer hover:bg-[var(--color-cream-dark)] transition-colors"
      >
        <ChevronRight
          className={cn(
            'w-3 h-3 text-[var(--color-ink-muted)] transition-transform shrink-0',
            open && 'rotate-90'
          )}
          aria-hidden="true"
        />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
          {title}
        </span>
        {!open && summary && (
          <span className="ml-auto text-[10px] font-mono text-[var(--color-ink-muted)] truncate max-w-[55%]">
            {summary}
          </span>
        )}
      </button>

      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}
