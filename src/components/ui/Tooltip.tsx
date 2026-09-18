import { ReactElement, ReactNode, cloneElement, isValidElement, useEffect, useId, useState } from 'react'
import { cn } from '../../lib/utils'

export interface TooltipProps {
  content: string
  children: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export function Tooltip({ content, children, position = 'top', className }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const id = useId()

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  }

  // Escape dismisses without moving focus or the pointer (WCAG 1.4.13).
  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVisible(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible])

  // Point the trigger at the bubble so a screen reader reads it with the control.
  const trigger =
    visible && isValidElement(children)
      ? cloneElement(children as ReactElement<{ 'aria-describedby'?: string }>, {
          'aria-describedby': id,
        })
      : children

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {trigger}
      {visible && (
        <div
          role="tooltip"
          id={id}
          className={cn(
            // cream, not white: the bubble is filled with --color-ink, which is
            // near-white in dark mode — white-on-white made the text vanish.
            'absolute z-50 px-2 py-1 text-[10px] font-medium text-[var(--color-cream)] bg-[var(--color-ink)] rounded whitespace-nowrap',
            positionClasses[position],
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}
