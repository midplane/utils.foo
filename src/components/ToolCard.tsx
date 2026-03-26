import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Tool } from '../tools/types'

interface ToolCardProps {
  tool: Tool
  index?: number
}

// Category to icon mapping
const categoryIcons: Record<string, ReactNode> = {
  Time: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Encoding: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
}

const defaultIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
)

export function ToolCard({ tool, index = 0 }: ToolCardProps) {
  const icon = categoryIcons[tool.category] || defaultIcon
  
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
            {icon}
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
          <svg className="flex-shrink-0 w-4 h-4 text-[var(--color-ink-muted)] group-hover:text-[var(--color-accent)] group-hover:translate-x-0.5 transition-all mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  )
}
