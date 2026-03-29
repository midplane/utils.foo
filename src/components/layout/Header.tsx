import { Link } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

export function Header() {
  const { isDark, toggle } = useTheme()

  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-cream)]/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
        <Link to="/" className="group flex items-center gap-2">
          <div className="relative">
            <div className="w-6 h-6 bg-[var(--color-ink)] rounded flex items-center justify-center group-hover:bg-[var(--color-accent)] transition-colors duration-300">
              <span className="text-[var(--color-cream)] text-[10px] font-bold tracking-tight">u.f</span>
            </div>
          </div>
          <span className="text-sm font-semibold text-[var(--color-ink)] tracking-tight">
            utils<span className="text-[var(--color-accent)]">.</span>foo
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-[var(--color-cream-dark)] rounded-full border border-[var(--color-border)]">
            <div className="relative flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <span className="absolute w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            </div>
            <span className="text-[10px] text-[var(--color-ink-muted)] font-medium">
              client-side only
            </span>
          </div>
          <span className="hidden md:block text-[10px] text-[var(--color-ink-muted)]">
            Your data never leaves your browser
          </span>

          <button
            onClick={toggle}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="ml-1 p-1.5 rounded-lg text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream-dark)] border border-transparent hover:border-[var(--color-border)] transition-colors"
          >
            {isDark
              ? <Sun className="w-3.5 h-3.5" />
              : <Moon className="w-3.5 h-3.5" />
            }
          </button>
        </div>
      </div>
    </header>
  )
}
