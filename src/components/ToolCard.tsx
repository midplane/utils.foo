import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Tool } from '../tools/types'

interface ToolCardProps {
  tool: Tool
  index?: number
}

export function ToolCard({ tool, index = 0 }: ToolCardProps) {
  const Icon = tool.icon

  return (
    <Link
      to={tool.path}
      className={`group block opacity-0 animate-fade-in-up stagger-${Math.min(index + 1, 6)}`}
      style={{ animationFillMode: 'forwards' }}
    >
      <div className="h-full p-3 bg-white rounded-lg border border-[var(--color-border)] hover:border-[var(--color-border-dark)] hover:shadow-[var(--shadow-soft)] transition-all relative overflow-hidden">
        {/* Accent corner */}
        <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-[var(--color-accent)]/5 to-transparent rounded-bl-xl" />

        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--color-cream-dark)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-ink-light)] group-hover:bg-[var(--color-accent)] group-hover:text-white group-hover:border-[var(--color-accent)] transition-all duration-200">
            <Icon className="w-4 h-4" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-[var(--color-ink)] group-hover:text-[var(--color-accent)] transition-colors truncate mb-0.5">
              {tool.name}
            </h3>
            <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed line-clamp-2">
              {tool.description}
            </p>
          </div>

          {/* Arrow */}
          <ChevronRight className="flex-shrink-0 w-4 h-4 text-[var(--color-ink-muted)] group-hover:text-[var(--color-accent)] group-hover:translate-x-0.5 transition-all mt-0.5" />
        </div>
      </div>
    </Link>
  )
}
