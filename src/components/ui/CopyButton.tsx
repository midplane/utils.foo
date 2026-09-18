import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button, ButtonProps } from './Button'
import { cn } from '../../lib/utils'

interface CopyButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Text to copy, or a function returning it.
   *
   * Pass a function when the text is expensive to build - it is only called on
   * click, rather than on every render of the parent.
   */
  text: string | (() => string)
}

export function CopyButton({ text, className, children, ...props }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(typeof text === 'function' ? text() : text)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleCopy}
      // Swapping the label in place is announced as a change to a live region.
      aria-live="polite"
      className={cn(
        'gap-1',
        copied && 'bg-[var(--color-success-bg)] border-[var(--color-success-border)] text-[var(--color-success-text)] hover:bg-[var(--color-success-bg)] hover:border-[var(--color-success-border)]',
        className
      )}
      {...props}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" aria-hidden="true" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" aria-hidden="true" />
          <span>{children || 'Copy'}</span>
        </>
      )}
    </Button>
  )
}
