import { forwardRef } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '../../lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SearchInputProps {
  /** Current search value */
  value: string
  /** Callback when value changes */
  onChange: (value: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Additional classes for the container */
  className?: string
}

// ─── Component ───────────────────────────────────────────────────────────────

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, placeholder = 'Search...', className }, ref) => {
    return (
      <div className={cn('relative', className)}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
        <input
          ref={ref}
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-[var(--color-border)] rounded-lg text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20 transition-all font-mono"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-[var(--color-cream-dark)] rounded transition-colors cursor-pointer"
          >
            <X className="w-3 h-3 text-[var(--color-ink-muted)]" />
          </button>
        )}
      </div>
    )
  }
)

SearchInput.displayName = 'SearchInput'
