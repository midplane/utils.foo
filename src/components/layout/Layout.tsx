import { ReactNode } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--color-cream)] flex flex-col relative">
      {/* Subtle dot grid background */}
      <div className="fixed inset-0 bg-dotgrid opacity-40 pointer-events-none" />
      
      {/* Gradient accent at top */}
      <div className="fixed top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-accent)]/30 to-transparent" />
      
      <Header />
      
      <main className="flex-1 relative z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          {children}
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
