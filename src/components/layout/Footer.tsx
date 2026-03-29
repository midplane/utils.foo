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
            <a
              href="https://github.com/midplane/utils.foo"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--color-accent)] transition-colors"
            >
              GitHub
            </a>
            <span className="text-[var(--color-border-dark)]">·</span>
            <a
              href="https://github.com/midplane/utils.foo/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--color-accent)] transition-colors"
            >
              Raise a request
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
