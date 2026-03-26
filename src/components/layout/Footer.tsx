import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-cream)] mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between text-[10px] text-[var(--color-ink-muted)]">
          <Link to="/" className="flex items-center gap-1.5 hover:text-[var(--color-accent)] transition-colors">
            <span className="font-medium">utils<span className="text-[var(--color-accent)]">.</span>foo</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <span>100% client-side</span>
            <span className="text-[var(--color-border-dark)]">·</span>
            <span>No data sent to servers</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
