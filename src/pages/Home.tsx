import { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { ToolCard } from '../components/ToolCard'
import { searchTools, tools } from '../tools/registry'

export function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const filteredTools = searchQuery ? searchTools(searchQuery) : tools
  const searchInputRef = useRef<HTMLInputElement>(null)

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
      {/* Compact Hero */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-2">
        <div>
          <h1 className="font-mono text-xl md:text-2xl font-semibold text-[var(--color-ink)]">
            Developer <span className="text-[var(--color-accent)]">Utilities</span>
          </h1>
          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
            Fast, free, client-side tools. <span className="text-[var(--color-ink-light)]">Zero tracking.</span>
          </p>
        </div>
        
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-ink-muted)]" />
          <input
            ref={searchInputRef}
            type="search"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[var(--color-border)] rounded-lg text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-border-dark)] focus:ring-1 focus:ring-[var(--color-ink)]/5 transition-all"
          />
          {!searchQuery && (
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-ink-muted)] bg-[var(--color-cream-dark)] border border-[var(--color-border)] rounded">
              /
            </kbd>
          )}
        </div>
      </div>

      {/* Divider with count */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[var(--color-border)]" />
        <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
          {searchQuery ? `${filteredTools.length} found` : `${tools.length} tools`}
        </span>
        <div className="flex-1 h-px bg-[var(--color-border)]" />
      </div>

      {/* Tool Grid - 3 columns on larger screens */}
      {filteredTools.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTools.map((tool, index) => (
            <ToolCard key={tool.id} tool={tool} index={index} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 animate-fade-in">
          <p className="text-sm text-[var(--color-ink-muted)]">No tools found matching "{searchQuery}"</p>
        </div>
      )}
    </div>
  )
}


