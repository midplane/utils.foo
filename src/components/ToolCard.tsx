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

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onToggleFavorite?.(tool.id)
  }

  return (
    <Link
      to={tool.path}
      className={`group block opacity-0 animate-fade-in-up stagger-${Math.min(index + 1, 6)}`}
      style={{ animationFillMode: 'forwards' }}
    >
      <div className="h-full p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] hover:border-[var(--color-border-dark)] hover:shadow-[var(--shadow-soft)] transition-all relative overflow-hidden">
        {/* Favorite button */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          className="absolute top-2 right-2 p-1 rounded-md hover:bg-[var(--color-cream-dark)] transition-colors z-10"
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star
            className={`w-3.5 h-3.5 transition-colors ${
              isFavorite
                ? 'fill-[var(--color-accent)] text-[var(--color-accent)]'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-accent)]'
            }`}
          />
        </button>

        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--color-cream-dark)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-ink-light)] group-hover:bg-[var(--color-accent)] group-hover:text-white group-hover:border-[var(--color-accent)] transition-all duration-200">
            <Icon className="w-4 h-4" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="font-semibold text-sm text-[var(--color-ink)] group-hover:text-[var(--color-accent)] transition-colors truncate mb-0.5">
              {tool.name}
            </h3>
            <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed line-clamp-2">
              {tool.description}
            </p>
          </div>
        </div>
      </div>
    </Link>
  )
}
