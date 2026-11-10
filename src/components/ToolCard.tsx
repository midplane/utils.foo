import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { Tool } from '../tools/types'

interface ToolCardProps {
  tool: Tool
  index?: number
  isFavorite?: boolean
  onToggleFavorite?: (id: string) => void
}

export function ToolCard({ tool, index = 0, isFavorite = false, onToggleFavorite }: ToolCardProps) {
  const Icon = tool.icon

  return (
    <div
      className={`group relative h-full opacity-0 animate-fade-in-up stagger-${Math.min(index + 1, 6)}`}
      style={{ animationFillMode: 'forwards' }}
    >
      {/* The favorite button is a sibling of the link, not a child: a button
          nested inside an <a> is invalid HTML and is announced as part of the
          link by screen readers. */}
      <Link
        to={tool.path}
        className="block h-full p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] hover:border-[var(--color-border-dark)] hover:shadow-[var(--shadow-soft)] transition-all"
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--color-cream-dark)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-ink-light)] group-hover:bg-[var(--color-ink)] group-hover:text-[var(--color-cream)] group-hover:border-[var(--color-ink)] transition-colors duration-200">
            <Icon className="w-4 h-4" aria-hidden="true" />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <h2 className="font-semibold text-sm text-[var(--color-ink)] truncate mb-0.5">
              {tool.name}
            </h2>
            <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed line-clamp-2">
              {tool.description}
            </p>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={() => onToggleFavorite?.(tool.id)}
        className="absolute top-1.5 right-1.5 p-1.5 rounded-md text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream-dark)] transition-colors cursor-pointer"
        aria-label={isFavorite ? `Remove ${tool.name} from favorites` : `Add ${tool.name} to favorites`}
      >
        <Star
          className={`w-3.5 h-3.5 transition-colors ${
            isFavorite ? 'fill-[var(--color-accent)] text-[var(--color-accent)]' : ''
          }`}
          aria-hidden="true"
        />
      </button>
    </div>
  )
}
