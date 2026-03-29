import { HTMLAttributes, forwardRef, ReactNode, useEffect, useRef } from 'react'
import { cn } from '../../lib/utils'

export interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ className, open, onClose, title, children, ...props }, ref) => {
    const overlayRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      }
      if (open) {
        document.addEventListener('keydown', handleEscape)
        document.body.style.overflow = 'hidden'
      }
      return () => {
        document.removeEventListener('keydown', handleEscape)
        document.body.style.overflow = ''
      }
    }, [open, onClose])

    if (!open) return null

    return (
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in"
        onClick={(e) => {
          if (e.target === overlayRef.current) onClose()
        }}
      >
        <div
          ref={ref}
          className={cn(
            'bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-[var(--shadow-lifted)] w-full max-w-md animate-fade-in-up',
            className
          )}
          {...props}
        >
          {title && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
              <h2 className="font-semibold text-sm text-[var(--color-ink)]">{title}</h2>
              <button
                onClick={onClose}
                className="p-1 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream-dark)] rounded transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <div className="p-4">{children}</div>
        </div>
      </div>
    )
  }
)

Modal.displayName = 'Modal'
