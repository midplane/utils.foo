import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, Star } from 'lucide-react'
import { ToolCard } from '../components/ToolCard'
import { searchTools, tools } from '../tools/registry'
import { useFavorites } from '../hooks/useFavorites'

export function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const { isFavorite, toggleFavorite, favorites } = useFavorites()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const { favoriteTools, otherTools } = useMemo(() => {
    const baseTools = searchQuery ? searchTools(searchQuery) : tools
    const sorted = baseTools.slice().sort((a, b) => a.name.localeCompare(b.name))
    return {
      favoriteTools: sorted.filter(t => favorites.has(t.id)),
      otherTools: sorted.filter(t => !favorites.has(t.id)),
    }
  }, [searchQuery, favorites])

  const totalCount = favoriteTools.length + otherTools.length

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-ink-muted)]" />
        <input
          ref={searchInputRef}
          type="search"
          placeholder="Search tools..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-border-dark)] focus:ring-1 focus:ring-[var(--color-ink)]/5 transition-all"
        />
        {!searchQuery && (
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-ink-muted)] bg-[var(--color-cream-dark)] border border-[var(--color-border)] rounded">
            /
          </kbd>
        )}
      </div>

      {/* Favorites Section */}
      {favoriteTools.length > 0 && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--color-border)]" />
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
              <Star className="w-3 h-3 fill-[var(--color-accent)] text-[var(--color-accent)]" />
              {favoriteTools.length} favorite{favoriteTools.length !== 1 ? 's' : ''}
            </span>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {favoriteTools.map((tool, index) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                index={index}
                isFavorite={true}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </>
      )}

      {/* Divider with count */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[var(--color-border)]" />
        <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
          {searchQuery ? `${totalCount} found` : `${tools.length} tools`}
        </span>
        <div className="flex-1 h-px bg-[var(--color-border)]" />
      </div>

      {/* Tool Grid - 3 columns on larger screens */}
      {otherTools.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {otherTools.map((tool, index) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              index={index}
              isFavorite={isFavorite(tool.id)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      ) : (
        !favoriteTools.length && (
          <div className="text-center py-8 animate-fade-in">
            <p className="text-sm text-[var(--color-ink-muted)]">No tools found matching "{searchQuery}"</p>
          </div>
        )
      )}
    </div>
  )
}