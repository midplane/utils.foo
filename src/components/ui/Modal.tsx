import { HTMLAttributes, forwardRef, ReactNode, useEffect, useId, useRef } from 'react'
import { cn } from '../../lib/utils'
import { useScrollLock } from '../../hooks/useScrollLock'

export interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /**
   * Accessible name, required when there is no visible `title` — otherwise the
   * dialog is announced with no name at all.
   */
  label?: string
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ className, open, onClose, title, label, children, ...props }, ref) => {
    const overlayRef = useRef<HTMLDivElement>(null)
    const dialogRef = useRef<HTMLDivElement>(null)
    const titleId = useId()

    useScrollLock(open)

    // Escape to close, and keep Tab inside the dialog. Without the trap, Tab
    // walks straight out into the page behind the overlay, which is still
    // rendered and still clickable to a keyboard user.
    useEffect(() => {
      if (!open) return

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose()
          return
        }
        if (e.key !== 'Tab') return

        const dialog = dialogRef.current
        if (!dialog) return
        const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
        if (items.length === 0) {
          e.preventDefault()
          return
        }
        const first = items[0]!
        const last = items[items.length - 1]!
        const active = document.activeElement

        if (e.shiftKey && (active === first || active === dialog)) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && active === last) {
          e.preventDefault()
          first.focus()
        }
      }

      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }, [open, onClose])

    // Move focus into the dialog on open, and return it to whatever opened the
    // modal on close — otherwise focus falls back to <body> and the user's
    // place in the page is lost.
    useEffect(() => {
      if (!open) return
      const previouslyFocused = document.activeElement as HTMLElement | null
      const dialog = dialogRef.current
      const target = dialog?.querySelector<HTMLElement>(FOCUSABLE) ?? dialog
      target?.focus()
      return () => previouslyFocused?.focus?.()
    }, [open])

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
          ref={(node) => {
            dialogRef.current = node
            if (typeof ref === 'function') ref(node)
            else if (ref) ref.current = node
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-label={title ? undefined : label}
          tabIndex={-1}
          className={cn(
            'bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-[var(--shadow-lifted)] w-full max-w-md animate-fade-in-up',
            className
          )}
          {...props}
        >
          {title && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
              <h2 id={titleId} className="font-semibold text-sm text-[var(--color-ink)]">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="p-1 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream-dark)] rounded transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
